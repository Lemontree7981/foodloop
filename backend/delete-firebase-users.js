// Script to delete all Firebase Authentication users
// Run with: node backend/delete-firebase-users.js

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function deleteAllFirebaseUsers() {
    console.log('🔥 Starting Firebase user deletion...\n');

    try {
        // List all users
        const listUsersResult = await admin.auth().listUsers();
        const users = listUsersResult.users;

        if (users.length === 0) {
            console.log('✅ No users found in Firebase Authentication');
            return;
        }

        console.log(`Found ${users.length} users in Firebase Authentication:\n`);

        // Display users
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email || user.phoneNumber || user.uid}`);
        });

        console.log('\n⚠️  Deleting all users in 3 seconds...');
        console.log('Press Ctrl+C to cancel\n');

        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Delete all users
        const deletePromises = users.map(user =>
            admin.auth().deleteUser(user.uid)
                .then(() => console.log(`✅ Deleted: ${user.email || user.phoneNumber || user.uid}`))
                .catch(err => console.error(`❌ Failed to delete ${user.email}: ${err.message}`))
        );

        await Promise.all(deletePromises);

        console.log('\n🎉 All Firebase users deleted successfully!');
        console.log('You can now register with any email address.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

// Run the script
deleteAllFirebaseUsers();
