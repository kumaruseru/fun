const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function verifyRegistration() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('🔍 Verifying user registration in cloud MySQL...');
    
    const [users] = await connection.execute('SELECT * FROM users ORDER BY id DESC LIMIT 5');
    
    console.log('👥 Latest users in cloud MySQL:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}`);
    });
    
    console.log('📊 Total users retrieved:', users.length);
    await connection.end();
    console.log('✅ Cloud MySQL verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyRegistration();
