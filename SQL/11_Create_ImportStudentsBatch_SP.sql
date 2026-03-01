-- ============================================================
-- Script to create sp_ImportStudentsBatch stored procedure
-- ============================================================
-- This script creates the stored procedure for batch importing students
-- Run this if you get error: "Could not find stored procedure 'sp_ImportStudentsBatch'"

USE [EducationManagement]
GO

-- ============================================================
-- 1. CREATE StudentImportType (Table-Valued Parameter Type)
-- ============================================================
IF EXISTS (SELECT * FROM sys.types WHERE name = 'StudentImportType' AND is_table_type = 1)
    DROP TYPE StudentImportType;
GO

CREATE TYPE StudentImportType AS TABLE
(
    StudentCode VARCHAR(20) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    Email VARCHAR(150) NOT NULL,
    Phone VARCHAR(20) NULL,
    DateOfBirth DATE NULL,
    Gender NVARCHAR(10) NULL,
    Address NVARCHAR(300) NULL,
    MajorId VARCHAR(50) NOT NULL,
    AcademicYearId VARCHAR(50) NULL
);
GO

PRINT '✓ Created type: StudentImportType';
GO

-- ============================================================
-- 2. CREATE sp_ImportStudentsBatch Stored Procedure
-- ============================================================
IF OBJECT_ID('sp_ImportStudentsBatch', 'P') IS NOT NULL 
    DROP PROCEDURE sp_ImportStudentsBatch;
GO

CREATE PROCEDURE sp_ImportStudentsBatch
    @Students StudentImportType READONLY,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Variables for results
    DECLARE @SuccessCount INT = 0;
    DECLARE @ErrorCount INT = 0;
    DECLARE @Errors TABLE (
        RowNumber INT,
        StudentCode VARCHAR(20),
        ErrorMessage NVARCHAR(500)
    );
    
    -- Counter for row number
    DECLARE @RowNumber INT = 0;
    
    BEGIN TRY
        -- Process each student
        DECLARE @StudentCode VARCHAR(20);
        DECLARE @FullName NVARCHAR(150);
        DECLARE @Email VARCHAR(150);
        DECLARE @Phone VARCHAR(20);
        DECLARE @DateOfBirth DATE;
        DECLARE @Gender NVARCHAR(10);
        DECLARE @Address NVARCHAR(300);
        DECLARE @MajorId VARCHAR(50);
        DECLARE @AcademicYearId VARCHAR(50);
        
        DECLARE student_cursor CURSOR FOR
            SELECT StudentCode, FullName, Email, Phone, DateOfBirth, Gender, 
                   Address, MajorId, AcademicYearId
            FROM @Students;
        
        OPEN student_cursor;
        
        FETCH NEXT FROM student_cursor INTO 
            @StudentCode, @FullName, @Email, @Phone, @DateOfBirth, @Gender,
            @Address, @MajorId, @AcademicYearId;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @RowNumber = @RowNumber + 1;
            
            BEGIN TRY
                -- Validate: Check duplicate student code
                IF EXISTS (SELECT 1 FROM students WHERE student_code = @StudentCode AND deleted_at IS NULL)
                BEGIN
                    INSERT INTO @Errors (RowNumber, StudentCode, ErrorMessage)
                    VALUES (@RowNumber, @StudentCode, N'Mã sinh viên đã tồn tại');
                    
                    SET @ErrorCount = @ErrorCount + 1;
                END
                -- Validate: Check duplicate email
                ELSE IF EXISTS (SELECT 1 FROM students WHERE email = @Email AND deleted_at IS NULL)
                BEGIN
                    INSERT INTO @Errors (RowNumber, StudentCode, ErrorMessage)
                    VALUES (@RowNumber, @StudentCode, CONCAT(N'Email đã tồn tại: ', @Email));
                    
                    SET @ErrorCount = @ErrorCount + 1;
                END
                -- Validate: Check major exists
                ELSE IF NOT EXISTS (SELECT 1 FROM majors WHERE major_id = @MajorId AND deleted_at IS NULL)
                BEGIN
                    INSERT INTO @Errors (RowNumber, StudentCode, ErrorMessage)
                    VALUES (@RowNumber, @StudentCode, CONCAT(N'Ngành không tồn tại: ', @MajorId));
                    
                    SET @ErrorCount = @ErrorCount + 1;
                END
                ELSE
                BEGIN
                    -- Generate student_id
                    DECLARE @StudentId VARCHAR(50) = 'STD-' + LOWER(CONVERT(VARCHAR(36), NEWID()));
                    
                    -- Generate user_id for student account
                    DECLARE @UserId VARCHAR(50) = 'USER-' + LOWER(CONVERT(VARCHAR(36), NEWID()));
                    
                    -- Generate default password (should be changed on first login)
                    DECLARE @PasswordHash VARCHAR(255) = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lSWE0cQ5pZri'; -- bcrypt hash of "Student@123"
                    
                    -- Create user account first
                    INSERT INTO users (user_id, username, password_hash, email, phone, full_name, 
                                      role_id, is_active, avatar_url, created_at, created_by)
                    VALUES (@UserId, @StudentCode, @PasswordHash, @Email, @Phone, @FullName,
                            'ROLE_STUDENT', 1, '/avatars/default.png', GETDATE(), @CreatedBy);
                    
                    -- Create student record
                    INSERT INTO students (student_id, user_id, student_code, full_name, gender, 
                                         date_of_birth, email, phone, address, major_id,
                                         academic_year_id, is_active, 
                                         created_at, created_by)
                    VALUES (@StudentId, @UserId, @StudentCode, @FullName, @Gender,
                            @DateOfBirth, @Email, @Phone, @Address, @MajorId,
                            @AcademicYearId, 1,
                            GETDATE(), @CreatedBy);
                    
                    SET @SuccessCount = @SuccessCount + 1;
                END
            END TRY
            BEGIN CATCH
                -- Capture error for this row
                INSERT INTO @Errors (RowNumber, StudentCode, ErrorMessage)
                VALUES (@RowNumber, @StudentCode, ERROR_MESSAGE());
                
                SET @ErrorCount = @ErrorCount + 1;
            END CATCH
            
            FETCH NEXT FROM student_cursor INTO 
                @StudentCode, @FullName, @Email, @Phone, @DateOfBirth, @Gender,
                @Address, @MajorId, @AcademicYearId;
        END
        
        CLOSE student_cursor;
        DEALLOCATE student_cursor;
        
        -- Return results
        SELECT @SuccessCount AS SuccessCount, @ErrorCount AS ErrorCount;
        
        -- Return errors if any
        IF @ErrorCount > 0
        BEGIN
            SELECT RowNumber, StudentCode, ErrorMessage
            FROM @Errors
            ORDER BY RowNumber;
        END
        
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('local', 'student_cursor') >= 0
        BEGIN
            CLOSE student_cursor;
            DEALLOCATE student_cursor;
        END
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT '✓ Created stored procedure: sp_ImportStudentsBatch';
GO

