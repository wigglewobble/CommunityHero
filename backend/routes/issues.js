const express = require('express');
const multer = require('multer');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { uploadImage } = require('../lib/cloudinary');
const { analyzeIssueImage, verifyIssueValidity } = require('../lib/gemini');
const { getBadge, VALID_STATUSES, VALID_SEVERITIES, VALID_CATEGORIES } = require('../lib/utils');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// GET all issues with filters
router.get('/', async (req, res) => {
  try {
    const { category, severity, status, search } = req.query;
    const where = {};
    if (category && category !== 'all' && VALID_CATEGORIES.includes(category)) where.category = category;
    if (severity && severity !== 'all' && VALID_SEVERITIES.includes(severity)) where.severity = severity;
    if (status && status !== 'all' && VALID_STATUSES.includes(status)) where.status = status;
    if (search && search.trim().length > 0) {
      const safe = search.trim().slice(0, 100);
      where.OR = [
        { title: { contains: safe, mode: 'insensitive' } },
        { description: { contains: safe, mode: 'insensitive' } },
        { address: { contains: safe, mode: 'insensitive' } }
      ];
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, badge: true } },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // cap result size
    });
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// GET single issue
router.get('/:id', async (req, res) => {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, badge: true } },
        comments: {
          include: { user: { select: { id: true, name: true, badge: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100
        },
        _count: { select: { upvotes: true } }
      }
    });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

// POST create issue with image upload + Gemini analysis
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, description, latitude, longitude, address } = req.body;

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Validate image mimetype
    if (req.file && !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Sanitize text fields
    const safeTitle = title ? title.trim().slice(0, 200) : '';
    const safeDescription = description ? description.trim().slice(0, 2000) : '';
    const safeAddress = address ? address.trim().slice(0, 300) : '';

    let category = req.body.category || 'Other';
    let severity = req.body.severity || 'medium';

    // Validate enums
    if (!VALID_CATEGORIES.includes(category)) category = 'Other';
    if (!VALID_SEVERITIES.includes(severity)) severity = 'medium';

    let imageUrl = null;
    let aiAnalysis = null;
    let department = null;
    let aiTitle = safeTitle;

    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, req.file.mimetype);
      aiAnalysis = await analyzeIssueImage(imageUrl);
      if (aiAnalysis) {
        category = VALID_CATEGORIES.includes(aiAnalysis.category) ? aiAnalysis.category : category;
        severity = VALID_SEVERITIES.includes(aiAnalysis.severity) ? aiAnalysis.severity : severity;
        department = aiAnalysis.department || null;
        if (!safeTitle && aiAnalysis.title) aiTitle = aiAnalysis.title.slice(0, 200);
      }
    }

    const issue = await prisma.issue.create({
      data: {
        title: aiTitle || 'Community Issue',
        description: safeDescription || aiAnalysis?.description || '',
        category,
        severity,
        imageUrl,
        latitude: lat,
        longitude: lng,
        address: safeAddress,
        aiAnalysis,
        department,
        userId: req.user.id
      },
      include: { user: { select: { id: true, name: true, badge: true } } }
    });

    const newPoints = req.user.points + 10;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { points: newPoints, badge: getBadge(newPoints) }
    });

    res.json({ issue, pointsEarned: 10, aiAnalysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// POST upvote / verify issue
router.post('/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const issueId = req.params.id;
    const userId = req.user.id;

    // Fetch issue first to check ownership
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Prevent self-upvote
    if (issue.userId === userId) {
      return res.status(400).json({ error: 'You cannot verify your own issue' });
    }

    const existing = await prisma.upvote.findUnique({ where: { userId_issueId: { userId, issueId } } });
    if (existing) return res.status(400).json({ error: 'Already verified' });

    await prisma.upvote.create({ data: { userId, issueId } });

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: { upvoteCount: { increment: 1 } }
    });

    // AI verification trigger at milestone upvotes
    let verification = null;
    if ([5, 10, 25, 50].includes(updated.upvoteCount)) {
      verification = await verifyIssueValidity(updated);
      if (verification?.escalate) {
        await prisma.issue.update({
          where: { id: issueId },
          data: {
            severity: 'critical',
            aiAnalysis: { ...(updated.aiAnalysis || {}), verification }
          }
        });
      }
    }

    const newPoints = req.user.points + 2;
    await prisma.user.update({
      where: { id: userId },
      data: { points: newPoints, badge: getBadge(newPoints) }
    });

    res.json({ upvoteCount: updated.upvoteCount, verification, pointsEarned: 2 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify issue' });
  }
});

// GET check if user upvoted
router.get('/:id/upvoted', authMiddleware, async (req, res) => {
  try {
    const upvote = await prisma.upvote.findUnique({
      where: { userId_issueId: { userId: req.user.id, issueId: req.params.id } }
    });
    res.json({ upvoted: !!upvote });
  } catch {
    res.json({ upvoted: false });
  }
});

// PATCH update issue status (owner only)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status value
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });
    if (!issue) return res.status(404).json({ error: 'Not found' });
    if (issue.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    // Prevent going backwards: resolved -> open is not allowed
    const statusOrder = { open: 0, 'in-progress': 1, resolved: 2 };
    if (statusOrder[status] < statusOrder[issue.status]) {
      return res.status(400).json({ error: 'Cannot revert to a previous status' });
    }

    const updated = await prisma.issue.update({
      where: { id: req.params.id },
      data: { status, resolvedAt: status === 'resolved' ? new Date() : null }
    });

    if (status === 'resolved') {
      const newPoints = req.user.points + 25;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { points: newPoints, badge: getBadge(newPoints) }
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST add comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text required' });
    if (text.trim().length > 500) return res.status(400).json({ error: 'Comment must be under 500 characters' });

    // Check issue exists
    const issueExists = await prisma.issue.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!issueExists) return res.status(404).json({ error: 'Issue not found' });

    const comment = await prisma.comment.create({
      data: { text: text.trim(), userId: req.user.id, issueId: req.params.id },
      include: { user: { select: { id: true, name: true, badge: true } } }
    });

    const newPoints = req.user.points + 1;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { points: newPoints, badge: getBadge(newPoints) }
    });

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
