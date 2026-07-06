-- Run this against the hoc_app database in SQL Server.
-- Replaces the old per-report "accountable person" fields with an
-- automated department email: each variant_master row of type
-- 'Department' can carry an email address that report-assignment
-- notifications are sent to automatically.

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'variant_master' AND COLUMN_NAME = 'email'
)
BEGIN
    ALTER TABLE variant_master
    ADD email VARCHAR(255) NULL;
END
GO

-- Also carries the department's Head of Department, auto-filled into the
-- report form when that department is selected as the action department.
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'variant_master' AND COLUMN_NAME = 'hod'
)
BEGIN
    ALTER TABLE variant_master
    ADD hod VARCHAR(150) NULL;
END
GO

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'hoc_input' AND COLUMN_NAME = 'accountable_person_email'
)
BEGIN
    ALTER TABLE hoc_input DROP COLUMN accountable_person_email;
END
GO

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'hoc_input' AND COLUMN_NAME = 'accountable_person'
)
BEGIN
    ALTER TABLE hoc_input DROP COLUMN accountable_person;
END
GO
