/**
 * Enhanced Secure Database Layer v2.0
 * Học hỏi từ MTProto patterns và cải tiến architecture
 * 
 * Key Improvements:
 * 1. Connection pooling với automatic failover
 * 2. Circuit breaker pattern cho error resilience
 * 3. Retry logic với exponential backoff
 * 4. Comprehensive health monitoring
 * 5. Clean separation of concerns
 * 6. Event-driven architecture
 */

const { CosmicProtoV2, CosmicLogger } = require('../security/cosmicproto/CosmicProtoV2');
const { EventEmitter } = require('events');
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config();

// =============================================================================
// DATABASE CONNECTION MANAGER (Inspired by MTProto networker patterns)
// =============================================================================
class DatabaseConnectionManager extends EventEmitter {
    constructor(config) {
        super();
        this.logger = new CosmicLogger('DB-CONN');
        this.config = config;
        this.pools = new Map();
        this.connectionStatus = new Map();
        this.circuitBreakers = new Map();
        this.healthCheckInterval = null;
        
        this.initializeConnectionPools();
        this.startHealthMonitoring();
    }

    async initializeConnectionPools() {
        this.logger.info('Initializing database connection pools...');
        
        for (const [dbName, dbConfig] of Object.entries(this.config.databases)) {
            try {
                await this.createConnectionPool(dbName, dbConfig);
                this.logger.info(`Connection pool created for ${dbName}`);
            } catch (error) {
                this.logger.error(`Failed to create pool for ${dbName}:`, error.message);
            }
        }
    }

    async createConnectionPool(dbName, config) {
        // Circuit breaker configuration
        this.circuitBreakers.set(dbName, {
            failures: 0,
            maxFailures: 5,
            timeout: 60000,
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            nextAttempt: 0
        });

        const poolConfig = {
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            ssl: config.ssl || { rejectUnauthorized: false },
            connectionLimit: config.connectionLimit || 10,
            queueLimit: config.queueLimit || 0,
            waitForConnections: true,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            multipleStatements: false
        };

        const pool = mysql.createPool(poolConfig);
        
        // Setup pool event handlers
        pool.on('connection', (connection) => {
            this.logger.debug(`New connection established as id ${connection.threadId} for ${dbName}`);
        });

        pool.on('error', (error) => {
            this.logger.error(`Database pool error for ${dbName}:`, error.message);
            this.handleConnectionError(dbName, error);
        });

        this.pools.set(dbName, pool);
        this.connectionStatus.set(dbName, 'healthy');
        
        // Test initial connection
        await this.testConnection(dbName);
    }

    async testConnection(dbName) {
        const pool = this.pools.get(dbName);
        if (!pool) {
            throw new Error(`Pool not found for database: ${dbName}`);
        }

        try {
            const connection = await pool.getConnection();
            await connection.execute('SELECT 1 as test');
            connection.release();
            
            this.connectionStatus.set(dbName, 'healthy');
            this.resetCircuitBreaker(dbName);
            this.logger.debug(`Connection test successful for ${dbName}`);
        } catch (error) {
            this.connectionStatus.set(dbName, 'unhealthy');
            this.handleConnectionError(dbName, error);
            throw error;
        }
    }

    async getConnection(dbName) {
        const breaker = this.circuitBreakers.get(dbName);
        
        // Check circuit breaker state
        if (breaker.state === 'OPEN') {
            if (Date.now() < breaker.nextAttempt) {
                throw new Error(`Circuit breaker OPEN for ${dbName}. Next attempt at ${new Date(breaker.nextAttempt)}`);
            } else {
                breaker.state = 'HALF_OPEN';
                this.logger.info(`Circuit breaker HALF_OPEN for ${dbName}, attempting connection`);
            }
        }

        const pool = this.pools.get(dbName);
        if (!pool) {
            throw new Error(`Pool not found for database: ${dbName}`);
        }

        try {
            const connection = await pool.getConnection();
            
            // If half-open, reset circuit breaker on successful connection
            if (breaker.state === 'HALF_OPEN') {
                this.resetCircuitBreaker(dbName);
            }
            
            return connection;
        } catch (error) {
            this.handleConnectionError(dbName, error);
            throw error;
        }
    }

    handleConnectionError(dbName, error) {
        const breaker = this.circuitBreakers.get(dbName);
        if (!breaker) return;

        breaker.failures++;
        this.logger.error(`Connection error for ${dbName} (${breaker.failures}/${breaker.maxFailures}):`, error.message);

        if (breaker.failures >= breaker.maxFailures) {
            breaker.state = 'OPEN';
            breaker.nextAttempt = Date.now() + breaker.timeout;
            this.logger.warn(`Circuit breaker OPEN for ${dbName} until ${new Date(breaker.nextAttempt)}`);
            this.emit('circuitBreakerOpen', { dbName, error });
        }

        this.connectionStatus.set(dbName, 'unhealthy');
        this.emit('connectionError', { dbName, error });
    }

    resetCircuitBreaker(dbName) {
        const breaker = this.circuitBreakers.get(dbName);
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'CLOSED';
            breaker.nextAttempt = 0;
            this.logger.debug(`Circuit breaker reset for ${dbName}`);
        }
    }

    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 30000); // Check every 30 seconds

        this.logger.info('Database health monitoring started');
    }

    async performHealthCheck() {
        for (const [dbName] of this.pools) {
            try {
                await this.testConnection(dbName);
            } catch (error) {
                this.logger.warn(`Health check failed for ${dbName}:`, error.message);
            }
        }
    }

    async destroy() {
        this.logger.info('Destroying database connection manager...');
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        for (const [dbName, pool] of this.pools) {
            try {
                await pool.end();
                this.logger.info(`Connection pool closed for ${dbName}`);
            } catch (error) {
                this.logger.error(`Error closing pool for ${dbName}:`, error.message);
            }
        }

        this.pools.clear();
        this.connectionStatus.clear();
        this.circuitBreakers.clear();
        this.logger.info('Database connection manager destroyed');
    }
}

// =============================================================================
// ENHANCED SECURE DATABASE LAYER V2
// =============================================================================
class SecureDatabaseLayerV2 extends EventEmitter {
    constructor(config = {}) {
        super();
        this.logger = new CosmicLogger('DB-LAYER');
        this.config = {
            databases: {
                mysql: {
                    host: process.env.MYSQL_HOST,
                    port: parseInt(process.env.MYSQL_PORT),
                    user: process.env.MYSQL_USER,
                    password: process.env.MYSQL_PASSWORD,
                    database: process.env.MYSQL_DATABASE,
                    ssl: { rejectUnauthorized: false },
                    connectionLimit: 10
                },
                // Add other databases here
            },
            retryAttempts: 3,
            retryDelay: 1000,
            queryTimeout: 30000,
            ...config
        };

        this.cosmicProto = new CosmicProtoV2({
            protectionLevel: 'maximum',
            retryAttempts: this.config.retryAttempts,
            timeout: this.config.queryTimeout
        });

        this.connectionManager = new DatabaseConnectionManager(this.config);
        this.queryCache = new Map();
        this.isInitialized = false;

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.connectionManager.on('connectionError', ({ dbName, error }) => {
            this.logger.error(`Database connection error [${dbName}]:`, error.message);
            this.emit('databaseError', { dbName, error });
        });

        this.connectionManager.on('circuitBreakerOpen', ({ dbName, error }) => {
            this.logger.warn(`Circuit breaker opened for ${dbName}:`, error.message);
            this.emit('circuitBreakerOpen', { dbName, error });
        });
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        this.logger.info('Initializing Enhanced Secure Database Layer v2.0...');
        
        try {
            // Initialize CosmicProto
            await this.cosmicProto.apiManager.initialize();
            
            // Wait for connection manager to be ready
            await new Promise((resolve) => {
                setTimeout(resolve, 1000); // Give pools time to initialize
            });

            this.isInitialized = true;
            this.logger.info('Secure Database Layer v2.0 initialized successfully');
            this.emit('initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Secure Database Layer:', error.message);
            throw error;
        }
    }

    // =============================================================================
    // ENHANCED QUERY METHODS WITH RETRY LOGIC
    // =============================================================================
    async executeQuery(dbName, query, params = [], options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const queryId = this.generateQueryId();
        const startTime = Date.now();

        this.logger.debug(`Executing query [${queryId}] on ${dbName}:`, { 
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            paramsCount: params.length 
        });

        let lastError;
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const result = await this.executeQueryWithConnection(dbName, query, params, options);
                
                const duration = Date.now() - startTime;
                this.logger.debug(`Query completed [${queryId}] in ${duration}ms (attempt ${attempt})`);
                
                return result;
            } catch (error) {
                lastError = error;
                this.logger.warn(`Query failed [${queryId}] attempt ${attempt}/${this.config.retryAttempts}:`, error.message);
                
                if (attempt < this.config.retryAttempts && this.isRetryableError(error)) {
                    const delay = this.calculateRetryDelay(attempt);
                    this.logger.debug(`Retrying query [${queryId}] in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    break;
                }
            }
        }

        const duration = Date.now() - startTime;
        this.logger.error(`Query failed permanently [${queryId}] after ${duration}ms:`, lastError.message);
        throw lastError;
    }

    async executeQueryWithConnection(dbName, query, params, options) {
        let connection;
        
        try {
            connection = await this.connectionManager.getConnection(dbName);
            
            // Skip timeout setting for cloud databases as they may not support it
            // if (options.timeout || this.config.queryTimeout) {
            //     await connection.execute('SET SESSION max_execution_time = ?', [
            //         Math.floor((options.timeout || this.config.queryTimeout) / 1000)
            //     ]);
            // }

            const [rows, fields] = await connection.execute(query, params);
            
            return {
                rows: rows || [],
                fields: fields || [],
                affectedRows: rows.affectedRows || 0,
                insertId: rows.insertId || null,
                queryId: this.generateQueryId()
            };
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // =============================================================================
    // ENHANCED USER OPERATIONS WITH FIELD-LEVEL ENCRYPTION
    // =============================================================================
    async createUser(userData) {
        this.logger.info('Creating user with enhanced security...');
        
        try {
            // Validate input
            this.validateUserData(userData);
            
            // No need to generate userId - using auto-increment
            
            // Encrypt sensitive fields
            const encryptedData = await this.encryptUserFields(userData);
            
            // Hash password
            const salt = require('crypto').randomBytes(16).toString('hex');
            const hashedPassword = await this.cosmicProto.apiManager.crypto.hashPassword(userData.password, salt);
            
            // Prepare insert query  
            const query = `
                INSERT INTO users (
                    email, first_name, last_name, password_hash, session_id,
                    auth_key, encryption_key, phone, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const params = [
                userData.email,
                userData.firstName,
                userData.lastName,
                hashedPassword,
                null, // session_id
                JSON.stringify(encryptedData), // auth_key for encrypted fields
                salt, // encryption_key
                userData.phone || null
            ];
            
            const result = await this.executeQuery('mysql', query, params);
            
            this.logger.info(`User created successfully with ID: ${result.insertId}`);
            
            // Return sanitized user data
            return {
                id: result.insertId,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                created_at: new Date()
            };
            
        } catch (error) {
            this.logger.error('User creation failed:', error.message);
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    async findUserByEmail(email) {
        this.logger.debug(`Finding user by email: ${email}`);
        
        try {
            const query = `
                SELECT id, first_name, last_name, email, password_hash, 
                       auth_key, encryption_key, phone, created_at
                FROM users 
                WHERE email = ? 
                LIMIT 1
            `;
            
            const result = await this.executeQuery('mysql', query, [email]);
            
            if (result.rows.length === 0) {
                this.logger.debug(`User not found with email: ${email}`);
                return null;
            }
            
            const user = result.rows[0];
            
            // Map database fields to consistent names
            user.firstName = user.first_name;
            user.lastName = user.last_name; 
            user.password = user.password_hash;
            user.salt = user.encryption_key;
            
            // Decrypt sensitive fields if present
            if (user.auth_key) {
                try {
                    const decryptedFields = await this.decryptUserFields(JSON.parse(user.auth_key));
                    user.decrypted_fields = decryptedFields;
                } catch (decryptError) {
                    this.logger.warn('Failed to decrypt user fields:', decryptError.message);
                }
            }
            
            this.logger.debug(`User found with ID: ${user.id}`);
            return user;
            
        } catch (error) {
            this.logger.error('Find user by email failed:', error.message);
            throw error;
        }
    }

    async authenticateUser(email, password) {
        this.logger.info('Authenticating user...');
        
        try {
            const user = await this.findUserByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Verify password
            const hashedInput = await this.cosmicProto.apiManager.crypto.hashPassword(password, user.salt);
            
            if (hashedInput !== user.password) {
                this.logger.warn(`Authentication failed for email: ${email}`);
                throw new Error('Invalid credentials');
            }
            
            // Skip last login update since column doesn't exist
            // await this.updateUserLastLogin(user.id);
            
            this.logger.info(`User authenticated successfully: ${user.id}`);
            
            // Return sanitized user data
            const { password: _, salt: __, ...sanitizedUser } = user;
            return sanitizedUser;
            
        } catch (error) {
            this.logger.error('User authentication failed:', error.message);
            throw error;
        }
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    validateUserData(userData) {
        const required = ['firstName', 'lastName', 'email', 'password'];
        for (const field of required) {
            if (!userData[field] || typeof userData[field] !== 'string') {
                throw new Error(`Invalid or missing field: ${field}`);
            }
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            throw new Error('Invalid email format');
        }
        
        // Password validation
        if (userData.password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
    }

    async generateSecureUserId() {
        // Generate unique user ID with enhanced security
        const timestamp = Date.now();
        const random = require('crypto').randomBytes(8).toString('hex');
        return parseInt(`${timestamp}${random}`, 16) % 2147483647; // Keep within MySQL INT range
    }

    async encryptUserFields(userData) {
        const sensitiveFields = ['phone', 'address', 'birthDate', 'socialSecurityNumber'];
        const encryptedFields = {};
        
        for (const field of sensitiveFields) {
            if (userData[field]) {
                encryptedFields[field] = await this.cosmicProto.apiManager.crypto.invoke('field-encrypt', userData[field], field);
            }
        }
        
        return encryptedFields;
    }

    async decryptUserFields(encryptedFields) {
        const decryptedFields = {};
        
        for (const [field, encryptedData] of Object.entries(encryptedFields)) {
            try {
                decryptedFields[field] = await this.cosmicProto.apiManager.crypto.invoke('field-decrypt', encryptedData, field);
            } catch (error) {
                this.logger.warn(`Failed to decrypt field ${field}:`, error.message);
            }
        }
        
        return decryptedFields;
    }

    async updateUserLastLogin(userId) {
        const query = 'UPDATE users SET last_login = NOW() WHERE id = ?';
        await this.executeQuery('mysql', query, [userId]);
    }

    generateQueryId() {
        return `q_${Date.now()}_${require('crypto').randomBytes(4).toString('hex')}`;
    }

    isRetryableError(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ENOTFOUND',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ER_LOCK_WAIT_TIMEOUT',
            'ER_LOCK_DEADLOCK'
        ];
        
        return retryableErrors.some(code => error.code === code || error.message.includes(code));
    }

    calculateRetryDelay(attempt) {
        return Math.min(this.config.retryDelay * Math.pow(2, attempt - 1), 10000);
    }

    // =============================================================================
    // HEALTH CHECK AND MONITORING
    // =============================================================================
    async healthCheck() {
        this.logger.debug('Performing database layer health check...');
        
        try {
            // Check CosmicProto health with timeout protection
            let cosmicProtoHealth;
            try {
                const healthPromise = this.cosmicProto.healthCheck();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Health check timeout')), 5000)
                );
                cosmicProtoHealth = await Promise.race([healthPromise, timeoutPromise]);
            } catch (error) {
                this.logger.warn('CosmicProto health check failed:', error.message);
                cosmicProtoHealth = {
                    status: 'unhealthy',
                    error: error.message,
                    version: '2.0.0'
                };
            }
            
            const checks = {
                cosmicProto: cosmicProtoHealth,
                databases: {},
                totalConnections: 0,
                circuitBreakers: {}
            };
            
            // Check each database connection
            for (const [dbName] of this.connectionManager.pools) {
                try {
                    await this.connectionManager.testConnection(dbName);
                    checks.databases[dbName] = 'healthy';
                } catch (error) {
                    checks.databases[dbName] = 'unhealthy';
                }
                
                // Get circuit breaker status
                const breaker = this.connectionManager.circuitBreakers.get(dbName);
                checks.circuitBreakers[dbName] = breaker ? breaker.state : 'unknown';
            }
            
            const overallStatus = Object.values(checks.databases).every(status => status === 'healthy') ? 'healthy' : 'degraded';
            
            return {
                status: overallStatus,
                timestamp: new Date(),
                version: '2.0.0',
                ...checks
            };
            
        } catch (error) {
            this.logger.error('Health check failed:', error.message);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    async destroy() {
        this.logger.info('Destroying Secure Database Layer v2.0...');
        
        try {
            await this.connectionManager.destroy();
            await this.cosmicProto.destroy();
            
            this.queryCache.clear();
            this.isInitialized = false;
            
            this.logger.info('Secure Database Layer v2.0 destroyed successfully');
        } catch (error) {
            this.logger.error('Error during destruction:', error.message);
        }
    }
}

module.exports = {
    SecureDatabaseLayerV2,
    DatabaseConnectionManager
};
