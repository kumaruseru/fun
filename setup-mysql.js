const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function setupCloudMySQL() {
  console.log('🚀 Setting up cloud MySQL database...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('✅ Connected to cloud MySQL!');
    
    // Check if users table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    
    if (tables.length === 0) {
      console.log('📝 Creating users table...');
      
      await connection.execute(`
        CREATE TABLE users (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          verified BOOLEAN DEFAULT FALSE,
          active BOOLEAN DEFAULT TRUE,
          INDEX idx_email (email),
          INDEX idx_active (active)
        )
      `);
      
      console.log('✅ Users table created successfully!');
    } else {
      console.log('✅ Users table already exists');
    }
    
    // Show table structure
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('📊 Users table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    // Test simple query
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('📊 Test query result:', result[0]);
    
    await connection.end();
    console.log('✅ Cloud MySQL setup complete!');
    
  } catch (error) {
    console.error('❌ Cloud MySQL setup failed:', error.message);
    console.error('Error code:', error.code);
  }
}

setupCloudMySQL();
