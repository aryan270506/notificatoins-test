/**
 * UniVerse – AI Doubt Resolver · Backend Routes
 * ─────────────────────────────────────────────────────────────
 * Mount in your main server.js / app.js:
 *   const doubtRoutes = require('./routes/doubtRoutes');
 *   app.use('/api/doubts', doubtRoutes);
 *
 * Add to your .env file — pick ONE provider:
 *   For Groq (free, fast):  GROQ_API_KEY=gsk_...
 *   For Grok/xAI:           GROK_API_KEY=xai-...
 * ─────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const axios    = require('axios');

// ── Auto-detect which provider key is available ────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY; // Use environment variable for Groq API key
const GROK_API_KEY = process.env.GROK_API_KEY;  // xai-... → xAI Grok

const PROVIDER = GROQ_API_KEY ? 'groq' : GROK_API_KEY ? 'grok' : null;
const API_KEY  = GROQ_API_KEY || GROK_API_KEY;

const API_URL = PROVIDER === 'groq'
  ? 'https://api.groq.com/openai/v1/chat/completions'   // Groq endpoint
  : 'https://api.x.ai/v1/chat/completions';             // xAI Grok endpoint

const MODEL = PROVIDER === 'groq'
  ? 'llama-3.3-70b-versatile'   // fast free Groq model
  : 'grok-beta';                // xAI model

if (!PROVIDER) {
  console.error('❌  No AI key found. Add GROQ_API_KEY or GROK_API_KEY to your .env');
} else {
  console.log(`✅  AI Doubt Resolver using provider: ${PROVIDER.toUpperCase()} (${MODEL})`);
}

// ── Mongoose Schema ────────────────────────────────────────────
const doubtSchema = new mongoose.Schema(
  {
    userId:   { type: String, default: 'anonymous' },
    question: { type: String, default: '' },
    hasImage: { type: Boolean, default: false },
    answer:   { type: String, required: true },
    title:    { type: String, default: '' },
    tags:     [String],
  },
  { timestamps: true }
);

const Doubt = mongoose.models.AiDoubt || mongoose.model('AiDoubt', doubtSchema, 'ai_doubts');

// ── Helper: parse AI response ──────────────────────────────────
function parseResponse(raw) {
  const lines = raw.split('\n').filter(l => l.trim());
  const title = (lines[0] || '').replace(/^#+\s*/, '').substring(0, 80) || 'Solution';

  const tagLine = raw.match(/key concepts?[:\-\s]+([^\n]+)/i);
  const tags = tagLine
    ? tagLine[1].split(/[,;]/).map(t => t.trim()).filter(Boolean).slice(0, 5)
    : [];

  return { title, tags };
}

// ── POST /api/doubts/solve ─────────────────────────────────────
router.post('/solve', async (req, res) => {
  const { question, imageBase64, imageMime, userId: bodyUserId } = req.body;
  // Prefer JWT user, fall back to userId sent in body, then anonymous
  const userId = req.user?._id || req.user?.id || bodyUserId || 'anonymous';

  if (!question && !imageBase64) {
    return res.status(400).json({ error: 'Provide a question or an image.' });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: 'No AI API key configured on the server. Add GROQ_API_KEY or GROK_API_KEY to .env' });
  }

  // Build message content array
  const userContent = [];

  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${imageMime || 'image/jpeg'};base64,${imageBase64}` },
    });
  }

  // ✅ Fixed: no more ${subject} reference
  userContent.push({
    type: 'text',
    text: question || 'Please explain or solve the content shown in the image.',
  });

  try {
    console.log(`🤖 Calling ${PROVIDER.toUpperCase()} API...`);

    const aiResponse = await axios.post(
      API_URL,
      {
        model:      MODEL,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are an expert tutor for students. Give clear, concise, step-by-step answers.
Format your response EXACTLY as:
Line 1: Short solution title (no markdown symbols)
Line 2-3: One or two intro sentences
Numbered steps: Step 1: Title
  Sub-lines with explanation
Final line: Key Concepts: concept1, concept2, concept3`,
          },
          { role: 'user', content: userContent },
        ],
      },
      {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        timeout: 30000,
      }
    );

    const rawAnswer = aiResponse.data?.choices?.[0]?.message?.content || '';
    if (!rawAnswer) {
      return res.status(502).json({ error: 'AI returned an empty response' });
    }

    console.log(`✅ ${PROVIDER.toUpperCase()} responded successfully`);

    const { title, tags } = parseResponse(rawAnswer);

    const saved = await Doubt.create({
      userId,
      question: question || '',
      hasImage: !!imageBase64,
      answer:   rawAnswer,
      title,
      tags,
    });

    console.log('💾 Saved to ai_doubts, id:', saved._id);

    return res.json({ answer: rawAnswer, title, tags, doubtId: saved._id });

  } catch (err) {
    console.error(`❌ ${PROVIDER?.toUpperCase() || 'AI'} error:`);
    console.error('   Status :', err?.response?.status);
    console.error('   Body   :', JSON.stringify(err?.response?.data));
    console.error('   Message:', err.message);

    return res.status(502).json({
      error:
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err.message ||
        'AI API call failed',
    });
  }
});

// ── GET /api/doubts/recent?limit=6 ────────────────────────────
router.get('/recent', async (req, res) => {
  const userId = req.user?._id || req.user?.id || req.query.userId || 'anonymous';
  console.log('🔍 Querying recents for userId:', userId);      // ADD THIS
  console.log('🔍 req.user:', req.user);                       // ADD THIS
  const limit = parseInt(req.query.limit) || 6;

  try {
    const recent = await Doubt.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('question title tags createdAt hasImage');

    return res.json({ doubts: recent });
  } catch (err) {
    console.error('❌ Recent doubts error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;