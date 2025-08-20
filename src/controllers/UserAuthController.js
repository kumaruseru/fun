/**
 * CosmicProto User Authentication Controller
 * Integrates quantum authentication with secure database operations
 */

const SecureDatabaseLayer = require('../security/cosmicproto/database/SecureDatabaseLayer');
const CosmicProto = require('../security/cosmicproto/CosmicProto');
const crypto = require('crypto');

/**
 * User Authentication Controller with Quantum Security
 */
class UserAuthController {
  constructor(cosmicProto = null) {
    console.log('🚀 Initializing User Authentication Controller...');
    
    // Get SecureDatabaseLayer from CosmicProto (encrypted connection)
    if (cosmicProto) {
      this.cosmicProto = cosmicProto;
      this.secureDB = cosmicProto.getSecureDatabaseLayer();
      console.log('🔐 Using CosmicProto encrypted database layer');
    } else {
      // Fallback: create new CosmicProto and SecureDatabaseLayer
      this.cosmicProto = new CosmicProto({
        securityLevel: 'maximum',
        encryptionLayers: ['quantum', 'symmetric', 'steganography'],
        realTimeAnalysis: true,
        adaptiveSecurity: true
      });
      
      this.secureDB = new SecureDatabaseLayer({
        encryptionLevel: 'maximum',
        encryption: {
          fieldLevelEncryption: true,
          queryEncryption: true,
          keyRotationInterval: 24 * 60 * 60 * 1000
        },
        accessControl: {
          requireZKAuth: true,
          sessionValidation: true,
          operationLogging: true
        }
      });
      console.log('⚠️ Using fallback CosmicProto and SecureDatabaseLayer');
    }
    
    // Controller configuration
    this.config = {
      version: '2.0',
      protocol: 'CosmicProto-Auth-Controller',
      
      // Rate limiting
      rateLimiting: {
        registrationLimit: 5, // per hour per IP
        loginAttempts: 3, // per 15 minutes
        blockDuration: 15 * 60 * 1000 // 15 minutes
      },
      
      // Validation rules
      validation: {
        emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        usernameRegex: /^[a-zA-Z0-9_]{3,30}$/,
        passwordMinLength: 8, // Reduced from 12 to 8 for better UX
        requireMFA: true
      },
      
      // Response settings
      responses: {
        includeSecurityDetails: false, // For production security
        logAllOperations: true,
        sanitizeErrors: true
      }
    };
    
    // Rate limiting state
    this.rateLimiters = {
      registration: new Map(),
      login: new Map(),
      blocked: new Set()
    };
    
    // Initialize controller
    this.initialize();
  }

  /**
   * Set cloud database connection
   */
  setCloudDatabaseConnection(connection) {
    console.log('🔗 Setting cloud database connection in UserAuthController...');
    this.secureDB.setCloudDatabaseConnection(connection);
  }

  /**
   * Initialize authentication controller
   */
  async initialize() {
    console.log('🚀 Initializing User Authentication Controller...');
    
    // Wait for security systems to be ready
    await Promise.all([
      new Promise(resolve => this.cosmicProto.once('protocol_ready', resolve)),
      this.secureDB.initialize()
    ]);
    
    // Start rate limit cleanup
    this.startRateLimitCleanup();
    
    console.log('✅ User Authentication Controller ready');
  }

  /**
   * User Registration Endpoint
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async registerUser(req, res) {
    const startTime = Date.now();
    const operationId = crypto.randomUUID();
    
    console.log('🚀 === UserAuthController.registerUser START ===');
    console.log(`📝 User registration request - Operation: ${operationId}`);
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      console.log('📋 Step 1: Extract and validate request data...');
      // Step 1: Extract and validate request data
      const { email, firstName, lastName, password, confirmPassword, biometricData } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const deviceInfo = this.extractDeviceInfo(req);
      
      console.log('🔍 Registration data extracted:', {
        email: email,
        firstName: firstName,
        lastName: lastName,
        hasPassword: !!password,
        clientIP: clientIP
      });
      
      // Step 2: Rate limiting check
      const rateLimitCheck = this.checkRateLimit('registration', clientIP);
      if (!rateLimitCheck.allowed) {
        return this.sendErrorResponse(res, 429, 'Rate limit exceeded', {
          retryAfter: rateLimitCheck.retryAfter,
          operationId
        });
      }
      
      // Step 3: Input validation
      const validation = this.validateRegistrationInput({
        email, firstName, lastName, password, confirmPassword
      });
      
      console.log('🔍 Validation result:', validation);
      
      if (!validation.valid) {
        console.log('❌ Validation failed:', validation.errors);
        return this.sendErrorResponse(res, 400, validation.message, {
          operationId,
          validationErrors: validation.errors
        });
      }
      
      // Step 4: Check if email already exists (username is generated uniquely)
      console.log('🔍 Checking email existence for:', email);
      const existingEmail = await this.secureDB.secureRetrieveUserRecord(email);
      console.log('🔍 Email check result:', existingEmail ? 'EXISTS' : 'NOT_FOUND');
      
      if (existingEmail) {
        return this.sendErrorResponse(res, 409, 'Email already registered', {
          operationId
        });
      }
      
      // Step 5: Prepare user data for quantum registration
      const userData = {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        biometricData: biometricData || null,
        registrationIP: clientIP,
        registrationUserAgent: userAgent,
        registrationTime: Date.now()
      };
      
      // Step 6: Enhanced device information
      const enhancedDeviceInfo = {
        ...deviceInfo,
        userAgent,
        ipAddress: clientIP,
        timestamp: Date.now(),
        fingerprint: this.generateDeviceFingerprint(req)
      };
      
      // Step 7: Context for security analysis
      const securityContext = {
        operation: 'user_registration',
        ipAddress: clientIP,
        userAgent,
        deviceFingerprint: enhancedDeviceInfo.fingerprint,
        timestamp: Date.now(),
        operationId
      };
      
      // Step 8: Secure registration with quantum encryption
      console.log('🔐 Processing with CosmicProto quantum security...');
      
      try {
        const registrationResult = await this.secureDB.secureUserRegistration(
          userData,
          enhancedDeviceInfo,
          securityContext
        );
        
        console.log('🔍 Registration result:', {
          success: registrationResult?.success,
          reason: registrationResult?.reason,
          hasError: !!registrationResult?.error
        });
        
        if (!registrationResult || !registrationResult.success) {
          const errorMessage = registrationResult?.reason || 'Registration failed - unknown error';
          console.log('❌ Registration failed:', errorMessage);
          return this.sendErrorResponse(res, 500, errorMessage, {
            operationId,
            error: this.sanitizeError(registrationResult?.error)
          });
        }
        
      } catch (registrationError) {
        console.error('❌ Registration error caught:', registrationError.message);
        console.error('❌ Full registration error:', registrationError);
        return this.sendErrorResponse(res, 500, 'Registration system error', {
          operationId,
          error: this.sanitizeError(registrationError)
        });
      }
      
      // Step 9: Generate initial secure session (optional for auto-login)
      let initialSession = null;
      if (req.body.autoLogin) {
        console.log('🔐 Creating initial secure session...');
        const loginCredentials = { email: userData.email, password };
        const loginContext = {
          ipAddress: clientIP,
          userAgent,
          deviceInfo: enhancedDeviceInfo,
          autoLogin: true
        };
        
        const sessionResult = await this.cosmicProto.authenticateUser(loginCredentials, loginContext);
        if (sessionResult.success) {
          initialSession = {
            sessionId: sessionResult.sessionId,
            tokens: sessionResult.session?.tokens,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
        }
      }
      
      // Step 10: Update rate limiter
      this.updateRateLimit('registration', clientIP);
      
      // Step 11: Prepare response
      const processingTime = Date.now() - startTime;
      
      const responseData = {
        success: true,
        message: 'User registered successfully with quantum security',
        userId: registrationResult.userId,
        operationId,
        securityFeatures: {
          quantumEncrypted: true,
          zeroKnowledgeProofs: true,
          biometricSupport: !!biometricData,
          multiLayerSecurity: true
        },
        processingTime,
        timestamp: Date.now()
      };
      
      // Add session if auto-login was requested
      if (initialSession) {
        responseData.session = initialSession;
        responseData.autoLoginSuccess = true;
      }
      
      console.log(`✅ User registration completed successfully in ${processingTime}ms`);
      
      return res.status(201).json(responseData);
      
    } catch (error) {
      console.error('❌ User registration error:', error);
      
      return this.sendErrorResponse(res, 500, 'Registration system error', {
        operationId,
        error: this.sanitizeError(error.message)
      });
    }
  }

  /**
   * User Login Endpoint
   * @param {Object} req - Request object  
   * @param {Object} res - Response object
   */
  async loginUser(req, res) {
    const startTime = Date.now();
    const operationId = crypto.randomUUID();
    
    console.log(`🔐 User login request - Operation: ${operationId}`);
    
    try {
      // Step 1: Extract request data
      const { email, username, password, mfaToken, biometricData } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const deviceInfo = this.extractDeviceInfo(req);
      
      // Step 2: Rate limiting check
      const identifier = email || username;
      const rateLimitCheck = this.checkRateLimit('login', `${clientIP}:${identifier}`);
      if (!rateLimitCheck.allowed) {
        return this.sendErrorResponse(res, 429, 'Too many login attempts', {
          retryAfter: rateLimitCheck.retryAfter,
          operationId
        });
      }
      
      // Step 3: Input validation
      const validation = this.validateLoginInput({ email, username, password });
      if (!validation.valid) {
        return this.sendErrorResponse(res, 400, validation.message, {
          operationId,
          validationErrors: validation.errors
        });
      }
      
      // Step 4: Prepare login credentials
      const loginCredentials = {
        email: email?.toLowerCase().trim(),
        username: username?.trim(),
        password,
        mfaToken,
        biometricData,
        userId: null // Will be resolved during authentication
      };
      
      // Step 5: Enhanced context for authentication
      const authContext = {
        ipAddress: clientIP,
        userAgent,
        deviceInfo: {
          ...deviceInfo,
          fingerprint: this.generateDeviceFingerprint(req)
        },
        geoLocation: this.extractGeoLocation(req),
        timestamp: Date.now(),
        operationId,
        securityLevel: 'maximum'
      };
      
      // Step 6: Secure login with quantum authentication
      console.log('🔐 Processing with CosmicProto quantum authentication...');
      const loginResult = await this.secureDB.secureUserLogin(loginCredentials, authContext);
      
      if (!loginResult.success) {
        // Update rate limiter on failed login
        this.updateRateLimit('login', `${clientIP}:${identifier}`);
        
        return this.sendErrorResponse(res, 401, loginResult.reason, {
          operationId,
          error: this.sanitizeError(loginResult.error)
        });
      }
      
      // Step 7: Clear rate limiter on successful login
      this.clearRateLimit('login', `${clientIP}:${identifier}`);
      
      // Step 8: Prepare secure response
      const processingTime = Date.now() - startTime;
      
      const responseData = {
        success: true,
        message: 'Login successful with quantum security',
        userId: loginResult.userId,
        operationId,
        session: {
          sessionId: loginResult.session.sessionId,
          tokens: loginResult.session.tokens,
          expiresAt: loginResult.session.createdAt + (24 * 60 * 60 * 1000),
          securityLevel: loginResult.session.authData?.securityLevel || 'maximum'
        },
        userProfile: loginResult.userProfile,
        securityFeatures: {
          quantumAuthenticated: true,
          zeroKnowledgeProofs: true,
          multiFactorAuth: true,
          sessionEncrypted: true,
          auditTrail: true
        },
        securityMetrics: {
          riskLevel: loginResult.session.authData?.riskLevel || 'low',
          authConfidence: loginResult.session.authData?.confidence || 0.95,
          deviceTrust: loginResult.session.authData?.deviceTrust || 0.9
        },
        processingTime,
        timestamp: Date.now()
      };
      
      console.log(`✅ User login completed successfully in ${processingTime}ms`);
      
      // Set secure session cookie
      const sessionData = {
        sessionId: loginResult.session.sessionId,
        userId: loginResult.userId,
        tokens: loginResult.session.tokens,
        expiresAt: loginResult.session.createdAt + (24 * 60 * 60 * 1000)
      };
      
      res.cookie('cosmic_session', JSON.stringify(sessionData), {
        httpOnly: false, // Allow JavaScript access for frontend
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      return res.status(200).json(responseData);
      
    } catch (error) {
      console.error('❌ User login error:', error);
      
      return this.sendErrorResponse(res, 500, 'Login system error', {
        operationId,
        error: this.sanitizeError(error.message)
      });
    }
  }

  /**
   * Session Validation Endpoint
   * @param {Object} req - Request object
   * @param {Object} res - Response object  
   */
  async validateSession(req, res) {
    const operationId = crypto.randomUUID();
    
    try {
      const { sessionId, accessToken } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Validate session with CosmicProto
      const sessionValid = await this.cosmicProto.validateUserSession(sessionId);
      
      if (!sessionValid.valid) {
        return this.sendErrorResponse(res, 401, 'Invalid session', {
          operationId,
          reason: sessionValid.reason
        });
      }
      
      return res.status(200).json({
        success: true,
        valid: true,
        userId: sessionValid.userId,
        session: sessionValid.session,
        operationId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Session validation error:', error);
      
      return this.sendErrorResponse(res, 500, 'Session validation error', {
        operationId,
        error: this.sanitizeError(error.message)
      });
    }
  }

  /**
   * User Logout Endpoint
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async logoutUser(req, res) {
    const operationId = crypto.randomUUID();
    
    try {
      const { sessionId } = req.body;
      
      // Secure session cleanup
      await this.cosmicProto.cleanupSession(sessionId);
      
      return res.status(200).json({
        success: true,
        message: 'Logout successful',
        operationId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ User logout error:', error);
      
      return this.sendErrorResponse(res, 500, 'Logout error', {
        operationId,
        error: this.sanitizeError(error.message)
      });
    }
  }

  // ===================== Helper Methods =====================

  validateRegistrationInput({ email, firstName, lastName, password, confirmPassword }) {
    const errors = [];
    
    if (!email || !this.config.validation.emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    
    if (!firstName || firstName.trim().length < 1) {
      errors.push('First name is required');
    }
    
    if (!lastName || lastName.trim().length < 1) {
      errors.push('Last name is required');
    }
    
    if (!password || password.length < this.config.validation.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.validation.passwordMinLength} characters`);
    }
    
    // Only check password match if confirmPassword is provided (for frontend forms)
    if (confirmPassword !== undefined && password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? 'Validation failed' : 'Valid',
      errors
    };
  }

  validateLoginInput({ email, username, password }) {
    const errors = [];
    
    if (!email && !username) {
      errors.push('Email or username is required');
    }
    
    if (email && !this.config.validation.emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    
    if (!password) {
      errors.push('Password is required');
    }
    
    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? 'Validation failed' : 'Valid',
      errors
    };
  }

  extractDeviceInfo(req) {
    return {
      userAgent: req.get('User-Agent'),
      acceptLanguage: req.get('Accept-Language'),
      acceptEncoding: req.get('Accept-Encoding'),
      platform: req.get('Sec-Ch-Ua-Platform'),
      mobile: req.get('Sec-Ch-Ua-Mobile'),
      screenResolution: req.body.deviceInfo?.screenResolution,
      timezone: req.body.deviceInfo?.timezone,
      timestamp: Date.now()
    };
  }

  generateDeviceFingerprint(req) {
    const components = [
      req.get('User-Agent'),
      req.get('Accept-Language'),
      req.get('Accept-Encoding'),
      req.body.deviceInfo?.screenResolution,
      req.body.deviceInfo?.timezone
    ].filter(Boolean);
    
    return crypto.createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  extractGeoLocation(req) {
    // Extract from headers or request data
    return {
      country: req.get('CF-IPCountry'), // Cloudflare
      region: req.body.location?.region,
      city: req.body.location?.city,
      latitude: req.body.location?.latitude,
      longitude: req.body.location?.longitude
    };
  }

  async checkUserExists(email, username) {
    // Check in database if user already exists
    try {
      console.log('🔍 Checking user existence for:', { email, username });
      
      const existingEmail = await this.secureDB.secureRetrieveUserRecord(email);
      console.log('🔍 Email check result:', existingEmail ? 'EXISTS' : 'NOT_FOUND');
      if (existingEmail) {
        return { exists: true, message: 'Email already registered' };
      }
      
      // For now, skip username check as we use email as primary key
      // const existingUsername = await this.secureDB.secureRetrieveUserRecord(username);
      // if (existingUsername) {
      //   return { exists: true, message: 'Username already taken' };
      // }
      
      return { exists: false };
    } catch (error) {
      console.error('❌ User existence check error:', error.message);
      console.error('❌ Full error:', error);
      throw error; // Re-throw to see the actual error
    }
  }

  checkRateLimit(type, identifier) {
    const rateLimiter = this.rateLimiters[type];
    const limit = this.config.rateLimiting[`${type}Limit`] || this.config.rateLimiting[`${type}Attempts`];
    const window = 60 * 60 * 1000; // 1 hour window
    
    const now = Date.now();
    const attempts = rateLimiter.get(identifier) || [];
    
    // Clean old attempts
    const validAttempts = attempts.filter(time => now - time < window);
    
    if (validAttempts.length >= limit) {
      return {
        allowed: false,
        retryAfter: Math.ceil((validAttempts[0] + window - now) / 1000)
      };
    }
    
    return { allowed: true };
  }

  updateRateLimit(type, identifier) {
    const rateLimiter = this.rateLimiters[type];
    const attempts = rateLimiter.get(identifier) || [];
    
    attempts.push(Date.now());
    rateLimiter.set(identifier, attempts);
  }

  clearRateLimit(type, identifier) {
    this.rateLimiters[type].delete(identifier);
  }

  startRateLimitCleanup() {
    setInterval(() => {
      const now = Date.now();
      const window = 60 * 60 * 1000;
      
      for (const [type, limiter] of Object.entries(this.rateLimiters)) {
        for (const [identifier, attempts] of limiter.entries()) {
          const validAttempts = attempts.filter(time => now - time < window);
          if (validAttempts.length === 0) {
            limiter.delete(identifier);
          } else {
            limiter.set(identifier, validAttempts);
          }
        }
      }
    }, 15 * 60 * 1000); // Clean every 15 minutes
  }

  sendErrorResponse(res, statusCode, message, additionalData = {}) {
    const errorResponse = {
      success: false,
      error: {
        code: statusCode,
        message: this.config.responses.sanitizeErrors ? this.sanitizeErrorMessage(message) : message,
        timestamp: Date.now(),
        ...additionalData
      }
    };
    
    return res.status(statusCode).json(errorResponse);
  }

  sanitizeError(error) {
    if (!this.config.responses.sanitizeErrors) {
      return error;
    }
    
    // Remove sensitive information from error messages
    return 'An internal error occurred';
  }

  sanitizeErrorMessage(message) {
    // Check if message is null or undefined
    if (!message || typeof message !== 'string') {
      return 'An internal error occurred';
    }
    
    // Remove sensitive patterns from error messages
    const sensitivePatterns = ['password', 'key', 'secret', 'token', 'hash'];
    let sanitized = message;
    
    for (const pattern of sensitivePatterns) {
      const regex = new RegExp(pattern, 'gi');
      sanitized = sanitized.replace(regex, '[REDACTED]');
    }
    
    return sanitized;
  }

  /**
   * Logout user and clear session
   */
  async logoutUser(req, res) {
    const startTime = Date.now();
    
    try {
      console.log('🔓 Starting user logout process...');
      
      // Get session data from cookie
      const sessionCookie = req.cookies.cosmic_session;
      
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(sessionCookie);
          console.log(`📝 Logging out session: ${sessionData.sessionId}`);
          
          // TODO: Add session cleanup in database if needed
          // await this.secureDB.cleanupSession(sessionData.sessionId);
          
        } catch (error) {
          console.log('⚠️ Invalid session cookie during logout');
        }
      }
      
      // Clear the session cookie
      res.clearCookie('cosmic_session', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ User logout completed successfully in ${processingTime}ms`);
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        timestamp: Date.now(),
        processingTime
      });
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Still clear cookie even if error occurred
      res.clearCookie('cosmic_session');
      
      return res.status(500).json({
        success: false,
        error: {
          code: 500,
          message: 'Logout failed',
          timestamp: Date.now()
        }
      });
    }
  }
}

module.exports = UserAuthController;
