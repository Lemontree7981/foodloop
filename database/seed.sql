-- Insert Sample Users
INSERT INTO users (name, email, phone, password_hash, role, organization, latitude, longitude, address, verified) VALUES
('Taj Restaurant', 'taj@restaurant.com', '+919876543210', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'donor', 'Taj Restaurant', 12.9716, 77.5946, 'MG Road, Bangalore', TRUE),
('Feeding India NGO', 'contact@feedingindia.org', '+919876543211', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'receiver', 'Feeding India', 12.9352, 77.6245, 'Indiranagar, Bangalore', TRUE),
('John Volunteer', 'john@volunteer.com', '+919876543212', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'volunteer', NULL, 12.9698, 77.5987, 'Koramangala, Bangalore', TRUE),
('Mehta Residence', 'mehta@home.com', '+919876543213', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'donor', NULL, 12.9352, 77.6245, 'Indiranagar, Bangalore', TRUE);

-- Insert Sample Food Listings
INSERT INTO food_listings (donor_id, food_type, quantity, description, latitude, longitude, address, contact, expiry_time, status, food_category) VALUES
(1, 'Mixed Vegetarian Meals', '50 servings', 'Surplus from lunch buffet - biryani, dal, vegetables', 12.9716, 77.5946, 'MG Road, Bangalore', '+919876543210', NOW() + INTERVAL '2 hours', 'available', 'vegetarian'),
(4, 'Home-cooked Food', '10 servings', 'Party leftovers - paneer dishes, rotis, rice', 12.9352, 77.6245, 'Indiranagar, Bangalore', '+919876543213', NOW() + INTERVAL '4 hours', 'available', 'vegetarian');

-- Insert Sample Analytics
INSERT INTO analytics (date, total_listings, total_claims, total_completed, meals_saved, co2_reduced) VALUES
(CURRENT_DATE, 25, 20, 18, 450, 187.5),
(CURRENT_DATE - INTERVAL '1 day', 30, 28, 26, 650, 270.8);
*/

// ============================================
// FILE: routes/auth.js
// ============================================
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

// Register User
router.post('/register', async (req, res) => {
  const { name, email, phone, password, role, organization, latitude, longitude, address } = req.body;

  try {
    // Check if user exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, organization, latitude, longitude, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, phone, role, organization, created_at`,
      [name, email, phone, passwordHash, role, organization, latitude, longitude, address]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password hash from response
    delete user.password_hash;

    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get Current User
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, name, email, phone, role, organization, latitude, longitude, address, verified, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
