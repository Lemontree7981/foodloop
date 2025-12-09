const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

// Get Overall Analytics
router.get('/', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        COUNT(DISTINCT donor_id) as active_donors,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as meals_saved
      FROM food_listings
    `);

    const claimsCount = await pool.query('SELECT COUNT(*) as total_claims FROM claims');

    const analytics = await pool.query(`
      SELECT SUM(co2_reduced) as total_co2_reduced
      FROM analytics
    `);

    res.json({
      totalMealsSaved: parseInt(stats.rows[0].meals_saved) || 0,
      totalCompleted: parseInt(stats.rows[0].total_completed) || 0,
      activePartners: parseInt(stats.rows[0].active_donors) || 0,
      completedDeliveries: parseInt(claimsCount.rows[0].total_claims) || 0,
      co2Reduced: parseFloat(analytics.rows[0].total_co2_reduced) || 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Error fetching analytics' });
  }
});

// Get Daily Analytics
router.get('/daily', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM analytics
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({ dailyAnalytics: result.rows });
  } catch (error) {
    console.error('Daily analytics error:', error);
    res.status(500).json({ error: 'Error fetching daily analytics' });
  }
});

module.exports = router;

