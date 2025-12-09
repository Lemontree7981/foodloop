-- Create Users Table
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

-- Create Food Listings Table
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

-- Create Claims Table
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

-- Create Notifications Table
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

-- Create Analytics Table
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

-- Create Indexes for Performance
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

-- Create Function to Update Timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Triggers for Updated At
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON food_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

