-- ===========================================
-- 17_Alter_Majors_Add_DepartmentId.sql
-- ===========================================
-- Description: Add department_id column to majors table
-- ===========================================

USE EducationManagement;
GO

PRINT '========================================';
PRINT 'Starting: 17_Alter_Majors_Add_DepartmentId.sql';
PRINT 'Adding department_id to majors table';
PRINT '========================================';
GO

-- Check if column already exists
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.majors')
    AND name = 'department_id'
)
BEGIN
    PRINT 'Adding department_id column to majors table...';

    ALTER TABLE dbo.majors
    ADD department_id VARCHAR(50) NULL;

    PRINT '✅ Column department_id added successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ Column department_id already exists, skipping...';
END
GO

-- Check if foreign key already exists
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_majors_departments'
)
BEGIN
    PRINT 'Adding foreign key constraint FK_majors_departments...';

    ALTER TABLE dbo.majors
    ADD CONSTRAINT FK_majors_departments
    FOREIGN KEY (department_id) REFERENCES dbo.departments(department_id);

    PRINT '✅ Foreign key constraint added successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ Foreign key FK_majors_departments already exists, skipping...';
END
GO

-- Check if index already exists
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_majors_department_id'
    AND object_id = OBJECT_ID('dbo.majors')
)
BEGIN
    PRINT 'Creating index IX_majors_department_id...';

    CREATE INDEX IX_majors_department_id ON dbo.majors(department_id);

    PRINT '✅ Index created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ Index IX_majors_department_id already exists, skipping...';
END
GO

PRINT '========================================';
PRINT '[OK] 17_Alter_Majors_Add_DepartmentId.sql completed';
PRINT '========================================';
GO
