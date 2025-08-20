/**
 * Enhanced Authentication Routes v2.0
 * Học hỏi từ MTProto patterns và architecture
 * 
 * Key Features:
 * 1. Clean route organization
 * 2. Comprehensive middleware stack
 * 3. Proper error boundaries
 * 4. Graceful degradation
 * 5. Monitoring và analytics
 */

const express = require('express');
const { UserAuthControllerV2 } = require('../controllers/UserAuthControllerV2');
const { CosmicLogger } = require('../security/cosmicproto/CosmicProtoV2');

// =============================================================================
// MIDDLEWARE STACK
// =============================================================================

// Request timing middleware
const requestTiming = (req, res, next) => {
    res.locals.startTime = Date.now();
    next();
};

// Request logging middleware
const requestLogger = (logger) => (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    logger.info(`${req.method} ${req.path} from ${clientIp}`, {
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
    });
    next();
};

// Response timing middleware
const responseLogger = (logger) => (req, res, next) => {
    const originalSend = res.send;
    res.send = function(body) {
        const duration = Date.now() - (res.locals.startTime || Date.now());
        logger.info(`Response sent for ${req.method} ${req.path}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: body ? body.length : 0
        });
        return originalSend.call(this, body);
    };
    next();
};

// Error boundary middleware
const errorBoundary = (logger) => (error, req, res, next) => {
    const requestId = req.requestId || 'unknown';
    const duration = Date.now() - (res.locals.startTime || Date.now());
    
    logger.error(`Unhandled error in request [${requestId}]:`, {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`
    });
    
    // Don't expose internal errors to clients
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            requestId,
            timestamp: new Date()
        });
    }
};

// CORS middleware với security headers
const securityHeaders = (req, res, next) => {
    // CORS headers
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'none'"
    ].join('; ');
    res.header('Content-Security-Policy', csp);
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
};

// =============================================================================
// ENHANCED AUTH ROUTES V2
// =============================================================================
class EnhancedAuthRoutes {
    constructor(options = {}) {
        this.logger = new CosmicLogger('AUTH-ROUTES');
        this.router = express.Router();
        this.authController = new UserAuthControllerV2(options);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupEventHandlers();
        
        this.logger.info('Enhanced Authentication Routes v2.0 initialized');
    }

    setupMiddleware() {
        // Apply global middleware stack
        this.router.use(requestTiming);
        this.router.use(securityHeaders);
        this.router.use(requestLogger(this.logger));
        this.router.use(responseLogger(this.logger));
    }

    setupRoutes() {
        // Health check endpoint
        this.router.get('/health', async (req, res) => {
            await this.authController.healthCheck(req, res);
        });

        // User registration endpoint
        this.router.post('/register', async (req, res) => {
            try {
                await this.authController.registerUser(req, res);
            } catch (error) {
                this.logger.error('Registration route error:', error.message);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Registration failed',
                        timestamp: new Date()
                    });
                }
            }
        });

        // User login endpoint
        this.router.post('/login', async (req, res) => {
            try {
                await this.authController.loginUser(req, res);
            } catch (error) {
                this.logger.error('Login route error:', error.message);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Login failed',
                        timestamp: new Date()
                    });
                }
            }
        });

        // Token verification endpoint
        this.router.post('/verify-token', async (req, res) => {
            try {
                await this.authController.verifyToken(req, res, () => {
                    res.json({
                        success: true,
                        valid: true,
                        user: {
                            userId: req.user.userId,
                            email: req.user.email,
                            firstName: req.user.firstName,
                            lastName: req.user.lastName
                        },
                        requestId: req.requestId
                    });
                });
            } catch (error) {
                this.logger.error('Token verification route error:', error.message);
                if (!res.headersSent) {
                    res.status(401).json({
                        success: false,
                        valid: false,
                        error: 'Token verification failed',
                        timestamp: new Date()
                    });
                }
            }
        });

        // Protected profile endpoint
        this.router.get('/profile', async (req, res) => {
            try {
                await this.authController.verifyToken(req, res, () => {
                    res.json({
                        success: true,
                        user: {
                            userId: req.user.userId,
                            email: req.user.email,
                            firstName: req.user.firstName,
                            lastName: req.user.lastName,
                            iat: req.user.iat,
                            iss: req.user.iss
                        },
                        requestId: req.requestId
                    });
                });
            } catch (error) {
                this.logger.error('Profile route error:', error.message);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to fetch profile',
                        timestamp: new Date()
                    });
                }
            }
        });

        // System information endpoint (protected)
        this.router.get('/system-info', async (req, res) => {
            try {
                await this.authController.verifyToken(req, res, async () => {
                    const health = await this.authController.dbLayer.healthCheck();
                    res.json({
                        success: true,
                        system: {
                            version: '2.0.0',
                            status: health.status,
                            timestamp: new Date(),
                            databases: health.databases,
                            cosmicProto: health.cosmicProto
                        },
                        requestId: req.requestId
                    });
                });
            } catch (error) {
                this.logger.error('System info route error:', error.message);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to fetch system information',
                        timestamp: new Date()
                    });
                }
            }
        });

        // Logout endpoint (invalidate token - placeholder for future token blacklisting)
        this.router.post('/logout', async (req, res) => {
            try {
                await this.authController.verifyToken(req, res, () => {
                    this.logger.info(`User logged out: ${req.user.userId}`);
                    // In a full implementation, you would blacklist the token here
                    res.json({
                        success: true,
                        message: 'Logged out successfully',
                        requestId: req.requestId
                    });
                });
            } catch (error) {
                this.logger.error('Logout route error:', error.message);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Logout failed',
                        timestamp: new Date()
                    });
                }
            }
        });

        // Fallback route for undefined endpoints
        this.router.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Authentication endpoint not found',
                path: req.originalUrl,
                timestamp: new Date()
            });
        });

        // Error boundary
        this.router.use(errorBoundary(this.logger));
    }

    setupEventHandlers() {
        this.authController.on('ready', () => {
            this.logger.info('Authentication controller ready - routes fully operational');
        });

        this.authController.on('userRegistered', ({ userId, email, clientIp }) => {
            this.logger.info(`New user registered: ${userId} (${email}) from ${clientIp}`);
        });

        this.authController.on('userLoggedIn', ({ userId, email, clientIp }) => {
            this.logger.info(`User login successful: ${userId} (${email}) from ${clientIp}`);
        });

        this.authController.on('authError', ({ operation, error, clientIp, requestId }) => {
            this.logger.error(`Auth error [${requestId}]: ${operation} failed from ${clientIp} - ${error}`);
        });

        this.authController.on('systemError', ({ component, error }) => {
            this.logger.error(`System error in ${component}:`, error.message);
        });

        this.authController.on('degradedMode', ({ component, database }) => {
            this.logger.warn(`Entering degraded mode: ${component} (${database})`);
        });
    }

    getRouter() {
        return this.router;
    }

    async initialize() {
        await this.authController.initialize();
        this.logger.info('Enhanced Authentication Routes v2.0 ready');
    }

    async destroy() {
        this.logger.info('Destroying Enhanced Authentication Routes v2.0...');
        await this.authController.destroy();
        this.logger.info('Authentication routes destroyed');
    }
}

// =============================================================================
// FACTORY FUNCTION FOR EASY INTEGRATION
// =============================================================================
const createEnhancedAuthRoutes = (options = {}) => {
    return new EnhancedAuthRoutes(options);
};

module.exports = {
    EnhancedAuthRoutes,
    createEnhancedAuthRoutes
};
