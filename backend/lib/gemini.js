const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

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

// Strict safety settings — block content at the lowest threshold across all harm categories.
// This is the first line of defense: Gemini itself will refuse to process clearly harmful imagery
// (nudity, sexual content, CSAM, graphic violence) and the API call will fail/block before we ever
// get a content response back.
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

class ContentRejectedError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'ContentRejectedError';
  }
}

// Step 1 — Moderation gate. Runs BEFORE the main analysis prompt.
// Asks Gemini explicitly: is this an appropriate photo of a civic/infrastructure issue,
// or is it a person's face, nudity, violence, or something irrelevant/inappropriate.
// This catches things the harm-category safety filters might not flag outright
// (e.g. a random selfie, a meme, a screenshot — not "harmful" but not a valid civic report either).
async function moderateImage(base64, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', safetySettings: SAFETY_SETTINGS });

  const prompt = `You are a content moderation agent for a civic issue reporting platform. Your ONLY job is to determine if this image is an appropriate photo of a real-world civic/infrastructure problem (potholes, garbage, water leakage, broken streetlights, road damage, drainage issues, encroachment, vandalism of public property, etc).

REJECT the image if it contains any of the following:
- A photo primarily of a person's face or body (portraits, selfies) with no visible civic issue
- Nudity, sexual content, or content involving minors in any inappropriate context
- Violence, gore, weapons, or graphic injury
- Memes, screenshots, unrelated images, jokes, or trolling content
- Any content that does not depict a genuine public infrastructure or civic problem

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "approved": <true|false>,
  "reason": "<one short sentence explaining the decision>"
}`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64, mimeType } }
  ]);

  const text = result.response.text().trim().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

// Analyze image using Gemini Vision — now gated by moderation first
async function analyzeIssueImage(imageUrl) {
  // Fetch image as base64 once, reuse for both moderation and analysis
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = response.headers.get('content-type') || 'image/jpeg';

  // Step 1: Moderation check
  try {
    const moderation = await moderateImage(base64, mimeType);
    if (!moderation.approved) {
      throw new ContentRejectedError(moderation.reason || 'Image does not depict a valid civic issue.');
    }
  } catch (err) {
    if (err.name === 'ContentRejectedError') throw err;
    // If the moderation call itself was blocked by Gemini's safety filters (harmful content),
    // the SDK throws — treat that as an automatic rejection, not a silent pass-through.
    console.error('Moderation check blocked or failed:', err.message);
    throw new ContentRejectedError('Image could not be verified as safe and appropriate content. Upload rejected.');
  }

  // Step 2: Main analysis (only runs if moderation passed)
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', safetySettings: SAFETY_SETTINGS });

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

module.exports = { analyzeIssueImage, generateInsights, verifyIssueValidity, ContentRejectedError };