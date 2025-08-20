/**
 * CosmicProto Express Server with Quantum Security
 * Main server implementation with advanced security protocols
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

// Import routes
const authRoutes = require('./routes/auth');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import security systems
const CosmicProto = require('./security/cosmicproto/CosmicProto');

class CosmicProtoServer {
  constructor() {
    this.app = express();
    this.cosmicProto = null;
    
    // Server configuration
    this.config = {
      port: process.env.PORT || 3000,
      host: process.env.HOST || '0.0.0.0',
      nodeEnv: process.env.NODE_ENV || 'development',
      
      // Security configuration
      security: {
        enableHttps: process.env.ENABLE_HTTPS === 'true',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // requests per window
        slowDownThreshold: parseInt(process.env.RATE_LIMIT_SLOW_DOWN_THRESHOLD) || 50, // start slowing down after 50 requests
        maxRequestSize: process.env.MAX_FILE_SIZE || '10mb',
        sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex')
      },
      
      // Performance configuration
      performance: {
        enableCompression: true,
        enableCaching: true,
        requestTimeout: 30000, // 30 seconds
        keepAliveTimeout: 65000 // 65 seconds
      }
    };
    
    // Initialize server
    this.initializeServer();
  }

  /**
   * Initialize Express server with security middleware
   */
  async initializeServer() {
    console.log('🚀 Initializing CosmicProto Express Server...');
    
    try {
      // Step 1: Initialize CosmicProto security
      await this.initializeCosmicProto();
      
      // Step 2: Configure security middleware
      this.configureSecurityMiddleware();
      
      // Step 3: Configure general middleware
      this.configureGeneralMiddleware();
      
      // Step 4: Configure routes
      this.configureRoutes();
      
      // Step 5: Configure error handling
      this.configureErrorHandling();
      
      console.log('✅ CosmicProto server initialized successfully');
      
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize CosmicProto security system
   */
  async initializeCosmicProto() {
    console.log('🔐 Initializing CosmicProto security system...');
    
    this.cosmicProto = new CosmicProto({
      securityLevel: 'maximum',
      encryptionLayers: ['quantum', 'symmetric', 'steganography'],
      realTimeAnalysis: true,
      adaptiveSecurity: true,
      integrationMode: 'full',
      networkMode: 'decentralized'
    });
    
    // Wait for protocol to be ready
    await new Promise((resolve) => {
      this.cosmicProto.once('protocol_ready', resolve);
    });
    
    console.log('✅ CosmicProto security system ready');
  }

  /**
   * Configure security middleware
   */
  configureSecurityMiddleware() {
    console.log('🛡️ Configuring security middleware...');
    
    // Helmet for basic security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com", "https://unpkg.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.tailwindcss.com"],
          imgSrc: ["'self'", "data:", "https:", "https://placehold.co", "https://images.unsplash.com"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Required for some features
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (this.config.security.corsOrigins.includes(origin) || 
            this.config.nodeEnv === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin', 
        'X-Requested-With', 
        'Content-Type', 
        'Accept', 
        'Authorization',
        'X-Session-Id',
        'X-Request-Id',
        'X-Device-Fingerprint'
      ]
    }));
    
    // Rate limiting
    const rateLimiter = rateLimit({
      windowMs: this.config.security.rateLimitWindow,
      max: this.config.security.rateLimitMax,
      message: {
        success: false,
        error: {
          code: 429,
          message: 'Too many requests from this IP',
          retryAfter: Math.ceil(this.config.security.rateLimitWindow / 1000),
          timestamp: Date.now()
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
      }
    });
    
    this.app.use(rateLimiter);
    
    // Speed limiting
    const speedLimiter = slowDown({
      windowMs: this.config.security.rateLimitWindow,
      delayAfter: this.config.security.slowDownThreshold,
      delayMs: 100, // Start with 100ms delay
      maxDelayMs: 2000, // Max 2 second delay
      skipFailedRequests: false,
      skipSuccessfulRequests: false
    });
    
    this.app.use(speedLimiter);
    
    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = req.get('X-Request-Id') || crypto.randomUUID();
      res.setHeader('X-Request-Id', req.requestId);
      next();
    });
    
    // IP and User Agent logging
    this.app.use((req, res, next) => {
      req.clientIP = req.ip || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
      
      req.userAgent = req.get('User-Agent') || 'unknown';
      next();
    });
  }

  /**
   * Configure general middleware
   */
  configureGeneralMiddleware() {
    console.log('⚙️ Configuring general middleware...');
    
    // Compression
    if (this.config.performance.enableCompression) {
      this.app.use(compression({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        }
      }));
    }
    
    // Body parsers with size limits
    this.app.use(cookieParser());
    this.app.use(express.json({ 
      limit: this.config.security.maxRequestSize,
      strict: true,
      verify: (req, res, buf) => {
        // Store raw body for signature verification if needed
        req.rawBody = buf;
      }
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: this.config.security.maxRequestSize 
    }));
    
    // Request timeout
    this.app.use((req, res, next) => {
      res.setTimeout(this.config.performance.requestTimeout, () => {
        res.status(408).json({
          success: false,
          error: {
            code: 408,
            message: 'Request timeout',
            requestId: req.requestId,
            timestamp: Date.now()
          }
        });
      });
      next();
    });
    
    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
        
        console.log(
          `[${logLevel}] ${req.method} ${req.originalUrl} - ` +
          `${res.statusCode} - ${duration}ms - ` +
          `IP: ${req.clientIP} - ` +
          `Request ID: ${req.requestId}`
        );
      });
      
      next();
    });
  }

  /**
   * Configure application routes
   */
  configureRoutes() {
    console.log('🛣️ Configuring routes...');
    
    // Serve static files
    this.app.use('/ui', express.static('src/ui'));
    this.app.use('/public', express.static('public'));
    
    // Page routes with authentication
    this.app.get('/', authMiddleware.redirectToLogin, (req, res) => {
      res.sendFile('src/ui/pages/social/home.html', { root: '.' });
    });
    
    this.app.get('/home', authMiddleware.redirectToLogin, (req, res) => {
      res.sendFile('src/ui/pages/social/home.html', { root: '.' });
    });
    
    this.app.get('/discovery', authMiddleware.redirectToLogin, (req, res) => {
      res.sendFile('src/ui/pages/explore/discovery.html', { root: '.' });
    });
    
    this.app.get('/maps', authMiddleware.redirectToLogin, (req, res) => {
      res.sendFile('src/ui/pages/explore/maps.html', { root: '.' });
    });
    
    this.app.get('/messages', authMiddleware.redirectToLogin, (req, res) => {
      res.sendFile('src/ui/pages/communication/message.html', { root: '.' });
    });
    
    this.app.get('/profile', authMiddleware.redirectToLogin, (req, res) => {
      res.sendFile('src/ui/pages/user/profile.html', { root: '.' });
    });
    
    // Auth pages (redirect if already logged in)
    this.app.get('/login', authMiddleware.redirectIfAuthenticated, (req, res) => {
      res.sendFile('src/ui/pages/auth/login.html', { root: '.' });
    });
    
    this.app.get('/register', authMiddleware.redirectIfAuthenticated, (req, res) => {
      res.sendFile('src/ui/pages/auth/register.html', { root: '.' });
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const healthStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        version: '2.0',
        protocol: 'CosmicProto',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: this.config.nodeEnv,
        security: {
          quantumResistant: true,
          zeroKnowledgeAuth: true,
          aiPowered: true,
          blockchainIntegrity: true
        }
      };
      
      res.status(200).json({
        success: true,
        health: healthStatus,
        requestId: req.requestId
      });
    });
    
    // API info endpoint
    this.app.get('/api/info', (req, res) => {
      res.status(200).json({
        success: true,
        api: {
          name: 'Cosmic Social Network API',
          version: '2.0',
          protocol: 'CosmicProto',
          description: 'Quantum-resistant social network with advanced security',
          features: [
            'Quantum cryptography',
            'Zero-knowledge authentication',
            'AI-powered security',
            'Blockchain integrity',
            'Multi-layer encryption'
          ],
          endpoints: {
            authentication: '/api/auth/*',
            users: '/api/users/*',
            messages: '/api/messages/*',
            posts: '/api/posts/*',
            health: '/health'
          }
        },
        requestId: req.requestId,
        timestamp: Date.now()
      });
    });
    
    // Authentication routes
    this.app.use('/api/auth', authRoutes);
    
    // TODO: Add other route modules
    // this.app.use('/api/users', userRoutes);
    // this.app.use('/api/messages', messageRoutes);
    // this.app.use('/api/posts', postRoutes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Cosmic Social Network API - Powered by CosmicProto',
        version: '2.0',
        security: 'Quantum-resistant',
        documentation: '/api/info',
        health: '/health',
        requestId: req.requestId,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Configure error handling
   */
  configureErrorHandling() {
    console.log('🚨 Configuring error handling...');
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 404,
          message: 'Endpoint not found',
          path: req.originalUrl,
          method: req.method,
          requestId: req.requestId,
          timestamp: Date.now()
        }
      });
    });
    
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('❌ Global error handler:', error);
      
      // Don't leak error details in production
      const isDevelopment = this.config.nodeEnv === 'development';
      
      const errorResponse = {
        success: false,
        error: {
          code: error.statusCode || 500,
          message: isDevelopment ? error.message : 'Internal server error',
          requestId: req.requestId,
          timestamp: Date.now()
        }
      };
      
      // Add stack trace in development
      if (isDevelopment) {
        errorResponse.error.stack = error.stack;
      }
      
      res.status(error.statusCode || 500).json(errorResponse);
    });
    
    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      console.log('📴 SIGTERM received, shutting down gracefully...');
      this.gracefulShutdown();
    });
    
    process.on('SIGINT', () => {
      console.log('📴 SIGINT received, shutting down gracefully...');
      this.gracefulShutdown();
    });
    
    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown(1);
    });
    
    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown(1);
    });
  }

  /**
   * Start the server
   */
  async startServer() {
    try {
      const server = this.app.listen(this.config.port, this.config.host, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🌌 COSMIC SOCIAL NETWORK                  ║
║                  Powered by CosmicProto v2.0                ║
╠══════════════════════════════════════════════════════════════╣
║ 🚀 Server running on: ${this.config.host}:${this.config.port.toString().padEnd(31)} ║
║ 🔐 Security Level: Maximum Quantum Protection               ║
║ 🛡️ Protocol: CosmicProto with Zero-Knowledge Auth           ║
║ 🤖 AI Security: Real-time Threat Detection                  ║
║ ⛓️ Blockchain: Integrity & Audit Trail                      ║
║ 🌍 Environment: ${this.config.nodeEnv.padEnd(42)} ║
╚══════════════════════════════════════════════════════════════╝
        `);
      });
      
      // Configure server settings
      server.keepAliveTimeout = this.config.performance.keepAliveTimeout;
      server.headersTimeout = this.config.performance.keepAliveTimeout + 1000;
      
      // Store server reference for graceful shutdown
      this.server = server;
      
      return server;
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  gracefulShutdown(exitCode = 0) {
    console.log('📴 Starting graceful shutdown...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Close database connections, cleanup resources, etc.
        if (this.cosmicProto) {
          console.log('🔐 Cleaning up CosmicProto resources...');
          // Add cleanup logic for CosmicProto
        }
        
        console.log('✅ Graceful shutdown completed');
        process.exit(exitCode);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.log('⚠️ Forcing server close...');
        process.exit(exitCode);
      }, 10000);
    } else {
      process.exit(exitCode);
    }
  }

  /**
   * Get server instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get CosmicProto instance
   */
  getCosmicProto() {
    return this.cosmicProto;
  }
}

// Export server class and create instance if running directly
module.exports = CosmicProtoServer;

// Start server if this file is run directly
if (require.main === module) {
  const server = new CosmicProtoServer();
  server.startServer().catch(error => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}
