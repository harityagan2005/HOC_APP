IF DB_ID('hoc_app') IS NOT NULL
BEGIN
    ALTER DATABASE hoc_app SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE hoc_app;
END
CREATE DATABASE hoc_app;
GO
USE hoc_app;
GO

-- Users table
IF OBJECT_ID('users', 'U') IS NULL
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'User' CHECK (role IN ('User', 'Admin')),
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END

-- OTP Verifications table for 2FA
IF OBJECT_ID('otp_verifications', 'U') IS NULL
BEGIN
    CREATE TABLE otp_verifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_otp_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT UQ_otp_user UNIQUE (user_id)
    );
END

-- Variant Master table
IF OBJECT_ID('variant_master', 'U') IS NULL
BEGIN
    CREATE TABLE variant_master (
        id INT IDENTITY(1,1) PRIMARY KEY,
        variant_type VARCHAR(100) NOT NULL,
        variant_name VARCHAR(150) NOT NULL,
        variant_code VARCHAR(50),
        description TEXT,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_variant UNIQUE (variant_type, variant_name)
    );
END

-- HOC Input table (Main reports table)
IF OBJECT_ID('hoc_input', 'U') IS NULL
BEGIN
    CREATE TABLE hoc_input (
        job_id INT IDENTITY(1,1) PRIMARY KEY,
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
        stop_job VARCHAR(10) DEFAULT 'No' CHECK (stop_job IN ('Yes', 'No')),
        end_date DATE,
        remarks TEXT,
        
        severity VARCHAR(20) DEFAULT 'Low' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
        fy_year VARCHAR(20),
        
        reported_by INT NOT NULL,
        created_date DATETIME DEFAULT GETDATE(),
        modified_date DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_hoc_users FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_hoc_location FOREIGN KEY (location_id) REFERENCES variant_master(id),
        CONSTRAINT FK_hoc_area FOREIGN KEY (area_id) REFERENCES variant_master(id),
        CONSTRAINT FK_hoc_status FOREIGN KEY (status_id) REFERENCES variant_master(id),
        CONSTRAINT FK_hoc_category FOREIGN KEY (category_id) REFERENCES variant_master(id),
        CONSTRAINT FK_hoc_dept FOREIGN KEY (action_department_id) REFERENCES variant_master(id)
    );
END

-- Create indexes for better query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_user_email' AND object_id = OBJECT_ID('users'))
    CREATE INDEX idx_user_email ON users(email);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_user_employee_id' AND object_id = OBJECT_ID('users'))
    CREATE INDEX idx_user_employee_id ON users(employee_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_variant_type' AND object_id = OBJECT_ID('variant_master'))
    CREATE INDEX idx_variant_type ON variant_master(variant_type);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_reported_by' AND object_id = OBJECT_ID('hoc_input'))
    CREATE INDEX idx_reported_by ON hoc_input(reported_by);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_severity' AND object_id = OBJECT_ID('hoc_input'))
    CREATE INDEX idx_severity ON hoc_input(severity);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_created_date' AND object_id = OBJECT_ID('hoc_input'))
    CREATE INDEX idx_created_date ON hoc_input(created_date);

-- Sample data for testing
-- Admin password: admin123 (bcrypt hash)
-- User password: user123 (bcrypt hash)
IF NOT EXISTS (SELECT 1 FROM users WHERE employee_id = 'EMP001')
BEGIN
    INSERT INTO users (employee_id, name, email, phone, password, role, is_active) VALUES 
    ('EMP001', 'Admin User', 'admin@hocapp.com', '9999999999', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 1);
END

IF NOT EXISTS (SELECT 1 FROM users WHERE employee_id = 'EMP002')
BEGIN
    INSERT INTO users (employee_id, name, email, phone, password, role, is_active) VALUES 
    ('EMP002', 'Regular User', 'user@hocapp.com', '9999999998', '$2a$10$YourHashHereForUser123PlaceholderValueXyz1234567890ab', 'User', 1);
END

IF NOT EXISTS (SELECT 1 FROM variant_master WHERE variant_type = 'Location' AND variant_name = 'Floor 1')
BEGIN
    INSERT INTO variant_master (variant_type, variant_name, variant_code) VALUES 
    ('Location', 'Floor 1', 'F1'),
    ('Location', 'Floor 2', 'F2'),
    ('Area', 'Production', 'PROD'),
    ('Area', 'Packaging', 'PKG'),
    ('Status', 'Open', 'OPEN'),
    ('Status', 'Closed', 'CLOSED'),
    ('Category', 'Safety Hazard', 'SH'),
    ('Category', 'Environmental', 'ENV');
END
