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
    -- Only meaningful for variant_type = 'Department': the address that
    -- automated report-assignment emails are sent to, and the department's
    -- Head of Department (auto-filled into the report form on selection).
    email        VARCHAR(255),
    hod          VARCHAR(150),
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

    responsible_person   VARCHAR(150),
    hod                  VARCHAR(150),

    image_url            VARCHAR(255),
    stop_job             VARCHAR(3) NOT NULL DEFAULT 'No'
                             CONSTRAINT chk_hoc_stop_job CHECK (stop_job IN ('Yes', 'No')),
    remarks              VARCHAR(MAX),

    severity             VARCHAR(10) NOT NULL DEFAULT 'Low'
                             CONSTRAINT chk_hoc_severity CHECK (severity IN ('Low', 'Medium', 'High')),

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
('EMP001', 'Admin User',      'admin@hocapp.com',      '9999999999', '$2a$10$4gmHZYWU02k7snDF6BuhruqYzdPg/U8vBHYxqJn1p1k29YfXY9xyO', 'Admin'),
('EMP002', 'Regular User',    'user@hocapp.com',       '9999999998', '$2a$10$jbePqNPIgcUpT1VngadTtOhhz2jRr4x0kwIY4uNpjyVNZREmFTTpG', 'User'),
('EMP003', 'Site Supervisor', 'supervisor@hocapp.com', '9999999997', '$2a$10$jbePqNPIgcUpT1VngadTtOhhz2jRr4x0kwIY4uNpjyVNZREmFTTpG', 'User');
GO

INSERT INTO variant_master (variant_type, variant_name, variant_code, email, hod) VALUES
('Location', 'Floor 1',            'F1',    NULL, NULL),
('Location', 'Floor 2',            'F2',    NULL, NULL),
('Location', 'Plant Yard',         'YARD',  NULL, NULL),
('Area',     'Production',         'PROD',  NULL, NULL),
('Area',     'Packaging',          'PKG',   NULL, NULL),
('Area',     'Warehouse',          'WH',    NULL, NULL),
('Status',   'Open',               'OPEN',       NULL, NULL),
('Status',   'In Progress',        'INPROG',     NULL, NULL),
('Status',   'Resolved',           'RESOLVED',   NULL, NULL),
('Status',   'Closed',             'CLOSED',     NULL, NULL),
('Category', 'Safety Hazard',      'SH',    NULL, NULL),
('Category', 'Environmental',      'ENV',   NULL, NULL),
('Category', 'Equipment Fault',    'EQF',   NULL, NULL),
('Department', 'Safety Department',      'DEPT-SAFETY', 'safety.dept@hocapp.com',      'Rajesh Kumar'),
('Department', 'Maintenance Department', 'DEPT-MAINT',  'maintenance.dept@hocapp.com', 'Suresh Iyer'),
('Department', 'Operations Department',  'DEPT-OPS',    'operations.dept@hocapp.com',  'Priya Nair');
GO

/* Demo hazard observation reports so dashboards/lists have data to show */
INSERT INTO hoc_input (
    job_req_for, company, observer_name, observation_date,
    location_id, area_id, status_id, category_id, action_department_id,
    oper_act, observations, corrective_actions,
    responsible_person, hod, stop_job, severity, reported_by
)
SELECT 'Scaffolding Inspection', 'Reliance Contractors Ltd.', 'Admin User', '2026-06-15',
       loc.id, area.id, stat.id, cat.id, dept.id,
       'Erecting scaffolding for maintenance work',
       'Scaffolding erected without base plates on uneven ground, risk of collapse.',
       'Base plates installed and scaffold re-inspected before use.',
       'Site Supervisor', 'Admin User', 'Yes', 'High', u.id
FROM variant_master loc, variant_master area, variant_master stat, variant_master cat, variant_master dept, users u
WHERE loc.variant_name = 'Floor 1' AND area.variant_name = 'Production' AND stat.variant_name = 'Closed'
  AND cat.variant_name = 'Safety Hazard' AND dept.variant_name = 'Safety Department' AND u.employee_id = 'EMP001';

INSERT INTO hoc_input (
    job_req_for, company, observer_name, observation_date,
    location_id, area_id, status_id, category_id, action_department_id,
    oper_act, observations, corrective_actions,
    responsible_person, hod, stop_job, severity, reported_by
)
SELECT 'Conveyor Belt Maintenance', 'Reliance Industries', 'Regular User', '2026-06-20',
       loc.id, area.id, stat.id, cat.id, dept.id,
       'Routine conveyor belt servicing',
       'Conveyor belt guard missing, exposing moving parts near walkway.',
       NULL,
       'Site Supervisor', 'Admin User', 'No', 'High', u.id
FROM variant_master loc, variant_master area, variant_master stat, variant_master cat, variant_master dept, users u
WHERE loc.variant_name = 'Floor 2' AND area.variant_name = 'Warehouse' AND stat.variant_name = 'In Progress'
  AND cat.variant_name = 'Equipment Fault' AND dept.variant_name = 'Maintenance Department' AND u.employee_id = 'EMP002';

INSERT INTO hoc_input (
    job_req_for, company, observer_name, observation_date,
    location_id, area_id, status_id, category_id, action_department_id,
    oper_act, observations, corrective_actions,
    responsible_person, hod, stop_job, severity, reported_by
)
SELECT 'Waste Disposal Check', 'Reliance Industries', 'Site Supervisor', '2026-06-25',
       loc.id, area.id, stat.id, cat.id, dept.id,
       'Routine waste yard walkthrough',
       'Chemical waste drums stored without secondary containment near drainage.',
       'Drums moved to designated containment area same day.',
       'Regular User', 'Admin User', 'No', 'Medium', u.id
FROM variant_master loc, variant_master area, variant_master stat, variant_master cat, variant_master dept, users u
WHERE loc.variant_name = 'Plant Yard' AND area.variant_name = 'Packaging' AND stat.variant_name = 'Resolved'
  AND cat.variant_name = 'Environmental' AND dept.variant_name = 'Operations Department' AND u.employee_id = 'EMP003';

INSERT INTO hoc_input (
    job_req_for, company, observer_name, observation_date,
    location_id, area_id, status_id, category_id, action_department_id,
    oper_act, observations, corrective_actions,
    responsible_person, hod, stop_job, severity, reported_by
)
SELECT 'Housekeeping Round', 'Reliance Industries', 'Admin User', '2026-06-28',
       loc.id, area.id, stat.id, cat.id, dept.id,
       'General housekeeping inspection',
       'Walkway partially blocked by empty pallets, minor trip hazard.',
       'Pallets cleared and stacked in designated storage.',
       'Regular User', 'Admin User', 'No', 'Low', u.id
FROM variant_master loc, variant_master area, variant_master stat, variant_master cat, variant_master dept, users u
WHERE loc.variant_name = 'Floor 1' AND area.variant_name = 'Warehouse' AND stat.variant_name = 'Open'
  AND cat.variant_name = 'Safety Hazard' AND dept.variant_name = 'Safety Department' AND u.employee_id = 'EMP002';
GO
