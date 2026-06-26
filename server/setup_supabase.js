import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const setupDatabase = async () => {
  let client;
  try {
    console.log('Connecting to PostgreSQL/Supabase database...');
    
    if (connectionString) {
      client = new Client({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        }
      });
    } else {
      client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
    }

    await client.connect();
    console.log('Connected successfully!');

    console.log('Dropping existing tables in reverse dependency order...');
    const tablesToDrop = [
      'driver_kpis', 'driver_documents', 'driver_attendance_logs', 'driver_attendance',
      'wallet_transactions', 'saved_cards', 'wallets', 'user_settings',
      'sos_alerts', 'incident_reports', 'trusted_contacts',
      'notifications', 'bookings', 'documents', 'users'
    ];
    for (const t of tablesToDrop) {
      await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    }

    console.log('Creating database tables with PostgreSQL syntax...');

    // 1. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role VARCHAR(50) NOT NULL DEFAULT 'client',
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100) NULL,
        password VARCHAR(255) NULL,
        status VARCHAR(20) DEFAULT 'active',
        license_no VARCHAR(100) NULL,
        profile_photo TEXT NULL,
        license_front TEXT NULL,
        license_back TEXT NULL,
        aadhaar_front TEXT NULL,
        aadhaar_back TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Documents
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Bookings
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_ref VARCHAR(50) NOT NULL,
        client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'upcoming',
        date VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        duty_type VARCHAR(50) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        transmission VARCHAR(50) NOT NULL,
        car_model VARCHAR(100) NOT NULL,
        driver VARCHAR(100) DEFAULT 'Waiting for Driver',
        price VARCHAR(50) NOT NULL,
        otp VARCHAR(10) DEFAULT NULL,
        started_at VARCHAR(100) DEFAULT NULL,
        promo_code VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        title VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        is_read SMALLINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Wallets
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(12,2) DEFAULT 0.00,
        reward_points INT DEFAULT 0,
        auto_reload SMALLINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Wallet Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(12,2) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Saved Cards
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_cards (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_last4 VARCHAR(100) NOT NULL,
        card_brand VARCHAR(50) NOT NULL,
        expiry_date VARCHAR(10) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Trusted Contacts
    await client.query(`
      CREATE TABLE IF NOT EXISTS trusted_contacts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. SOS Alerts
    await client.query(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        resolved_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Incident Reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        issue_type VARCHAR(100) NOT NULL,
        description TEXT NULL,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Driver Attendance
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_attendance (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        is_clocked_in SMALLINT DEFAULT 0,
        hours_logged DECIMAL(10,4) DEFAULT 0.0000,
        monthly_hours_logged DECIMAL(10,4) DEFAULT 0.0000,
        last_clock_in TIMESTAMP NULL,
        last_clock_out TIMESTAMP NULL
      )
    `);

    // 12. Driver Attendance Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_attendance_logs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Success'
      )
    `);

    // 13. Driver Documents
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_documents (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_key VARCHAR(50) NOT NULL,
        document_name VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending Review',
        expiry_date VARCHAR(100) NOT NULL,
        file_path TEXT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 14. Driver KPIs
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_kpis (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        rating DECIMAL(3,2) DEFAULT 4.92,
        acceptance_rate INT DEFAULT 96,
        reliability_score INT DEFAULT 98,
        loyalty_tier VARCHAR(50) DEFAULT 'Gold Partner'
      )
    `);

    // 15. User Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        sidebar_compact SMALLINT DEFAULT 0,
        duty_type VARCHAR(50) DEFAULT 'Inside City',
        transmission VARCHAR(50) DEFAULT 'Automatic',
        car_model VARCHAR(100) DEFAULT '',
        silent_ride SMALLINT DEFAULT 0,
        sms_alerts SMALLINT DEFAULT 1,
        email_alerts SMALLINT DEFAULT 1,
        push_notifications SMALLINT DEFAULT 0,
        sos_contact_phone VARCHAR(20) DEFAULT '',
        auto_alert_sos SMALLINT DEFAULT 1,
        platform_commission INT DEFAULT 30,
        min_fare DECIMAL(10,2) DEFAULT 10.00,
        rating_threshold DECIMAL(3,2) DEFAULT 4.50,
        auto_approve_drivers SMALLINT DEFAULT 0,
        base_currency VARCHAR(10) DEFAULT 'USD',
        map_refresh_interval INT DEFAULT 10
      )
    `);

    console.log('Tables created successfully!');

    console.log('Seeding demo admin account...');
    const adminPassword = await bcrypt.hash('admin', 10);
    
    const existingAdmin = await client.query(
      'SELECT * FROM users WHERE email = $1 OR phone_number = $2',
      ['admin@gmail.com', '+10000000000']
    );

    if (existingAdmin.rows.length === 0) {
      await client.query(
        `INSERT INTO users (
          role, first_name, last_name, phone_number, email, password, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'admin', 
          'System', 
          'Admin', 
          '+10000000000', 
          'admin@gmail.com', 
          adminPassword, 
          'active'
        ]
      );
      console.log('Admin user added successfully!');
    } else {
      console.log('Admin user already exists, skipping.');
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error during database setup:', error);
  } finally {
    if (client) {
      await client.end();
    }
  }
};

setupDatabase();
