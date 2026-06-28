const express = require('express');
const prisma = require('../lib/prisma');
const { generateInsights } = require('../lib/gemini');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Simple in-memory cache for AI insights (5 minute TTL)
let insightsCache = { data: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000;

router.get('/stats', async (req, res) => {
  try {
    const [total, open, inProgress, resolved, critical] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: 'open' } }),
      prisma.issue.count({ where: { status: 'in-progress' } }),
      prisma.issue.count({ where: { status: 'resolved' } }),
      prisma.issue.count({ where: { severity: 'critical' } })
    ]);

    const categoryData = await prisma.issue.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } }
    });

    const topReporters = await prisma.user.findMany({
      orderBy: { points: 'desc' },
      take: 10,
      select: { id: true, name: true, points: true, badge: true }
    });

    const recentResolved = await prisma.issue.findMany({
      where: { status: 'resolved' },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, category: true, resolvedAt: true }
    });

    res.json({
      summary: { total, open, inProgress, resolved, critical },
      categoryData: categoryData.map(c => ({ name: c.category, count: c._count.category })),
      topReporters,
      recentResolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// AI insights — auth protected + cached
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    // Return cached result if still fresh
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh && insightsCache.data && Date.now() - insightsCache.ts < CACHE_TTL) {
      return res.json({ insights: insightsCache.data, analyzedCount: insightsCache.analyzedCount, cached: true });
    }

    const issues = await prisma.issue.findMany({
      where: { status: { in: ['open', 'in-progress'] } },
      select: {
        id: true, title: true, category: true, severity: true,
        status: true, latitude: true, longitude: true,
        address: true, upvoteCount: true, aiAnalysis: true
      }
    });

    const insights = await generateInsights(issues);

    // Update cache
    insightsCache = { data: insights, ts: Date.now(), analyzedCount: issues.length };

    res.json({ insights, analyzedCount: issues.length, cached: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Map data
router.get('/map', async (req, res) => {
  try {
    const issues = await prisma.issue.findMany({
      select: {
        id: true, title: true, category: true, severity: true,
        status: true, latitude: true, longitude: true, address: true,
        upvoteCount: true, imageUrl: true
      }
    });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

module.exports = router;
