-- ==========================================
-- 17_Alter_Majors_Add_DepartmentId.sql
-- ==========================================
-- Purpose: Add department_id column to majors table
-- Date: 2026-05-06
-- ==========================================

USE EducationManagement;
GO

-- Check if column exists
IF COL_LENGTH('dbo.majors', 'department_id') IS NULL
BEGIN
    PRINT 'Adding department_id column to majors table...';

    -- Add department_id column
    ALTER TABLE dbo.majors
    ADD department_id VARCHAR(50) NULL;

    -- Add foreign key constraint
    ALTER TABLE dbo.majors
    ADD CONSTRAINT FK_majors_departments 
    FOREIGN KEY (department_id) REFERENCES dbo.departments(department_id);

    -- Create index for performance
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_majors_department_id' AND object_id = OBJECT_ID('majors'))
    BEGIN
        CREATE INDEX IX_majors_department_id ON dbo.majors(department_id);
        PRINT '✅ Created index: IX_majors_department_id';
    END;

    PRINT '✅ Added department_id to majors table';
END;
ELSE
BEGIN
    PRINT '✅ Column department_id already exists in majors table';
END
GO

PRINT '=========================================';
PRINT 'Migration 17_Alter_Majors_Add_DepartmentId completed';
PRINT '=========================================';
GO
