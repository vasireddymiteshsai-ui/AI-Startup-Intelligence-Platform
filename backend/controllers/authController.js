const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../services/firebaseService');

/**
 * POST /api/auth/signup
 * Register a new user with email & password.
 */
async function signup(req, res) {
  try {
    const { email, password, name, role } = req.body;
    const db = getDb();

    // Check for existing user
    const existing = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    const userDoc = {
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      role: role || 'Founder',
      passwordHash,
      createdAt: new Date().toISOString(),
      ideasCount: 0,
    };

    const docRef = await db.collection('users').add(userDoc);

    // Issue JWT
    const token = jwt.sign(
      { email: userDoc.email, uid: docRef.id, name: userDoc.name, role: userDoc.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { email: userDoc.email, name: userDoc.name, role: userDoc.role, uid: docRef.id },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error during signup. Please try again.' });
  }
}

/**
 * POST /api/auth/login
 * Authenticate with email & password.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const db = getDb();

    const snapshot = await db
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { email: userData.email, uid: userDoc.id, name: userData.name, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { email: userData.email, name: userData.name, role: userData.role, uid: userDoc.id },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
}

/**
 * GET /api/auth/me
 * Get the current user's profile from token.
 */
async function getMe(req, res) {
  try {
    const db = getDb();
    const snapshot = await db
      .collection('users')
      .where('email', '==', req.user.email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = snapshot.docs[0].data();
    const { passwordHash, ...safeUser } = userData;

    return res.json({ user: { ...safeUser, uid: snapshot.docs[0].id } });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { signup, login, getMe };
