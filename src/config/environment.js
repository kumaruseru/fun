const dotenv = require('dotenv');
const path = require('path');

/**
 * Environment Configuration Loader
 * Loads appropriate environment file based on NODE_ENV
 */
class EnvironmentConfig {
  constructor() {
    this.loadEnvironment();
  }

  /**
   * Load environment configuration based on NODE_ENV
   */
  loadEnvironment() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    let envPath;

    switch (nodeEnv) {
      case 'development':
        envPath = path.join(__dirname, '../../environments/dev/.env.development');
        break;
      case 'staging':
        envPath = path.join(__dirname, '../../environments/staging/.env.staging');
        break;
      case 'production':
        envPath = path.join(__dirname, '../../environments/production/.env.production');
        break;
      default:
        envPath = path.join(__dirname, '../../.env');
    }

    // Load the environment file
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
      console.warn(`⚠️  Could not load environment file: ${envPath}`);
      // Fallback to default .env
      dotenv.config({ path: path.join(__dirname, '../../.env') });
    } else {
      console.log(`✅ Loaded environment: ${nodeEnv} from ${envPath}`);
    }
  }

  /**
   * Get all environment variables
   * @returns {Object}
   */
  getAll() {
    return {
      // App Configuration
      NODE_ENV: process.env.NODE_ENV,
      PORT: parseInt(process.env.PORT, 10),
      HOST: process.env.HOST,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      TRUST_PROXY: process.env.TRUST_PROXY === 'true',

      // JWT Configuration
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,

      // Security
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      SESSION_SECRET: process.env.SESSION_SECRET,
      SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE, 10),
      BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10),

      // Database URLs
      MONGODB_URI: process.env.MONGODB_URI,
      MYSQL_URI: process.env.MYSQL_URI,
      REDIS_URI: process.env.REDIS_URI,
      NEO4J_URI: process.env.NEO4J_URI,

      // Email Configuration
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: parseInt(process.env.SMTP_PORT, 10),
      SMTP_SECURE: process.env.SMTP_SECURE === 'true',
      EMAIL_FROM: process.env.EMAIL_FROM,

      // File Upload
      UPLOAD_PATH: process.env.UPLOAD_PATH,
      AVATAR_PATH: process.env.AVATAR_PATH,
      MAX_AVATAR_SIZE: process.env.MAX_AVATAR_SIZE,

      // Security Headers
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      HELMET_ENABLED: process.env.HELMET_ENABLED === 'true',

      // Debug
      DEBUG_MODE: process.env.DEBUG_MODE === 'true',
      VERBOSE_LOGGING: process.env.VERBOSE_LOGGING === 'true'
    };
  }

  /**
   * Get specific environment variable
   * @param {string} key 
   * @param {any} defaultValue 
   * @returns {any}
   */
  get(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  /**
   * Check if environment is production
   * @returns {boolean}
   */
  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if environment is development
   * @returns {boolean}
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if environment is staging
   * @returns {boolean}
   */
  isStaging() {
    return process.env.NODE_ENV === 'staging';
  }
}

module.exports = new EnvironmentConfig();
