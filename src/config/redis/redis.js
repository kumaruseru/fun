const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Redis Configuration
 */
class RedisConfig {
  constructor() {
    this.config = {
      url: process.env.REDIS_URI,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      },
      database: 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true
    };
  }

  /**
   * Create Redis client
   * @returns {Promise<redis.RedisClientType>}
   */
  async createClient() {
    try {
      const client = redis.createClient(this.config);
      
      client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      client.on('connect', () => {
        console.log('🔗 Redis connecting...');
      });

      client.on('ready', () => {
        console.log('✅ Redis connected successfully');
      });

      await client.connect();
      return client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Test Redis connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const client = await this.createClient();
      await client.ping();
      await client.quit();
      return true;
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }
}

module.exports = RedisConfig;
