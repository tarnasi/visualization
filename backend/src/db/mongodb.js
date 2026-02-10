const { MongoClient } = require('mongodb');

// Singleton MongoDB instance
let client = null;
let db = null;

/**
 * Connect to MongoDB
 * @returns {Promise<object>} MongoDB database instance
 */
const connectMongo = async () => {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/drilling_data';
    
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    
    // Extract database name from URI or use default
    const dbName = uri.split('/').pop().split('?')[0] || 'drilling_data';
    db = client.db(dbName);

    console.log('✓ MongoDB connected successfully');
    console.log(`  Database: ${dbName}`);

    // Test the connection
    await db.admin().ping();
    console.log('✓ MongoDB ping successful');

    return db;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    throw error;
  }
};

/**
 * Get MongoDB database instance
 * @returns {object} MongoDB database instance
 */
const getDb = () => {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongo() first.');
  }
  return db;
};

/**
 * Get MongoDB client instance
 * @returns {object} MongoDB client instance
 */
const getClient = () => {
  if (!client) {
    throw new Error('MongoDB client not initialized. Call connectMongo() first.');
  }
  return client;
};

/**
 * Test MongoDB connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    if (!db) {
      await connectMongo();
    }
    await db.admin().ping();
    const serverStatus = await db.admin().serverStatus();
    console.log(`  MongoDB version: ${serverStatus.version}`);
    console.log(`  Uptime: ${Math.floor(serverStatus.uptime / 60)} minutes`);
    return true;
  } catch (error) {
    console.error('✗ MongoDB connection test failed:', error.message);
    return false;
  }
};

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
const closeMongo = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
    client = null;
    db = null;
  }
};

/**
 * Create collections and indexes
 * @returns {Promise<void>}
 */
const initializeCollections = async () => {
  try {
    const database = getDb();
    
    // Create collections if they don't exist
    const collections = await database.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Drilling logs collection
    if (!collectionNames.includes('drilling_logs')) {
      await database.createCollection('drilling_logs');
      console.log('✓ Created collection: drilling_logs');
    }

    // Create indexes
    await database.collection('drilling_logs').createIndex({ timestamp: -1 });
    await database.collection('drilling_logs').createIndex({ depth: 1 });
    await database.collection('drilling_logs').createIndex({ well_id: 1, timestamp: -1 });
    
    console.log('✓ MongoDB indexes created');
  } catch (error) {
    console.error('Error initializing MongoDB collections:', error);
  }
};

module.exports = {
  connectMongo,
  getDb,
  getClient,
  testConnection,
  closeMongo,
  initializeCollections
};
