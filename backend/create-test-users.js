// Script to create test users in both Firebase and PostgreSQL
// Run with: node backend/create-test-users.js

const admin = require('firebase-admin');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Initialize PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const testUsers = [
    {
        name: 'Taj Restaurant',
        email: 'taj@restaurant.com',
        phone: '+919876543210',
        password: 'password123',
        role: 'donor',
        organization: 'Taj Restaurant',
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'MG Road, Bangalore'
    },
    {
        name: 'Feeding India NGO',
        email: 'contact@feedingindia.org',
        phone: '+919876543211',
        password: 'password123',
        role: 'receiver',
        organization: 'Feeding India',
        latitude: 12.9352,
        longitude: 77.6245,
        address: 'Indiranagar, Bangalore'
    },
    {
        name: 'John Volunteer',
        email: 'john@volunteer.com',
        phone: '+919876543212',
        password: 'password123',
        role: 'volunteer',
        organization: null,
        latitude: 12.9698,
        longitude: 77.5987,
        address: 'Koramangala, Bangalore'
    }
];

async function createTestUsers() {
    console.log('🚀 Creating test users in Firebase and PostgreSQL...\n');

    for (const user of testUsers) {
        try {
            console.log(`Creating: ${user.email}...`);

            // 1. Create user in Firebase Authentication
            let firebaseUser;
            try {
                firebaseUser = await admin.auth().createUser({
                    email: user.email,
                    password: user.password,
                    displayName: user.name,
                    phoneNumber: user.phone
                });
                console.log(`  ✅ Created in Firebase`);
            } catch (firebaseError) {
                if (firebaseError.code === 'auth/email-already-exists') {
                    console.log(`  ⚠️  Already exists in Firebase, skipping...`);
                    // Get existing user
                    firebaseUser = await admin.auth().getUserByEmail(user.email);
                } else {
                    throw firebaseError;
                }
            }

            // 2. Check if user exists in PostgreSQL
            const checkUser = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [user.email]
            );

            if (checkUser.rows.length > 0) {
                console.log(`  ⚠️  Already exists in PostgreSQL, skipping...`);
            } else {
                // 3. Create user in PostgreSQL
                await pool.query(
                    `INSERT INTO users (name, email, phone, password_hash, role, organization, latitude, longitude, address, verified) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        user.name,
                        user.email,
                        user.phone,
                        'firebase_managed', // Password is managed by Firebase
                        user.role,
                        user.organization,
                        user.latitude,
                        user.longitude,
                        user.address,
                        true
                    ]
                );
                console.log(`  ✅ Created in PostgreSQL`);
            }

            console.log(`  📧 Email: ${user.email}`);
            console.log(`  🔑 Password: ${user.password}`);
            console.log(`  👤 Role: ${user.role}\n`);

        } catch (error) {
            console.error(`  ❌ Error creating ${user.email}:`, error.message);
        }
    }

    console.log('🎉 Test users setup complete!\n');
    console.log('You can now log in with:');
    console.log('  • taj@restaurant.com / password123 (Donor)');
    console.log('  • contact@feedingindia.org / password123 (Receiver)');
    console.log('  • john@volunteer.com / password123 (Volunteer)\n');

    await pool.end();
    process.exit(0);
}

createTestUsers().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
