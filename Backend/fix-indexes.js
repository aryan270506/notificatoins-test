const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/catalystDB';

async function dropOldIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('admins');
    
    // Get all indexes on admins collection
    const indexList = await collection.listIndexes().toArray();
    console.log('\n📋 Current indexes on admins collection:');
    indexList.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop the problematic adminId_1 index if it exists
    const hasAdminIdIndex = indexList.some(idx => idx.name === 'adminId_1');
    if (hasAdminIdIndex) {
      await collection.dropIndex('adminId_1');
      console.log('\n🗑️  Dropped old adminId_1 index');
    } else {
      console.log('\n✓ No adminId_1 index found');
    }

    // Also drop any other potentially problematic indexes
    const indexesToDrop = ['adminId', 'id_1_role_1'];
    for (const indexName of indexesToDrop) {
      const hasIndex = indexList.some(idx => idx.name === indexName);
      if (hasIndex) {
        try {
          await collection.dropIndex(indexName);
          console.log(`🗑️  Dropped ${indexName} index`);
        } catch (e) {
          console.log(`⚠️  Could not drop ${indexName}: ${e.message}`);
        }
      }
    }

    console.log('\n✅ Index cleanup complete');
    console.log('\n📋 Updated indexes on admins collection:');
    const newIndexList = await collection.listIndexes().toArray();
    newIndexList.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropOldIndexes();
