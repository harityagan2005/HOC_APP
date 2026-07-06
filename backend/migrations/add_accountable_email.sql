-- Run this against the hoc_app database in SQL Server to add the accountable person email column
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'hoc_input' AND COLUMN_NAME = 'accountable_person_email'
)
BEGIN
    ALTER TABLE hoc_input
    ADD accountable_person_email VARCHAR(255) NULL;
END
GO
