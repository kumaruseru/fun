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
    
    this.config = {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      disableLosslessIntegers: true,
      encrypted: this.uri.startsWith('neo4j+s://') ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF'
    };
  }

  /**
   * Create Neo4j driver
   * @returns {neo4j.Driver}
   */
  createDriver() {
    try {
      const auth = neo4j.auth.basic(this.username, this.password);
      const driver = neo4j.driver(this.uri, auth, this.config);
      
      console.log('✅ Neo4j driver created successfully');
      return driver;
    } catch (error) {
      console.error('❌ Neo4j driver creation failed:', error.message);
      throw error;
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
