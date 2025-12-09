// backend/middleware/auth.js

const admin = require('firebase-admin');
const { pool } = require('../config/database');
const path = require('path'); 

// 1. Load the Service Account Key file reliably
// The path goes from middleware/ up one level (..) to the backend root directory.
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json')); 

// 2. Initialize Firebase Admin SDK if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Middleware to authenticate a user based on their Firebase ID Token.
 * It verifies the token, extracts user details, and maps them to a PostgreSQL user ID.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects 'Bearer <token>'

  if (!token) {
    // 401: Unauthorized - No token provided
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // A. Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email; // Use email as the identifier

    // B. Find the user in YOUR PostgreSQL database
    const userResult = await pool.query(
      'SELECT id, role, name, phone FROM users WHERE email = $1', 
      [email]
    );

    if (userResult.rows.length === 0) {
      // 403: Forbidden - Token is valid, but the user hasn't been synced to the database.
      // This is a common point of error if the registration/sync route failed.
      return res.status(403).json({ error: 'User is authenticated but not registered in database' });
    }

    // C. Attach the essential Postgres ID and Role to the request
    req.user = { 
      // This userId (Postgres ID) is what your claims.js and listings.js routes expect.
      userId: userResult.rows[0].id, 
      role: userResult.rows[0].role,
      name: userResult.rows[0].name
    };
    
    // Proceed to the requested route handler (e.g., POST /api/listings)
    next();
  } catch (error) {
    console.error("Firebase Token Verification Failed:", error.message);
    // 403: Forbidden - Token is invalid, expired, or corrupted
    return res.status(403).json({ error: 'Invalid or expired authentication token' });
  }
}

module.exports = { authenticateToken };
