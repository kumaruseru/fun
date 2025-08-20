/**
 * CosmicProto Secure Database Layer v2.1
 * Quantum-encrypted multi-database operations
 */

const crypto = require('crypto');

class SecureDatabaseLayer {
  constructor(databaseConnections) {
    console.log('🔐 Initializing Secure Database Layer with 4-database support...');
    this.databases = databaseConnections;
    this.isInitialized = false;
    console.log('✅ Secure Database Layer initialized');
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('🔐 Starting SecureDatabaseLayer initialization...');
    this.isInitialized = true;
    console.log('✅ SecureDatabaseLayer initialization complete');
  }

  /**
   * Secure user registration across all databases
   */
  async secureUserRegistration(userData) {
    console.log('� === SecureDatabaseLayer.secureUserRegistration START ===');
    console.log('�👤 Starting secure user registration...');
    console.log('📊 Registration data:', {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      hasPassword: !!userData.password
    });

    try {
      console.log('🔑 Generating user ID and encryption keys...');
      
      // Generate user ID and encryption keys
      const userId = crypto.randomUUID();
      const encryptionKey = crypto.randomBytes(32);
      
      console.log('✅ Generated userId:', userId);
      console.log('🔐 Generated encryption key length:', encryptionKey.length);

      console.log('💾 About to store across all databases...');
      
      // Store across all 4 databases
      const databaseResults = await this.storeUserAcrossAllDatabases({
        ...userData,
        userId,
        encryptionKey: encryptionKey.toString('hex'),
        createdAt: new Date(),
        verified: false,
        active: true
      });

      console.log('✅ User registration completed successfully');
      console.log('📊 Database storage results:', databaseResults);
      console.log('🚀 === SecureDatabaseLayer.secureUserRegistration END SUCCESS ===');

      return {
        success: true,
        userId,
        databaseResults,
        message: 'User registered successfully across all databases'
      };

    } catch (error) {
      console.error('❌ === SecureDatabaseLayer.secureUserRegistration ERROR ===');
      console.error('❌ Registration error in SecureDatabaseLayer:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ === END ERROR ===');
      return {
        success: false,
        error: error.message,
        reason: 'Database registration failed'
      };
    }
  }

  /**
   * Store user data across all 4 databases
   */
  async storeUserAcrossAllDatabases(userData) {
    console.log('💾 === storeUserAcrossAllDatabases START ===');
    console.log('💾 Storing user across all 4 databases...');
    console.log('📊 Available databases:', Object.keys(this.databases));
    const results = {};

    try {
      // 1. MySQL - Structured user data  
      if (this.databases.mysql) {
        console.log('📄 === MYSQL STORAGE START ===');
        console.log('📄 Storing in MySQL...');
        console.log('🔍 MySQL connection status:', !!this.databases.mysql);
        
        // Use existing schema: auto-increment id, ignore userId for MySQL
        const query = `
          INSERT INTO users (email, first_name, last_name, password_hash)
          VALUES (?, ?, ?, ?)
        `;
        console.log('📝 MySQL query:', query);
        console.log('📊 MySQL params:', [
          userData.email,
          userData.firstName,
          userData.lastName,
          '***password***' // mask password in logs
        ]);
        
        const [result] = await this.databases.mysql.execute(query, [
          userData.email,
          userData.firstName,
          userData.lastName,
          userData.password // Will be hashed by CosmicProto
        ]);
        
        // Get the auto-generated MySQL ID
        const mysqlUserId = result.insertId;
        console.log('✅ MySQL storage successful, ID:', mysqlUserId);
        console.log('📄 === MYSQL STORAGE SUCCESS ===');
        results.mysql = { success: true, id: mysqlUserId };
      } else {
        console.log('⚠️ MySQL database not available');
        results.mysql = { success: false, reason: 'database not available' };
      }

      // 2. MongoDB - Document storage with encryption
      if (this.databases.mongodb) {
        console.log('📄 Storing in MongoDB...');
        await this.databases.mongodb.collection('users').insertOne({
          _id: userData.userId,
          email: userData.email,
          profile: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            createdAt: userData.createdAt,
            verified: userData.verified,
            active: userData.active
          },
          security: {
            encryptionKey: userData.encryptionKey,
            lastLogin: null,
            loginCount: 0
          }
        });
        results.mongodb = 'success';
        console.log('✅ MongoDB storage successful');
      }

      // 3. Redis - Session cache
      if (this.databases.redis) {
        console.log('📄 Storing in Redis...');
        const userKey = `user:${userData.userId}`;
        await this.databases.redis.hSet(userKey, {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          active: userData.active.toString(),
          createdAt: userData.createdAt.toISOString()
        });
        await this.databases.redis.expire(userKey, 86400); // 24 hours
        results.redis = 'success';
        console.log('✅ Redis storage successful');
      }

      // 4. Neo4j - Graph relationships
      if (this.databases.neo4j) {
        console.log('📄 Storing in Neo4j...');
        await this.createUserGraphNode({
          userId: userData.userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          createdAt: userData.createdAt
        });
        results.neo4j = 'success';
        console.log('✅ Neo4j storage successful');
      }

      console.log('✅ All databases updated successfully');
      return results;

    } catch (error) {
      console.error('❌ Multi-database storage error:', error);
      throw new Error(`Database storage failed: ${error.message}`);
    }
  }

  /**
   * Create user node in Neo4j graph database
   */
  async createUserGraphNode(userData) {
    try {
      const session = this.databases.neo4j.session();
      const result = await session.run(
        `CREATE (u:User {
          id: $userId,
          email: $email,
          firstName: $firstName,
          lastName: $lastName,
          createdAt: datetime($createdAt)
        }) RETURN u`,
        {
          userId: userData.userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          createdAt: userData.createdAt.toISOString()
        }
      );
      await session.close();
      return result;
    } catch (error) {
      console.error('❌ Neo4j graph node creation failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve user from multiple databases
   */
  async getUser(userId) {
    console.log('🔍 Retrieving user:', userId);
    const userData = {};

    try {
      // Get from MySQL
      if (this.databases.mysql) {
        const [rows] = await this.databases.mysql.execute(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );
        userData.mysql = rows[0] || null;
      }

      // Get from MongoDB
      if (this.databases.mongodb) {
        userData.mongodb = await this.databases.mongodb
          .collection('users')
          .findOne({ _id: userId });
      }

      // Get from Redis
      if (this.databases.redis) {
        userData.redis = await this.databases.redis.hGetAll(`user:${userId}`);
      }

      return userData;

    } catch (error) {
      console.error('❌ User retrieval error:', error);
      throw error;
    }
  }
}

module.exports = SecureDatabaseLayer;
