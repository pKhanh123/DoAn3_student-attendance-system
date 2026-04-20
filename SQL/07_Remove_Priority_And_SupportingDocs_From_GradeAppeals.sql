USE EducationManagement;
GO

PRINT '========================================';
PRINT 'Starting: 07_Remove_Priority_And_SupportingDocs_From_GradeAppeals.sql';
PRINT 'Remove priority and supporting_docs from grade_appeals';
PRINT '========================================';
GO

-- Drop CHECK constraint for priority if exists
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Appeal_Priority')
BEGIN
    ALTER TABLE dbo.grade_appeals DROP CONSTRAINT CHK_Appeal_Priority;
    PRINT 'Dropped CHECK constraint CHK_Appeal_Priority';
END
ELSE
BEGIN
    PRINT 'CHECK constraint CHK_Appeal_Priority does not exist';
END
GO

-- Drop DEFAULT constraint for priority if exists
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = dc.name
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE OBJECT_NAME(dc.parent_object_id) = 'grade_appeals' AND c.name = 'priority';

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.grade_appeals DROP CONSTRAINT ' + @ConstraintName);
    PRINT 'Dropped DEFAULT constraint for priority column';
END
ELSE
BEGIN
    PRINT 'No DEFAULT constraint found for priority column';
END
GO

-- Drop priority column if exists
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.grade_appeals') AND name = 'priority')
BEGIN
    ALTER TABLE dbo.grade_appeals DROP COLUMN priority;
    PRINT 'Dropped column priority from grade_appeals';
END
ELSE
BEGIN
    PRINT 'Column priority does not exist in dbo.grade_appeals';
END
GO

-- Drop supporting_docs column if exists
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.grade_appeals') AND name = 'supporting_docs')
BEGIN
    ALTER TABLE dbo.grade_appeals DROP COLUMN supporting_docs;
    PRINT 'Dropped column supporting_docs from grade_appeals';
END
ELSE
BEGIN
    PRINT 'Column supporting_docs does not exist in dbo.grade_appeals';
END
GO

PRINT '========================================';
PRINT 'Completed: 07_Remove_Priority_And_SupportingDocs_From_GradeAppeals.sql';
PRINT '========================================';
GO
