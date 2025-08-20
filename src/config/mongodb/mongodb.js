const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

/**
 * MongoDB Database Configuration
 */
class MongoDBConfig {
  constructor() {
    this.uri = process.env.MONGODB_URI;
    this.options = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 50,
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT, 10) || 10000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority'
    };
  }

  /**
   * Create MongoDB connection
   * @returns {Promise<MongoClient>}
   */
  async connect() {
    try {
      const client = new MongoClient(this.uri, this.options);
      await client.connect();
      
      // Test connection
      await client.db().admin().ping();
      console.log('✅ MongoDB connected successfully');
      
      return client;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database name from URI
   * @returns {string}
   */
  getDatabaseName() {
    const url = new URL(this.uri);
    return url.pathname.slice(1).split('?')[0] || 'cown2';
  }
}

module.exports = MongoDBConfig;
