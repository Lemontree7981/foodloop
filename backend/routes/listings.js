const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get All Available Listings
router.get('/', async (req, res) => {
  const { latitude, longitude, radius = 10, status = 'available' } = req.query;

  try {
    let query = `
      SELECT 
        l.*,
        u.name as donor_name,
        u.organization as donor_organization,
        u.phone as donor_phone
      FROM food_listings l
      JOIN users u ON l.donor_id = u.id
      WHERE l.status = $1 AND l.expiry_time > NOW()
    `;
    
    const params = [status];

    // Add distance filter if location provided
    if (latitude && longitude) {
      query += ` AND (
        6371 * acos(
          cos(radians($2)) * cos(radians(l.latitude)) *
          cos(radians(l.longitude) - radians($3)) +
          sin(radians($2)) * sin(radians(l.latitude))
        )
      ) <= $4`;
      params.push(latitude, longitude, radius);
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ listings: result.rows });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Error fetching listings' });
  }
});

// Get Single Listing
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        l.*,
        u.name as donor_name,
        u.organization as donor_organization,
        u.email as donor_email,
        u.phone as donor_phone
      FROM food_listings l
      JOIN users u ON l.donor_id = u.id
      WHERE l.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Error fetching listing' });
  }
});

// Create New Listing
router.post('/', authenticateToken, async (req, res) => {
  const { food_type, quantity, description, latitude, longitude, address, contact, expiry_hours, food_category, image_url } = req.body;
  const donor_id = req.user.userId;

  try {
    // Calculate expiry time
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + (expiry_hours || 2));

    const result = await pool.query(
      `INSERT INTO food_listings 
        (donor_id, food_type, quantity, description, latitude, longitude, address, contact, expiry_time, food_category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [donor_id, food_type, quantity, description, latitude, longitude, address, contact, expiryTime, food_category, image_url]
    );

    // Create notifications for nearby receivers
    await createNearbyNotifications(result.rows[0]);

    res.status(201).json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Error creating listing' });
  }
});

// Update Listing
router.put('/:id', authenticateToken, async (req, res) => {
  const { status, food_type, quantity, description } = req.body;
  const listingId = req.params.id;

  try {
    // Verify ownership
    const listing = await pool.query(
      'SELECT donor_id FROM food_listings WHERE id = $1',
      [listingId]
    );

    if (listing.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.rows[0].donor_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update listing
    const result = await pool.query(
      `UPDATE food_listings 
       SET status = COALESCE($1, status),
           food_type = COALESCE($2, food_type),
           quantity = COALESCE($3, quantity),
           description = COALESCE($4, description)
       WHERE id = $5
       RETURNING *`,
      [status, food_type, quantity, description, listingId]
    );

    res.json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'Error updating listing' });
  }
});

// Delete Listing
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM food_listings WHERE id = $1 AND donor_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Error deleting listing' });
  }
});

// Helper function to create notifications
async function createNearbyNotifications(listing) {
  try {
    // Find receivers within 10km
    const receivers = await pool.query(
      `SELECT id FROM users 
       WHERE role IN ('receiver', 'volunteer')
       AND (
         6371 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )
       ) <= 10`,
      [listing.latitude, listing.longitude]
    );

    // Create notifications
    for (const receiver of receivers.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_listing_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          receiver.id,
          'New Food Available!',
          `${listing.food_type} - ${listing.quantity} available near you`,
          'new_listing',
          listing.id
        ]
      );
    }
  } catch (error) {
    console.error('Notification creation error:', error);
  }
}

module.exports = router;

