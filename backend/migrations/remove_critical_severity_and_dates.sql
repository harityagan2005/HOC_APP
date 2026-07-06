-- Run this against the hoc_app database in SQL Server.
-- Removes the 'Critical' severity level (any existing Critical rows should be
-- reclassified to 'High' before running this), and drops the end_date and
-- fy_year columns from hoc_input — no longer collected on the report form.

UPDATE hoc_input SET severity = 'High' WHERE severity = 'Critical';
GO

DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = cc.name FROM sys.check_constraints cc
JOIN sys.columns col ON cc.parent_object_id = col.object_id AND cc.parent_column_id = col.column_id
WHERE cc.parent_object_id = OBJECT_ID('hoc_input') AND col.name = 'severity';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE hoc_input DROP CONSTRAINT [' + @constraintName + ']');
END
GO

ALTER TABLE hoc_input ADD CONSTRAINT chk_hoc_severity CHECK (severity IN ('Low', 'Medium', 'High'));
GO

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'hoc_input' AND COLUMN_NAME = 'end_date'
)
BEGIN
    ALTER TABLE hoc_input DROP COLUMN end_date;
END
GO

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'hoc_input' AND COLUMN_NAME = 'fy_year'
)
BEGIN
    ALTER TABLE hoc_input DROP COLUMN fy_year;
END
GO
