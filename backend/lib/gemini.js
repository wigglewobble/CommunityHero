const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CATEGORIES = ['Pothole', 'Water Leakage', 'Streetlight', 'Garbage/Waste', 'Road Damage', 'Drainage', 'Encroachment', 'Vandalism', 'Other'];
const DEPARTMENTS = {
  'Pothole': 'Roads & Infrastructure Dept.',
  'Road Damage': 'Roads & Infrastructure Dept.',
  'Water Leakage': 'Water & Sanitation Dept.',
  'Drainage': 'Water & Sanitation Dept.',
  'Streetlight': 'Electricity & Lighting Dept.',
  'Garbage/Waste': 'Solid Waste Management Dept.',
  'Encroachment': 'Municipal Corporation',
  'Vandalism': 'Police & Law Enforcement',
  'Other': 'General Administration'
};

// Analyze image using Gemini Vision
async function analyzeIssueImage(imageUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an AI agent for a civic issue reporting platform in India. Analyze this image of a community/infrastructure problem.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "category": "<one of: ${CATEGORIES.join(', ')}>",
  "severity": "<low|medium|high|critical>",
  "confidence": <0-100>,
  "title": "<short 5-8 word title>",
  "description": "<2-3 sentence description of what you see>",
  "immediateRisk": "<yes|no>",
  "estimatedFixTime": "<e.g. 1-2 days, 1 week, 2-4 weeks>",
  "actionRequired": "<brief recommended action for authorities>"
}`;

    // Fetch image as base64
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } }
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    parsed.department = DEPARTMENTS[parsed.category] || DEPARTMENTS['Other'];
    return parsed;
  } catch (err) {
    console.error('Gemini vision error:', err.message);
    return {
      category: 'Other',
      severity: 'medium',
      confidence: 0,
      title: 'Community Issue Reported',
      description: 'Issue reported by citizen. Manual review required.',
      immediateRisk: 'no',
      estimatedFixTime: '1-2 weeks',
      actionRequired: 'Review and assign to appropriate department.',
      department: DEPARTMENTS['Other']
    };
  }
}

// Agentic: Run cluster & hotspot analysis across all open issues
async function generateInsights(issues) {
  try {
    if (!issues || issues.length === 0) return null;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const summary = issues.map(i => ({
      category: i.category,
      severity: i.severity,
      status: i.status,
      lat: i.latitude,
      lng: i.longitude,
      upvotes: i.upvoteCount,
      address: i.address
    }));

    const prompt = `You are a civic analytics AI agent. Analyze these ${issues.length} community issues and generate actionable insights.

Issues data: ${JSON.stringify(summary)}

Respond ONLY with valid JSON (no markdown):
{
  "totalAnalyzed": ${issues.length},
  "criticalAlerts": ["<alert1>", "<alert2>"],
  "hotspots": [
    { "area": "<area name>", "issueCount": <n>, "dominantCategory": "<cat>", "urgency": "<high|medium|low>" }
  ],
  "categoryBreakdown": { "<category>": <count> },
  "predictiveInsights": ["<insight1>", "<insight2>", "<insight3>"],
  "recommendations": ["<rec1>", "<rec2>", "<rec3>"],
  "overallHealthScore": <0-100>,
  "weeklyTrend": "<improving|stable|worsening>"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini insights error:', err.message);
    return null;
  }
}

// Agentic: AI verification of upvoted issue
async function verifyIssueValidity(issue) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are a civic issue verification agent. An issue has been reported with ${issue.upvoteCount} community upvotes.

Issue: ${JSON.stringify({
  title: issue.title,
  category: issue.category,
  severity: issue.severity,
  description: issue.description,
  upvotes: issue.upvoteCount,
  aiAnalysis: issue.aiAnalysis
})}

Based on community verification and AI analysis, is this issue legitimate and urgent?
Respond ONLY with JSON:
{
  "verified": <true|false>,
  "urgencyScore": <0-100>,
  "escalate": <true|false>,
  "reason": "<one sentence>"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    return { verified: true, urgencyScore: 50, escalate: false, reason: 'Auto-verified' };
  }
}

module.exports = { analyzeIssueImage, generateInsights, verifyIssueValidity };
