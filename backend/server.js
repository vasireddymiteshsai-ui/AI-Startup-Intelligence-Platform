require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initFirebase } = require('./services/firebaseService');

// Initialize Firebase before anything else
initFirebase();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,      // allow inline styles & Google Fonts
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://127.0.0.1:5501',
      'http://localhost:5501',
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI analysis routes have higher cost, limit more strictly
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'AI analysis rate limit reached. Please wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const ideasRoutes = require('./routes/ideas');
const analysisRoutes = require('./routes/analysis');
const collaborationRoutes = require('./routes/collaboration');
const trendsRoutes = require('./routes/trends');
const commentsRoutes = require('./routes/comments');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/analysis', aiLimiter, analysisRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/comments', commentsRoutes);

// ─── Serve Frontend Static Files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── SPA Fallback: non-API routes serve index ──────────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

// ─── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AI Startup Intelligence API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
