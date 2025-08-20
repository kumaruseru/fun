const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Neo4j Graph Database Configuration
 */
class Neo4jConfig {
  constructor() {
    this.uri = process.env.NEO4J_URI;
    this.username = process.env.NEO4J_USERNAME;
    this.password = process.env.NEO4J_PASSWORD;
    this.database = process.env.NEO4J_DATABASE || 'neo4j';
    
    // Determine encryption from URI and create appropriate config
    const isEncryptedUri = this.uri && (this.uri.startsWith('neo4j+s://') || this.uri.startsWith('bolt+s://'));
    
    this.config = {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      disableLosslessIntegers: true
    };
    
    // Only add encryption config if not specified in URI
    if (!isEncryptedUri && this.uri && !this.uri.includes('+s://')) {
      this.config.encrypted = 'ENCRYPTION_OFF';
    }
  }

  /**
   * Create Neo4j driver
   * @returns {neo4j.Driver}
   */
  createDriver() {
    try {
      // Skip Neo4j if URI is not configured
      if (!this.uri || !this.username || !this.password) {
        console.log('⚠️ Neo4j not configured, skipping...');
        return null;
      }

      const auth = neo4j.auth.basic(this.username, this.password);
      
      // Create minimal config to avoid conflicts
      const minimalConfig = {
        maxConnectionLifetime: 3 * 60 * 60 * 1000,
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000,
        disableLosslessIntegers: true
      };
      
      const driver = neo4j.driver(this.uri, auth, minimalConfig);
      
      console.log('✅ Neo4j driver created successfully');
      return driver;
    } catch (error) {
      console.error('❌ Neo4j driver creation failed:', error.message);
      console.log('⚠️ Continuing without Neo4j...');
      return null;
    }
  }

  /**
   * Test Neo4j connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    const driver = this.createDriver();
    const session = driver.session({ database: this.database });
    
    try {
      const result = await session.run('RETURN 1 as test');
      const isConnected = result.records[0].get('test').toNumber() === 1;
      console.log('✅ Neo4j connection test successful');
      return isConnected;
    } catch (error) {
      console.error('❌ Neo4j connection test failed:', error.message);
      return false;
    } finally {
      await session.close();
      await driver.close();
    }
  }

  /**
   * Get database name
   * @returns {string}
   */
  getDatabaseName() {
    return this.database;
  }
}

module.exports = Neo4jConfig;
