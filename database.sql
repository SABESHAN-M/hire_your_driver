-- Run this script in XAMPP phpMyAdmin (http://localhost/phpmyadmin)
-- It will create the database and the necessary tables for the React application.

CREATE DATABASE IF NOT EXISTS `hire_your_driver`;
USE `hire_your_driver`;

-- Users table handles Clients, Drivers, and Admins
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role` ENUM('client', 'driver', 'admin') NOT NULL DEFAULT 'client',
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone_number` VARCHAR(20) NOT NULL UNIQUE,
  `email` VARCHAR(100) NULL,
  `password` VARCHAR(255) NULL, -- Optional if they login using phone OTP
  `status` VARCHAR(20) DEFAULT 'active',
  `license_no` VARCHAR(100) NULL,
  `profile_photo` LONGTEXT NULL,
  `license_front` LONGTEXT NULL,
  `license_back` LONGTEXT NULL,
  `aadhaar_front` LONGTEXT NULL,
  `aadhaar_back` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table to store driver license photos or avatar
CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `document_type` ENUM('avatar', 'license_front', 'license_back') NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_ref` VARCHAR(50) NOT NULL,
  `client_id` INT NOT NULL,
  `status` VARCHAR(20) DEFAULT 'upcoming',
  `date` VARCHAR(100) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `destination` VARCHAR(255) NOT NULL,
  `duty_type` VARCHAR(50) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  `transmission` VARCHAR(50) NOT NULL,
  `car_model` VARCHAR(100) NOT NULL,
  `driver` VARCHAR(100) DEFAULT 'Waiting for Driver',
  `price` VARCHAR(50) NOT NULL,
  `otp` VARCHAR(10) DEFAULT NULL,
  `started_at` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Trusted Contacts table
CREATE TABLE IF NOT EXISTS `trusted_contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Incident Reports table
CREATE TABLE IF NOT EXISTS `incident_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `issue_type` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'open',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- SOS Alerts table
CREATE TABLE IF NOT EXISTS `sos_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'active',
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Wallet Table
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `balance` DECIMAL(10, 2) DEFAULT 0.00,
  `reward_points` INT DEFAULT 0,
  `auto_reload` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Saved Cards Table
CREATE TABLE IF NOT EXISTS `saved_cards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `card_last4` VARCHAR(100) NOT NULL,
  `card_brand` VARCHAR(50) NOT NULL,
  `expiry_date` VARCHAR(5) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `transaction_type` ENUM('credit', 'debit') NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
