const MySQLConfig = require('./database/mysql');
const MongoDBConfig = require('./mongodb/mongodb');
const RedisConfig = require('./redis/redis');
const Neo4jConfig = require('./neo4j/neo4j');

/**
 * Main Database Configuration Manager
 * Manages all database connections for the application
 */
class DatabaseManager {
  constructor() {
    this.mysql = new MySQLConfig();
    this.mongodb = new MongoDBConfig();
    this.redis = new RedisConfig();
    this.neo4j = new Neo4jConfig();
    
    this.connections = {
      mysql: null,
      mongodb: null,
      redis: null,
      neo4j: null
    };
  }

  /**
   * Initialize all database connections
   * @returns {Promise<Object>}
   */
  async initializeAll() {
    try {
      console.log('🚀 Initializing database connections...');
      
      // Initialize MySQL
      this.connections.mysql = await this.mysql.createPool();
      
      // Initialize MongoDB
      this.connections.mongodb = await this.mongodb.connect();
      
      // Initialize Redis
      this.connections.redis = await this.redis.createClient();
      
      // Initialize Neo4j
      this.connections.neo4j = this.neo4j.createDriver();
      
      console.log('✅ All database connections initialized successfully');
      return this.connections;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Test all database connections
   * @returns {Promise<Object>}
   */
  async testAllConnections() {
    const results = {
      mysql: false,
      mongodb: false,
      redis: false,
      neo4j: false
    };

    try {
      console.log('🔍 Testing database connections...');
      
      // Test MySQL
      results.mysql = await this.mysql.testConnection();
      
      // Test Redis
      results.redis = await this.redis.testConnection();
      
      // Test Neo4j
      results.neo4j = await this.neo4j.testConnection();
      
      // MongoDB test (if connected)
      if (this.connections.mongodb) {
        try {
          await this.connections.mongodb.db().admin().ping();
          results.mongodb = true;
        } catch (error) {
          results.mongodb = false;
        }
      }
      
      console.log('📊 Connection test results:', results);
      return results;
    } catch (error) {
      console.error('❌ Connection testing failed:', error.message);
      return results;
    }
  }

  /**
   * Close all database connections
   * @returns {Promise<void>}
   */
  async closeAll() {
    try {
      console.log('🔒 Closing database connections...');
      
      // Close MySQL
      if (this.connections.mysql) {
        await this.connections.mysql.end();
        console.log('✅ MySQL connection closed');
      }
      
      // Close MongoDB
      if (this.connections.mongodb) {
        await this.connections.mongodb.close();
        console.log('✅ MongoDB connection closed');
      }
      
      // Close Redis
      if (this.connections.redis) {
        await this.connections.redis.quit();
        console.log('✅ Redis connection closed');
      }
      
      // Close Neo4j
      if (this.connections.neo4j) {
        await this.connections.neo4j.close();
        console.log('✅ Neo4j connection closed');
      }
      
      console.log('✅ All database connections closed successfully');
    } catch (error) {
      console.error('❌ Error closing database connections:', error.message);
      throw error;
    }
  }

  /**
   * Get specific database connection
   * @param {string} type - Database type (mysql, mongodb, redis, neo4j)
   * @returns {Object|null}
   */
  getConnection(type) {
    return this.connections[type] || null;
  }

  /**
   * Get all database connections
   * @returns {Object}
   */
  getAllConnections() {
    return this.connections;
  }
}

module.exports = DatabaseManager;
