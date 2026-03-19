-- ===========================================
-- 02_SP_People.sql
-- ===========================================
-- Description: Students and Lecturers Management
-- ===========================================

USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '========================================';
PRINT 'Starting: 02_SP_People.sql';
PRINT 'People Management SPs';
PRINT '========================================';
GO

IF OBJECT_ID('sp_AddStudentFull', 'P') IS NOT NULL DROP PROCEDURE sp_AddStudentFull;
GO
CREATE PROCEDURE sp_AddStudentFull
    @UserId VARCHAR(50),
    @StudentCode VARCHAR(20),
    @FullName NVARCHAR(150),
    @Gender NVARCHAR(10) = NULL,
    @Dob DATE = NULL,
    @Email VARCHAR(150) = NULL,
    @Phone VARCHAR(20) = NULL,
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @AcademicYearId VARCHAR(50) = NULL,
    @CohortYear VARCHAR(10) = NULL,
    @PasswordHash VARCHAR(255) = NULL,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Auto-create user if not exists
        IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE user_id = @UserId AND deleted_at IS NULL)
        BEGIN
            -- Get role_id for Student (ROLE_STUDENT)
            DECLARE @RoleId VARCHAR(50) = 'ROLE_STUDENT';
            
            -- Validate role exists
            IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = @RoleId AND deleted_at IS NULL)
            BEGIN
                RAISERROR(N'Role does not exist: %s', 16, 1, @RoleId);
                RETURN;
            END
            
            -- Use provided password hash, or fallback to default if not provided
            -- (Backend should provide password hash from StudentCode)
            IF @PasswordHash IS NULL OR @PasswordHash = ''
            BEGIN
                -- Fallback: default password hash (should not happen if backend works correctly)
                SET @PasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lSWE0cQ5pZri';
            END
            
            -- Create user account automatically
            INSERT INTO dbo.users (user_id, username, password_hash, email, phone, full_name, 
                                  role_id, is_active, avatar_url, created_at, created_by)
            VALUES (@UserId, @StudentCode, @PasswordHash, 
                    ISNULL(@Email, @StudentCode + '@student.edu.vn'), 
                    @Phone, @FullName, @RoleId, 1, '/avatars/default.png', GETDATE(), @CreatedBy);
        END
        
        -- Validate StudentCode unique
        IF EXISTS (SELECT 1 FROM dbo.students WHERE student_code = @StudentCode AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'MĂ£ sinh viĂªn Ä‘Ă£ tá»“n táº¡i: %s', 16, 1, @StudentCode);
            RETURN;
        END
        
        -- Generate StudentId
        DECLARE @StudentId VARCHAR(50) = 'STD-' + LOWER(CONVERT(VARCHAR(36), NEWID()));
        
        -- Insert Student
        INSERT INTO dbo.students (
            student_id, user_id, student_code, full_name, gender, 
            date_of_birth, email, phone, faculty_id, major_id, 
            academic_year_id, cohort_year, is_active, 
            created_at, created_by
        )
        VALUES (
            @StudentId, @UserId, @StudentCode, @FullName, @Gender,
            @Dob, @Email, @Phone, @FacultyId, @MajorId,
            @AcademicYearId, @CohortYear, 1,
            GETDATE(), @CreatedBy
        );
        
        COMMIT TRANSACTION;
        SELECT @StudentId AS student_id;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

IF OBJECT_ID('sp_CreateLecturer', 'P') IS NOT NULL DROP PROCEDURE sp_CreateLecturer;
GO
CREATE PROCEDURE sp_CreateLecturer
    @LecturerId VARCHAR(50),
    @LecturerCode VARCHAR(20),
    @FullName NVARCHAR(150),
    @Email VARCHAR(150) = NULL,
    @Phone VARCHAR(20) = NULL,
    @DepartmentId VARCHAR(50) = NULL,
    @UserId VARCHAR(50) = NULL,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    INSERT INTO dbo.lecturers (lecturer_id, lecturer_code, full_name, email, phone,
                               department_id, user_id, created_at, created_by)
    VALUES (@LecturerId, @LecturerCode, @FullName, @Email, @Phone, @DepartmentId,
            @UserId, GETDATE(), @CreatedBy);
END
GO

IF OBJECT_ID('sp_CreateStudent', 'P') IS NOT NULL DROP PROCEDURE sp_CreateStudent;
GO
CREATE PROCEDURE sp_CreateStudent
    @StudentId VARCHAR(50),
    @UserId VARCHAR(50),
    @StudentCode VARCHAR(20),
    @FullName NVARCHAR(150),
    @Gender NVARCHAR(10) = NULL,
    @Dob DATE = NULL,
    @Email VARCHAR(150) = NULL,
    @Phone VARCHAR(20) = NULL,
    @Address NVARCHAR(300) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @AcademicYearId VARCHAR(50) = NULL,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    INSERT INTO dbo.students (student_id, user_id, student_code, full_name, gender, date_of_birth,
                              email, phone, address, major_id, academic_year_id,
                              created_at, created_by)
    VALUES (@StudentId, @UserId, @StudentCode, @FullName, @Gender, @Dob, @Email, @Phone,
            @Address, @MajorId, @AcademicYearId, GETDATE(), @CreatedBy);
    SELECT @StudentId AS student_id;
END
GO

IF OBJECT_ID('sp_DeleteLecturer', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteLecturer;
GO
CREATE PROCEDURE sp_DeleteLecturer
    @LecturerId VARCHAR(50),
    @DeletedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.lecturers
    SET deleted_at = GETDATE(), deleted_by = @DeletedBy
    WHERE lecturer_id = @LecturerId;
END
GO

IF OBJECT_ID('sp_DeleteStudent', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteStudent;
GO
CREATE PROCEDURE sp_DeleteStudent
    @StudentId VARCHAR(50),
    @DeletedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.students
    SET deleted_at = GETDATE(), deleted_by = @DeletedBy
    WHERE student_id = @StudentId;
END
GO

IF OBJECT_ID('sp_DeleteStudentFull', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteStudentFull;
GO
CREATE PROCEDURE sp_DeleteStudentFull
    @StudentId VARCHAR(50),
    @DeletedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate Student exists
        IF NOT EXISTS (SELECT 1 FROM dbo.students WHERE student_id = @StudentId AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'Sinh viĂªn khĂ´ng tá»“n táº¡i: %s', 16, 1, @StudentId);
            RETURN;
        END
        
        -- Soft delete Student
        UPDATE dbo.students
        SET deleted_at = GETDATE(), deleted_by = @DeletedBy
        WHERE student_id = @StudentId;
        
        -- Soft delete Student Profile (if exists)
        IF OBJECT_ID('dbo.student_profiles', 'U') IS NOT NULL
        BEGIN
            UPDATE dbo.student_profiles
            SET deleted_at = GETDATE(), deleted_by = @DeletedBy
            WHERE student_id = @StudentId;
        END
        
        -- Soft delete Student Family (if exists)
        IF OBJECT_ID('dbo.student_families', 'U') IS NOT NULL
        BEGIN
            UPDATE dbo.student_families
            SET deleted_at = GETDATE(), deleted_by = @DeletedBy
            WHERE student_id = @StudentId;
        END
        
        COMMIT TRANSACTION;
        SELECT @StudentId AS student_id;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

IF OBJECT_ID('sp_GetAllLecturers', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllLecturers;
GO
CREATE PROCEDURE sp_GetAllLecturers
    @Page INT = 1,
    @PageSize INT = 10,
    @Search NVARCHAR(255) = NULL,
    @DepartmentId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    -- Total count
    SELECT COUNT(*) AS TotalCount
    FROM dbo.lecturers l
    LEFT JOIN dbo.departments d ON l.department_id = d.department_id
    WHERE l.deleted_at IS NULL
        AND (@Search IS NULL OR 
             l.lecturer_code LIKE '%' + @Search + '%' OR 
             l.full_name LIKE '%' + @Search + '%' OR
             l.email LIKE '%' + @Search + '%')
        AND (@DepartmentId IS NULL OR l.department_id = @DepartmentId);
    
    -- Data with pagination
    SELECT l.*, d.department_name, f.faculty_name
    FROM dbo.lecturers l
    LEFT JOIN dbo.departments d ON l.department_id = d.department_id
    LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
    WHERE l.deleted_at IS NULL
        AND (@Search IS NULL OR 
             l.lecturer_code LIKE '%' + @Search + '%' OR 
             l.full_name LIKE '%' + @Search + '%' OR
             l.email LIKE '%' + @Search + '%')
        AND (@DepartmentId IS NULL OR l.department_id = @DepartmentId)
    ORDER BY l.created_at DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('sp_GetAllStudents', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllStudents;
GO
CREATE PROCEDURE sp_GetAllStudents
    @Page INT = 1,
    @PageSize INT = 10,
    @Search NVARCHAR(255) = NULL,
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @AcademicYearId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    SELECT COUNT(*) as TotalCount
    FROM dbo.students s
    LEFT JOIN dbo.majors m ON s.major_id = m.major_id
    WHERE s.deleted_at IS NULL
        AND (@Search IS NULL OR s.student_code LIKE '%' + @Search + '%' 
             OR s.full_name LIKE '%' + @Search + '%')
        AND (@FacultyId IS NULL OR m.faculty_id = @FacultyId)
        AND (@MajorId IS NULL OR s.major_id = @MajorId)
        AND (@AcademicYearId IS NULL OR s.academic_year_id = @AcademicYearId);
    
    SELECT s.student_id, s.user_id, s.student_code, s.full_name, s.gender, s.date_of_birth,
           s.email, s.phone, s.address, s.major_id, m.major_name, m.faculty_id, f.faculty_name,
           s.academic_year_id, ay.year_name, s.is_active,
           s.created_at, s.created_by, s.updated_at, s.updated_by
    FROM dbo.students s
    LEFT JOIN dbo.majors m ON s.major_id = m.major_id
    LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
    LEFT JOIN dbo.academic_years ay ON s.academic_year_id = ay.academic_year_id
    WHERE s.deleted_at IS NULL
        AND (@Search IS NULL OR s.student_code LIKE '%' + @Search + '%' 
             OR s.full_name LIKE '%' + @Search + '%')
        AND (@FacultyId IS NULL OR m.faculty_id = @FacultyId)
        AND (@MajorId IS NULL OR s.major_id = @MajorId)
        AND (@AcademicYearId IS NULL OR s.academic_year_id = @AcademicYearId)
    ORDER BY s.created_at DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('sp_GetLecturerById', 'P') IS NOT NULL DROP PROCEDURE sp_GetLecturerById;
GO
CREATE PROCEDURE sp_GetLecturerById
    @LecturerId VARCHAR(50)
AS
BEGIN
    SELECT l.*, d.department_name
    FROM dbo.lecturers l
    LEFT JOIN dbo.departments d ON l.department_id = d.department_id
    WHERE l.lecturer_id = @LecturerId AND l.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetLecturerByUserId', 'P') IS NOT NULL DROP PROCEDURE sp_GetLecturerByUserId;
GO
CREATE PROCEDURE sp_GetLecturerByUserId
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        l.lecturer_id,
        l.user_id,
        l.lecturer_code,
        l.full_name,
        l.email,
        l.phone,
        l.department_id,
        l.academic_title,
        l.degree,
        l.specialization,
        l.position,
        l.join_date,
        l.is_active,
        l.created_at,
        l.created_by,
        l.updated_at,
        l.updated_by,
        d.department_name,
        f.faculty_name,
        u.username
    FROM dbo.lecturers l
    LEFT JOIN dbo.departments d ON l.department_id = d.department_id
    LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
    LEFT JOIN dbo.users u ON l.user_id = u.user_id
    WHERE l.user_id = @UserId AND l.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetStudentById', 'P') IS NOT NULL DROP PROCEDURE sp_GetStudentById;
GO
CREATE PROCEDURE sp_GetStudentById
    @StudentId VARCHAR(50)
AS
BEGIN
    SELECT s.*, m.major_name, m.faculty_id, f.faculty_name, ay.year_name
    FROM dbo.students s
    LEFT JOIN dbo.majors m ON s.major_id = m.major_id
    LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
    LEFT JOIN dbo.academic_years ay ON s.academic_year_id = ay.academic_year_id
    WHERE s.student_id = @StudentId AND s.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetStudentByUserId', 'P') IS NOT NULL DROP PROCEDURE sp_GetStudentByUserId;
GO
CREATE PROCEDURE sp_GetStudentByUserId
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        s.student_id, s.user_id, s.student_code, s.full_name, s.gender,
        s.date_of_birth AS dob, s.email, s.phone, s.faculty_id, s.major_id,
        s.academic_year_id, s.cohort_year, s.is_active,
        s.created_at, s.created_by, s.updated_at, s.updated_by,
        s.deleted_at, s.deleted_by,
        m.major_name, m.faculty_id AS major_faculty_id,
        f.faculty_name, ay.year_name
    FROM dbo.students s
    LEFT JOIN dbo.majors m ON s.major_id = m.major_id
    LEFT JOIN dbo.faculties f ON m.faculty_id = f.faculty_id
    LEFT JOIN dbo.academic_years ay ON s.academic_year_id = ay.academic_year_id
    WHERE s.user_id = @UserId AND s.deleted_at IS NULL;
END
GO

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
                    VALUES (@RowNumber, @StudentCode, N'MĂ£ sinh viĂªn Ä‘Ă£ tá»“n táº¡i');
                    
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

IF OBJECT_ID('sp_UpdateLecturer', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateLecturer;
GO
CREATE PROCEDURE sp_UpdateLecturer
    @LecturerId VARCHAR(50),
    @LecturerCode VARCHAR(20),
    @FullName NVARCHAR(150),
    @Email VARCHAR(150) = NULL,
    @Phone VARCHAR(20) = NULL,
    @DepartmentId VARCHAR(50) = NULL,
    @UpdatedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.lecturers
    SET lecturer_code = @LecturerCode, full_name = @FullName, email = @Email,
        phone = @Phone, department_id = @DepartmentId,
        updated_at = GETDATE(), updated_by = @UpdatedBy
    WHERE lecturer_id = @LecturerId AND deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_UpdateStudent', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateStudent;
GO
CREATE PROCEDURE sp_UpdateStudent
    @StudentId VARCHAR(50),
    @FullName NVARCHAR(150),
    @Gender NVARCHAR(10) = NULL,
    @Dob DATE = NULL,
    @Email VARCHAR(150) = NULL,
    @Phone VARCHAR(20) = NULL,
    @Address NVARCHAR(300) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @AcademicYearId VARCHAR(50) = NULL,
    @UpdatedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.students
    SET full_name = @FullName, gender = @Gender, date_of_birth = @Dob,
        email = @Email, phone = @Phone, address = @Address,
        major_id = @MajorId, academic_year_id = @AcademicYearId,
        updated_at = GETDATE(), updated_by = @UpdatedBy
    WHERE student_id = @StudentId AND deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_UpdateStudentFull', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateStudentFull;
GO
CREATE PROCEDURE sp_UpdateStudentFull
    @StudentId VARCHAR(50),
    @FullName NVARCHAR(150),
    @Gender NVARCHAR(10) = NULL,
    @Dob DATE = NULL,
    @Email VARCHAR(150) = NULL,
    @Phone VARCHAR(20) = NULL,
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @AcademicYearId VARCHAR(50) = NULL,
    @CohortYear VARCHAR(10) = NULL,
    @Nationality NVARCHAR(50) = NULL,
    @Ethnicity NVARCHAR(30) = NULL,
    @Religion NVARCHAR(50) = NULL,
    @Hometown NVARCHAR(250) = NULL,
    @CurrentAddress NVARCHAR(250) = NULL,
    @BankNo NVARCHAR(30) = NULL,
    @BankName NVARCHAR(100) = NULL,
    @InsuranceNo NVARCHAR(30) = NULL,
    @IssuePlace NVARCHAR(100) = NULL,
    @IssueDate DATE = NULL,
    @Facebook NVARCHAR(200) = NULL,
    @FamilyFullName NVARCHAR(150) = NULL,
    @RelationType NVARCHAR(50) = NULL,
    @BirthYear INT = NULL,
    @PhoneFamily NVARCHAR(20) = NULL,
    @JobFamily NVARCHAR(100) = NULL,
    @UpdatedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate Student exists
        IF NOT EXISTS (SELECT 1 FROM dbo.students WHERE student_id = @StudentId AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'Sinh viĂªn khĂ´ng tá»“n táº¡i: %s', 16, 1, @StudentId);
            RETURN;
        END
        
        -- Update Student
        UPDATE dbo.students
        SET full_name = @FullName, gender = @Gender, date_of_birth = @Dob,
            email = @Email, phone = @Phone, faculty_id = @FacultyId,
            major_id = @MajorId, academic_year_id = @AcademicYearId,
            cohort_year = @CohortYear,
            updated_at = GETDATE(), updated_by = @UpdatedBy
        WHERE student_id = @StudentId AND deleted_at IS NULL;
        
        -- Update/Create Student Profile (if student_profiles table exists)
        IF OBJECT_ID('dbo.student_profiles', 'U') IS NOT NULL
        BEGIN
            IF EXISTS (SELECT 1 FROM dbo.student_profiles WHERE student_id = @StudentId)
            BEGIN
                UPDATE dbo.student_profiles
                SET nationality = @Nationality, ethnicity = @Ethnicity, religion = @Religion,
                    hometown = @Hometown, current_address = @CurrentAddress,
                    bank_no = @BankNo, bank_name = @BankName,
                    insurance_no = @InsuranceNo, issue_place = @IssuePlace,
                    issue_date = @IssueDate, facebook = @Facebook,
                    updated_at = GETDATE(), updated_by = @UpdatedBy
                WHERE student_id = @StudentId;
            END
            ELSE
            BEGIN
                INSERT INTO dbo.student_profiles (
                    student_id, nationality, ethnicity, religion,
                    hometown, current_address, bank_no, bank_name,
                    insurance_no, issue_place, issue_date, facebook,
                    created_at, created_by
                )
                VALUES (
                    @StudentId, @Nationality, @Ethnicity, @Religion,
                    @Hometown, @CurrentAddress, @BankNo, @BankName,
                    @InsuranceNo, @IssuePlace, @IssueDate, @Facebook,
                    GETDATE(), @UpdatedBy
                );
            END
        END
        
        -- Update/Create Student Family (if student_families table exists and family info provided)
        IF OBJECT_ID('dbo.student_families', 'U') IS NOT NULL 
           AND @FamilyFullName IS NOT NULL
        BEGIN
            -- Check if family member exists
            DECLARE @FamilyId VARCHAR(50);
            SELECT TOP 1 @FamilyId = student_family_id
            FROM dbo.student_families
            WHERE student_id = @StudentId AND deleted_at IS NULL
            ORDER BY created_at DESC;
            
            IF @FamilyId IS NOT NULL
            BEGIN
                UPDATE dbo.student_families
                SET full_name = @FamilyFullName, relation_type = @RelationType,
                    birth_year = @BirthYear, phone = @PhoneFamily, job = @JobFamily,
                    updated_at = GETDATE(), updated_by = @UpdatedBy
                WHERE student_family_id = @FamilyId;
            END
            ELSE
            BEGIN
                SET @FamilyId = 'SF-' + LOWER(CONVERT(VARCHAR(36), NEWID()));
                INSERT INTO dbo.student_families (
                    student_family_id, student_id, relation_type, full_name,
                    birth_year, phone, job, created_at, created_by
                )
                VALUES (
                    @FamilyId, @StudentId, @RelationType, @FamilyFullName,
                    @BirthYear, @PhoneFamily, @JobFamily, GETDATE(), @UpdatedBy
                );
            END
        END
        
        COMMIT TRANSACTION;
        SELECT @StudentId AS student_id;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT '========================================';
-- ===========================================
-- STUDENT CLASS TRANSFER STORED PROCEDURES
-- ===========================================

-- 1. SP_TRANSFERSTUDENTTOCLASS - Chuyển sinh viên sang lớp hành chính khác
IF OBJECT_ID('sp_TransferStudentToClass', 'P') IS NOT NULL
    DROP PROCEDURE sp_TransferStudentToClass;
GO

CREATE PROCEDURE sp_TransferStudentToClass
    @StudentId          VARCHAR(50),
    @ToAdminClassId     VARCHAR(50),
    @TransferReason     NVARCHAR(500) = NULL,
    @TransferredBy      VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- 1. Validate student exists
        IF NOT EXISTS (SELECT 1 FROM dbo.students WHERE student_id = @StudentId AND deleted_at IS NULL)
        BEGIN
            THROW 50009, N'Không tìm thấy sinh viên', 1;
        END
        
        -- 2. Validate target class exists and is active
        IF NOT EXISTS (SELECT 1 FROM dbo.administrative_classes 
                       WHERE admin_class_id = @ToAdminClassId AND deleted_at IS NULL)
        BEGIN
            THROW 50010, N'Không tìm thấy lớp hành chính đích', 1;
        END
        
        -- 3. Check if target class has available slots
        DECLARE @CurrentStudents INT, @MaxStudents INT;
        SELECT @CurrentStudents = current_students, @MaxStudents = max_students
        FROM dbo.administrative_classes
        WHERE admin_class_id = @ToAdminClassId;
        
        IF @CurrentStudents >= @MaxStudents
        BEGIN
            THROW 50011, N'Lớp đích đã đầy, không thể chuyển sinh viên', 1;
        END
        
        -- 4. Get current class (if any)
        DECLARE @FromAdminClassId VARCHAR(50);
        SELECT @FromAdminClassId = admin_class_id 
        FROM dbo.students 
        WHERE student_id = @StudentId;
        
        -- 5. Validate: student is not already in target class
        IF @FromAdminClassId = @ToAdminClassId
        BEGIN
            THROW 50012, N'Sinh viên đã ở trong lớp này rồi', 1;
        END
        
        -- 6. Create transfer record
        DECLARE @TransferId VARCHAR(50) = 'TRF-' + CONVERT(VARCHAR(36), NEWID());
        
        INSERT INTO dbo.student_class_transfers (
            transfer_id,
            student_id,
            from_admin_class_id,
            to_admin_class_id,
            transfer_reason,
            transfer_date,
            transferred_by
        )
        VALUES (
            @TransferId,
            @StudentId,
            @FromAdminClassId,
            @ToAdminClassId,
            @TransferReason,
            GETDATE(),
            @TransferredBy
        );
        
        -- 7. Update student's admin_class_id
        UPDATE dbo.students
        SET admin_class_id = @ToAdminClassId,
            updated_at = GETDATE(),
            updated_by = @TransferredBy
        WHERE student_id = @StudentId;
        
        -- 8. Decrease old class count (if exists)
        IF @FromAdminClassId IS NOT NULL
        BEGIN
            UPDATE dbo.administrative_classes
            SET current_students = current_students - 1,
                updated_at = GETDATE(),
                updated_by = @TransferredBy
            WHERE admin_class_id = @FromAdminClassId;
        END
        
        -- 9. Increase new class count
        UPDATE dbo.administrative_classes
        SET current_students = current_students + 1,
            updated_at = GETDATE(),
            updated_by = @TransferredBy
        WHERE admin_class_id = @ToAdminClassId;
        
        COMMIT TRANSACTION;
        
        -- Return success
        SELECT 
            1 AS Success,
            N'Chuyển lớp thành công' AS Message,
            @TransferId AS TransferId,
            @FromAdminClassId AS FromClassId,
            @ToAdminClassId AS ToClassId;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorNumber INT = ERROR_NUMBER();
        
        -- Re-throw with original error number if it's a custom error
        IF @ErrorNumber >= 50000
            THROW;
        ELSE
            THROW 50001, @ErrorMessage, 1;
    END CATCH
END
GO

PRINT '✓ Created stored procedure: sp_TransferStudentToClass';
GO

-- 2. SP_GETSTUDENTTRANSFERHISTORY - Lấy lịch sử chuyển lớp của sinh viên
IF OBJECT_ID('sp_GetStudentTransferHistory', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetStudentTransferHistory;
GO

CREATE PROCEDURE sp_GetStudentTransferHistory
    @StudentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        t.transfer_id,
        t.student_id,
        s.student_code,
        s.full_name AS student_name,
        t.from_admin_class_id,
        fc.class_code AS from_class_code,
        fc.class_name AS from_class_name,
        t.to_admin_class_id,
        tc.class_code AS to_class_code,
        tc.class_name AS to_class_name,
        t.transfer_reason,
        t.transfer_date,
        t.transferred_by,
        u.full_name AS transferred_by_name,
        t.created_at
    FROM dbo.student_class_transfers t
    INNER JOIN dbo.students s ON s.student_id = t.student_id
    LEFT JOIN dbo.administrative_classes fc ON fc.admin_class_id = t.from_admin_class_id
    INNER JOIN dbo.administrative_classes tc ON tc.admin_class_id = t.to_admin_class_id
    LEFT JOIN dbo.users u ON u.user_id = t.transferred_by
    WHERE t.student_id = @StudentId
    ORDER BY t.transfer_date DESC;
END
GO

PRINT '✓ Created stored procedure: sp_GetStudentTransferHistory';
GO

-- 3. SP_RECALCULATEADMINCLASSSTUDENTCOUNT - Tính lại số lượng sinh viên trong lớp hành chính
IF OBJECT_ID('sp_RecalculateAdminClassStudentCount', 'P') IS NOT NULL
    DROP PROCEDURE sp_RecalculateAdminClassStudentCount;
GO

CREATE PROCEDURE sp_RecalculateAdminClassStudentCount
    @AdminClassId VARCHAR(50) = NULL  -- NULL = recalculate all classes
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF @AdminClassId IS NOT NULL
        BEGIN
            -- Recalculate for specific class
            UPDATE ac
            SET ac.current_students = (
                SELECT COUNT(*)
                FROM dbo.students s
                WHERE s.admin_class_id = ac.admin_class_id
                  AND s.deleted_at IS NULL
            ),
            ac.updated_at = GETDATE()
            FROM dbo.administrative_classes ac
            WHERE ac.admin_class_id = @AdminClassId
              AND ac.deleted_at IS NULL;
        END
        ELSE
        BEGIN
            -- Recalculate for all classes
            UPDATE ac
            SET ac.current_students = (
                SELECT COUNT(*)
                FROM dbo.students s
                WHERE s.admin_class_id = ac.admin_class_id
                  AND s.deleted_at IS NULL
            ),
            ac.updated_at = GETDATE()
            FROM dbo.administrative_classes ac
            WHERE ac.deleted_at IS NULL;
        END
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, N'Đã cập nhật số lượng sinh viên thành công' AS Message;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorNumber INT = ERROR_NUMBER();
        
        IF @ErrorNumber >= 50000
            THROW;
        ELSE
            THROW 50001, @ErrorMessage, 1;
    END CATCH
END
GO

PRINT '✓ Created stored procedure: sp_RecalculateAdminClassStudentCount';
GO

PRINT '[OK] People Management SPs completed';
PRINT '========================================';
GO