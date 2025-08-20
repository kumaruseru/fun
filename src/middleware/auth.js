/**
 * Authentication Middleware for CosmicProto
 * Checks user authentication status and redirects if needed
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req, res, next) {
  // Get token from headers
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.cosmic_token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 401,
        message: 'Access token required'
      }
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cosmic-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 401,
        message: 'Invalid or expired token'
      }
    });
  }
}

/**
 * Middleware to redirect unauthenticated users to login
 */
function redirectToLogin(req, res, next) {
  // Check if request is for API
  if (req.path.startsWith('/api/')) {
    return requireAuth(req, res, next);
  }

  // For page requests, check session
  const sessionData = req.cookies.cosmic_session;
  
  if (!sessionData) {
    return res.redirect('/login');
  }

  try {
    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      res.clearCookie('cosmic_session');
      return res.redirect('/login');
    }

    req.session = session;
    next();
  } catch (error) {
    res.clearCookie('cosmic_session');
    return res.redirect('/login');
  }
}

/**
 * Middleware to redirect authenticated users away from login/register
 */
function redirectIfAuthenticated(req, res, next) {
  const sessionData = req.cookies.cosmic_session;
  
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      
      // Check if session is still valid
      if (!session.expiresAt || Date.now() < session.expiresAt) {
        return res.redirect('/home');
      }
    } catch (error) {
      // Invalid session data, clear it
      res.clearCookie('cosmic_session');
    }
  }

  next();
}

module.exports = {
  requireAuth,
  redirectToLogin,
  redirectIfAuthenticated
};
