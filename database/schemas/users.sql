-- CosmicProto Social Network - Users Table Schema
-- MySQL Database Schema for User Data
-- This table works alongside MongoDB encryption and Neo4j relationships

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(128) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    operation_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    security_level VARCHAR(20) DEFAULT 'high',
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_operation_id (operation_id),
    INDEX idx_created_at (created_at),
    INDEX idx_names (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sessions Table (for authentication tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    device_info JSON,
    session_data TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Activity Log (for audit trail)
CREATE TABLE IF NOT EXISTS user_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grant permissions (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cosmic_social.users TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cosmic_social.user_sessions TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cosmic_social.user_activity TO 'app_user'@'%';
