// Quick script to check users in database
const { connectDB, closeDB } = require('./database');

async function checkUsers() {
    try {
        console.log('🔍 Checking users in database...\n');

        const db = await connectDB();
        const users = await db.collection('users').find({}).toArray();

        console.log(`Found ${users.length} user(s):\n`);

        users.forEach((user, index) => {
            console.log(`${index + 1}. Username: "${user.username}"`);
            console.log(`   Password: "${user.password}"`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Full Name: ${user.fullName || 'N/A'}`);
            console.log(`   Created: ${user.createdAt}`);
            console.log(`   ID: ${user._id}`);
            console.log('');
        });

        // Test authentication
        console.log('🧪 Testing authentication for admin...');
        const testUser = await db.collection('users').findOne({
            username: 'admin',
            password: 'admin123'
        });
        console.log('Result:', testUser ? '✓ SUCCESS' : '✗ FAILED');
        if (testUser) {
            console.log('Matched user:', testUser.username, testUser.role);
        }

        await closeDB();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkUsers();
