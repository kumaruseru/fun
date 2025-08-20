const mysql = require('mysql2/promise');

async function checkDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'cosmic_social'
    });

    // Check if users table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE ?', ['users']);
    
    if (tables.length === 0) {
      console.log('❌ Users table does not exist!');
      console.log('Creating users table...');
      
      await connection.execute(`
        CREATE TABLE users (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          verified BOOLEAN DEFAULT FALSE,
          active BOOLEAN DEFAULT TRUE
        )
      `);
      
      console.log('✅ Users table created successfully');
    } else {
      console.log('✅ Users table exists');
      
      // Show table structure
      const [columns] = await connection.execute('DESCRIBE users');
      console.log('📊 Table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkDatabase();
