const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * MySQL Database Configuration
 * Supports multiple environments (development, staging, production)
 */
class MySQLConfig {
  constructor() {
    this.config = {
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT, 10),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      charset: process.env.MYSQL_CHARSET || 'utf8mb4',
      timezone: '+00:00',
      
      // Connection Pool Settings
      connectionLimit: parseInt(process.env.MYSQL_MAX_CONNECTIONS, 10) || 20,
      acquireTimeout: parseInt(process.env.MYSQL_TIMEOUT, 10) || 10000,
      timeout: parseInt(process.env.MYSQL_TIMEOUT, 10) || 10000,
      reconnect: true,
      
      // SSL Configuration
      ssl: process.env.MYSQL_SSL_MODE === 'REQUIRED' ? {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      } : false,
      
      // Additional Options
      multipleStatements: false,
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: true,
      
      // Debug mode for development
      debug: process.env.NODE_ENV === 'development' ? ['ComQueryPacket'] : false
    };
  }

  /**
   * Create MySQL connection pool
   * @returns {Promise<mysql.Pool>}
   */
  async createPool() {
    try {
      const pool = mysql.createPool(this.config);
      
      // Test connection
      const connection = await pool.getConnection();
      console.log('✅ MySQL connected successfully');
      connection.release();
      
      return pool;
    } catch (error) {
      console.error('❌ MySQL connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database configuration
   * @returns {Object}
   */
  getConfig() {
    return this.config;
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const pool = await this.createPool();
      const [rows] = await pool.execute('SELECT 1 as test');
      await pool.end();
      return rows[0].test === 1;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }
}

module.exports = MySQLConfig;
