const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  console.log('🚀 Starting FoodLoop Database Setup...\n');

  try {
    // Drop existing tables (be careful with this in production!)
    console.log('📋 Dropping existing tables...');
    await pool.query(`
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS analytics CASCADE;
      DROP TABLE IF EXISTS claims CASCADE;
      DROP TABLE IF EXISTS food_listings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Existing tables dropped\n');

    // Create Users Table
    console.log('📋 Creating users table...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'receiver', 'volunteer')),
        organization VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        address TEXT,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created\n');

    // Create Food Listings Table
    console.log('📋 Creating food_listings table...');
    await pool.query(`
      CREATE TABLE food_listings (
        id SERIAL PRIMARY KEY,
        donor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        food_type VARCHAR(255) NOT NULL,
        quantity VARCHAR(100) NOT NULL,
        description TEXT,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address TEXT NOT NULL,
        contact VARCHAR(20) NOT NULL,
        expiry_time TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'completed', 'expired', 'cancelled')),
        image_url TEXT,
        food_category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Food listings table created\n');

    // Create Claims Table
    console.log('📋 Creating claims table...');
    await pool.query(`
      CREATE TABLE claims (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES food_listings(id) ON DELETE CASCADE,
        claimer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'cancelled')),
        proof_url TEXT,
        notes TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback TEXT
      );
    `);
    console.log('✅ Claims table created\n');

    // Create Notifications Table
    console.log('📋 Creating notifications table...');
    await pool.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        related_listing_id INTEGER REFERENCES food_listings(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Notifications table created\n');

    // Create Analytics Table
    console.log('📋 Creating analytics table...');
    await pool.query(`
      CREATE TABLE analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        total_listings INTEGER DEFAULT 0,
        total_claims INTEGER DEFAULT 0,
        total_completed INTEGER DEFAULT 0,
        meals_saved INTEGER DEFAULT 0,
        co2_reduced DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Analytics table created\n');

    // Create Indexes
    console.log('📋 Creating indexes...');
    await pool.query(`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_phone ON users(phone);
      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_listings_donor ON food_listings(donor_id);
      CREATE INDEX idx_listings_status ON food_listings(status);
      CREATE INDEX idx_listings_expiry ON food_listings(expiry_time);
      CREATE INDEX idx_listings_location ON food_listings(latitude, longitude);
      CREATE INDEX idx_claims_listing ON claims(listing_id);
      CREATE INDEX idx_claims_claimer ON claims(claimer_id);
      CREATE INDEX idx_claims_status ON claims(status);
      CREATE INDEX idx_notifications_user ON notifications(user_id);
      CREATE INDEX idx_notifications_read ON notifications(read);
    `);
    console.log('✅ Indexes created\n');

    // Create Triggers
    console.log('📋 Creating triggers...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON food_listings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Triggers created\n');

    // Insert Sample Data
    console.log('📋 Inserting sample data...');
    
    // Hash password for sample users
    const passwordHash = await bcrypt.hash('password123', 10);

    // Insert users
    const users = await pool.query(`
      INSERT INTO users (name, email, phone, password_hash, role, organization, latitude, longitude, address, verified) VALUES
      ('Taj Restaurant', 'taj@restaurant.com', '+919876543210', $1, 'donor', 'Taj Restaurant', 12.9716, 77.5946, 'MG Road, Bangalore', TRUE),
      ('Feeding India NGO', 'contact@feedingindia.org', '+919876543211', $1, 'receiver', 'Feeding India', 12.9352, 77.6245, 'Indiranagar, Bangalore', TRUE),
      ('John Volunteer', 'john@volunteer.com', '+919876543212', $1, 'volunteer', NULL, 12.9698, 77.5987, 'Koramangala, Bangalore', TRUE),
      ('Mehta Residence', 'mehta@home.com', '+919876543213', $1, 'donor', NULL, 12.9352, 77.6245, 'Indiranagar, Bangalore', TRUE),
      ('Akshaya Patra Foundation', 'info@akshayapatra.org', '+919876543214', $1, 'receiver', 'Akshaya Patra', 12.9141, 77.6411, 'HSR Layout, Bangalore', TRUE)
      RETURNING id
    `, [passwordHash]);

    console.log('✅ Sample users created');
    console.log(`   - Email: taj@restaurant.com | Password: password123 | Role: donor`);
    console.log(`   - Email: contact@feedingindia.org | Password: password123 | Role: receiver`);
    console.log(`   - Email: john@volunteer.com | Password: password123 | Role: volunteer\n`);

    // Insert food listings
    await pool.query(`
      INSERT INTO food_listings (donor_id, food_type, quantity, description, latitude, longitude, address, contact, expiry_time, status, food_category) VALUES
      (1, 'Mixed Vegetarian Meals', '50 servings', 'Surplus from lunch buffet - biryani, dal, vegetables', 12.9716, 77.5946, 'MG Road, Bangalore', '+919876543210', NOW() + INTERVAL '2 hours', 'available', 'vegetarian'),
      (1, 'Paneer Dishes', '30 servings', 'Fresh paneer butter masala and paneer tikka', 12.9716, 77.5946, 'MG Road, Bangalore', '+919876543210', NOW() + INTERVAL '3 hours', 'available', 'vegetarian'),
      (4, 'Home-cooked Food', '10 servings', 'Party leftovers - paneer dishes, rotis, rice', 12.9352, 77.6245, 'Indiranagar, Bangalore', '+919876543213', NOW() + INTERVAL '4 hours', 'available', 'vegetarian'),
      (4, 'Mixed Snacks', '20 servings', 'Samosas, pakoras, and sweets', 12.9352, 77.6245, 'Indiranagar, Bangalore', '+919876543213', NOW() + INTERVAL '5 hours', 'available', 'vegetarian')
    `);
    console.log('✅ Sample food listings created\n');

    // Insert analytics
    await pool.query(`
      INSERT INTO analytics (date, total_listings, total_claims, total_completed, meals_saved, co2_reduced) VALUES
      (CURRENT_DATE, 25, 20, 18, 450, 187.5),
      (CURRENT_DATE - INTERVAL '1 day', 30, 28, 26, 650, 270.8),
      (CURRENT_DATE - INTERVAL '2 days', 22, 20, 19, 475, 198.3)
    `);
    console.log('✅ Sample analytics created\n');

    console.log('🎉 Database setup completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Update your .env file with database credentials');
    console.log('   2. Run: npm run dev');
    console.log('   3. Test API endpoints at http://localhost:5000\n');
    console.log('🔐 Test credentials:');
    console.log('   Donor: taj@restaurant.com / password123');
    console.log('   Receiver: contact@feedingindia.org / password123');
    console.log('   Volunteer: john@volunteer.com / password123\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup
setupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
