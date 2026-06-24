import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const seedData = async () => {
  try {
    console.log('Connecting to XAMPP MySQL...');
    // Connect without specifying a database initially
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log(' Creating database and tables...');
    await connection.query('CREATE DATABASE IF NOT EXISTS `hire_your_driver`');
    await connection.query('USE `hire_your_driver`');

    // Drop ALL tables in reverse-dependency order so foreign key constraints don't block
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tablesToDrop = [
      'driver_kpis', 'driver_documents', 'driver_attendance_logs', 'driver_attendance',
      'wallet_transactions', 'saved_cards', 'wallets',
      'sos_alerts', 'incident_reports', 'trusted_contacts',
      'notifications', 'bookings', 'documents', 'users'
    ];
    for (const t of tablesToDrop) {
      await connection.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.query(`
      CREATE TABLE \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`role\` ENUM('client', 'driver', 'admin') NOT NULL DEFAULT 'client',
        \`first_name\` VARCHAR(100) NOT NULL,
        \`last_name\` VARCHAR(100) NOT NULL,
        \`phone_number\` VARCHAR(20) NOT NULL UNIQUE,
        \`email\` VARCHAR(100) NULL,
        \`password\` VARCHAR(255) NULL,
        \`status\` VARCHAR(20) DEFAULT 'active',
        \`license_no\` VARCHAR(100) NULL,
        \`profile_photo\` LONGTEXT NULL,
        \`license_front\` LONGTEXT NULL,
        \`license_back\` LONGTEXT NULL,
        \`aadhaar_front\` LONGTEXT NULL,
        \`aadhaar_back\` LONGTEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE \`documents\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`document_type\` ENUM('avatar', 'license_front', 'license_back') NOT NULL,
        \`file_path\` VARCHAR(255) NOT NULL,
        \`uploaded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE \`bookings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`booking_ref\` VARCHAR(50) NOT NULL,
        \`client_id\` INT NOT NULL,
        \`status\` VARCHAR(20) DEFAULT 'upcoming',
        \`date\` VARCHAR(100) NOT NULL,
        \`location\` VARCHAR(255) NOT NULL,
        \`destination\` VARCHAR(255) NOT NULL,
        \`duty_type\` VARCHAR(50) NOT NULL,
        \`duration\` VARCHAR(50) NOT NULL,
        \`transmission\` VARCHAR(50) NOT NULL,
        \`car_model\` VARCHAR(100) NOT NULL,
        \`driver\` VARCHAR(100) DEFAULT 'Waiting for Driver',
        \`price\` VARCHAR(50) NOT NULL,
        \`otp\` VARCHAR(10) DEFAULT NULL,
        \`started_at\` VARCHAR(100) DEFAULT NULL,
        \`promo_code\` VARCHAR(100) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`client_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE \`notifications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NULL,
        \`role\` VARCHAR(20) NOT NULL,
        \`title\` VARCHAR(100) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`is_read\` TINYINT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE \`wallets\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL UNIQUE,
        \`balance\` DECIMAL(12,2) DEFAULT 0.00,
        \`reward_points\` INT DEFAULT 0,
        \`auto_reload\` TINYINT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE \`wallet_transactions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`amount\` DECIMAL(12,2) NOT NULL,
        \`transaction_type\` ENUM('credit','debit') NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE \`saved_cards\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`card_last4\` VARCHAR(100) NOT NULL,
        \`card_brand\` VARCHAR(50) NOT NULL,
        \`expiry_date\` VARCHAR(10) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE \`trusted_contacts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE \`sos_alerts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE \`incident_reports\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`issue_type\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    console.log(' Seeding demo data...');

    const defaultPassword = await bcrypt.hash('1234567890', 10);
    const adminPassword = await bcrypt.hash('admin', 10);

    const demoUsers = [
      {
        role: 'admin',
        first_name: 'System',
        last_name: 'Admin',
        phone_number: '+10000000000',
        email: 'admin@gmail.com',
        password: adminPassword
      }
    ];

    for (const user of demoUsers) {
      const [existing] = await connection.query('SELECT * FROM users WHERE email = ? OR phone_number = ?', [user.email, user.phone_number]);

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO users (
            role, first_name, last_name, phone_number, email, password, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            user.role, 
            user.first_name, 
            user.last_name, 
            user.phone_number, 
            user.email, 
            user.password, 
            'active'
          ]
        );
        console.log(`Added demo ${user.role}: ${user.first_name} ${user.last_name} (${user.email})`);
      } else {
        console.log(` Skipped ${user.role} ${user.first_name} (already exists)`);
      }
    }

    console.log('\n Seeding completed successfully!');
    console.log('You can now log in with the following credentials:');
    console.log('----------------------------------------------------');
    console.log('Admin:  admin@gmail.com   | Password: admin      | Phone: +1 0000000000');
    console.log('----------------------------------------------------');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data. Is XAMPP MySQL running?');
    console.error(error);
    process.exit(1);
  }
};

seedData();
