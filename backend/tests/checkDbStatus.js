const mongoose = require('mongoose');
require('dotenv').config();

const checkStatus = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`\n✅ Connected to Database: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);
        console.log(`Port: ${mongoose.connection.port}`);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`\n📂 Collections (${collections.length}):`);

        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`   - ${col.name}: ${count} documents`);
        }

        // Specific Data Preview (Optional)
        if (collections.some(c => c.name === 'users')) {
            const userCount = await mongoose.connection.db.collection('users').countDocuments();
            if (userCount > 0) {
                const user = await mongoose.connection.db.collection('users').findOne({});
                console.log(`\n👤 Example User: ${user.name} (${user.email})`);
            }
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkStatus();
