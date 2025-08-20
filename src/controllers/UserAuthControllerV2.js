/**
 * Enhanced User Authentication Controller v2.0
 * Học hỏi từ MTProto patterns và architecture cải tiến
 * 
 * Key Improvements:
 * 1. Event-driven architecture
 * 2. Comprehensive error handling với proper HTTP status codes
 * 3. Rate limiting và security measures
 * 4. Detailed audit logging
 * 5. Graceful degradation
 * 6. Clean separation of concerns
 */

const { SecureDatabaseLayerV2 } = require('../core/SecureDatabaseLayerV2');
const { CosmicLogger } = require('../security/cosmicproto/CosmicProtoV2');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// =============================================================================
// SECURITY MIDDLEWARE (Inspired by MTProto security patterns)
// =============================================================================
class SecurityManager {
    constructor(options = {}) {
        this.logger = new CosmicLogger('SECURITY');
        this.rateLimits = new Map(); // IP-based rate limiting
        this.suspiciousActivities = new Map();
        this.config = {
            maxAttempts: options.maxAttempts || 5,
            windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
            blockDuration: options.blockDuration || 30 * 60 * 1000, // 30 minutes
            maxSuspiciousScore: options.maxSuspiciousScore || 100,
            ...options
        };
    }

    async checkRateLimit(clientIp, action = 'general') {
        const key = `${clientIp}:${action}`;
        const now = Date.now();
        
        let record = this.rateLimits.get(key);
        if (!record) {
            record = {
                attempts: 0,
                firstAttempt: now,
                lastAttempt: now,
                blockedUntil: null
            };
        }

        // Check if currently blocked
        if (record.blockedUntil && now < record.blockedUntil) {
            const remainingTime = Math.ceil((record.blockedUntil - now) / 1000);
            this.logger.warn(`Rate limit active for ${clientIp}:${action}. Blocked for ${remainingTime} more seconds`);
            throw new Error(`Rate limit exceeded. Try again in ${remainingTime} seconds`);
        }

        // Reset window if needed
        if (now - record.firstAttempt > this.config.windowMs) {
            record.attempts = 0;
            record.firstAttempt = now;
            record.blockedUntil = null;
        }

        // Increment attempts
        record.attempts++;
        record.lastAttempt = now;

        // Check if limit exceeded
        if (record.attempts > this.config.maxAttempts) {
            record.blockedUntil = now + this.config.blockDuration;
            this.logger.error(`Rate limit exceeded for ${clientIp}:${action}. Blocking for ${this.config.blockDuration / 1000} seconds`);
            
            // Track suspicious activity
            this.trackSuspiciousActivity(clientIp, 'rate_limit_exceeded', {
                action,
                attempts: record.attempts
            });
            
            throw new Error('Rate limit exceeded. Account temporarily blocked');
        }

        this.rateLimits.set(key, record);
        this.logger.debug(`Rate limit check passed for ${clientIp}:${action}. Attempts: ${record.attempts}/${this.config.maxAttempts}`);
    }

    trackSuspiciousActivity(clientIp, activityType, metadata = {}) {
        const key = clientIp;
        let record = this.suspiciousActivities.get(key);
        
        if (!record) {
            record = {
                ip: clientIp,
                activities: [],
                totalScore: 0,
                firstActivity: Date.now(),
                lastActivity: Date.now()
            };
        }

        // Score different activities
        const scoreMap = {
            'rate_limit_exceeded': 50,
            'invalid_credentials': 10,
            'suspicious_request': 25,
            'multiple_failed_logins': 30
        };

        const score = scoreMap[activityType] || 5;
        record.activities.push({
            type: activityType,
            timestamp: Date.now(),
            score,
            metadata
        });
        record.totalScore += score;
        record.lastActivity = Date.now();

        this.suspiciousActivities.set(key, record);

        if (record.totalScore >= this.config.maxSuspiciousScore) {
            this.logger.error(`High suspicious activity score for ${clientIp}: ${record.totalScore}`);
            // Could trigger additional security measures here
        }

        this.logger.debug(`Suspicious activity tracked for ${clientIp}: ${activityType} (Score: +${score}, Total: ${record.totalScore})`);
    }

    generateSecureToken(payload, expiresIn = '24h') {
        const jwtSecret = process.env.JWT_SECRET || 'cosmic-proto-v2-secret';
        const tokenId = crypto.randomUUID();
        
        const tokenPayload = {
            ...payload,
            jti: tokenId,
            iat: Math.floor(Date.now() / 1000),
            iss: 'CosmicProtoV2'
        };

        return jwt.sign(tokenPayload, jwtSecret, { expiresIn });
    }

    verifyToken(token) {
        const jwtSecret = process.env.JWT_SECRET || 'cosmic-proto-v2-secret';
        try {
            return jwt.verify(token, jwtSecret);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    sanitizeUserData(user) {
        const { password, salt, encrypted_fields, ...sanitized } = user;
        return sanitized;
    }
}

// =============================================================================
// ENHANCED USER AUTHENTICATION CONTROLLER V2
// =============================================================================
class UserAuthControllerV2 extends EventEmitter {
    constructor(options = {}) {
        super();
        this.logger = new CosmicLogger('AUTH-CTRL');
        this.dbLayer = new SecureDatabaseLayerV2();
        this.security = new SecurityManager(options.security);
        this.isInitialized = false;
        
        this.setupEventHandlers();
        this.logger.info('UserAuthController v2.0 initialized');
    }

    setupEventHandlers() {
        this.dbLayer.on('initialized', () => {
            this.logger.info('Database layer ready for authentication operations');
        });

        this.dbLayer.on('databaseError', ({ dbName, error }) => {
            this.logger.error(`Database error in auth controller [${dbName}]:`, error.message);
            this.emit('systemError', { component: 'database', error });
        });

        this.dbLayer.on('circuitBreakerOpen', ({ dbName }) => {
            this.logger.warn(`Circuit breaker opened for ${dbName} - entering degraded mode`);
            this.emit('degradedMode', { component: 'database', database: dbName });
        });
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        this.logger.info('Initializing Enhanced User Authentication Controller v2.0...');
        
        try {
            await this.dbLayer.initialize();
            this.isInitialized = true;
            this.logger.info('Authentication Controller v2.0 ready');
            this.emit('ready');
        } catch (error) {
            this.logger.error('Failed to initialize Authentication Controller:', error.message);
            throw error;
        }
    }

    // =============================================================================
    // USER REGISTRATION WITH ENHANCED SECURITY
    // =============================================================================
    async registerUser(req, res) {
        const requestId = this.generateRequestId();
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const startTime = Date.now();

        this.logger.info(`[${requestId}] User registration started from ${clientIp}`);

        try {
            // Initialize if needed
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Security checks
            await this.security.checkRateLimit(clientIp, 'register');

            // Validate request
            const { firstName, lastName, email, password } = req.body;
            this.validateRegistrationData({ firstName, lastName, email, password });

            // Check if user already exists
            const existingUser = await this.dbLayer.findUserByEmail(email);
            if (existingUser) {
                this.logger.warn(`[${requestId}] Registration attempt with existing email: ${email}`);
                return this.sendErrorResponse(res, 409, 'User already exists', requestId);
            }

            // Create user with enhanced security
            const userData = { firstName, lastName, email, password };
            const newUser = await this.dbLayer.createUser(userData);

            // Generate secure token
            const token = this.security.generateSecureToken({
                userId: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            });

            const duration = Date.now() - startTime;
            this.logger.info(`[${requestId}] User registered successfully: ${newUser.id} in ${duration}ms`);

            // Emit success event
            this.emit('userRegistered', {
                userId: newUser.id,
                email: newUser.email,
                clientIp,
                requestId
            });

            // Send success response
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                requestId,
                user: this.security.sanitizeUserData(newUser),
                token,
                expiresIn: '24h'
            });

        } catch (error) {
            await this.handleAuthError(error, res, requestId, clientIp, 'register');
        }
    }

    // =============================================================================
    // USER LOGIN WITH ENHANCED SECURITY
    // =============================================================================
    async loginUser(req, res) {
        const requestId = this.generateRequestId();
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const startTime = Date.now();

        this.logger.info(`[${requestId}] User login started from ${clientIp}`);

        try {
            // Initialize if needed
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Security checks
            await this.security.checkRateLimit(clientIp, 'login');

            // Validate request
            const { email, password } = req.body;
            this.validateLoginData({ email, password });

            // Authenticate user
            const user = await this.dbLayer.authenticateUser(email, password);

            // Generate secure token
            const token = this.security.generateSecureToken({
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            });

            const duration = Date.now() - startTime;
            this.logger.info(`[${requestId}] User logged in successfully: ${user.id} in ${duration}ms`);

            // Emit success event
            this.emit('userLoggedIn', {
                userId: user.id,
                email: user.email,
                clientIp,
                requestId
            });

            // Send success response
            res.status(200).json({
                success: true,
                message: 'Login successful',
                requestId,
                user: this.security.sanitizeUserData(user),
                token,
                expiresIn: '24h'
            });

        } catch (error) {
            // Track failed login attempt
            if (error.message === 'User not found' || error.message === 'Invalid credentials') {
                this.security.trackSuspiciousActivity(clientIp, 'invalid_credentials', {
                    email: req.body.email,
                    requestId
                });
            }

            await this.handleAuthError(error, res, requestId, clientIp, 'login');
        }
    }

    // =============================================================================
    // TOKEN VERIFICATION MIDDLEWARE
    // =============================================================================
    async verifyToken(req, res, next) {
        const requestId = this.generateRequestId();
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return this.sendErrorResponse(res, 401, 'No token provided', requestId);
            }

            const decoded = this.security.verifyToken(token);
            req.user = decoded;
            req.requestId = requestId;

            this.logger.debug(`[${requestId}] Token verified for user: ${decoded.userId}`);
            next();

        } catch (error) {
            this.logger.warn(`[${requestId}] Token verification failed from ${clientIp}:`, error.message);
            this.security.trackSuspiciousActivity(clientIp, 'invalid_token', { requestId });
            return this.sendErrorResponse(res, 401, 'Invalid or expired token', requestId);
        }
    }

    // =============================================================================
    // HEALTH CHECK ENDPOINT
    // =============================================================================
    async getHealthStatus() {
        const requestId = this.generateRequestId();
        
        try {
            let health = { status: 'unknown', error: 'Health check initialization failed' };
            
            try {
                const healthResult = await this.dbLayer.healthCheck();
                if (healthResult && typeof healthResult === 'object') {
                    health = healthResult;
                } else {
                    this.logger.warn(`[${requestId}] Health check returned invalid result:`, healthResult);
                    health = { status: 'unhealthy', error: 'Invalid health check response' };
                }
            } catch (error) {
                this.logger.warn(`[${requestId}] Database health check failed:`, error.message);
                health = {
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date()
                };
            }
            
            return {
                status: health.status || 'unknown',
                timestamp: new Date(),
                requestId,
                component: 'UserAuthController',
                version: '2.0.0',
                database: health || { status: 'unknown' },
                security: {
                    activeRateLimits: this.security.rateLimits.size,
                    suspiciousActivities: this.security.suspiciousActivities.size
                }
            };
        } catch (error) {
            this.logger.error(`[${requestId}] Internal health check failed:`, error.message);
            return {
                status: 'error',
                error: error.message,
                requestId,
                timestamp: new Date()
            };
        }
    }

    async healthCheck(req, res) {
        if (!req || !res) {
            // Direct method call - return data instead of HTTP response
            return this.getHealthStatus();
        }
        
        const requestId = this.generateRequestId();
        
        try {
            const healthStatus = await this.getHealthStatus();
            const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(healthStatus);

        } catch (error) {
            this.logger.error(`[${requestId}] Health check failed:`, error.message);
            res.status(500).json({
                status: 'error',
                error: error.message,
                requestId,
                timestamp: new Date()
            });
        }
    }

    // =============================================================================
    // VALIDATION METHODS
    // =============================================================================
    validateRegistrationData({ firstName, lastName, email, password }) {
        const errors = [];

        if (!firstName || firstName.trim().length < 2) {
            errors.push('First name must be at least 2 characters long');
        }

        if (!lastName || lastName.trim().length < 2) {
            errors.push('Last name must be at least 2 characters long');
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Valid email address is required');
        }

        if (!password || password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    validateLoginData({ email, password }) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Valid email address is required');
        }
    }

    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    async handleAuthError(error, res, requestId, clientIp, operation) {
        const duration = Date.now() - (res.locals.startTime || Date.now());
        
        this.logger.error(`[${requestId}] ${operation} failed from ${clientIp} in ${duration}ms:`, error.message);

        // Emit error event
        this.emit('authError', {
            operation,
            error: error.message,
            clientIp,
            requestId,
            duration
        });

        // Determine appropriate error response
        let statusCode = 500;
        let message = 'Internal server error';

        if (error.message.includes('Rate limit')) {
            statusCode = 429;
            message = error.message;
        } else if (error.message.includes('Validation failed')) {
            statusCode = 400;
            message = error.message;
        } else if (error.message.includes('User not found') || error.message.includes('Invalid credentials')) {
            statusCode = 401;
            message = 'Invalid credentials';
        } else if (error.message.includes('User already exists')) {
            statusCode = 409;
            message = 'User already exists';
        }

        return this.sendErrorResponse(res, statusCode, message, requestId);
    }

    sendErrorResponse(res, statusCode, message, requestId) {
        res.status(statusCode).json({
            success: false,
            error: message,
            requestId,
            timestamp: new Date()
        });
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    generateRequestId() {
        return `auth_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    // =============================================================================
    // GRACEFUL SHUTDOWN
    // =============================================================================
    async destroy() {
        this.logger.info('Destroying User Authentication Controller v2.0...');
        
        try {
            await this.dbLayer.destroy();
            this.security.rateLimits.clear();
            this.security.suspiciousActivities.clear();
            
            this.isInitialized = false;
            this.logger.info('Authentication Controller v2.0 destroyed successfully');
        } catch (error) {
            this.logger.error('Error during controller destruction:', error.message);
        }
    }
}

module.exports = {
    UserAuthControllerV2,
    SecurityManager
};
