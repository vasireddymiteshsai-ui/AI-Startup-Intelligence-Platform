const admin = require('firebase-admin');
const path = require('path');

let db;

/**
 * Initialize Firebase Admin SDK.
 * Uses service account JSON file specified by FIREBASE_SERVICE_ACCOUNT_PATH.
 */
function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    return db;
  }

  try {
    let serviceAccount;

    // Option 1: Inline JSON credentials (for production / Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    // Option 2: File path (for local development)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    }
    else {
      throw new Error('No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase connected successfully');
    return db;
  } catch (err) {
    console.error('❌ Firebase initialization failed:', err.message);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Firebase not initialized. Call initFirebase() first.');
  }
  return db;
}

module.exports = { initFirebase, getDb };
