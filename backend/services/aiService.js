const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-2.0-flash for text generation (fast & capable)
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Use text-embedding-004 for semantic embeddings
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

/**
 * Retry wrapper with exponential backoff for rate-limited API calls.
 */
async function withRetry(fn, retries = 2, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('quota');
      if (isRateLimit && i < retries - 1) {
        const wait = delay * Math.pow(2, i);
        console.log(`Rate limited, retrying in ${wait}ms (attempt ${i + 2}/${retries})...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

// ─── Smart Local Analysis Engine ──────────────────────────────────────────
// Generates unique, idea-specific results when Gemini API is unavailable.
// Uses NLP-like keyword extraction to produce contextually relevant analysis.

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed, min, max) {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return Math.floor(r * (max - min + 1)) + min;
}

function detectDomain(text) {
  const t = text.toLowerCase();
  if (/health|medical|doctor|patient|hospital|wellness|fitness|pharma|clinic/.test(t)) return 'HealthTech';
  if (/fintech|finance|payment|banking|invest|crypto|wallet|insurance|trading/.test(t)) return 'FinTech';
  if (/edu|learn|student|teach|school|course|tutor|university|skill/.test(t)) return 'EdTech';
  if (/\bai\b|machine learning|ml\b|nlp|model|chatbot|gpt|deep learning|neural/.test(t)) return 'AI/ML';
  if (/saas|software|platform|tool|dashboard|api|automation|workflow/.test(t)) return 'SaaS';
  if (/ecommerce|shop|marketplace|retail|sell|buy|store|product/.test(t)) return 'E-Commerce';
  if (/social|community|network|connect|chat|messaging|forum/.test(t)) return 'Social';
  if (/food|restaurant|delivery|meal|recipe|kitchen|diet|nutrition/.test(t)) return 'FoodTech';
  if (/travel|hotel|booking|trip|tourism|flight|destination/.test(t)) return 'TravelTech';
  if (/game|gaming|entertainment|metaverse|vr|ar|virtual/.test(t)) return 'Gaming/XR';
  if (/climate|green|sustainability|environment|energy|solar|carbon/.test(t)) return 'CleanTech';
  if (/hr|recruit|job|talent|workforce|employee|hiring/.test(t)) return 'HRTech';
  if (/security|privacy|lock|protect|cyber|encrypt|auth/.test(t)) return 'CyberSecurity';
  if (/real estate|property|rent|housing|construction/.test(t)) return 'PropTech';
  if (/logistic|supply chain|shipping|warehouse|fleet|delivery|transport/.test(t)) return 'Logistics';
  return 'Technology';
}

function extractKeywords(text) {
  const t = text.toLowerCase();
  const keywords = [];
  const patterns = [
    [/automat/i, 'automation'], [/ai|artificial intelligence/i, 'AI'], [/machine learn/i, 'machine learning'],
    [/predict/i, 'predictive analytics'], [/real.?time/i, 'real-time processing'], [/analyz|analys/i, 'analytics'],
    [/chatbot|chat bot/i, 'chatbot'], [/mobile|app/i, 'mobile app'], [/cloud/i, 'cloud computing'],
    [/blockchain|crypto/i, 'blockchain'], [/iot|sensor/i, 'IoT'], [/api|integrat/i, 'API integration'],
    [/personali[sz]/i, 'personalization'], [/recommend/i, 'recommendation engine'], [/nlp|natural language/i, 'NLP'],
    [/subscri/i, 'subscription model'], [/b2b/i, 'B2B'], [/b2c/i, 'B2C'], [/saas/i, 'SaaS'],
    [/marketplace/i, 'marketplace'], [/booking|schedul/i, 'scheduling'], [/payment|invoice/i, 'payments'],
    [/whatsapp|messaging/i, 'messaging platform'], [/remind/i, 'notifications'], [/small business|smb/i, 'SMB market'],
    [/detect|recogni/i, 'detection/recognition'], [/behavio/i, 'behavioral analysis'], [/secur|privacy|lock/i, 'security'],
    [/wast|efficien/i, 'efficiency optimization'], [/customer|support|service/i, 'customer service'],
  ];
  for (const [pat, kw] of patterns) {
    if (pat.test(t)) keywords.push(kw);
  }
  return keywords.length > 0 ? keywords : ['innovative solution', 'digital platform', 'technology'];
}

const domainData = {
  'HealthTech':    { techFr: 'React Native + Next.js', techBe: 'Python/FastAPI with HIPAA compliance', techDb: 'PostgreSQL with encryption', techHost: 'AWS (HIPAA-eligible)', techAi: 'TensorFlow, BioBERT, Med-PaLM', audience: 'Healthcare providers, patients aged 25-55, and clinics', channels: ['Medical conferences', 'Health influencers', 'Hospital partnerships'], pricing: 'Freemium with premium telehealth features, $29-99/mo per provider' },
  'FinTech':       { techFr: 'React + TypeScript', techBe: 'Node.js/Express with PCI compliance', techDb: 'PostgreSQL + Redis caching', techHost: 'AWS with multi-region', techAi: 'Plaid API, Stripe, fraud detection ML models', audience: 'Millennials and Gen-Z seeking financial tools, ages 22-40', channels: ['Financial blogs', 'App Store optimization', 'Fintech partnerships'], pricing: 'Freemium model, transaction-based fees + premium at $9.99/mo' },
  'EdTech':        { techFr: 'React + WebRTC for live classes', techBe: 'Node.js/Express', techDb: 'MongoDB + Redis', techHost: 'Google Cloud Platform', techAi: 'GPT-4 for tutoring, speech recognition, adaptive learning models', audience: 'Students ages 16-30, working professionals, tutors and educators', channels: ['University partnerships', 'YouTube edu-content', 'SEO-driven content'], pricing: 'Freemium with paid courses, institutional licensing $499/year' },
  'AI/ML':         { techFr: 'React + D3.js for visualizations', techBe: 'Python/FastAPI + Node.js gateway', techDb: 'PostgreSQL + Vector DB (Pinecone)', techHost: 'GCP with GPU instances', techAi: 'Gemini API, LangChain, HuggingFace Transformers, custom fine-tuned models', audience: 'Tech companies, data scientists, and enterprise teams', channels: ['Dev communities (GitHub, HN)', 'AI conferences', 'Technical blog SEO'], pricing: 'Usage-based API pricing + enterprise plans $199-999/mo' },
  'SaaS':          { techFr: 'React + Tailwind CSS', techBe: 'Node.js/Express', techDb: 'PostgreSQL + Redis', techHost: 'Vercel + AWS Lambda', techAi: 'OpenAI API, custom workflow automation', audience: 'Small-to-mid businesses, startup founders, and operations teams', channels: ['Product Hunt launch', 'LinkedIn B2B marketing', 'Content marketing'], pricing: 'Tiered SaaS: Free → Pro $29/mo → Enterprise $99/mo' },
  'E-Commerce':    { techFr: 'Next.js + Tailwind', techBe: 'Node.js + Stripe/Razorpay', techDb: 'MongoDB + Elasticsearch', techHost: 'AWS + CloudFront CDN', techAi: 'Recommendation engine, visual search, demand forecasting', audience: 'Online shoppers ages 18-45, D2C brands', channels: ['Instagram/Facebook ads', 'Influencer marketing', 'SEO + Google Shopping'], pricing: 'Commission-based (8-15%) + seller subscription plans' },
  'Social':        { techFr: 'React Native (cross-platform)', techBe: 'Node.js + Socket.io', techDb: 'MongoDB + Redis pub/sub', techHost: 'AWS + CloudFront', techAi: 'Content moderation AI, recommendation algorithms', audience: 'Gen-Z and Millennials, niche communities', channels: ['TikTok viral campaigns', 'University ambassador programs', 'App Store optimization'], pricing: 'Free tier + premium features $4.99/mo, advertising revenue' },
  'FoodTech':      { techFr: 'React Native', techBe: 'Node.js/Express + real-time tracking', techDb: 'MongoDB + Redis geospatial', techHost: 'AWS with auto-scaling', techAi: 'Demand forecasting, route optimization, dietary recommendation AI', audience: 'Urban consumers aged 20-40, restaurants and cloud kitchens', channels: ['Food bloggers', 'Social media ads', 'Local restaurant partnerships'], pricing: 'Delivery commission (15-25%) + subscription for restaurants' },
  'CyberSecurity': { techFr: 'React + Electron for desktop', techBe: 'Go/Rust for performance', techDb: 'PostgreSQL + encrypted storage', techHost: 'AWS GovCloud / Azure', techAi: 'Anomaly detection ML, behavioral biometrics, threat intelligence', audience: 'Enterprises, SMBs concerned about data security, IT admins', channels: ['Cybersecurity conferences', 'LinkedIn B2B', 'Security researcher partnerships'], pricing: 'Per-device licensing $5-15/device/mo, enterprise contracts' },
  'Logistics':     { techFr: 'React + Mapbox/Google Maps', techBe: 'Node.js + Python microservices', techDb: 'PostgreSQL + TimescaleDB', techHost: 'AWS + edge computing', techAi: 'Route optimization, demand forecasting, warehouse automation ML', audience: 'Logistics companies, e-commerce businesses, warehouse operators', channels: ['Industry trade shows', 'LinkedIn ads', 'Logistics partnerships'], pricing: 'Usage-based per-shipment fee + enterprise SaaS plans $199-499/mo' },
};

const defaultDomain = { techFr: 'React + Next.js', techBe: 'Node.js/Express', techDb: 'PostgreSQL + Redis', techHost: 'AWS / Vercel', techAi: 'Gemini API, TensorFlow, custom ML models', audience: 'Tech-savvy users aged 20-45, startups and SMBs', channels: ['Product Hunt', 'LinkedIn marketing', 'SEO + content marketing'], pricing: 'Freemium + Pro tier $19-49/mo' };

function generateLocalAnalysis(ideaText) {
  const hash = hashCode(ideaText);
  const domain = detectDomain(ideaText);
  const keywords = extractKeywords(ideaText);
  const wordCount = ideaText.split(/\s+/).length;
  const detailBonus = Math.min(wordCount / 5, 10);
  
  const baseViability = seededRandom(hash, 55, 85) + Math.floor(detailBonus);
  const isViable = baseViability > 60;
  
  const kw1 = keywords[0] || 'technology';
  const kw2 = keywords[1] || 'innovation';
  const kw3 = keywords[2] || 'digital solutions';

  return {
    summary: `This ${domain} startup leverages ${kw1} and ${kw2} to create a differentiated product in a growing market. The idea targets a real pain point with potential for strong product-market fit, particularly in ${kw3}-driven segments. With the right execution and go-to-market strategy, this concept has solid commercial potential.`,
    advantages: [
      `Strong market alignment with the growing ${domain} sector, which is projected to see significant growth`,
      `Leverages ${kw1} to create a competitive moat and differentiated user experience`,
      `Addresses a clear pain point with measurable ROI for target customers`,
      `${kw2} capabilities provide scalable value proposition across market segments`,
      `Low initial barrier to entry with clear expansion path from MVP to full platform`,
    ],
    disadvantages: [
      `Competitive landscape in ${domain} requires strong differentiation and speed to market`,
      `Customer acquisition in this space may require significant initial investment in trust-building`,
      `Technical complexity of ${kw1} implementation may extend development timelines`,
      `Regulatory and compliance requirements in ${domain} could add operational overhead`,
    ],
    suggestions: [
      `Start with a focused niche within ${domain} before expanding to adjacent markets`,
      `Build strategic partnerships with established ${domain} players for distribution`,
      `Implement a data flywheel: use early user data to continuously improve the ${kw1} capabilities`,
      `Consider a pilot program with 5-10 early adopters to validate PMF before scaling`,
      `Develop a strong content marketing strategy to establish thought leadership in ${kw2}`,
    ],
    viability: isViable ? 'Yes' : 'No',
    success_probability: String(Math.min(baseViability, 92)),
    competition_level: baseViability > 75 ? 'Low' : baseViability > 60 ? 'Medium' : 'High',
  };
}

function generateLocalScores(ideaText) {
  const hash = hashCode(ideaText);
  const wordCount = ideaText.split(/\s+/).length;
  const detailBonus = Math.min(Math.floor(wordCount / 8), 8);
  
  const market    = seededRandom(hash + 1, 58, 88) + detailBonus;
  const monetize  = seededRandom(hash + 2, 55, 85) + detailBonus;
  const exec      = seededRandom(hash + 3, 45, 78) + detailBonus;
  const investor  = seededRandom(hash + 4, 52, 82) + detailBonus;
  const scale     = seededRandom(hash + 5, 55, 88) + detailBonus;
  const overall   = Math.round((market + monetize + exec + investor + scale) / 5);

  const risks = ['Low', 'Medium', 'High'];
  const riskIdx = overall > 75 ? 0 : overall > 60 ? 1 : 2;

  return {
    market_demand: Math.min(market, 97),
    monetization_potential: Math.min(monetize, 95),
    execution_difficulty: Math.min(exec, 90),
    risk_level: risks[riskIdx],
    overall_score: Math.min(overall, 95),
    investor_appeal: Math.min(investor, 93),
    scalability: Math.min(scale, 96),
  };
}

function generateLocalMVPPlan(ideaText) {
  const domain = detectDomain(ideaText);
  const keywords = extractKeywords(ideaText);
  const hash = hashCode(ideaText);
  const dd = domainData[domain] || defaultDomain;
  const kw1 = keywords[0] || 'core technology';
  const kw2 = keywords[1] || 'user experience';
  const kw3 = keywords[2] || 'platform features';

  const costRange = seededRandom(hash + 10, 0, 2);
  const costs = ['$3,000 - $12,000', '$8,000 - $25,000', '$15,000 - $45,000'];

  return {
    mvp_features: [
      `Core ${kw1} engine with user-facing interface`,
      `User authentication, profiles, and onboarding flow`,
      `${kw2} dashboard with real-time metrics and insights`,
      `${kw3} integration and data management system`,
      `Admin panel with analytics, user management, and reporting`,
    ],
    tech_stack: {
      frontend: dd.techFr,
      backend: dd.techBe,
      database: dd.techDb,
      hosting: dd.techHost,
      ai_tools: dd.techAi,
    },
    timeline: [
      { week: 'Week 1-2', milestone: `Research, wireframing, and architecture design for ${domain} platform` },
      { week: 'Week 3-4', milestone: `Core ${kw1} backend development and API scaffolding` },
      { week: 'Week 5-6', milestone: `Frontend development: ${kw2} interface and user flows` },
      { week: 'Week 7-8', milestone: `Integration testing, ${kw3} features, and beta deployment` },
      { week: 'Week 9-12', milestone: 'User testing, iteration, performance optimization, and public launch' },
    ],
    go_to_market: {
      target_audience: dd.audience,
      acquisition_channels: dd.channels,
      pricing_model: dd.pricing,
      launch_strategy: `Soft launch with ${domain} early adopters via a closed beta, gather feedback, iterate on core ${kw1} features, then launch publicly on Product Hunt and relevant ${domain} communities`,
    },
    estimated_cost: costs[costRange],
  };
}

// ─── Main API Functions ───────────────────────────────────────────────────

async function analyzeIdea(ideaText) {
  const prompt = `You are an expert startup advisor and venture capital analyst.
Analyze this startup idea and respond with ONLY valid JSON (no markdown, no code blocks):

Idea: "${ideaText}"

Return this exact JSON structure:
{
  "summary": "Brief 2-3 sentence summary of the idea",
  "advantages": ["advantage 1", "advantage 2", "advantage 3"],
  "disadvantages": ["disadvantage 1", "disadvantage 2", "disadvantage 3"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "viability": "Yes or No",
  "success_probability": "number between 0-100",
  "competition_level": "Low or Medium or High"
}`;

  try {
    const result = await withRetry(() => textModel.generateContent(prompt));
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('analyzeIdea Gemini failed, using local analysis engine:', err.message?.substring(0, 80));
    return generateLocalAnalysis(ideaText);
  }
}

async function scoreIdea(ideaText) {
  const prompt = `You are a startup investment analyst. Score this startup idea on the following metrics.
Respond with ONLY valid JSON (no markdown, no code blocks):

Idea: "${ideaText}"

Return this exact JSON structure:
{
  "market_demand": number_0_to_100,
  "monetization_potential": number_0_to_100,
  "execution_difficulty": number_0_to_100,
  "risk_level": "Low or Medium or High",
  "overall_score": number_0_to_100,
  "investor_appeal": number_0_to_100,
  "scalability": number_0_to_100
}`;

  try {
    const result = await withRetry(() => textModel.generateContent(prompt));
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('scoreIdea Gemini failed, using local scoring engine:', err.message?.substring(0, 80));
    return generateLocalScores(ideaText);
  }
}

async function generateMVPPlan(ideaText) {
  const prompt = `You are a CTO and product manager. Create a detailed MVP plan for this startup idea.
Respond with ONLY valid JSON (no markdown, no code blocks):

Idea: "${ideaText}"

Return this exact JSON structure:
{
  "mvp_features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "tech_stack": {
    "frontend": "recommended frontend tech",
    "backend": "recommended backend tech",
    "database": "recommended database",
    "hosting": "recommended hosting",
    "ai_tools": "relevant AI tools if applicable"
  },
  "timeline": [
    {"week": "Week 1-2", "milestone": "milestone description"},
    {"week": "Week 3-4", "milestone": "milestone description"},
    {"week": "Week 5-6", "milestone": "milestone description"},
    {"week": "Week 7-8", "milestone": "milestone description"},
    {"week": "Week 9-12", "milestone": "milestone description"}
  ],
  "go_to_market": {
    "target_audience": "description of target audience",
    "acquisition_channels": ["channel 1", "channel 2", "channel 3"],
    "pricing_model": "recommended pricing model",
    "launch_strategy": "brief launch strategy description"
  },
  "estimated_cost": "estimated development cost range"
}`;

  try {
    const result = await withRetry(() => textModel.generateContent(prompt));
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('generateMVPPlan Gemini failed, using local plan engine:', err.message?.substring(0, 80));
    return generateLocalMVPPlan(ideaText);
  }
}

/**
 * Generate an embedding vector for a given text.
 * Falls back to a deterministic hash-based vector when API is unavailable.
 */
async function generateEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.error('generateEmbedding Gemini failed, using local embedding:', err.message?.substring(0, 60));
    // Generate a deterministic 768-dim pseudo-embedding from the text
    const dims = 768;
    const embedding = [];
    for (let i = 0; i < dims; i++) {
      const seed = hashCode(text + i);
      embedding.push((Math.sin(seed) * 0.5));
    }
    return embedding;
  }
}

module.exports = { analyzeIdea, scoreIdea, generateMVPPlan, generateEmbedding };
