/* ============================================================
   HOC App schema — SQL Server (T-SQL) version
   Converted from MySQL
   ============================================================
   Run this while connected to the [master] database. If hoc_app
   is currently in use, DROP DATABASE will fail — the SINGLE_USER
   block below force-closes existing connections first.
   ============================================================ */

IF DB_ID('hoc_app') IS NOT NULL
BEGIN
    ALTER DATABASE hoc_app SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE hoc_app;
END
GO

CREATE DATABASE hoc_app;
GO

USE hoc_app;
GO

/* ============================================================
   Users table
   ============================================================ */
CREATE TABLE users (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    employee_id VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(10)  NOT NULL DEFAULT 'User'
                    CONSTRAINT chk_users_role CHECK (role IN ('User', 'Admin')),
    is_active   BIT          NOT NULL DEFAULT 1,
    created_at  DATETIME2    NOT NULL DEFAULT SYSDATETIME(),
    updated_at  DATETIME2    NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ============================================================
   OTP Verifications table (2FA)
   ============================================================ */
CREATE TABLE otp_verifications (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    user_id    INT         NOT NULL,
    otp        VARCHAR(10) NOT NULL,
    expires_at DATETIME2   NOT NULL,
    created_at DATETIME2   NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_otp UNIQUE (user_id)
);
GO

/* ============================================================
   Variant Master table
   ============================================================ */
CREATE TABLE variant_master (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    variant_type VARCHAR(100) NOT NULL,
    variant_name VARCHAR(150) NOT NULL,
    variant_code VARCHAR(50),
    description  VARCHAR(MAX),
    created_at   DATETIME2    NOT NULL DEFAULT SYSDATETIME(),
    updated_at   DATETIME2    NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT unique_variant UNIQUE (variant_type, variant_name)
);
GO

/* ============================================================
   HOC Input table (main reports table)
   ============================================================ */
CREATE TABLE hoc_input (
    job_id               INT IDENTITY(1,1) PRIMARY KEY,
    job_req_for          VARCHAR(100) NOT NULL,
    company              VARCHAR(150),
    observer_name        VARCHAR(150) NOT NULL,
    observation_date     DATE,

    -- Foreign keys to variant_master
    location_id          INT NOT NULL,
    area_id              INT NOT NULL,
    status_id            INT NOT NULL,
    category_id          INT NOT NULL,
    action_department_id INT,

    oper_act             VARCHAR(255),
    observations         VARCHAR(MAX) NOT NULL,
    corrective_actions   VARCHAR(MAX),

    accountable_person   VARCHAR(150),
    responsible_person   VARCHAR(150),
    hod                  VARCHAR(150),

    image_url            VARCHAR(255),
    stop_job             VARCHAR(3) NOT NULL DEFAULT 'No'
                             CONSTRAINT chk_hoc_stop_job CHECK (stop_job IN ('Yes', 'No')),
    end_date             DATE,
    remarks              VARCHAR(MAX),

    severity             VARCHAR(10) NOT NULL DEFAULT 'Low'
                             CONSTRAINT chk_hoc_severity CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    fy_year              VARCHAR(20),

    reported_by          INT NOT NULL,
    created_date         DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    modified_date        DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT fk_hoc_reported_by FOREIGN KEY (reported_by)          REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_hoc_location    FOREIGN KEY (location_id)          REFERENCES variant_master(id),
    CONSTRAINT fk_hoc_area        FOREIGN KEY (area_id)              REFERENCES variant_master(id),
    CONSTRAINT fk_hoc_status      FOREIGN KEY (status_id)            REFERENCES variant_master(id),
    CONSTRAINT fk_hoc_category    FOREIGN KEY (category_id)          REFERENCES variant_master(id),
    CONSTRAINT fk_hoc_action_dept FOREIGN KEY (action_department_id) REFERENCES variant_master(id)
);
GO

/* ============================================================
   Indexes
   ============================================================ */
CREATE INDEX idx_reported_by      ON hoc_input(reported_by);
CREATE INDEX idx_severity         ON hoc_input(severity);
CREATE INDEX idx_created_date     ON hoc_input(created_date);

CREATE INDEX idx_user_email       ON users(email);
CREATE INDEX idx_user_employee_id ON users(employee_id);
CREATE INDEX idx_variant_type     ON variant_master(variant_type);
GO

/* ============================================================
   Triggers — emulate MySQL's ON UPDATE CURRENT_TIMESTAMP
   (SQL Server has no column-level "on update" clause)
   ============================================================ */
CREATE TRIGGER trg_users_set_updated_at
ON users AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE u SET updated_at = SYSDATETIME()
    FROM users u INNER JOIN inserted i ON u.id = i.id;
END;
GO

CREATE TRIGGER trg_variant_master_set_updated_at
ON variant_master AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE v SET updated_at = SYSDATETIME()
    FROM variant_master v INNER JOIN inserted i ON v.id = i.id;
END;
GO

CREATE TRIGGER trg_hoc_input_set_modified_date
ON hoc_input AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE h SET modified_date = SYSDATETIME()
    FROM hoc_input h INNER JOIN inserted i ON h.job_id = i.job_id;
END;
GO

/* ============================================================
   Sample data for testing
   Admin password: admin123 (bcrypt hash)
   User  password: user123  (bcrypt hash)
   ============================================================ */
INSERT INTO users (employee_id, name, email, phone, password, role) VALUES
('EMP001', 'Admin User',   'admin@hocapp.com', '9999999999', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin'),
('EMP002', 'Regular User',  'user@hocapp.com', '9999999998', '$2a$10$YourHashHereForUser123PlaceholderValueXyz1234567890ab', 'User');
GO

INSERT INTO variant_master (variant_type, variant_name, variant_code) VALUES
('Location', 'Floor 1',       'F1'),
('Location', 'Floor 2',       'F2'),
('Area',     'Production',    'PROD'),
('Area',     'Packaging',     'PKG'),
('Status',   'Open',          'OPEN'),
('Status',   'Closed',        'CLOSED'),
('Category', 'Safety Hazard', 'SH'),
('Category', 'Environmental', 'ENV');
GO
