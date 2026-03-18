// Script to reset users collection and seed default admin
const { connectDB, closeDB } = require('./database');

async function resetUsers() {
    try {
        console.log('🔄 Resetting users collection...\n');

        const db = await connectDB();

        // Drop users collection
        try {
            await db.collection('users').drop();
            console.log('✓ Dropped existing users collection');
        } catch (err) {
            console.log('ℹ No existing users collection to drop');
        }

        // Create users collection with index
        await db.createCollection('users');
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        console.log('✓ Created users collection with unique index');

        // Insert default admin
        await db.collection('users').insertOne({
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            fullName: 'System Administrator',
            createdAt: new Date()
        });
        console.log('✓ Default admin user created (admin/admin123)');

        // Verify
        const users = await db.collection('users').find({}).toArray();
        console.log(`\n✅ Total users: ${users.length}`);
        users.forEach(user => {
            console.log(`   - ${user.username} (${user.role})`);
        });

        await closeDB();
        console.log('\n✅ Users reset complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetUsers();
