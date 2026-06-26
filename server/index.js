import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { exec } from 'child_process';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { 
      role, 
      firstName, 
      lastName, 
      phoneNumber, 
      email, 
      password,
      licenseNumber,
      profilePhoto,
      licenseFront,
      licenseBack,
      aadhaarFront,
      aadhaarBack
    } = req.body;

    // Check if user already exists with this phone number
    const [existing] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User with this phone number already exists' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const status = role === 'driver' ? 'pending' : 'active';

    const [result] = await db.query(
      `INSERT INTO users (
        role, first_name, last_name, phone_number, email, password, status, 
        license_no, profile_photo, license_front, license_back, aadhaar_front, aadhaar_back
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        role, 
        firstName, 
        lastName, 
        phoneNumber, 
        email || null, 
        hashedPassword, 
        status,
        licenseNumber || null,
        profilePhoto || null,
        licenseFront || null,
        licenseBack || null,
        aadhaarFront || null,
        aadhaarBack || null
      ]
    );

    // If driver, notify admin
    if (role === 'driver') {
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (NULL, ?, ?, ?)',
        ['admin', 'New Driver Signup', `Driver ${firstName} ${lastName || ''} has signed up and is pending verification.`]
      );
    }

    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, method, email, password, phoneNumber } = req.body;

    if (method === 'email') {
      const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password for this role' });
      }

      const user = users[0];
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your account is pending administrator approval. Please wait until your profile details and documents are verified.' });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password for this role' });
      }

      res.json({ message: 'Login successful', user: { id: user.id, role: user.role, firstName: user.first_name, lastName: user.last_name } });
    } else {
      // Phone method - assume OTP was verified on frontend for this demo
      const [users] = await db.query('SELECT * FROM users WHERE phone_number = ? AND role = ?', [phoneNumber, role]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'User not found with this phone number' });
      }

      const user = users[0];
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your account is pending administrator approval. Please wait until your profile details and documents are verified.' });
      }
      
      res.json({ message: 'Login successful', user: { id: user.id, role: user.role, firstName: user.first_name, lastName: user.last_name } });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify registered email exists for role
app.post('/api/auth/verify-reset-email', async (req, res) => {
  try {
    const { email, role } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'No user found with this email for the selected role' });
    }
    res.json({ message: 'Email verified. Code sent.' });
  } catch (error) {
    console.error('Verify reset email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password Route
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, role, newPassword } = req.body;
    // Find user by email and role
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'No user found with this email for the selected role' });
    }
    const user = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/api/bookings', async (req, res) => {
  try {
    const { booking_ref, client_id, date, location, destination, duty_type, duration, transmission, car_model, price, promo_code } = req.body;
    
    // Validate booking date and time (no past dates/times)
    if (date) {
      const parts = date.split(', ');
      if (parts.length === 2) {
        const [selectedDate, selectedTime] = parts;
        const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
        const now = new Date();
        // Allow a 5-minute buffer
        if (!isNaN(selectedDateTime.getTime()) && selectedDateTime.getTime() < now.getTime() - 5 * 60 * 1000) {
          return res.status(400).json({ error: 'Booking date and time cannot be in the past' });
        }
      }
    }

    // Check if promo code was already used/applied by this client
    if (promo_code) {
      const [used] = await db.query(
        'SELECT id FROM bookings WHERE client_id = ? AND LOWER(promo_code) = LOWER(?)',
        [client_id, promo_code]
      );
      if (used.length > 0) {
        return res.status(400).json({ error: 'invalid promo code' });
      }
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate random 4-digit OTP
    
    const [result] = await db.query(
      'INSERT INTO bookings (booking_ref, client_id, date, location, destination, duty_type, duration, transmission, car_model, price, otp, promo_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [booking_ref, client_id, date, location, destination, duty_type, duration, transmission, car_model, price, otp, promo_code || null]
    );
    
    // Create notification for client
    await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
      [client_id, 'client', 'Booking Created', `Your booking request ${booking_ref} has been created and is waiting for a driver.`]
    );
    // General notification for all drivers
    await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (NULL, ?, ?, ?)',
      ['driver', 'New Booking Available', `A new booking request ${booking_ref} from ${location} to ${destination} is now available.`]
    );
    
    res.status(201).json({ message: 'Booking created successfully', bookingId: result.insertId, otp });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bookings for a client
app.get('/api/bookings/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const [bookings] = await db.query('SELECT * FROM bookings WHERE client_id = ? ORDER BY created_at DESC', [clientId]);
    
    // Map db columns back to frontend expected properties
    const formattedBookings = bookings.map(b => ({
      id: b.booking_ref,
      status: b.status,
      date: b.date,
      location: b.location,
      destination: b.destination,
      dutyType: b.duty_type,
      duration: b.duration,
      transmission: b.transmission,
      carModel: b.car_model,
      driver: b.driver,
      price: b.price,
      dbId: b.id,
      otp: b.otp
    }));
    
    res.json(formattedBookings);
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed booking info (including started_at and driver details)
app.get('/api/booking-details/:dbId', async (req, res) => {
  try {
    const { dbId } = req.params;
    const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [dbId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookings[0];
    
    let driverDetails = null;
    if (booking.driver && booking.driver !== 'Waiting for Driver') {
      const [drivers] = await db.query(
        'SELECT first_name, last_name, profile_photo, license_no FROM users WHERE role = "driver" AND CONCAT(first_name, " ", last_name) = ?',
        [booking.driver]
      );
      if (drivers.length > 0) {
        const driver = drivers[0];
        const [completedCount] = await db.query(
          'SELECT COUNT(*) as count FROM bookings WHERE driver = ? AND status = "completed"',
          [booking.driver]
        );
        let driverPhoto = driver.profile_photo;
        if (driverPhoto && driverPhoto.startsWith('{') && driverPhoto.endsWith('}')) {
          try {
            const parsed = JSON.parse(driverPhoto);
            driverPhoto = parsed.type === 'url' ? parsed.url : null;
          } catch (e) {
            console.error('Error parsing driver photo JSON:', e);
          }
        }
        driverDetails = {
          name: `${driver.first_name} ${driver.last_name || ''}`.trim(),
          photo: driverPhoto,
          license: driver.license_no,
          completedTrips: completedCount[0].count
        };
      }
    }

    const [wallets] = await db.query('SELECT balance FROM wallets WHERE user_id = ?', [booking.client_id]);
    const walletBalance = wallets.length > 0 ? parseFloat(wallets[0].balance) : 0.00;

    res.json({
      booking: {
        id: booking.booking_ref,
        status: booking.status,
        date: booking.date,
        location: booking.location,
        destination: booking.destination,
        dutyType: booking.duty_type,
        duration: booking.duration,
        transmission: booking.transmission,
        carModel: booking.car_model,
        driver: booking.driver,
        price: booking.price,
        dbId: booking.id,
        otp: booking.otp,
        startedAt: booking.started_at
      },
      driver: driverDetails,
      clientWalletBalance: walletBalance
    });
  } catch (error) {
    console.error('Fetch booking details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bookings for a driver
app.get('/api/bookings/driver/:driverName', async (req, res) => {
  try {
    const { driverName } = req.params;
    const [bookings] = await db.query(
      `SELECT b.*, u.first_name AS client_first_name, u.last_name AS client_last_name 
       FROM bookings b 
       JOIN users u ON b.client_id = u.id 
       WHERE b.driver = ? 
       ORDER BY b.created_at DESC`,
      [driverName]
    );
    
    // Map db columns back to frontend expected properties
    const formattedBookings = bookings.map(b => ({
      id: b.booking_ref,
      status: b.status,
      date: b.date,
      location: b.location,
      destination: b.destination,
      dutyType: b.duty_type,
      duration: b.duration,
      transmission: b.transmission,
      carModel: b.car_model,
      driver: b.driver,
      price: b.price,
      dbId: b.id,
      clientName: `${b.client_first_name} ${b.client_last_name || ''}`.trim(),
      otp: b.otp
    }));
    
    res.json(formattedBookings);
  } catch (error) {
    console.error('Fetch driver bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all unassigned bookings
app.get('/api/bookings/unassigned/available', async (req, res) => {
  try {
    const { driverId } = req.query;
    if (driverId) {
      // Ensure attendance record exists
      await ensureAttendanceResets(driverId);
      // Check if driver is clocked in
      const [rows] = await db.query('SELECT is_clocked_in FROM driver_attendance WHERE user_id = ?', [driverId]);
      if (rows.length === 0 || rows[0].is_clocked_in !== 1) {
        // Driver is not on duty (or doesn't exist/not clocked in), return empty array
        return res.json([]);
      }
    }
    
    const [bookings] = await db.query(
      `SELECT b.*, u.first_name AS client_first_name, u.last_name AS client_last_name, cs.silent_ride AS client_silent_ride 
       FROM bookings b 
       JOIN users u ON b.client_id = u.id 
       LEFT JOIN user_settings cs ON b.client_id = cs.user_id 
       WHERE b.driver = "Waiting for Driver" AND b.status = "upcoming" 
       ORDER BY b.created_at DESC`
    );
    
    // Map db columns back to frontend expected properties
    const formattedBookings = bookings.map(b => ({
      id: b.booking_ref,
      status: b.status,
      date: b.date,
      location: b.location,
      destination: b.destination,
      dutyType: b.duty_type,
      duration: b.duration,
      transmission: b.transmission,
      carModel: b.car_model,
      driver: b.driver,
      price: b.price,
      dbId: b.id,
      clientName: `${b.client_first_name} ${b.client_last_name || ''}`.trim(),
      otp: b.otp,
      clientSilentRide: b.client_silent_ride === 1
    }));
    
    res.json(formattedBookings);
  } catch (error) {
    console.error('Fetch unassigned bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept a booking (assign driver)
app.patch('/api/bookings/:dbId/accept', async (req, res) => {
  try {
    const { dbId } = req.params;
    const { driverName, driverId } = req.body;

    // Enforce: driver can only have one active trip at a time
    const [activeTrips] = await db.query(
      'SELECT id, booking_ref, status FROM bookings WHERE driver = ? AND status IN ("upcoming", "started")',
      [driverName]
    );
    console.log(`[Accept] Driver "${driverName}" active trips:`, activeTrips.length);
    if (activeTrips.length > 0) {
      const activeRef = activeTrips[0].booking_ref;
      const activeStatus = activeTrips[0].status;
      return res.status(400).json({ 
        error: `You already have an active trip (${activeRef} - ${activeStatus}). Please complete your current trip before accepting a new one.`
      });
    }

    await db.query('UPDATE bookings SET driver = ? WHERE id = ?', [driverName, dbId]);
    
    // Create notifications for client and driver
    const [bookingRows] = await db.query('SELECT booking_ref, client_id FROM bookings WHERE id = ?', [dbId]);
    if (bookingRows.length > 0) {
      const { booking_ref, client_id } = bookingRows[0];
      // Notify client
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
        [client_id, 'client', 'Driver Assigned', `Driver ${driverName} has accepted your booking ${booking_ref}.`]
      );
      // Find driver ID to notify driver
      const [driverRows] = await db.query(
        'SELECT id FROM users WHERE role = "driver" AND CONCAT(first_name, " ", last_name) = ?',
        [driverName]
      );
      if (driverRows.length > 0) {
        const foundDriverId = driverRows[0].id;
        await db.query(
          'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
          [foundDriverId, 'driver', 'Booking Accepted', `You have accepted booking ${booking_ref}. Check your upcoming rides for details.`]
        );
      }
    }
    
    res.json({ message: 'Booking accepted successfully' });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a booking / trip (requires matching OTP from client)
app.patch('/api/bookings/:dbId/start', async (req, res) => {
  try {
    const { dbId } = req.params;
    const { otp } = req.body;
    
    // 1. Fetch booking details
    const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [dbId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookings[0];
    if (booking.status !== 'upcoming') {
      return res.status(400).json({ error: 'Only upcoming bookings can be started' });
    }
    
    // 2. Validate OTP
    if (booking.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please ask the client for the correct code.' });
    }
    
    // 3. Set booking status to started
    const startTime = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    await db.query('UPDATE bookings SET status = "started", started_at = ? WHERE id = ?', [startTime, dbId]);
    
    // Create notifications for client and driver
    const [bookingRows] = await db.query('SELECT booking_ref, client_id, driver FROM bookings WHERE id = ?', [dbId]);
    if (bookingRows.length > 0) {
      const { booking_ref, client_id, driver: driverName } = bookingRows[0];
      // Notify client
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
        [client_id, 'client', 'Trip Started', `Your trip ${booking_ref} has started. Have a safe journey!`]
      );
      // Notify driver
      const [driverRows] = await db.query(
        'SELECT id FROM users WHERE role = "driver" AND CONCAT(first_name, " ", last_name) = ?',
        [driverName]
      );
      if (driverRows.length > 0) {
        await db.query(
          'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
          [driverRows[0].id, 'driver', 'Trip Started', `Trip ${booking_ref} has successfully started.`]
        );
      }
    }
    
    res.json({ message: 'Trip started successfully' });
  } catch (error) {
    console.error('Start booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete a booking (triggers payment split: 70% to driver, 30% to admin)
app.post('/api/bookings/:dbId/complete', async (req, res) => {
  try {
    const { dbId } = req.params;
    
    // 1. Fetch booking details
    const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [dbId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookings[0];
    if (booking.status !== 'started') {
      return res.status(400).json({ error: 'Only started bookings can be completed' });
    }
    
    // 2. Parse price (e.g. "$85.00" -> 85.00)
    const priceNum = parseFloat(booking.price.replace(/[^0-9.]/g, ''));
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Invalid booking price' });
    }
    
    // 3. Find Client's Wallet (Create if doesn't exist)
    const clientId = booking.client_id;
    let [clientWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [clientId]);
    if (clientWallets.length === 0) {
      await db.query('INSERT INTO wallets (user_id) VALUES (?)', [clientId]);
      [clientWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [clientId]);
    }
    const clientWallet = clientWallets[0];
    
    // Check if client has enough money in wallet
    if (parseFloat(clientWallet.balance) < priceNum) {
      const missing = priceNum - parseFloat(clientWallet.balance);
      // Create notification for client to reload wallet
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
        [
          clientId, 
          'client', 
          'Payment Pending - Reload Wallet', 
          `Your trip ${booking.booking_ref} is ending, but your wallet balance ($${parseFloat(clientWallet.balance).toFixed(2)}) is insufficient to cover the fare of ${booking.price}. Please reload your wallet with at least $${missing.toFixed(2)} to complete payment.`
        ]
      );
      return res.status(400).json({ 
        error: `Insufficient Funds: The client's wallet balance of $${parseFloat(clientWallet.balance).toFixed(2)} is insufficient for this trip fare of ${booking.price}. Please request the client to top up $${missing.toFixed(2)} to complete the transaction.` 
      });
    }
    
    // Deduct client balance
    await db.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [priceNum, clientId]);
    await db.query(
      'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
      [clientId, priceNum, 'debit', `Debit for Completed Trip Ref: ${booking.booking_ref}`]
    );
    
    // 4. Find Admin to get custom commission rate
    let adminId = null;
    const [admins] = await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    if (admins.length > 0) {
      adminId = admins[0].id;
    } else {
      // Create a default admin if none exists
      const defaultAdminPassword = await bcrypt.hash('admin12345', 10);
      const [result] = await db.query(
        'INSERT INTO users (role, first_name, last_name, phone_number, email, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['admin', 'System', 'Admin', '+10000000000', 'admin@gmail.com', defaultAdminPassword, 'active']
      );
      adminId = result.insertId;
    }

    let commissionRate = 30; // default 30%
    if (adminId) {
      const [settings] = await db.query('SELECT platform_commission FROM user_settings WHERE user_id = ?', [adminId]);
      if (settings.length > 0 && settings[0].platform_commission !== null) {
        commissionRate = settings[0].platform_commission;
      }
    }

    const driverShare = parseFloat((priceNum * ((100 - commissionRate) / 100)).toFixed(2));
    const adminShare = parseFloat((priceNum * (commissionRate / 100)).toFixed(2));

    // 5. Find Driver and Transfer
    const driverName = booking.driver;
    let driverId = null;
    const [drivers] = await db.query(
      'SELECT id FROM users WHERE role = "driver" AND CONCAT(first_name, " ", last_name) = ?',
      [driverName]
    );
    if (drivers.length > 0) {
      driverId = drivers[0].id;
    } else {
      // Fallback: find first driver
      const [allDrivers] = await db.query('SELECT id FROM users WHERE role = "driver" LIMIT 1');
      if (allDrivers.length > 0) {
        driverId = allDrivers[0].id;
      }
    }

    if (driverId) {
      let [driverWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [driverId]);
      if (driverWallets.length === 0) {
        await db.query('INSERT INTO wallets (user_id) VALUES (?)', [driverId]);
      }
      // Credit driver wallet
      await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [driverShare, driverId]);
      await db.query(
        'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
        [driverId, driverShare, 'credit', `${100 - commissionRate}% Earnings Share for Ride Ref: ${booking.booking_ref}`]
      );
    }

    // 6. Transfer to Admin
    if (adminId) {
      let [adminWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [adminId]);
      if (adminWallets.length === 0) {
        await db.query('INSERT INTO wallets (user_id) VALUES (?)', [adminId]);
      }
      // Credit admin wallet
      await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [adminShare, adminId]);
      await db.query(
        'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
        [adminId, adminShare, 'credit', `${commissionRate}% Admin Commission for Ride Ref: ${booking.booking_ref}`]
      );
    }
    
    // 6. Set booking status to completed
    await db.query('UPDATE bookings SET status = "completed" WHERE id = ?', [dbId]);
    
    // Create notifications for client, driver, and admin
    await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
      [clientId, 'client', 'Trip Completed', `Your trip ${booking.booking_ref} has been completed. Amount $${priceNum.toFixed(2)} has been deducted from your wallet.`]
    );
    if (driverId) {
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
        [driverId, 'driver', 'Trip Completed', `You completed trip ${booking.booking_ref}. Earnings share of $${driverShare.toFixed(2)} credited to wallet.`]
      );
    }
    if (adminId) {
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
        [adminId, 'admin', 'New Commission Earned', `Trip ${booking.booking_ref} completed. Admin share of $${adminShare.toFixed(2)} credited.`]
      );
    }
    
    res.json({
      message: 'Booking completed successfully and payments split.',
      price: priceNum,
      driverShare,
      adminShare
    });
  } catch (error) {
    console.error('Complete booking split payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cashout / Payout wallet balance to bank account
app.post('/api/wallet/cashout', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid cashout amount' });
    }
    
    const [wallets] = await db.query('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
    if (wallets.length === 0 || wallets[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    await db.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, userId]);
    await db.query(
      'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
      [userId, amount, 'debit', 'Cashout payout to bank account']
    );
    await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
      [userId, 'driver', 'Payout Completed', `Your payout request of $${parseFloat(amount).toFixed(2)} has been successfully completed and transferred.`]
    );
    
    res.json({ message: 'Payout requested successfully' });
  } catch (error) {
    console.error('Wallet cashout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a booking
app.patch('/api/bookings/:dbId/cancel', async (req, res) => {
  try {
    const { dbId } = req.params;
    await db.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [dbId]);
    
    // Create notifications for client and driver
    const [bookingRows] = await db.query('SELECT booking_ref, client_id, driver FROM bookings WHERE id = ?', [dbId]);
    if (bookingRows.length > 0) {
      const { booking_ref, client_id, driver: driverName } = bookingRows[0];
      // Notify client
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
        [client_id, 'client', 'Booking Cancelled', `Your booking ${booking_ref} has been cancelled.`]
      );
      // Notify driver if driver was assigned
      if (driverName && driverName !== 'Waiting for Driver') {
        const [driverRows] = await db.query(
          'SELECT id FROM users WHERE role = "driver" AND CONCAT(first_name, " ", last_name) = ?',
          [driverName]
        );
        if (driverRows.length > 0) {
          await db.query(
            'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
            [driverRows[0].id, 'driver', 'Booking Cancelled', `Trip ${booking_ref} has been cancelled by the client.`]
          );
        }
      }
    }
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET pending drivers for admin
app.get('/api/admin/drivers/pending', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, first_name, last_name, email, phone_number, created_at, 
             license_no, profile_photo, license_front, license_back, aadhaar_front, aadhaar_back 
      FROM users 
      WHERE role = 'driver' AND status = 'pending' 
      ORDER BY created_at DESC
    `);
    const processedRows = rows.map(r => {
      let photo = r.profile_photo;
      if (photo && photo.startsWith('{') && photo.endsWith('}')) {
        try {
          const parsed = JSON.parse(photo);
          photo = parsed.type === 'url' ? parsed.url : null;
        } catch (e) {
          console.error('Error parsing profile photo JSON:', e);
        }
      }
      return { ...r, profile_photo: photo };
    });
    res.json(processedRows);
  } catch (error) {
    console.error('Fetch pending drivers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH approve driver
app.patch('/api/admin/drivers/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE users SET status = 'active' WHERE id = ?", [id]);
    
    // Create notifications for the driver
    await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
      [id, 'driver', 'Account Approved', 'Your profile details and documents have been successfully verified. You can now login and receive orders.']
    );
    
    res.json({ message: 'Driver approved successfully' });
  } catch (error) {
    console.error('Approve driver error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH reject driver
app.patch('/api/admin/drivers/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE users SET status = 'rejected' WHERE id = ?", [id]);
    
    await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
      [id, 'driver', 'Account Rejected', 'Your account application has been reviewed and was not approved. Please contact support for more details.']
    );
    
    res.json({ message: 'Driver rejected' });
  } catch (error) {
    console.error('Reject driver error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET admin dashboard stats overview
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [totalUsersR] = await db.query('SELECT COUNT(*) as count FROM users');
    const [totalDriversR] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'driver'");
    const [totalClientsR] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'client'");
    const [pendingDriversR] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'pending'");
    const [activeDriversR] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'active'");
    const [totalBookingsR] = await db.query('SELECT COUNT(*) as count FROM bookings');
    const [completedBookingsR] = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'");
    const [upcomingBookingsR] = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'upcoming'");
    const [startedBookingsR] = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'started'");
    const [cancelledBookingsR] = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'");
    
    // Revenue stats (admin wallet)
    let totalRevenue = 0;
    const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (admins.length > 0) {
      const [walletR] = await db.query('SELECT balance FROM wallets WHERE user_id = ?', [admins[0].id]);
      if (walletR.length > 0) totalRevenue = walletR[0].balance;
    }

    // Total platform revenue from all completed booking prices
    const [totalPlatformR] = await db.query("SELECT SUM(CAST(REPLACE(REPLACE(price, '$', ''), ',', '') AS DECIMAL(12,2))) as total FROM bookings WHERE status = 'completed'");

    res.json({
      totalUsers: totalUsersR[0].count,
      totalDrivers: totalDriversR[0].count,
      totalClients: totalClientsR[0].count,
      pendingDrivers: pendingDriversR[0].count,
      activeDrivers: activeDriversR[0].count,
      totalBookings: totalBookingsR[0].count,
      completedBookings: completedBookingsR[0].count,
      upcomingBookings: upcomingBookingsR[0].count,
      startedBookings: startedBookingsR[0].count,
      cancelledBookings: cancelledBookingsR[0].count,
      adminRevenue: totalRevenue,
      totalPlatformRevenue: totalPlatformR[0].total || 0
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all drivers for admin management
app.get('/api/admin/drivers', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number, u.status, u.created_at,
             u.license_no, u.profile_photo, u.license_front, u.license_back, u.aadhaar_front, u.aadhaar_back,
             COALESCE(da.is_clocked_in, 0) as is_on_duty,
             COALESCE(w.balance, 0.00) as wallet_balance,
             (SELECT COALESCE(SUM(amount), 0.00) FROM wallet_transactions WHERE user_id = u.id AND transaction_type = 'credit') as total_earnings,
             (SELECT COUNT(*) FROM bookings WHERE driver = CONCAT(u.first_name, ' ', u.last_name) AND status = 'completed') as total_trips
      FROM users u
      LEFT JOIN driver_attendance da ON u.id = da.user_id
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.role = 'driver'
      ORDER BY u.created_at DESC
    `);
    const processedRows = rows.map(r => {
      let photo = r.profile_photo;
      if (photo && photo.startsWith('{') && photo.endsWith('}')) {
        try {
          const parsed = JSON.parse(photo);
          photo = parsed.type === 'url' ? parsed.url : null;
        } catch (e) {
          console.error('Error parsing profile photo JSON:', e);
        }
      }
      return { ...r, profile_photo: photo };
    });
    res.json(processedRows);
  } catch (error) {
    console.error('Fetch all drivers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST award performance bonus to a driver
app.post('/api/admin/drivers/:id/bonus', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, message, announceToAll } = req.body;
    
    const bonusAmount = parseFloat(amount);
    if (isNaN(bonusAmount) || bonusAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bonus amount' });
    }
    
    // 1. Verify driver role
    const [drivers] = await db.query('SELECT first_name, last_name FROM users WHERE id = ? AND role = "driver"', [id]);
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const driver = drivers[0];
    const driverName = `${driver.first_name} ${driver.last_name || ''}`.trim();
    
    // 2. Find Admin and verify/deduct balance
    const [admins] = await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    if (admins.length === 0) {
      return res.status(400).json({ error: 'No administrator account found on the platform' });
    }
    const adminId = admins[0].id;

    let [adminWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [adminId]);
    if (adminWallets.length === 0) {
      await db.query('INSERT INTO wallets (user_id) VALUES (?)', [adminId]);
      [adminWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [adminId]);
    }
    const adminWallet = adminWallets[0];
    if (parseFloat(adminWallet.balance) < bonusAmount) {
      return res.status(400).json({ 
        error: `Insufficient Admin Funds: The platform's admin wallet has a balance of $${parseFloat(adminWallet.balance).toFixed(2)}, which is insufficient to cover this performance bonus of $${bonusAmount.toFixed(2)}.` 
      });
    }

    // Deduct from Admin's wallet
    await db.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [bonusAmount, adminId]);
    await db.query(
      'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
      [adminId, bonusAmount, 'debit', `Performance Bonus paid to Driver ${driverName}`]
    );

    // 3. Credit driver's wallet (create wallet if not exists)
    let [wallets] = await db.query('SELECT id FROM wallets WHERE user_id = ?', [id]);
    if (wallets.length === 0) {
      await db.query('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [id, bonusAmount]);
    } else {
      await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [bonusAmount, id]);
    }
    
    // 4. Log credit transaction
    await db.query(
      'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
      [id, bonusAmount, 'credit', 'Performance Bonus awarded by Admin']
    );
    
    // 4. Send specific notification to the driver
    await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (?, "driver", ?, ?)',
      [id, 'Performance Bonus Awarded', `Congratulations! The administrator has awarded you a performance bonus of $${bonusAmount.toFixed(2)}.`]
    );
    
    // 5. Broadcast to all drivers if selected
    if (announceToAll) {
      const announcementMsg = message || `Congratulations to Driver ${driverName} for outstanding performance! A performance bonus has been awarded to their wallet. Keep up the great work!`;
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (NULL, "driver", ?, ?)',
        ['Outstanding Driver Performance Announcement', announcementMsg]
      );
    }
    
    res.json({ message: 'Performance bonus awarded successfully' });
  } catch (error) {
    console.error('Award bonus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all bookings for admin
app.get('/api/admin/bookings', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, u.first_name as client_first_name, u.last_name as client_last_name, u.phone_number as client_phone
      FROM bookings b
      JOIN users u ON b.client_id = u.id
      ORDER BY b.created_at DESC
    `);
    const formatted = rows.map(b => ({
      id: b.id,
      bookingRef: b.booking_ref,
      clientName: `${b.client_first_name} ${b.client_last_name || ''}`.trim(),
      clientPhone: b.client_phone,
      status: b.status,
      date: b.date,
      location: b.location,
      destination: b.destination,
      dutyType: b.duty_type,
      duration: b.duration,
      transmission: b.transmission,
      carModel: b.car_model,
      driver: b.driver,
      price: b.price,
      createdAt: b.created_at
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all users for admin
app.get('/api/admin/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, role, first_name, last_name, email, phone_number, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET admin revenue / wallet data
app.get('/api/admin/revenue', async (req, res) => {
  try {
    const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    let wallet = { balance: 0, reward_points: 0 };
    let transactions = [];
    let commissionRate = 30; // default
    if (admins.length > 0) {
      const adminId = admins[0].id;
      const [walletR] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [adminId]);
      if (walletR.length > 0) wallet = walletR[0];
      const [txR] = await db.query('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [adminId]);
      transactions = txR;

      const [settings] = await db.query('SELECT platform_commission FROM user_settings WHERE user_id = ?', [adminId]);
      if (settings.length > 0 && settings[0].platform_commission !== null) {
        commissionRate = settings[0].platform_commission;
      }
    }
    
    // Total platform stats
    const [totalPlatformR] = await db.query("SELECT SUM(CAST(REPLACE(REPLACE(price, '$', ''), ',', '') AS DECIMAL(12,2))) as total FROM bookings WHERE status = 'completed'");
    const [completedCountR] = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'");
    
    res.json({
      wallet,
      transactions,
      totalPlatformRevenue: totalPlatformR[0].total || 0,
      completedTrips: completedCountR[0].count,
      commissionRate
    });
  } catch (error) {
    console.error('Admin revenue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET admin messages (broadcasts and notifications sent to users)
app.get('/api/admin/messages', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT n.*, u.first_name, u.last_name, u.email, u.phone_number
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    console.error('Admin fetch messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST send admin message / announcement / promo code
app.post('/api/admin/messages', async (req, res) => {
  try {
    const { targetType, targetUserId, messageType, promoCode, title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    let finalTitle = title;
    let finalMessage = message;

    if (messageType === 'promo' && promoCode) {
      finalTitle = `[PROMO CODE: ${promoCode.toUpperCase()}] ${title}`;
    }

    if (targetType === 'all_users') {
      await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (NULL, "client", ?, ?)',
        [finalTitle, finalMessage]
      );
      const [result] = await db.query(
        'INSERT INTO notifications (user_id, role, title, message) VALUES (NULL, "driver", ?, ?)',
        [finalTitle, finalMessage]
      );
      return res.json({
        message: 'Announcement broadcasted to all clients and drivers successfully',
        notificationId: result.insertId
      });
    }

    let role = 'client';

    if (targetType === 'all_clients') {
      role = 'client';
    } else if (targetType === 'all_drivers') {
      role = 'driver';
    } else if (targetType === 'specific_client') {
      if (!targetUserId) return res.status(400).json({ error: 'Specific client ID is required' });
      role = 'client';
    } else if (targetType === 'specific_driver') {
      if (!targetUserId) return res.status(400).json({ error: 'Specific driver ID is required' });
      role = 'driver';
    } else if (targetType === 'specific_users') {
      if (!targetUserId) return res.status(400).json({ error: 'Specific user IDs are required' });
    }

    if (Array.isArray(targetUserId)) {
      if (targetUserId.length === 0) {
        return res.status(400).json({ error: 'At least one recipient must be selected' });
      }
      for (const uid of targetUserId) {
        const [userRows] = await db.query('SELECT role FROM users WHERE id = ?', [uid]);
        const userRole = userRows.length > 0 ? userRows[0].role : role;
        await db.query(
          'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
          [uid, userRole, finalTitle, finalMessage]
        );
      }
      return res.json({
        message: `Announcement / Promo sent successfully to ${targetUserId.length} recipients`,
        count: targetUserId.length
      });
    }

    const [result] = await db.query(
      'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
      [targetUserId || null, role, finalTitle, finalMessage]
    );

    res.json({
      message: 'Announcement / Promo sent successfully',
      notificationId: result.insertId
    });
  } catch (error) {
    console.error('Admin post message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE recall admin message
app.delete('/api/admin/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM notifications WHERE id = ?', [id]);
    res.json({ message: 'Message recalled successfully' });
  } catch (error) {
    console.error('Admin delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET validate promo code for a client user
app.get('/api/promos/validate', async (req, res) => {
  try {
    const { code, userId } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    // Check if the user has already used this promo code in a previous booking
    const [usedRows] = await db.query(
      'SELECT id FROM bookings WHERE client_id = ? AND LOWER(promo_code) = LOWER(?)',
      [userId, code]
    );

    if (usedRows.length > 0) {
      return res.status(400).json({ valid: false, error: 'invalid promo code' });
    }

    // Check if there is a notification matching this promo code that is targetable to this user
    const [rows] = await db.query(
      `SELECT title FROM notifications 
       WHERE title LIKE ? AND (user_id = ? OR (user_id IS NULL AND role = 'client'))
       ORDER BY created_at DESC LIMIT 1`,
      [`[PROMO CODE: ${code.toUpperCase()}]%`, userId]
    );

    if (rows.length > 0) {
      // Extract discount percentage from code (e.g. DRIVE30 -> 30%, SAVE25 -> 25%, free -> 10% default)
      let discountPercent = 10;
      const numMatch = code.match(/\d+/);
      if (numMatch) {
        discountPercent = parseInt(numMatch[0]);
      }
      res.json({ valid: true, discountPercent });
    } else {
      res.status(400).json({ valid: false, error: 'invalid promo code' });
    }
  } catch (error) {
    console.error('Promo validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Database Explorer Admin Routes
const ALLOWED_DB_TABLES = [
  'users', 'documents', 'bookings', 'notifications', 'wallets', 
  'wallet_transactions', 'saved_cards', 'trusted_contacts', 
  'sos_alerts', 'incident_reports', 'driver_attendance', 
  'driver_attendance_logs', 'driver_documents', 'driver_kpis', 
  'user_settings'
];

// Helper to check if a table is allowed
const isTableAllowed = (tableName) => ALLOWED_DB_TABLES.includes(tableName.toLowerCase());

// 1. GET list of tables
app.get('/api/admin/db/tables', async (req, res) => {
  try {
    const [rows] = await db.query('SHOW TABLES');
    const tables = [];
    for (const row of rows) {
      const keys = Object.keys(row);
      if (keys.length > 0) {
        const tblName = row[keys[0]];
        if (isTableAllowed(tblName)) {
          const [[countRow]] = await db.query(`SELECT COUNT(*) as count FROM \`${tblName}\``);
          tables.push({ name: tblName, count: countRow.count });
        }
      }
    }
    res.json(tables);
  } catch (error) {
    console.error('DB explorer get tables error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET table schema (columns)
app.get('/api/admin/db/tables/:tableName/schema', async (req, res) => {
  try {
    const { tableName } = req.params;
    if (!isTableAllowed(tableName)) {
      return res.status(403).json({ error: 'Access denied to system table' });
    }
    const [columns] = await db.query(`DESCRIBE \`${tableName}\``);
    res.json(columns);
  } catch (error) {
    console.error(`DB explorer get schema error for ${req.params.tableName}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. GET table rows (with pagination, search, sorting)
app.get('/api/admin/db/tables/:tableName/rows', async (req, res) => {
  try {
    const { tableName } = req.params;
    if (!isTableAllowed(tableName)) {
      return res.status(403).json({ error: 'Access denied to system table' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || '';
    const sortOrder = req.query.sortOrder || 'ASC';

    const [cols] = await db.query(`DESCRIBE \`${tableName}\``);
    const textColumns = cols.map(c => c.Field);

    let queryStr = `SELECT * FROM \`${tableName}\``;
    let countQueryStr = `SELECT COUNT(*) as total FROM \`${tableName}\``;
    let queryParams = [];

    if (search && textColumns.length > 0) {
      const searchConditions = textColumns.map(c => `\`${c}\` LIKE ?`).join(' OR ');
      queryStr += ` WHERE ${searchConditions}`;
      countQueryStr += ` WHERE ${searchConditions}`;
      for (let i = 0; i < textColumns.length; i++) {
        queryParams.push(`%${search}%`);
      }
    }

    if (sortBy && textColumns.includes(sortBy)) {
      queryStr += ` ORDER BY \`${sortBy}\` ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
    } else {
      if (textColumns.includes('id')) {
        queryStr += ' ORDER BY `id` DESC';
      } else if (textColumns.includes('created_at')) {
        queryStr += ' ORDER BY `created_at` DESC';
      }
    }

    queryStr += ' LIMIT ? OFFSET ?';
    const finalParams = [...queryParams, limit, offset];

    const [rows] = await db.query(queryStr, finalParams);
    const [[totalRow]] = await db.query(countQueryStr, queryParams);

    res.json({
      rows,
      total: totalRow.total,
      page,
      limit
    });
  } catch (error) {
    console.error(`DB explorer get rows error for ${req.params.tableName}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. POST insert a new row
app.post('/api/admin/db/tables/:tableName/rows', async (req, res) => {
  try {
    const { tableName } = req.params;
    if (!isTableAllowed(tableName)) {
      return res.status(403).json({ error: 'Access denied to system table' });
    }

    const rowData = req.body;
    if ('id' in rowData && (rowData.id === null || rowData.id === '')) {
      delete rowData.id;
    }

    const columns = Object.keys(rowData);
    const values = Object.values(rowData);

    if (columns.length === 0) {
      return res.status(400).json({ error: 'No data provided to insert' });
    }

    const queryStr = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    const [result] = await db.query(queryStr, values);

    res.status(201).json({ message: 'Row inserted successfully', insertId: result.insertId });
  } catch (error) {
    console.error(`DB explorer insert row error for ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 5. PUT update an existing row
app.put('/api/admin/db/tables/:tableName/rows/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    if (!isTableAllowed(tableName)) {
      return res.status(403).json({ error: 'Access denied to system table' });
    }

    const rowData = { ...req.body };
    delete rowData.id;

    const columns = Object.keys(rowData);
    const values = Object.values(rowData);

    if (columns.length === 0) {
      return res.status(400).json({ error: 'No data provided to update' });
    }

    const setClause = columns.map(c => `\`${c}\` = ?`).join(', ');
    const queryStr = `UPDATE \`${tableName}\` SET ${setClause} WHERE \`id\` = ?`;
    await db.query(queryStr, [...values, id]);

    res.json({ message: 'Row updated successfully' });
  } catch (error) {
    console.error(`DB explorer update row error for ${req.params.tableName} ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 6. DELETE a row
app.delete('/api/admin/db/tables/:tableName/rows/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    if (!isTableAllowed(tableName)) {
      return res.status(403).json({ error: 'Access denied to system table' });
    }

    const queryStr = `DELETE FROM \`${tableName}\` WHERE \`id\` = ?`;
    await db.query(queryStr, [id]);

    res.json({ message: 'Row deleted successfully' });
  } catch (error) {
    console.error(`DB explorer delete row error for ${req.params.tableName} ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 6b. POST delete multiple rows in bulk
app.post('/api/admin/db/tables/:tableName/delete-bulk', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { ids } = req.body;
    if (!isTableAllowed(tableName)) {
      return res.status(403).json({ error: 'Access denied to system table' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of ids is required' });
    }
    await db.query(`DELETE FROM \`${tableName}\` WHERE \`id\` IN (?)`, [ids]);
    res.json({ message: `${ids.length} rows deleted successfully` });
  } catch (error) {
    console.error(`DB explorer bulk delete error for ${tableName}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


// 7. POST execute custom raw query
app.post('/api/admin/db/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query string is required' });
    }

    const [results] = await db.query(query);
    res.json({ results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 8. POST database reset and re-seed
app.post('/api/admin/db/reset', async (req, res) => {
  try {
    console.log('Admin triggered database reset and seed...');
    exec('node server/seed.js', (err, stdout, stderr) => {
      if (err) {
        console.error('Seed execution error:', err, stderr);
        return res.status(500).json({ error: `Database seed failed: ${err.message}` });
      }
      console.log('Seed executed successfully:\n', stdout);
      res.json({ message: 'Database reset and seeded successfully!' });
    });
  } catch (error) {
    console.error('Database reset endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET notifications for a user or role
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId, role } = req.query;
    let query = 'SELECT * FROM notifications WHERE ';
    let params = [];
    if (userId && role) {
      if (role === 'driver') {
        // Ensure attendance record exists
        await ensureAttendanceResets(userId);
      }
      query += '(user_id = ? OR (user_id IS NULL AND role = ?))';
      params.push(userId, role);
    } else if (userId) {
      query += 'user_id = ?';
      params.push(userId);
    } else if (role) {
      query += 'role = ?';
      params.push(role);
    } else {
      query += '1 = 1';
    }
    query += ' ORDER BY created_at DESC, id DESC LIMIT 20';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH mark notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE clear all notifications for a user
app.delete('/api/notifications/clear', async (req, res) => {
  try {
    const { userId, role } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Delete user-specific notifications
    // Also delete role-wide notifications matching the role (e.g. driver notifications) so that the user's dashboard is fully cleared
    await db.query(
      'DELETE FROM notifications WHERE user_id = ? OR (user_id IS NULL AND role = ?)',
      [userId, role]
    );
    
    res.json({ message: 'Notifications cleared successfully' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update user password
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    // If user has a password set, compare it.
    if (user.password) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- SAFETY CENTER ROUTES ---

// Get trusted contacts
app.get('/api/contacts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [contacts] = await db.query('SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(contacts);
  } catch (error) {
    console.error('Fetch contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add trusted contact
app.post('/api/contacts', async (req, res) => {
  try {
    const { userId, name, phone } = req.body;
    const [result] = await db.query(
      'INSERT INTO trusted_contacts (user_id, name, phone) VALUES (?, ?, ?)',
      [userId, name, phone]
    );
    res.status(201).json({ message: 'Contact added successfully', contactId: result.insertId });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete trusted contact
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM trusted_contacts WHERE id = ?', [id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log SOS Alert
app.post('/api/sos', async (req, res) => {
  try {
    const { userId } = req.body;
    const [result] = await db.query('INSERT INTO sos_alerts (user_id) VALUES (?)', [userId]);
    res.status(201).json({ message: 'SOS Alert logged', alertId: result.insertId });
  } catch (error) {
    console.error('SOS Alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit Incident Report
app.post('/api/reports', async (req, res) => {
  try {
    const { userId, issueType, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO incident_reports (user_id, issue_type, description) VALUES (?, ?, ?)',
      [userId, issueType, description]
    );
    res.status(201).json({ message: 'Report submitted successfully', reportId: result.insertId });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// --- WALLET ROUTES ---

// Get Wallet Data
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch or create wallet
    let [wallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    if (wallets.length === 0) {
      await db.query('INSERT INTO wallets (user_id) VALUES (?)', [userId]);
      [wallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    }
    const wallet = wallets[0];
    
    // Fetch saved cards
    const [cards] = await db.query('SELECT * FROM saved_cards WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    
    // Fetch transactions
    const [transactions] = await db.query('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC', [userId]);

    res.json({
      wallet,
      cards,
      transactions
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Money to Wallet
app.post('/api/wallet/add-money', async (req, res) => {
  try {
    const { userId, amount, method } = req.body;
    
    // Ensure wallet exists
    let [wallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    if (wallets.length === 0) {
      await db.query('INSERT INTO wallets (user_id) VALUES (?)', [userId]);
    }
    
    // Calculate Reward Points (1 point per dollar)
    const points = Math.floor(amount);
    
    // Update wallet balance and points
    await db.query(
      'UPDATE wallets SET balance = balance + ?, reward_points = reward_points + ? WHERE user_id = ?',
      [amount, points, userId]
    );
    
    const desc = method ? `Added funds via ${method}` : 'Added funds via Saved Card';
    
    // Log transaction
    await db.query(
      'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
      [userId, amount, 'credit', desc]
    );

    // Auto-detect and pay for any pending 'started' trips if balance is now sufficient
    const [startedBookings] = await db.query(
      "SELECT * FROM bookings WHERE client_id = ? AND status = 'started' ORDER BY created_at ASC",
      [userId]
    );

    let [currWallets] = await db.query('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
    let currentBalance = currWallets.length > 0 ? parseFloat(currWallets[0].balance) : 0;

    for (const booking of startedBookings) {
      const priceNum = parseFloat(booking.price.replace(/[^0-9.]/g, ''));
      if (isNaN(priceNum) || priceNum <= 0) continue;

      if (currentBalance >= priceNum) {
        currentBalance -= priceNum;
        await db.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [currentBalance, userId]);
        await db.query(
          'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
          [userId, priceNum, 'debit', `Debit for Completed Trip Ref: ${booking.booking_ref} (Auto-Paid on Recharge)`]
        );

        // Find Admin to get platform commission
        let adminId = null;
        const [admins] = await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        if (admins.length > 0) {
          adminId = admins[0].id;
        } else {
          const defaultAdminPassword = await bcrypt.hash('admin12345', 10);
          const [result] = await db.query(
            'INSERT INTO users (role, first_name, last_name, phone_number, email, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['admin', 'System', 'Admin', '+10000000000', 'admin@gmail.com', defaultAdminPassword, 'active']
          );
          adminId = result.insertId;
        }

        let commissionRate = 30;
        if (adminId) {
          const [settings] = await db.query('SELECT platform_commission FROM user_settings WHERE user_id = ?', [adminId]);
          if (settings.length > 0 && settings[0].platform_commission !== null) {
            commissionRate = settings[0].platform_commission;
          }
        }

        const driverShare = parseFloat((priceNum * ((100 - commissionRate) / 100)).toFixed(2));
        const adminShare = parseFloat((priceNum * (commissionRate / 100)).toFixed(2));

        // Find Driver
        const driverName = booking.driver;
        let driverId = null;
        const [drivers] = await db.query(
          'SELECT id FROM users WHERE role = "driver" AND CONCAT(first_name, " ", last_name) = ?',
          [driverName]
        );
        if (drivers.length > 0) {
          driverId = drivers[0].id;
        } else {
          const [allDrivers] = await db.query('SELECT id FROM users WHERE role = "driver" LIMIT 1');
          if (allDrivers.length > 0) {
            driverId = allDrivers[0].id;
          }
        }

        if (driverId) {
          let [driverWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [driverId]);
          if (driverWallets.length === 0) {
            await db.query('INSERT INTO wallets (user_id) VALUES (?)', [driverId]);
          }
          await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [driverShare, driverId]);
          await db.query(
            'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
            [driverId, driverShare, 'credit', `${100 - commissionRate}% Earnings Share for Ride Ref: ${booking.booking_ref} (Auto-Paid)`]
          );
        }

        if (adminId) {
          let [adminWallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [adminId]);
          if (adminWallets.length === 0) {
            await db.query('INSERT INTO wallets (user_id) VALUES (?)', [adminId]);
          }
          await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [adminShare, adminId]);
          await db.query(
            'INSERT INTO wallet_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
            [adminId, adminShare, 'credit', `${commissionRate}% Admin Commission for Ride Ref: ${booking.booking_ref} (Auto-Paid)`]
          );
        }

        // Set booking status to completed
        await db.query('UPDATE bookings SET status = "completed" WHERE id = ?', [booking.id]);

        // Create notifications for client, driver, and admin
        await db.query(
          'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
          [userId, 'client', 'Trip Auto-Paid', `Your trip ${booking.booking_ref} has been automatically paid and completed. $${priceNum.toFixed(2)} has been deducted from your wallet.`]
        );
        if (driverId) {
          await db.query(
            'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
            [driverId, 'driver', 'Trip Auto-Paid & Completed', `Trip ${booking.booking_ref} payment is complete. Earnings share of $${driverShare.toFixed(2)} credited to wallet.`]
          );
        }
        if (adminId) {
          await db.query(
            'INSERT INTO notifications (user_id, role, title, message) VALUES (?, ?, ?, ?)',
            [adminId, 'admin', 'New Commission Earned', `Trip ${booking.booking_ref} completed automatically after client recharge. Admin share of $${adminShare.toFixed(2)} credited.`]
          );
        }
      }
    }
    
    res.json({ message: 'Funds added successfully' });
  } catch (error) {
    console.error('Add money error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Saved Card
app.post('/api/wallet/add-card', async (req, res) => {
  try {
    const { userId, cardNumber, expiryDate, cardBrand, cardLast4 } = req.body;
    
    // Mock save by taking last 4 digits
    const last4 = cardLast4 || (cardNumber ? cardNumber.slice(-4) : '0000');
    const brand = cardBrand || (cardNumber && cardNumber.startsWith('4') ? 'Visa' : 'Mastercard');
    
    await db.query(
      'INSERT INTO saved_cards (user_id, card_last4, card_brand, expiry_date) VALUES (?, ?, ?, ?)',
      [userId, last4, brand, expiryDate]
    );
    
    res.status(201).json({ message: 'Card saved successfully' });
  } catch (error) {
    console.error('Add card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Saved Card
app.delete('/api/wallet/card/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM saved_cards WHERE id = ?', [id]);
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle Auto-reload
app.post('/api/wallet/toggle-reload', async (req, res) => {
  try {
    const { userId, autoReload } = req.body;
    await db.query('UPDATE wallets SET auto_reload = ? WHERE user_id = ?', [autoReload ? 1 : 0, userId]);
    res.json({ message: 'Auto-reload updated' });
  } catch (error) {
    console.error('Toggle reload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET user profile and metrics
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await db.query('SELECT id, role, first_name, last_name, phone_number, email, created_at, license_no, profile_photo, license_front, license_back, aadhaar_front, aadhaar_back FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Get total bookings count (role-aware)
    let bookingsCountQuery = 'SELECT COUNT(*) as count FROM bookings WHERE client_id = ?';
    if (user.role === 'driver') {
      bookingsCountQuery = 'SELECT COUNT(*) as count FROM bookings WHERE driver = (SELECT CONCAT(first_name, \' \', last_name) FROM users WHERE id = ?)';
    }
    const [bookingsCount] = await db.query(bookingsCountQuery, [id]);
    
    // Get wallet balance
    const [wallets] = await db.query('SELECT balance, reward_points FROM wallets WHERE user_id = ?', [id]);
    const balance = wallets.length > 0 ? wallets[0].balance : 0.00;
    const points = wallets.length > 0 ? wallets[0].reward_points : 0;
    
    // Get active incident reports count
    const [reportsCount] = await db.query('SELECT COUNT(*) as count FROM incident_reports WHERE user_id = ?', [id]);
    
    res.json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        email: user.email,
        createdAt: user.created_at,
        licenseNo: user.license_no,
        profilePhoto: user.profile_photo,
        licenseFront: user.license_front,
        licenseBack: user.license_back,
        aadhaarFront: user.aadhaar_front,
        aadhaarBack: user.aadhaar_back
      },
      metrics: {
        totalBookings: bookingsCount[0].count,
        walletBalance: balance,
        rewardPoints: points,
        activeReports: reportsCount[0].count
      }
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update user profile
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, profilePhoto } = req.body;
    
    let query = 'UPDATE users SET ';
    const params = [];
    
    if (firstName !== undefined) {
      query += 'first_name = ?, ';
      params.push(firstName);
    }
    if (lastName !== undefined) {
      query += 'last_name = ?, ';
      params.push(lastName);
    }
    if (email !== undefined) {
      query += 'email = ?, ';
      params.push(email || null);
    }
    if (profilePhoto !== undefined) {
      query += 'profile_photo = ?, ';
      params.push(profilePhoto || null);
    }
    
    if (params.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);
    
    await db.query(query, params);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update user password (security credentials)
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Fetch user password hash
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // If password exists, verify current password
    if (user.password) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
    }

    // Hash the new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update in database
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET user settings
app.get('/api/users/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if settings exist
    const [settings] = await db.query('SELECT * FROM user_settings WHERE user_id = ?', [id]);
    
    if (settings.length > 0) {
      return res.json(settings[0]);
    }
    
    // If not, insert default settings row
    await db.query(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [id]
    );
    
    // Fetch and return the newly inserted default row
    const [newSettings] = await db.query('SELECT * FROM user_settings WHERE user_id = ?', [id]);
    res.json(newSettings[0]);
  } catch (error) {
    console.error('Fetch user settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update user settings
app.put('/api/users/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sidebarCompact,
      dutyType,
      transmission,
      carModel,
      silentRide,
      smsAlerts,
      emailAlerts,
      pushNotifications,
      sosContactPhone,
      autoAlertSos,
      // Admin specific settings
      platformCommission,
      minFare,
      ratingThreshold,
      autoApproveDrivers,
      baseCurrency,
      mapRefreshInterval
    } = req.body;

    const toInt = (val) => (val === true || val === 1 || val === 'true') ? 1 : 0;

    await db.query(
      `INSERT INTO user_settings (
        user_id, sidebar_compact, duty_type, transmission, car_model, silent_ride,
        sms_alerts, email_alerts, push_notifications, sos_contact_phone, auto_alert_sos,
        platform_commission, min_fare, rating_threshold, auto_approve_drivers,
        base_currency, map_refresh_interval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        sidebar_compact = VALUES(sidebar_compact),
        duty_type = VALUES(duty_type),
        transmission = VALUES(transmission),
        car_model = VALUES(car_model),
        silent_ride = VALUES(silent_ride),
        sms_alerts = VALUES(sms_alerts),
        email_alerts = VALUES(email_alerts),
        push_notifications = VALUES(push_notifications),
        sos_contact_phone = VALUES(sos_contact_phone),
        auto_alert_sos = VALUES(auto_alert_sos),
        platform_commission = VALUES(platform_commission),
        min_fare = VALUES(min_fare),
        rating_threshold = VALUES(rating_threshold),
        auto_approve_drivers = VALUES(auto_approve_drivers),
        base_currency = VALUES(base_currency),
        map_refresh_interval = VALUES(map_refresh_interval)`,
      [
        id,
        toInt(sidebarCompact),
        dutyType || 'Inside City',
        transmission || 'Automatic',
        (carModel || '').trim(),
        toInt(silentRide),
        toInt(smsAlerts),
        toInt(emailAlerts),
        toInt(pushNotifications),
        (sosContactPhone || '').trim(),
        toInt(autoAlertSos),
        platformCommission !== undefined ? Number(platformCommission) : 30,
        minFare !== undefined ? Number(minFare) : 10.00,
        ratingThreshold !== undefined ? Number(ratingThreshold) : 4.50,
        toInt(autoApproveDrivers),
        baseCurrency || 'USD',
        mapRefreshInterval !== undefined ? Number(mapRefreshInterval) : 10
      ]
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- REAL DRIVER DASHBOARD BACKEND SERVICE ---

const initializeDatabase = async () => {
  try {
    console.log('Initializing extra driver tables...');
    
    // Increase MySQL packet size limit for large base64 uploads (not needed/supported in PostgreSQL/Supabase)
    /*
    try {
      await db.query('SET GLOBAL max_allowed_packet = 67108864');
      await db.query('SET SESSION max_allowed_packet = 67108864');
      console.log('Increased MySQL max_allowed_packet limit to 64MB');
    } catch (e) {
      console.warn('Could not set max_allowed_packet:', e.message);
    }
    */
    
    // Create notifications table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NULL,
        \`role\` VARCHAR(20) NOT NULL,
        \`title\` VARCHAR(100) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`is_read\` TINYINT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alter users table to add status column if not exists
    try {
      await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
      console.log("Added status column to users table");
    } catch (e) {
      // ignore if exists
    }

    const alterColumns = [
      { name: 'license_no', type: 'VARCHAR(100) NULL' },
      { name: 'profile_photo', type: 'LONGTEXT NULL' },
      { name: 'license_front', type: 'LONGTEXT NULL' },
      { name: 'license_back', type: 'LONGTEXT NULL' },
      { name: 'aadhaar_front', type: 'LONGTEXT NULL' },
      { name: 'aadhaar_back', type: 'LONGTEXT NULL' }
    ];

    for (const col of alterColumns) {
      try {
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`Added ${col.name} column to users table`);
      } catch (e) {
        // ignore if exists
      }
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`driver_attendance\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL UNIQUE,
        \`is_clocked_in\` TINYINT DEFAULT 0,
        \`hours_logged\` DECIMAL(10,4) DEFAULT 0.0000,
        \`monthly_hours_logged\` DECIMAL(10,4) DEFAULT 0.0000,
        \`last_clock_in\` TIMESTAMP NULL,
        \`last_clock_out\` TIMESTAMP NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`driver_attendance_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`event_type\` VARCHAR(50) NOT NULL,
        \`event_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`status\` VARCHAR(50) DEFAULT 'Success',
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`driver_documents\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`document_key\` VARCHAR(50) NOT NULL,
        \`document_name\` VARCHAR(100) NOT NULL,
        \`status\` VARCHAR(50) DEFAULT 'Pending Review',
        \`expiry_date\` VARCHAR(100) NOT NULL,
        \`file_path\` LONGTEXT NULL,
        \`uploaded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    try {
      await db.query('ALTER TABLE driver_documents MODIFY COLUMN file_path LONGTEXT NULL');
      console.log('Modified driver_documents.file_path to LONGTEXT');
    } catch (e) {
      // ignore
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`driver_kpis\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL UNIQUE,
        \`rating\` DECIMAL(3,2) DEFAULT 4.92,
        \`acceptance_rate\` INT DEFAULT 96,
        \`reliability_score\` INT DEFAULT 98,
        \`loyalty_tier\` VARCHAR(50) DEFAULT 'Gold Partner',
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);

    // Ensure bookings table has the otp column
    try {
      await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp VARCHAR(10) DEFAULT NULL');
      console.log('Added otp column to bookings table');
    } catch (e) {
      // Column might already exist, safe to ignore
    }

    // Ensure bookings table has the started_at column
    try {
      await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at VARCHAR(100) DEFAULT NULL');
      console.log('Added started_at column to bookings table');
    } catch (e) {
      // Column might already exist, safe to ignore
    }

    // Ensure bookings table has the promo_code column
    try {
      await db.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code VARCHAR(100) DEFAULT NULL');
      console.log('Added promo_code column to bookings table');
    } catch (e) {
      // Column might already exist, safe to ignore
    }

    // Ensure saved_cards table has large enough card_last4 column for third party accounts
    try {
      await db.query('ALTER TABLE saved_cards MODIFY COLUMN card_last4 VARCHAR(100) NOT NULL');
      console.log('Modified saved_cards.card_last4 to VARCHAR(100)');
    } catch (e) {
      // Column might not exist yet, or other error, safe to ignore
    }

    // Initialize existing bookings without OTP with a random OTP
    await db.query('UPDATE bookings SET otp = FLOOR(1000 + RAND() * 9000) WHERE otp IS NULL');

    // Create user_settings table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`user_settings\` (
        \`user_id\` INT PRIMARY KEY,
        \`sidebar_compact\` TINYINT DEFAULT 0,
        \`duty_type\` VARCHAR(50) DEFAULT 'Inside City',
        \`transmission\` VARCHAR(50) DEFAULT 'Automatic',
        \`car_model\` VARCHAR(100) DEFAULT '',
        \`silent_ride\` TINYINT DEFAULT 0,
        \`sms_alerts\` TINYINT DEFAULT 1,
        \`email_alerts\` TINYINT DEFAULT 1,
        \`push_notifications\` TINYINT DEFAULT 0,
        \`sos_contact_phone\` VARCHAR(20) DEFAULT '',
        \`auto_alert_sos\` TINYINT DEFAULT 1,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);
    console.log('User settings table initialized.');

    // Add admin-specific configuration columns to user_settings table if they don't exist
    const adminSettingsColumns = [
      { name: 'platform_commission', type: 'INT DEFAULT 30' },
      { name: 'min_fare', type: 'DECIMAL(10,2) DEFAULT 10.00' },
      { name: 'rating_threshold', type: 'DECIMAL(3,2) DEFAULT 4.50' },
      { name: 'auto_approve_drivers', type: 'TINYINT DEFAULT 0' },
      { name: 'base_currency', type: 'VARCHAR(10) DEFAULT \'USD\'' },
      { name: 'map_refresh_interval', type: 'INT DEFAULT 10' }
    ];

    for (const col of adminSettingsColumns) {
      try {
        await db.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to user_settings table`);
      } catch (e) {
        // ignore if exists
      }
    }

    console.log('Extra driver tables initialized successfully.');
  } catch (error) {
    console.error('Error initializing driver tables:', error);
  }
};
initializeDatabase();

// Helper to verify and apply daily and end-of-month resets on driver attendance hours
const ensureAttendanceResets = async (userId) => {
  let [rows] = await db.query('SELECT * FROM driver_attendance WHERE user_id = ?', [userId]);
  if (rows.length === 0) {
    await db.query('INSERT INTO driver_attendance (user_id) VALUES (?)', [userId]);
    [rows] = await db.query('SELECT * FROM driver_attendance WHERE user_id = ?', [userId]);
  }
  const attendance = rows[0];
  let lastActivity = null;
  if (attendance.last_clock_in && attendance.last_clock_out) {
    lastActivity = new Date(attendance.last_clock_in) > new Date(attendance.last_clock_out)
      ? attendance.last_clock_in
      : attendance.last_clock_out;
  } else {
    lastActivity = attendance.last_clock_in || attendance.last_clock_out;
  }

  // Align monthly hours if they are ever less than daily hours (due to column addition delay)
  if (Number(attendance.monthly_hours_logged) < Number(attendance.hours_logged)) {
    await db.query(
      'UPDATE driver_attendance SET monthly_hours_logged = hours_logged WHERE user_id = ?',
      [userId]
    );
    [rows] = await db.query('SELECT * FROM driver_attendance WHERE user_id = ?', [userId]);
  }

  if (lastActivity) {
    const lastActivityDate = new Date(lastActivity);
    const today = new Date();
    
    const isDifferentDay = lastActivityDate.toDateString() !== today.toDateString();
    const isDifferentMonth = lastActivityDate.getFullYear() !== today.getFullYear() || lastActivityDate.getMonth() !== today.getMonth();

    if (isDifferentMonth) {
      // Monthly reset: Reset both daily and monthly accumulated hours
      await db.query(
        'UPDATE driver_attendance SET hours_logged = 0.0000, monthly_hours_logged = 0.0000, is_clocked_in = 0, last_clock_in = NULL, last_clock_out = NULL WHERE user_id = ?',
        [userId]
      );
      [rows] = await db.query('SELECT * FROM driver_attendance WHERE user_id = ?', [userId]);
    } else if (isDifferentDay) {
      // Daily reset: Reset daily hours only, preserve monthly accumulated hours
      await db.query(
        'UPDATE driver_attendance SET hours_logged = 0.0000, is_clocked_in = 0, last_clock_in = NULL, last_clock_out = NULL WHERE user_id = ?',
        [userId]
      );
      [rows] = await db.query('SELECT * FROM driver_attendance WHERE user_id = ?', [userId]);
    }
  }
  return rows[0];
};

// Fetch attendance state and shift logs
app.get('/api/driver/attendance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const attendance = await ensureAttendanceResets(userId);
    const [logs] = await db.query('SELECT * FROM driver_attendance_logs WHERE user_id = ? ORDER BY event_time DESC LIMIT 10', [userId]);
    res.json({ attendance, logs });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clock-in / Clock-out duty toggling
app.post('/api/driver/attendance/toggle', async (req, res) => {
  try {
    const { userId } = req.body;
    const current = await ensureAttendanceResets(userId);
    const nextClockState = current.is_clocked_in === 1 ? 0 : 1;
    const now = new Date();
    
    if (nextClockState === 1) {
      // Clocking IN: keep existing accumulated hours, record clock-in time
      await db.query(
        'UPDATE driver_attendance SET is_clocked_in = 1, last_clock_in = ?, last_clock_out = NULL WHERE user_id = ?',
        [now, userId]
      );
    } else {
      // Clocking OUT: calculate session hours and ADD to total hours_logged
      let addedHours = 0;
      if (current.last_clock_in) {
        const clockInTime = new Date(current.last_clock_in);
        const diffMs = now.getTime() - clockInTime.getTime();
        addedHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(4));
        if (addedHours < 0) addedHours = 0;
      }
      
      const currentDaily = Number(current.hours_logged) || 0;
      const currentMonthly = Number(current.monthly_hours_logged) || 0;
      
      const newDailyHours = parseFloat((currentDaily + addedHours).toFixed(4));
      const newMonthlyHours = parseFloat((currentMonthly + addedHours).toFixed(4));
      
      await db.query(
        'UPDATE driver_attendance SET is_clocked_in = 0, hours_logged = ?, monthly_hours_logged = ?, last_clock_out = ? WHERE user_id = ?',
        [newDailyHours, newMonthlyHours, now, userId]
      );
    }

    // Create log entry
    await db.query(
      'INSERT INTO driver_attendance_logs (user_id, event_type, status) VALUES (?, ?, ?)',
      [userId, nextClockState === 1 ? 'Clock In' : 'Clock Out', 'Success']
    );

    const [updatedRows] = await db.query('SELECT * FROM driver_attendance WHERE user_id = ?', [userId]);
    const [logs] = await db.query('SELECT * FROM driver_attendance_logs WHERE user_id = ? ORDER BY event_time DESC LIMIT 10', [userId]);
    
    let addedHoursForToast = 0;
    if (nextClockState === 0 && current.last_clock_in) {
      const clockInTime = new Date(current.last_clock_in);
      const diffMs = now.getTime() - clockInTime.getTime();
      addedHoursForToast = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(4));
      if (addedHoursForToast < 0) addedHoursForToast = 0;
    }
    
    res.json({ attendance: updatedRows[0], logs, addedHours: addedHoursForToast });
  } catch (err) {
    console.error('Toggle attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch rating, acceptance rate, and partner level KPIs
app.get('/api/driver/kpis/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let [rows] = await db.query('SELECT * FROM driver_kpis WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      await db.query('INSERT INTO driver_kpis (user_id) VALUES (?)', [userId]);
      [rows] = await db.query('SELECT * FROM driver_kpis WHERE user_id = ?', [userId]);
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Fetch KPIs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Unified Documents for Driver (combining users table and driver_documents table)
const getUnifiedDocuments = async (userId) => {
  const [users] = await db.query('SELECT status, license_no, profile_photo, license_front, license_back, aadhaar_front, aadhaar_back FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    return [];
  }
  const user = users[0];
  const userStatus = user.status;
  
  let docStatus = 'Pending Review';
  if (userStatus === 'active') docStatus = 'Verified';
  else if (userStatus === 'rejected') docStatus = 'Rejected';
  
  const unifiedDocs = [
    {
      id: 'license_front',
      user_id: Number(userId),
      document_key: 'license_front',
      document_name: "Driver's License (Front)",
      status: user.license_front ? docStatus : 'Not Uploaded',
      expiry_date: user.license_front ? 'Dec 12, 2028' : 'N/A',
      file_path: user.license_front || ''
    },
    {
      id: 'license_back',
      user_id: Number(userId),
      document_key: 'license_back',
      document_name: "Driver's License (Back)",
      status: user.license_back ? docStatus : 'Not Uploaded',
      expiry_date: user.license_back ? 'Dec 12, 2028' : 'N/A',
      file_path: user.license_back || ''
    },
    {
      id: 'aadhaar_front',
      user_id: Number(userId),
      document_key: 'aadhaar_front',
      document_name: 'Aadhaar Card (Front)',
      status: user.aadhaar_front ? docStatus : 'Not Uploaded',
      expiry_date: user.aadhaar_front ? 'Permanent' : 'N/A',
      file_path: user.aadhaar_front || ''
    },
    {
      id: 'aadhaar_back',
      user_id: Number(userId),
      document_key: 'aadhaar_back',
      document_name: 'Aadhaar Card (Back)',
      status: user.aadhaar_back ? docStatus : 'Not Uploaded',
      expiry_date: user.aadhaar_back ? 'Permanent' : 'N/A',
      file_path: user.aadhaar_back || ''
    }
  ];
  
  return unifiedDocs;
};

// Fetch documents validity
app.get('/api/driver/documents/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const docs = await getUnifiedDocuments(userId);
    res.json(docs);
  } catch (err) {
    console.error('Fetch driver documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark new file path upload
app.post('/api/driver/documents/upload', async (req, res) => {
  try {
    const { userId, documentKey, filePath } = req.body;
    const userTableColumns = ['license_front', 'license_back', 'aadhaar_front', 'aadhaar_back', 'profile_photo'];
    
    if (userTableColumns.includes(documentKey)) {
      await db.query(`UPDATE users SET ${documentKey} = ? WHERE id = ?`, [filePath, userId]);
      await db.query('UPDATE users SET status = "pending" WHERE id = ?', [userId]);
    } else {
      const [existing] = await db.query('SELECT * FROM driver_documents WHERE user_id = ? AND document_key = ?', [userId, documentKey]);
      if (existing.length === 0) {
        const documentNames = {
          insurance: 'Vehicle Insurance',
          registration: 'Vehicle Registration'
        };
        const name = documentNames[documentKey] || documentKey;
        await db.query(
          'INSERT INTO driver_documents (user_id, document_key, document_name, status, expiry_date, file_path) VALUES (?, ?, ?, "Pending Review", "Pending Verification", ?)',
          [userId, documentKey, name, filePath]
        );
      } else {
        await db.query(
          'UPDATE driver_documents SET status = "Pending Review", expiry_date = "Pending Verification", file_path = ? WHERE user_id = ? AND document_key = ?',
          [filePath, userId, documentKey]
        );
      }
    }
    
    const docs = await getUnifiedDocuments(userId);
    res.json({ message: 'Document uploaded successfully', documents: docs });
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
