DROP DATABASE IF EXISTS hoc_app;
CREATE DATABASE hoc_app;
USE hoc_app;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role ENUM('User', 'Admin') DEFAULT 'User',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP Verifications table for 2FA
CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_otp (user_id)
);

-- Variant Master table
CREATE TABLE IF NOT EXISTS variant_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_type VARCHAR(100) NOT NULL,
    variant_name VARCHAR(150) NOT NULL,
    variant_code VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_variant (variant_type, variant_name)
);

-- HOC Input table (Main reports table)
CREATE TABLE IF NOT EXISTS hoc_input (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    job_req_for VARCHAR(100) NOT NULL,
    company VARCHAR(150),
    observer_name VARCHAR(150) NOT NULL,
    observation_date DATE,
    
    -- Foreign keys to variant_master
    location_id INT NOT NULL,
    area_id INT NOT NULL,
    status_id INT NOT NULL,
    category_id INT NOT NULL,
    action_department_id INT,
    
    oper_act VARCHAR(255),
    observations TEXT NOT NULL,
    corrective_actions TEXT,
    
    accountable_person VARCHAR(150),
    responsible_person VARCHAR(150),
    hod VARCHAR(150),
    
    image_url VARCHAR(255),
    stop_job ENUM('Yes', 'No') DEFAULT 'No',
    end_date DATE,
    remarks TEXT,
    
    severity ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low',
    fy_year VARCHAR(20),
    
    reported_by INT NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES variant_master(id),
    FOREIGN KEY (area_id) REFERENCES variant_master(id),
    FOREIGN KEY (status_id) REFERENCES variant_master(id),
    FOREIGN KEY (category_id) REFERENCES variant_master(id),
    FOREIGN KEY (action_department_id) REFERENCES variant_master(id),
    
    INDEX idx_reported_by (reported_by),
    INDEX idx_severity (severity),
    INDEX idx_created_date (created_date)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_employee_id ON users(employee_id);
CREATE INDEX idx_variant_type ON variant_master(variant_type);

-- Sample data for testing
-- Admin password: admin123 (bcrypt hash)
-- User password: user123 (bcrypt hash)
INSERT INTO users (employee_id, name, email, phone, password, role) VALUES 
('EMP001', 'Admin User', 'admin@hocapp.com', '9999999999', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin'),
('EMP002', 'Regular User', 'user@hocapp.com', '9999999998', '$2a$10$YourHashHereForUser123PlaceholderValueXyz1234567890ab', 'User');

INSERT INTO variant_master (variant_type, variant_name, variant_code) VALUES 
('Location', 'Floor 1', 'F1'),
('Location', 'Floor 2', 'F2'),
('Area', 'Production', 'PROD'),
('Area', 'Packaging', 'PKG'),
('Status', 'Open', 'OPEN'),
('Status', 'Closed', 'CLOSED'),
('Category', 'Safety Hazard', 'SH'),
('Category', 'Environmental', 'ENV');
