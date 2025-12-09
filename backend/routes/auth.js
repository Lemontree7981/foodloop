const express = require('express');
const { pool } = require('../config/database');
const admin = require('firebase-admin'); // Uses the instance from middleware
const router = express.Router();

// Validation helper functions
const validateName = (name) => {
  if (!name || typeof name !== 'string') return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 255) return 'Name must be less than 255 characters';
  return null;
};

const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return 'Phone number is required';
  // Remove spaces, dashes, and parentheses for validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  // Check for valid phone format: optional + followed by 10-15 digits
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return 'Please enter a valid phone number (10-15 digits)';
  }
  return null;
};

const validateRole = (role) => {
  const validRoles = ['donor', 'receiver', 'volunteer'];
  if (!role || !validRoles.includes(role)) {
    return 'Role must be one of: donor, receiver, or volunteer';
  }
  return null;
};

// SYNC/REGISTER ROUTE
// Frontend calls this after Firebase Email/Password Authentication
router.post('/sync', async (req, res) => {
  const { token, name, phone, role, address, latitude, longitude, organization } = req.body;

  try {
    // Verify the token to get the email securely
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({ error: 'No email found in authentication token' });
    }

    // Check if user exists by email
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (checkUser.rows.length > 0) {
      // User exists, just return info
      return res.json({ user: checkUser.rows[0] });
    }

    // New user - validate required fields for registration
    const errors = {};

    const nameError = validateName(name);
    if (nameError) errors.name = nameError;

    const phoneError = validatePhone(phone);
    if (phoneError) errors.phone = phoneError;

    const roleError = validateRole(role);
    if (roleError) errors.role = roleError;

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors: errors
      });
    }

    // Create new user in PostgreSQL
    // Using 'firebase_managed' as placeholder for password_hash since Firebase handles authentication
    const newUser = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, organization, address, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        name.trim(),
        email,
        phone.trim(),
        'firebase_managed',
        role,
        organization || null,
        address || '',
        latitude || 12.9716,
        longitude || 77.5946
      ]
    );

    res.json({ user: newUser.rows[0] });

  } catch (error) {
    console.error('Sync error:', error);

    // Handle duplicate phone number error
    if (error.code === '23505' && error.constraint === 'users_phone_key') {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors: { phone: 'This phone number is already registered' }
      });
    }

    // Handle duplicate email error
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors: { email: 'This email is already registered' }
      });
    }

    res.status(500).json({ error: 'Error syncing user' });
  }
});

module.exports = router;
