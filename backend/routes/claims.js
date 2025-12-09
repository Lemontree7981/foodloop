const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Claim a Listing
router.post('/', authenticateToken, async (req, res) => {
  const { listing_id, notes } = req.body;
  const claimer_id = req.user.userId;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if listing is available
    const listing = await client.query(
      'SELECT * FROM food_listings WHERE id = $1 AND status = $2',
      [listing_id, 'available']
    );

    if (listing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Listing not available' });
    }

    // Create claim
    const claim = await client.query(
      `INSERT INTO claims (listing_id, claimer_id, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [listing_id, claimer_id, notes]
    );

    // Update listing status
    await client.query(
      'UPDATE food_listings SET status = $1 WHERE id = $2',
      ['claimed', listing_id]
    );

    // Notify donor
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_listing_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        listing.rows[0].donor_id,
        'Food Claimed!',
        `Your ${listing.rows[0].food_type} has been claimed`,
        'claim',
        listing_id
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ claim: claim.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Error creating claim' });
  } finally {
    client.release();
  }
});

// Get User Claims
router.get('/my-claims', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        l.food_type,
        l.quantity,
        l.description,
        l.address,
        l.contact,
        l.latitude,
        l.longitude,
        u.name as donor_name,
        u.phone as donor_phone
      FROM claims c
      JOIN food_listings l ON c.listing_id = l.id
      JOIN users u ON l.donor_id = u.id
      WHERE c.claimer_id = $1
      ORDER BY c.claimed_at DESC`,
      [req.user.userId]
    );

    res.json({ claims: result.rows });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Error fetching claims' });
  }
});

// Complete a Claim
router.put('/:id/complete', authenticateToken, async (req, res) => {
  const { proof_url, rating, feedback } = req.body;
  const claimId = req.params.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update claim
    const claim = await client.query(
      `UPDATE claims 
       SET status = 'completed', 
           completed_at = NOW(),
           proof_url = $1,
           rating = $2,
           feedback = $3
       WHERE id = $4 AND claimer_id = $5
       RETURNING *`,
      [proof_url, rating, feedback, claimId, req.user.userId]
    );

    if (claim.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Update listing status
    await client.query(
      'UPDATE food_listings SET status = $1 WHERE id = $2',
      ['completed', claim.rows[0].listing_id]
    );

    // Update analytics
    await client.query(
      `INSERT INTO analytics (date, total_completed, meals_saved, co2_reduced)
       VALUES (CURRENT_DATE, 1, 1, 0.42)
       ON CONFLICT (date) DO UPDATE SET
         total_completed = analytics.total_completed + 1,
         meals_saved = analytics.meals_saved + 1,
         co2_reduced = analytics.co2_reduced + 0.42`
    );

    await client.query('COMMIT');
    res.json({ claim: claim.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete claim error:', error);
    res.status(500).json({ error: 'Error completing claim' });
  } finally {
    client.release();
  }
});

module.exports = router;

