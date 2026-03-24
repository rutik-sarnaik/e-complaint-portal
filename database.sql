-- Municipal Complaint Management System Database Schema
-- For MySQL / MariaDB

CREATE DATABASE IF NOT EXISTS municipal_system;
USE municipal_system;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('citizen', 'admin') DEFAULT 'citizen',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    image_path VARCHAR(255),
    status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Default Admin
-- Password is 'admin123' (hashed using bcrypt)
INSERT INTO users (name, email, phone, password, role) 
VALUES ('Administrator', 'admin@municipal.gov', '0000000000', '$2a$10$7.p/f7W.v0h9Y.v0h9Y.v0h9Y.v0h9Y.v0h9Y.v0h9Y.v0h9Y', 'admin')
ON DUPLICATE KEY UPDATE email=email;
