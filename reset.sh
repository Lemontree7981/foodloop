#!/bin/bash
# Complete reset script for FoodLoop
# Run with: npm run reset

echo "🔄 Starting complete FoodLoop reset..."
echo ""

echo "Step 1/3: Deleting Firebase users..."
node backend/delete-firebase-users.js

echo ""
echo "Step 2/3: Resetting PostgreSQL database..."
node database/setup.js

echo ""
echo "Step 3/3: Creating test users in Firebase..."
node backend/create-test-users.js

echo ""
echo "✅ Complete reset finished!"
echo "You can now use the test accounts or register new ones."
