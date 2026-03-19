-- ===========================================
-- 🎓 HỆ THỐNG QUẢN LÝ ĐIỂM DANH SINH VIÊN
-- 📋 File 1/4: TẠO CÁC BẢNG (CREATE TABLES)
-- ===========================================

USE master;
GO

-- Tạo database nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'EducationManagement')
BEGIN
    CREATE DATABASE EducationManagement;
END
GO

USE EducationManagement;
GO

-- ===========================================
-- CREATE USER-DEFINED TYPES
-- ===========================================

-- Create StudentImportType for table-valued parameter
-- ✅ Drop stored procedure trước (vì nó sử dụng type này)
IF OBJECT_ID('sp_ImportStudentsBatch', 'P') IS NOT NULL 
    DROP PROCEDURE sp_ImportStudentsBatch;
GO

-- Sau đó mới drop type
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

-- ===========================================
-- DROP ALL FOREIGN KEY CONSTRAINTS (if tables exist)
-- ===========================================
PRINT '';
PRINT '🔧 Dropping all foreign key constraints...';
GO

-- Dynamic SQL to drop all foreign key constraints
DECLARE @sql NVARCHAR(MAX) = N'';
DECLARE @fkCount INT = 0;

-- Count foreign keys first
SELECT @fkCount = COUNT(*)
FROM sys.foreign_keys
WHERE OBJECT_SCHEMA_NAME(parent_object_id) = 'dbo';

-- Build drop statements
SELECT @sql += N'
ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
FROM sys.foreign_keys
WHERE OBJECT_SCHEMA_NAME(parent_object_id) = 'dbo';

IF @sql <> N'' AND @fkCount > 0
BEGIN
    BEGIN TRY
        EXEC sp_executesql @sql;
        PRINT CONCAT('   ✅ Dropped ', CAST(@fkCount AS VARCHAR), ' foreign key constraint(s)');
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  Warning: Some foreign key constraints may not have been dropped';
        PRINT CONCAT('   Error: ', ERROR_MESSAGE());
    END CATCH
END
ELSE
BEGIN
    PRINT '   ℹ️  No foreign key constraints to drop';
END
GO

-- ===========================================
-- 1. BẢNG ROLES (Vai trò người dùng)
-- ===========================================
IF OBJECT_ID('dbo.roles', 'U') IS NOT NULL DROP TABLE dbo.roles;
GO

CREATE TABLE dbo.roles (
    role_id      VARCHAR(50) PRIMARY KEY,
    role_name    NVARCHAR(100) NOT NULL UNIQUE,
    description  NVARCHAR(255) NULL,
    created_at   DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by   VARCHAR(50) NULL,
    updated_at   DATETIME NULL,
    updated_by   VARCHAR(50) NULL,
    is_active    BIT NOT NULL DEFAULT 1,
    deleted_at   DATETIME NULL,
    deleted_by   VARCHAR(50) NULL
);
GO

-- ===========================================
-- 2. BẢNG USERS (Người dùng)
-- ===========================================
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

CREATE TABLE dbo.users (
    user_id        VARCHAR(50) PRIMARY KEY,
    username       VARCHAR(50) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    phone          VARCHAR(20) NULL,
    full_name      NVARCHAR(150) NOT NULL,
    avatar_url     VARCHAR(300) NULL,
    role_id        VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.roles(role_id),
    is_active      BIT NOT NULL DEFAULT 1,
    last_login_at  DATETIME NULL,
    created_at     DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by     VARCHAR(50) NULL,
    updated_at     DATETIME NULL,
    updated_by     VARCHAR(50) NULL,
    deleted_at     DATETIME NULL,
    deleted_by     VARCHAR(50) NULL
);
GO

-- ===========================================
-- 3. BẢNG FACULTIES (Khoa)
-- ===========================================
IF OBJECT_ID('dbo.faculties', 'U') IS NOT NULL DROP TABLE dbo.faculties;
GO

CREATE TABLE dbo.faculties (
    faculty_id   VARCHAR(50) PRIMARY KEY,
    faculty_code VARCHAR(20) NOT NULL UNIQUE,
    faculty_name NVARCHAR(150) NOT NULL UNIQUE,
    description  NVARCHAR(500) NULL,
    is_active    BIT NOT NULL DEFAULT 1,
    created_at   DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by   VARCHAR(50) NULL,
    updated_at   DATETIME NULL,
    updated_by   VARCHAR(50) NULL,
    deleted_at   DATETIME NULL,
    deleted_by   VARCHAR(50) NULL
);
GO

-- ===========================================
-- 4. BẢNG DEPARTMENTS (Bộ môn)
-- ===========================================
IF OBJECT_ID('dbo.departments', 'U') IS NOT NULL DROP TABLE dbo.departments;
GO

CREATE TABLE dbo.departments (
    department_id   VARCHAR(50) PRIMARY KEY,
    department_code VARCHAR(20) NOT NULL UNIQUE,
    department_name NVARCHAR(150) NOT NULL,
    faculty_id      VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.faculties(faculty_id),
    description     NVARCHAR(500) NULL,
    created_at      DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by      VARCHAR(50) NULL,
    updated_at      DATETIME NULL,
    updated_by      VARCHAR(50) NULL,
    deleted_at      DATETIME NULL,
    deleted_by      VARCHAR(50) NULL
);
GO

-- ===========================================
-- 5. BẢNG MAJORS (Ngành học)
-- ===========================================
IF OBJECT_ID('dbo.majors', 'U') IS NOT NULL DROP TABLE dbo.majors;
GO

CREATE TABLE dbo.majors (
    major_id     VARCHAR(50) PRIMARY KEY,
    major_name   NVARCHAR(150) NOT NULL,
    major_code   VARCHAR(20) NOT NULL UNIQUE,
    faculty_id   VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.faculties(faculty_id),
    description  NVARCHAR(500) NULL,
    created_at   DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by   VARCHAR(50) NULL,
    updated_at   DATETIME NULL,
    updated_by   VARCHAR(50) NULL,
    deleted_at   DATETIME NULL,
    deleted_by   VARCHAR(50) NULL
);
GO

-- ===========================================
-- 6. BẢNG ACADEMIC_YEARS (Niên khóa)
-- ===========================================
IF OBJECT_ID('dbo.academic_years', 'U') IS NOT NULL DROP TABLE dbo.academic_years;
GO

CREATE TABLE dbo.academic_years (
    academic_year_id   VARCHAR(50) PRIMARY KEY,
    year_name          NVARCHAR(50) NOT NULL UNIQUE,
    cohort_code        NVARCHAR(10) NULL,
    start_year         INT NOT NULL,
    end_year           INT NOT NULL,
    duration_years     INT NOT NULL DEFAULT 4,
    description        NVARCHAR(500) NULL,
    is_active          BIT NOT NULL DEFAULT 0,
    created_at         DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by         VARCHAR(50) NULL,
    updated_at         DATETIME NULL,
    updated_by         VARCHAR(50) NULL,
    deleted_at         DATETIME NULL,
    deleted_by         VARCHAR(50) NULL
);
GO

-- ===========================================
-- 6A. BẢNG SCHOOL_YEARS (Năm học - 1 năm = 2 học kỳ)
-- ===========================================
IF OBJECT_ID('dbo.school_years', 'U') IS NOT NULL DROP TABLE dbo.school_years;
GO

CREATE TABLE dbo.school_years (
    school_year_id    VARCHAR(50) PRIMARY KEY,
    year_code         NVARCHAR(20) NOT NULL UNIQUE,
    year_name         NVARCHAR(100) NOT NULL,
    academic_year_id  VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.academic_years(academic_year_id),
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    semester1_start   DATE NULL,
    semester1_end     DATE NULL,
    semester2_start   DATE NULL,
    semester2_end     DATE NULL,
    is_active         BIT NOT NULL DEFAULT 0,
    current_semester  INT NULL,
    created_at        DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by        VARCHAR(50) NULL,
    updated_at        DATETIME NULL,
    updated_by        VARCHAR(50) NULL,
    deleted_at        DATETIME NULL,
    deleted_by        VARCHAR(50) NULL
);
GO

-- ===========================================
-- 7. BẢNG STUDENTS (Sinh viên)
-- ===========================================
IF OBJECT_ID('dbo.students', 'U') IS NOT NULL DROP TABLE dbo.students;
GO

CREATE TABLE dbo.students (
    student_id       VARCHAR(50) PRIMARY KEY,
    student_code     VARCHAR(20) NOT NULL UNIQUE,
    full_name        NVARCHAR(150) NOT NULL,
    date_of_birth    DATE NULL,
    gender           NVARCHAR(10) NULL,
    email            VARCHAR(150) NULL,
    phone            VARCHAR(20) NULL,
    address          NVARCHAR(300) NULL,
    major_id         VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.majors(major_id),
    academic_year_id VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.academic_years(academic_year_id),
    advisor_id       VARCHAR(50) NULL,
    user_id          VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.users(user_id),
    last_warning_sent DATETIME NULL,
    is_active        BIT NOT NULL DEFAULT 1,
    created_at       DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by       VARCHAR(50) NULL,
    updated_at       DATETIME NULL,
    updated_by       VARCHAR(50) NULL,
    deleted_at       DATETIME NULL,
    deleted_by       VARCHAR(50) NULL
);
GO

-- ===========================================
-- 8. BẢNG LECTURERS (Giảng viên)
-- ===========================================
IF OBJECT_ID('dbo.lecturers', 'U') IS NOT NULL DROP TABLE dbo.lecturers;
GO

CREATE TABLE dbo.lecturers (
    lecturer_id   VARCHAR(50) PRIMARY KEY,
    lecturer_code VARCHAR(20) NOT NULL UNIQUE,
    full_name     NVARCHAR(150) NOT NULL,
    email         VARCHAR(150) NULL,
    phone         VARCHAR(20) NULL,
    department_id VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.departments(department_id),
    user_id       VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.users(user_id),
    is_active     BIT NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by    VARCHAR(50) NULL,
    updated_at    DATETIME NULL,
    updated_by    VARCHAR(50) NULL,
    deleted_at    DATETIME NULL,
    deleted_by    VARCHAR(50) NULL
);
GO

-- ===========================================
-- 9. BẢNG SUBJECTS (Môn học)
-- ===========================================
IF OBJECT_ID('dbo.subjects', 'U') IS NOT NULL DROP TABLE dbo.subjects;
GO

CREATE TABLE dbo.subjects (
    subject_id    VARCHAR(50) PRIMARY KEY,
    subject_code  VARCHAR(20) NOT NULL UNIQUE,
    subject_name  NVARCHAR(200) NOT NULL,
    credits       INT NOT NULL,
    department_id VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.departments(department_id),
    description   NVARCHAR(500) NULL,
    created_at    DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by    VARCHAR(50) NULL,
    updated_at    DATETIME NULL,
    updated_by    VARCHAR(50) NULL,
    deleted_at    DATETIME NULL,
    deleted_by    VARCHAR(50) NULL
);
GO

-- ===========================================
-- 10. BẢNG CLASSES (Lớp học phần)
-- ===========================================
IF OBJECT_ID('dbo.classes', 'U') IS NOT NULL DROP TABLE dbo.classes;
GO

CREATE TABLE dbo.classes (
    class_id         VARCHAR(50) PRIMARY KEY,
    class_code       VARCHAR(20) NOT NULL UNIQUE,
    class_name       NVARCHAR(200) NOT NULL,
    subject_id       VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.subjects(subject_id),
    lecturer_id      VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.lecturers(lecturer_id),
    academic_year_id VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.academic_years(academic_year_id),
    school_year_id   VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.school_years(school_year_id),
    semester         INT NULL,
    max_students     INT NULL,
    current_enrollment INT NULL DEFAULT 0 CHECK (current_enrollment >= 0), -- ✅ NGHIỆP VỤ: Số lượng đăng ký không được âm
    schedule         NVARCHAR(500) NULL, -- ⚠️ DEPRECATED: Dùng timetable_sessions thay thế, giữ lại để backward compatibility
    room             NVARCHAR(100) NULL, -- ⚠️ DEPRECATED: Dùng timetable_sessions.room_id thay thế, giữ lại để backward compatibility
    created_at       DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by       VARCHAR(50) NULL,
    updated_at       DATETIME NULL,
    updated_by       VARCHAR(50) NULL,
    deleted_at       DATETIME NULL,
    deleted_by       VARCHAR(50) NULL
);
GO

-- ✅ NGHIỆP VỤ: Thêm table-level constraint sau khi bảng đã được tạo (tham chiếu đến max_students)
-- Đảm bảo current_enrollment <= max_students (nếu max_students không NULL)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Class_Enrollment_Max')
BEGIN
    ALTER TABLE dbo.classes
    ADD CONSTRAINT CHK_Class_Enrollment_Max 
        CHECK (max_students IS NULL OR current_enrollment <= max_students);
    PRINT '✓ Added constraint: CHK_Class_Enrollment_Max';
END
ELSE
    PRINT '✓ Constraint already exists: CHK_Class_Enrollment_Max';
GO

-- ===========================================
-- 11. BẢNG ENROLLMENTS (Đăng ký học phần)
-- ===========================================
IF OBJECT_ID('dbo.enrollments', 'U') IS NOT NULL DROP TABLE dbo.enrollments;
GO

CREATE TABLE dbo.enrollments (
    enrollment_id   VARCHAR(50) PRIMARY KEY,
    student_id      VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.students(student_id),
    class_id        VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.classes(class_id),
    enrollment_date DATETIME NOT NULL DEFAULT(GETDATE()),
    status          NVARCHAR(50) NULL,
    created_at      DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by      VARCHAR(50) NULL,
    deleted_at      DATETIME NULL,
    deleted_by      VARCHAR(50) NULL
);
GO

-- ===========================================
-- 12. BẢNG ATTENDANCES (Điểm danh)
-- ===========================================
IF OBJECT_ID('dbo.attendances', 'U') IS NOT NULL DROP TABLE dbo.attendances;
GO

CREATE TABLE dbo.attendances (
    attendance_id   VARCHAR(50) PRIMARY KEY,
    enrollment_id   VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.enrollments(enrollment_id),
    class_id        VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.classes(class_id),
    attendance_date DATETIME NOT NULL,
    status          NVARCHAR(20) NOT NULL,
    note            NVARCHAR(500) NULL,
    marked_by       VARCHAR(50) NULL,  -- ✅ Người thực hiện điểm danh (user_id của giảng viên/admin/cố vấn)
    created_at      DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by      VARCHAR(50) NULL,
    updated_at      DATETIME NULL,
    updated_by      VARCHAR(50) NULL,
    deleted_at      DATETIME NULL,
    deleted_by      VARCHAR(50) NULL
);
GO

-- ===========================================
-- 13. BẢNG GRADES (Điểm số)
-- ===========================================
IF OBJECT_ID('dbo.grades', 'U') IS NOT NULL DROP TABLE dbo.grades;
GO

CREATE TABLE dbo.grades (
    grade_id         VARCHAR(50) PRIMARY KEY,
    enrollment_id    VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.enrollments(enrollment_id),
    midterm_score    DECIMAL(4,2) NULL,
    final_score      DECIMAL(4,2) NULL,
    total_score      DECIMAL(4,2) NULL,
    letter_grade     VARCHAR(5) NULL,
    attendance_score DECIMAL(4,2) NULL CHECK (attendance_score >= 0 AND attendance_score <= 10),
    assignment_score DECIMAL(4,2) NULL CHECK (assignment_score >= 0 AND assignment_score <= 10),
    created_at       DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by       VARCHAR(50) NULL,
    updated_at       DATETIME NULL,
    updated_by       VARCHAR(50) NULL,
    deleted_at       DATETIME NULL,
    deleted_by       VARCHAR(50) NULL
);
GO

-- ===========================================
-- 13A. BẢNG GPAS (Điểm trung bình)
-- ===========================================
IF OBJECT_ID('dbo.gpas', 'U') IS NOT NULL DROP TABLE dbo.gpas;
GO

CREATE TABLE dbo.gpas (
    gpa_id           VARCHAR(50) PRIMARY KEY,
    student_id       VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.students(student_id),
    academic_year_id VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.academic_years(academic_year_id),
    school_year_id   VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.school_years(school_year_id),
    semester         INT NULL, -- NULL = cả năm học, 1/2/3 = học kỳ cụ thể
    gpa10            DECIMAL(4,2) NULL CHECK (gpa10 >= 0 AND gpa10 <= 10),
    gpa4             DECIMAL(4,2) NULL CHECK (gpa4 >= 0 AND gpa4 <= 4),
    total_credits    INT NULL DEFAULT 0,
    accumulated_credits INT NULL DEFAULT 0,
    rank_text        NVARCHAR(50) NULL, -- Xuat sac, Gioi, Kha, Trung binh, Yeu (Tieng Viet khong dau - backend se chuyen doi)
    is_active        BIT NOT NULL DEFAULT 1,
    created_at       DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by       VARCHAR(50) NULL,
    updated_at       DATETIME NULL,
    updated_by       VARCHAR(50) NULL,
    deleted_at       DATETIME NULL,
    deleted_by       VARCHAR(50) NULL,
    
    -- Unique constraint: Mỗi sinh viên chỉ có 1 GPA cho 1 năm học + học kỳ
    CONSTRAINT uk_gpa_student_schoolyear_semester UNIQUE (student_id, school_year_id, semester)
);
GO

-- ===========================================
-- 14. BẢNG NOTIFICATIONS (Thông báo)
-- ===========================================
IF OBJECT_ID('dbo.notifications', 'U') IS NOT NULL DROP TABLE dbo.notifications;
GO

CREATE TABLE dbo.notifications (
    notification_id   VARCHAR(50) PRIMARY KEY,
    -- Legacy columns (kept for backward compatibility)
    user_id           VARCHAR(50) NULL,  -- Changed to NULL, will be migrated to recipient_id
    message           NVARCHAR(MAX) NULL, -- Changed to NULL, will be migrated to content
    notification_type NVARCHAR(50) NULL, -- Changed to NULL, will be migrated to type
    -- New schema columns
    recipient_id      VARCHAR(50) NULL,
    title             NVARCHAR(200) NOT NULL,
    content           NVARCHAR(MAX) NULL,
    type              NVARCHAR(50) NULL,
    is_read           BIT NOT NULL DEFAULT 0,
    sent_date         DATETIME NULL,
    is_active         BIT NOT NULL DEFAULT 1,
    created_at        DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by        VARCHAR(50) NULL,
    updated_at        DATETIME NULL,
    updated_by        VARCHAR(50) NULL,
    deleted_at        DATETIME NULL,
    deleted_by        VARCHAR(50) NULL
);
GO

-- Add foreign key for recipient_id (if users table exists)
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications
        ADD CONSTRAINT FK_Notifications_RecipientId_Users
        FOREIGN KEY (recipient_id) REFERENCES dbo.users(user_id);
    END TRY
    BEGIN CATCH
        -- Foreign key will be added later if needed
    END CATCH
END
GO

-- Add foreign key for user_id (backward compatibility)
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
BEGIN
    BEGIN TRY
        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Notifications_UserId_Users')
        BEGIN
            ALTER TABLE dbo.notifications
            ADD CONSTRAINT FK_Notifications_UserId_Users
            FOREIGN KEY (user_id) REFERENCES dbo.users(user_id);
        END
    END TRY
    BEGIN CATCH
        -- Foreign key will be added later if needed
    END CATCH
END
GO

-- ===========================================
-- 15. BẢNG PERMISSIONS (Quyền hạn)
-- ===========================================
IF OBJECT_ID('dbo.permissions', 'U') IS NOT NULL DROP TABLE dbo.permissions;
GO

CREATE TABLE dbo.permissions (
    permission_id   VARCHAR(50) PRIMARY KEY,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    permission_name NVARCHAR(200) NOT NULL,
    description     NVARCHAR(500) NULL,
    -- 🔹 Menu structure fields
    parent_code     VARCHAR(100) NULL,        -- Parent permission code for menu hierarchy
    icon            VARCHAR(100) NULL,        -- FontAwesome icon class
    sort_order      INT NULL,                 -- Display order in menu
    is_active       BIT NOT NULL DEFAULT 1,   -- Active status
    -- ✅ Flag để phân biệt: menu-only permissions (chỉ cho menu) vs executable permissions (check authorization)
    is_menu_only    BIT NOT NULL DEFAULT 0,   -- Menu-only flag: true = chỉ dùng cho menu, false = dùng để check authorization
    created_at      DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by      VARCHAR(50) NULL,
    updated_at      DATETIME NULL,
    updated_by      VARCHAR(50) NULL,
    deleted_at      DATETIME NULL,            -- Soft delete
    deleted_by      VARCHAR(50) NULL          -- Audit
);
GO

-- ===========================================
-- 16. BẢNG ROLE_PERMISSIONS (Liên kết vai trò - quyền)
-- ===========================================
IF OBJECT_ID('dbo.role_permissions', 'U') IS NOT NULL DROP TABLE dbo.role_permissions;
GO

CREATE TABLE dbo.role_permissions (
    role_id       VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.roles(role_id) ON DELETE CASCADE,
    permission_id VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.permissions(permission_id) ON DELETE CASCADE,
    created_at    DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by    VARCHAR(50) NULL,
    
    PRIMARY KEY (role_id, permission_id)
);
GO

-- ===========================================
-- 17. BẢNG AUDIT_LOGS (Nhật ký hệ thống)
-- ===========================================
IF OBJECT_ID('dbo.audit_logs', 'U') IS NOT NULL DROP TABLE dbo.audit_logs;
GO

CREATE TABLE dbo.audit_logs (
    log_id       BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id      VARCHAR(50) NULL,
    action       VARCHAR(50) NOT NULL,
    entity_type  VARCHAR(100) NOT NULL,
    entity_id    VARCHAR(50) NULL,
    old_values   NVARCHAR(MAX) NULL,
    new_values   NVARCHAR(MAX) NULL,
    ip_address   VARCHAR(50) NULL,
    user_agent   VARCHAR(500) NULL,
    created_at   DATETIME NOT NULL DEFAULT(GETDATE())
);
GO

-- ===========================================
-- 19. BẢNG REFRESH_TOKENS (JWT Refresh Tokens)
-- ===========================================
IF OBJECT_ID('dbo.refresh_tokens', 'U') IS NOT NULL DROP TABLE dbo.refresh_tokens;
GO

CREATE TABLE dbo.refresh_tokens (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id             VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    token               VARCHAR(500) NOT NULL UNIQUE,
    expires_at          DATETIME NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT(GETDATE()),
    revoked_at          DATETIME NULL,
    replaced_by_token   VARCHAR(500) NULL
);
GO

-- ===========================================
-- 20. BẢNG ADVISOR_WARNING_CONFIG (Cấu hình cảnh báo cho cố vấn học tập)
-- ===========================================
IF OBJECT_ID('dbo.advisor_warning_config', 'U') IS NOT NULL DROP TABLE dbo.advisor_warning_config;
GO

CREATE TABLE dbo.advisor_warning_config (
    config_id             INT IDENTITY(1,1) PRIMARY KEY,
    attendance_threshold  DECIMAL(5,2) NOT NULL DEFAULT 20.0 CHECK (attendance_threshold >= 0 AND attendance_threshold <= 100),
    gpa_threshold         DECIMAL(4,2) NOT NULL DEFAULT 2.0 CHECK (gpa_threshold >= 0 AND gpa_threshold <= 10),
    email_template        NVARCHAR(MAX) NULL,
    email_subject         NVARCHAR(500) NULL,
    auto_send_emails      BIT NOT NULL DEFAULT 0,
    created_at            DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by            VARCHAR(50) NULL,
    updated_at            DATETIME NULL,
    updated_by            VARCHAR(50) NULL
);
GO

-- Chỉ cho phép 1 bản ghi config duy nhất
CREATE UNIQUE INDEX IX_AdvisorWarningConfig_Single ON dbo.advisor_warning_config(config_id);
GO

-- Insert default config nếu chưa có
IF NOT EXISTS (SELECT 1 FROM dbo.advisor_warning_config)
BEGIN
    INSERT INTO dbo.advisor_warning_config (attendance_threshold, gpa_threshold, auto_send_emails)
    VALUES (20.0, 2.0, 0);
    PRINT '   ✅ Inserted default advisor warning config';
END
GO

PRINT '✅ Đã tạo xong các bảng core system!';
GO

-- #############################################################################
-- PHASE 1: ENROLLMENT SYSTEM - TABLES
-- #############################################################################

PRINT '';
PRINT '========================================';
PRINT 'Starting: PHASE 1 - Enrollment Tables';
PRINT 'Purpose: Create enrollment system tables';
PRINT '========================================';
GO

-- =============================================
-- 1. CREATE TABLE: administrative_classes
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'administrative_classes')
BEGIN
    PRINT 'Creating table: administrative_classes';
    
    CREATE TABLE dbo.administrative_classes (
        -- Primary Key
        admin_class_id      VARCHAR(50) PRIMARY KEY,
        
        -- Basic Information
        class_code          VARCHAR(20) NOT NULL UNIQUE,
        class_name          NVARCHAR(150) NOT NULL,
        
        -- Foreign Keys
        major_id            VARCHAR(50) NULL,
        advisor_id          VARCHAR(50) NULL,
        academic_year_id    VARCHAR(50) NULL,
        
        -- Class Details
        cohort_year         INT NOT NULL CHECK (cohort_year >= 2000 AND cohort_year <= 2100),
        max_students        INT DEFAULT 50 CHECK (max_students > 0 AND max_students <= 200),
        current_students    INT DEFAULT 0 CHECK (current_students >= 0),
        
        -- Description
        description         NVARCHAR(500) NULL,
        
        -- Audit Fields
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),
        created_by          VARCHAR(50) NULL,
        updated_at          DATETIME NULL,
        updated_by          VARCHAR(50) NULL,
        deleted_at          DATETIME NULL,
        deleted_by          VARCHAR(50) NULL,
        
        -- Constraints
        CONSTRAINT CHK_AdminClass_CurrentNotExceedMax CHECK (current_students <= max_students),
        CONSTRAINT FK_AdminClass_Major FOREIGN KEY (major_id) REFERENCES majors(major_id),
        CONSTRAINT FK_AdminClass_Advisor FOREIGN KEY (advisor_id) REFERENCES lecturers(lecturer_id),
        CONSTRAINT FK_AdminClass_AcademicYear FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id)
    );
    
    PRINT '✓ Table created: administrative_classes';
END
ELSE
BEGIN
    PRINT '✓ Table already exists: administrative_classes';
END
GO

-- Create indexes for administrative_classes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminClass_ClassCode' AND object_id = OBJECT_ID('administrative_classes'))
    CREATE INDEX IX_AdminClass_ClassCode ON administrative_classes(class_code);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminClass_Major' AND object_id = OBJECT_ID('administrative_classes'))
    CREATE INDEX IX_AdminClass_Major ON administrative_classes(major_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminClass_CohortYear' AND object_id = OBJECT_ID('administrative_classes'))
    CREATE INDEX IX_AdminClass_CohortYear ON administrative_classes(cohort_year);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminClass_Advisor' AND object_id = OBJECT_ID('administrative_classes'))
    CREATE INDEX IX_AdminClass_Advisor ON administrative_classes(advisor_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminClass_AcademicYear' AND object_id = OBJECT_ID('administrative_classes'))
    CREATE INDEX IX_AdminClass_AcademicYear ON administrative_classes(academic_year_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminClass_Active' AND object_id = OBJECT_ID('administrative_classes'))
    CREATE INDEX IX_AdminClass_Active ON administrative_classes(is_active, deleted_at);

PRINT '✓ Indexes created for administrative_classes';
GO

-- Update students table to add admin_class_id
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('students') AND name = 'admin_class_id')
BEGIN
    ALTER TABLE students ADD admin_class_id VARCHAR(50) NULL;
    PRINT '✓ Added column: students.admin_class_id';
    
    ALTER TABLE students 
    ADD CONSTRAINT FK_Student_AdminClass 
    FOREIGN KEY (admin_class_id) REFERENCES administrative_classes(admin_class_id);
    PRINT '✓ Added FK: FK_Student_AdminClass';
    
    CREATE INDEX IX_Student_AdminClass ON students(admin_class_id);
    PRINT '✓ Created index: IX_Student_AdminClass';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: students.admin_class_id';
END
GO

-- Ensure compatibility columns for later stored procedures
-- Add missing is_active to administrative_classes if the table pre-existed without it
IF COL_LENGTH('dbo.administrative_classes','is_active') IS NULL
BEGIN
    PRINT '⚠ Adding missing column: administrative_classes.is_active (BIT DEFAULT 1)';
    ALTER TABLE dbo.administrative_classes ADD is_active BIT NOT NULL CONSTRAINT DF_AdminClass_IsActive DEFAULT(1);
END
GO

-- Add computed alias column phone_number on students if missing (some SPs select phone_number)
IF COL_LENGTH('dbo.students','phone_number') IS NULL
BEGIN
    PRINT '⚠ Adding computed column: students.phone_number AS ([phone]) PERSISTED';
    ALTER TABLE dbo.students ADD phone_number AS ([phone]) PERSISTED;
END
GO

-- Add faculty_id column to students table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('students') AND name = 'faculty_id')
BEGIN
    ALTER TABLE students ADD faculty_id VARCHAR(50) NULL;
    PRINT '✓ Added column: students.faculty_id';
    
    ALTER TABLE students 
    ADD CONSTRAINT FK_Student_Faculty 
    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id);
    PRINT '✓ Added FK: FK_Student_Faculty';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: students.faculty_id';
END
GO

-- Add cohort_year column to students table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('students') AND name = 'cohort_year')
BEGIN
    ALTER TABLE students ADD cohort_year INT NULL;
    PRINT '✓ Added column: students.cohort_year';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: students.cohort_year';
END
GO

-- Add academic_title column to lecturers table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lecturers') AND name = 'academic_title')
BEGIN
    ALTER TABLE lecturers ADD academic_title NVARCHAR(100) NULL;
    PRINT '✓ Added column: lecturers.academic_title';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: lecturers.academic_title';
END
GO

-- Add degree column to lecturers table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lecturers') AND name = 'degree')
BEGIN
    ALTER TABLE lecturers ADD degree NVARCHAR(100) NULL;
    PRINT '✓ Added column: lecturers.degree';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: lecturers.degree';
END
GO

-- Add specialization column to lecturers table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lecturers') AND name = 'specialization')
BEGIN
    ALTER TABLE lecturers ADD specialization NVARCHAR(200) NULL;
    PRINT '✓ Added column: lecturers.specialization';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: lecturers.specialization';
END
GO

-- Add position column to lecturers table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lecturers') AND name = 'position')
BEGIN
    ALTER TABLE lecturers ADD position NVARCHAR(100) NULL;
    PRINT '✓ Added column: lecturers.position';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: lecturers.position';
END
GO

-- Add join_date column to lecturers table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lecturers') AND name = 'join_date')
BEGIN
    ALTER TABLE lecturers ADD join_date DATE NULL;
    PRINT '✓ Added column: lecturers.join_date';
END
ELSE
BEGIN
    PRINT '✓ Column already exists: lecturers.join_date';
END
GO

-- =============================================
-- 2. CREATE TABLE: registration_periods
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'registration_periods')
BEGIN
    PRINT 'Creating table: registration_periods';
    
    CREATE TABLE dbo.registration_periods (
        -- Primary Key
        period_id           VARCHAR(50) PRIMARY KEY,
        
        -- Basic Information
        period_name         NVARCHAR(200) NOT NULL,
        
        -- Foreign Keys
        academic_year_id    VARCHAR(50) NOT NULL,
        
        -- Period Details
        semester            INT NOT NULL CHECK (semester IN (1, 2, 3)),
        start_date          DATETIME NOT NULL,
        end_date            DATETIME NOT NULL,
        status              NVARCHAR(20) DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'OPEN', 'CLOSED')),
        period_type         NVARCHAR(20) DEFAULT 'NORMAL' CHECK (period_type IN ('NORMAL', 'RETAKE')), -- NORMAL: đăng ký học phần thường, RETAKE: đăng ký học lại
        
        -- Description
        description         NVARCHAR(500) NULL,
        
        -- Audit Fields
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),
        created_by          VARCHAR(50) NULL,
        updated_at          DATETIME NULL,
        updated_by          VARCHAR(50) NULL,
        deleted_at          DATETIME NULL,
        deleted_by          VARCHAR(50) NULL,
        
        -- Constraints
        CONSTRAINT CHK_Period_DateRange CHECK (start_date < end_date),
        CONSTRAINT FK_Period_AcademicYear FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id)
    );
    
    PRINT '✓ Table created: registration_periods';
END
ELSE
BEGIN
    PRINT '✓ Table already exists: registration_periods';
END
GO

-- Create indexes for registration_periods
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Period_AcademicYearSemester' AND object_id = OBJECT_ID('registration_periods'))
    CREATE INDEX IX_Period_AcademicYearSemester ON registration_periods(academic_year_id, semester);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Period_Status' AND object_id = OBJECT_ID('registration_periods'))
    CREATE INDEX IX_Period_Status ON registration_periods(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Period_DateRange' AND object_id = OBJECT_ID('registration_periods'))
    CREATE INDEX IX_Period_DateRange ON registration_periods(start_date, end_date);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Period_Active' AND object_id = OBJECT_ID('registration_periods'))
    CREATE INDEX IX_Period_Active ON registration_periods(is_active, deleted_at, status);

-- Unique constraint: prevent multiple OPEN periods (cho phép nhiều OPEN nếu khác period_type)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Period_AcademicYearSemester' AND object_id = OBJECT_ID('registration_periods'))
BEGIN
    -- Drop old unique index if exists (vì cần thêm period_type vào constraint)
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Period_AcademicYearSemester' AND object_id = OBJECT_ID('registration_periods'))
    BEGIN
        DROP INDEX UQ_Period_AcademicYearSemester ON registration_periods;
    END
    
    -- Tạo unique constraint mới bao gồm period_type (chỉ tạo nếu chưa tồn tại)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Period_AcademicYearSemesterType' AND object_id = OBJECT_ID('registration_periods'))
    BEGIN
        CREATE UNIQUE INDEX UQ_Period_AcademicYearSemesterType 
        ON registration_periods(academic_year_id, semester, period_type, is_active) 
        WHERE is_active = 1 AND deleted_at IS NULL AND status = 'OPEN';
    END
END

-- Index cho period_type
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Period_Type' AND object_id = OBJECT_ID('registration_periods'))
    CREATE INDEX IX_Period_Type ON registration_periods(period_type, status);

PRINT '✓ Indexes created for registration_periods';
GO

-- =============================================
-- 3. UPDATE TABLE: classes (add current_enrollment) - ✅ ĐÃ DI CHUYỂN VÀO CREATE TABLE
-- =============================================
-- ✅ LƯU Ý: current_enrollment đã được tạo trong CREATE TABLE dbo.classes (dòng 338)
-- ✅ Constraints đã được thêm sau CREATE TABLE (dòng 352-360)
-- Phần này chỉ giữ lại để backward compatibility nếu bảng đã tồn tại từ trước

PRINT 'Checking classes table constraints...';

-- ✅ Đảm bảo constraint CHK_Class_Enrollment_Max tồn tại (nếu bảng đã có từ trước)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'classes')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Class_Enrollment_Max' AND parent_object_id = OBJECT_ID('classes'))
    BEGIN
        ALTER TABLE dbo.classes
        ADD CONSTRAINT CHK_Class_Enrollment_Max 
            CHECK (max_students IS NULL OR current_enrollment <= max_students);
        PRINT '✓ Added constraint: CHK_Class_Enrollment_Max (backward compatibility)';
    END
    
    -- ✅ Đảm bảo column-level constraint cho current_enrollment >= 0
    -- (Nếu column đã tồn tại nhưng chưa có constraint)
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('classes') AND name = 'current_enrollment')
       AND NOT EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('classes') 
                       AND definition LIKE '%current_enrollment >= 0%')
    BEGIN
        -- Note: Không thể thêm column-level CHECK sau khi tạo, phải dùng ALTER với table-level
        IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Class_EnrollmentNonNegative' AND parent_object_id = OBJECT_ID('classes'))
        BEGIN
            ALTER TABLE dbo.classes
            ADD CONSTRAINT CHK_Class_EnrollmentNonNegative 
                CHECK (current_enrollment >= 0);
            PRINT '✓ Added constraint: CHK_Class_EnrollmentNonNegative (backward compatibility)';
        END
    END
END
GO

-- Create index
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Class_CurrentEnrollment' AND object_id = OBJECT_ID('classes'))
BEGIN
    CREATE INDEX IX_Class_CurrentEnrollment ON classes(current_enrollment, max_students);
    PRINT '✓ Created index: IX_Class_CurrentEnrollment';
END
GO

-- Update existing data
UPDATE c
SET c.current_enrollment = ISNULL(e.enrollment_count, 0)
FROM classes c
LEFT JOIN (
    SELECT 
        class_id,
        COUNT(*) AS enrollment_count
    FROM enrollments
    WHERE deleted_at IS NULL
    GROUP BY class_id
) e ON c.class_id = e.class_id
WHERE c.deleted_at IS NULL;

PRINT '✓ Updated existing enrollment counts';
GO

-- =============================================
-- 4. UPDATE TABLE: enrollments (add status fields)
-- =============================================

PRINT 'Updating enrollments table...';

-- Add enrollment_status column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('enrollments') AND name = 'enrollment_status')
BEGIN
    ALTER TABLE enrollments ADD enrollment_status NVARCHAR(20) DEFAULT 'APPROVED' NOT NULL;
    PRINT '✓ Added column: enrollments.enrollment_status';
END

-- Add drop_deadline column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('enrollments') AND name = 'drop_deadline')
BEGIN
    ALTER TABLE enrollments ADD drop_deadline DATE NULL;
    PRINT '✓ Added column: enrollments.drop_deadline';
END

-- Add notes column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('enrollments') AND name = 'notes')
BEGIN
    ALTER TABLE enrollments ADD notes NVARCHAR(500) NULL;
    PRINT '✓ Added column: enrollments.notes';
END

-- Add drop_reason column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('enrollments') AND name = 'drop_reason')
BEGIN
    ALTER TABLE enrollments ADD drop_reason NVARCHAR(500) NULL;
    PRINT '✓ Added column: enrollments.drop_reason';
END

-- Add updated_at column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('enrollments') AND name = 'updated_at')
BEGIN
    ALTER TABLE enrollments ADD updated_at DATETIME NULL;
    PRINT '✓ Added column: enrollments.updated_at';
END

-- Add updated_by column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('enrollments') AND name = 'updated_by')
BEGIN
    ALTER TABLE enrollments ADD updated_by VARCHAR(50) NULL;
    PRINT '✓ Added column: enrollments.updated_by';
END
GO

-- Add check constraint
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Enrollment_Status')
BEGIN
    ALTER TABLE enrollments 
    ADD CONSTRAINT CHK_Enrollment_Status 
    CHECK (enrollment_status IN ('PENDING', 'APPROVED', 'DROPPED', 'WITHDRAWN'));
    PRINT '✓ Added constraint: CHK_Enrollment_Status';
END
GO

-- Create indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Enrollment_Status' AND object_id = OBJECT_ID('enrollments'))
    CREATE INDEX IX_Enrollment_Status ON enrollments(enrollment_status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Enrollment_StatusActive' AND object_id = OBJECT_ID('enrollments'))
    CREATE INDEX IX_Enrollment_StatusActive ON enrollments(enrollment_status, deleted_at);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Enrollment_DropDeadline' AND object_id = OBJECT_ID('enrollments'))
    CREATE INDEX IX_Enrollment_DropDeadline ON enrollments(drop_deadline);

PRINT '✓ Indexes created for enrollments';
GO

-- Migrate existing data
UPDATE enrollments
SET enrollment_status = 'APPROVED'
WHERE enrollment_status IS NULL OR enrollment_status = 'APPROVED';

UPDATE e
SET e.drop_deadline = CAST(DATEADD(WEEK, 2, e.enrollment_date) AS DATE)
FROM enrollments e
WHERE e.drop_deadline IS NULL
AND e.enrollment_status = 'APPROVED'
AND e.deleted_at IS NULL
AND e.enrollment_date IS NOT NULL;

PRINT '✓ Migrated existing enrollment data';
GO

-- =============================================
-- 5. CREATE TABLE: subject_prerequisites
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'subject_prerequisites')
BEGIN
    PRINT 'Creating table: subject_prerequisites';
    
    CREATE TABLE dbo.subject_prerequisites (
        -- Primary Key
        prerequisite_id         VARCHAR(50) PRIMARY KEY,
        
        -- Foreign Keys
        subject_id              VARCHAR(50) NOT NULL,
        prerequisite_subject_id VARCHAR(50) NOT NULL,
        
        -- Prerequisite Details
        minimum_grade           DECIMAL(4,2) DEFAULT 4.0 CHECK (minimum_grade >= 0 AND minimum_grade <= 10),
        is_required             BIT DEFAULT 1,
        
        -- Description
        description             NVARCHAR(500) NULL,
        
        -- Audit Fields
        is_active               BIT DEFAULT 1,
        created_at              DATETIME DEFAULT GETDATE(),
        created_by              VARCHAR(50) NULL,
        updated_at              DATETIME NULL,
        updated_by              VARCHAR(50) NULL,
        deleted_at              DATETIME NULL,
        deleted_by              VARCHAR(50) NULL,
        
        -- Constraints
        CONSTRAINT CHK_Prerequisite_NotSelf CHECK (subject_id != prerequisite_subject_id),
        CONSTRAINT FK_Prerequisite_Subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
        CONSTRAINT FK_Prerequisite_PrereqSubject FOREIGN KEY (prerequisite_subject_id) REFERENCES subjects(subject_id),
        CONSTRAINT UQ_Prerequisite_Pair UNIQUE (subject_id, prerequisite_subject_id)
    );
    
    PRINT '✓ Table created: subject_prerequisites';
END
ELSE
BEGIN
    PRINT '✓ Table already exists: subject_prerequisites';
END
GO

-- Create indexes for subject_prerequisites
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Prerequisite_Subject' AND object_id = OBJECT_ID('subject_prerequisites'))
    CREATE INDEX IX_Prerequisite_Subject ON subject_prerequisites(subject_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Prerequisite_PrereqSubject' AND object_id = OBJECT_ID('subject_prerequisites'))
    CREATE INDEX IX_Prerequisite_PrereqSubject ON subject_prerequisites(prerequisite_subject_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Prerequisite_ActiveRequired' AND object_id = OBJECT_ID('subject_prerequisites'))
    CREATE INDEX IX_Prerequisite_ActiveRequired ON subject_prerequisites(is_active, is_required, deleted_at);

PRINT '✓ Indexes created for subject_prerequisites';
GO

-- Create trigger to prevent circular dependencies
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_PreventCircularPrerequisites')
BEGIN
    EXEC('
    CREATE TRIGGER trg_PreventCircularPrerequisites
    ON subject_prerequisites
    AFTER INSERT, UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @SubjectId VARCHAR(50);
        DECLARE @PrereqId VARCHAR(50);
        
        SELECT @SubjectId = subject_id, @PrereqId = prerequisite_subject_id
        FROM inserted;
        
        DECLARE @HasCircular BIT = 0;
        
        WITH PrereqChain AS (
            SELECT 
                subject_id,
                prerequisite_subject_id,
                1 AS level
            FROM subject_prerequisites
            WHERE subject_id = @PrereqId
            AND is_active = 1
            AND deleted_at IS NULL
            
            UNION ALL
            
            SELECT 
                sp.subject_id,
                sp.prerequisite_subject_id,
                pc.level + 1
            FROM subject_prerequisites sp
            INNER JOIN PrereqChain pc ON sp.subject_id = pc.prerequisite_subject_id
            WHERE sp.is_active = 1
            AND sp.deleted_at IS NULL
            AND pc.level < 10
        )
        SELECT @HasCircular = 1
        FROM PrereqChain
        WHERE prerequisite_subject_id = @SubjectId;
        
        IF @HasCircular = 1
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, ''Không thể tạo điều kiện tiên quyết: Phát hiện vòng lặp phụ thuộc (circular dependency)'', 1;
        END
    END
    ');
    PRINT '✓ Created trigger: trg_PreventCircularPrerequisites';
END
GO

-- #############################################################################
-- PHASE 1 COMPLETE
-- #############################################################################

PRINT '';
PRINT '========================================';
PRINT '✅ PHASE 1 COMPLETED!';
PRINT '========================================';
PRINT '✓ administrative_classes';
PRINT '✓ registration_periods';
PRINT '✓ classes (updated)';
PRINT '✓ enrollments (updated)';
PRINT '✓ subject_prerequisites';
PRINT '========================================';
PRINT '';

-- ===========================================
-- 18. PHẦN MỞ RỘNG: THỜI KHÓA BIỂU (ROOMS + TIMETABLE_SESSIONS)
-- ===========================================

-- ROOMS (phòng học)
IF OBJECT_ID('dbo.rooms', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.rooms (
        room_id     VARCHAR(50) PRIMARY KEY,
        room_code   NVARCHAR(50) NOT NULL UNIQUE,
        building    NVARCHAR(100) NULL,
        capacity    INT NULL,
        is_active   BIT NOT NULL DEFAULT 1,
        created_at  DATETIME NOT NULL DEFAULT(GETDATE()),
        created_by  VARCHAR(50) NULL,
        updated_at  DATETIME NULL,
        updated_by  VARCHAR(50) NULL,
        deleted_at  DATETIME NULL,
        deleted_by  VARCHAR(50) NULL
    );
    PRINT '✓ Table created: rooms';
END
ELSE
    PRINT '✓ Table already exists: rooms';
GO

-- TIMETABLE_SESSIONS (phiên học cụ thể)
IF OBJECT_ID('dbo.timetable_sessions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.timetable_sessions (
        session_id      VARCHAR(50) PRIMARY KEY,
        class_id        VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.classes(class_id),
        subject_id      VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.subjects(subject_id),
        lecturer_id     VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.lecturers(lecturer_id),
        room_id         VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.rooms(room_id),
        school_year_id  VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.school_years(school_year_id),
        week_no         INT NULL, -- NULL = tất cả các tuần, số cụ thể = tuần đó
        weekday         INT NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1=CN, 2=T2, ..., 7=T7
        start_time      TIME NOT NULL,
        end_time        TIME NOT NULL,
        period_from     INT NULL CHECK (period_from IS NULL OR (period_from BETWEEN 1 AND 12)),
        period_to       INT NULL CHECK (period_to IS NULL OR (period_to BETWEEN 1 AND 12)),
        recurrence      NVARCHAR(20) NULL CHECK (recurrence IS NULL OR recurrence IN ('ONCE', 'WEEKLY', 'BIWEEKLY')),
        status          NVARCHAR(20) NULL CHECK (status IS NULL OR status IN ('PLANNED', 'ACTIVE', 'CANCELLED', 'COMPLETED')),
        notes           NVARCHAR(500) NULL,
        created_at      DATETIME NOT NULL DEFAULT(GETDATE()),
        created_by      VARCHAR(50) NULL,
        updated_at      DATETIME NULL,
        updated_by      VARCHAR(50) NULL,
        deleted_at      DATETIME NULL,
        deleted_by      VARCHAR(50) NULL,
        -- ✅ NGHIỆP VỤ: Constraints cho period và time
        CONSTRAINT CHK_Period_Range CHECK (
            (period_from IS NULL AND period_to IS NULL) OR
            (period_from IS NOT NULL AND period_to IS NOT NULL 
             AND period_from BETWEEN 1 AND 12 
             AND period_to BETWEEN 1 AND 12
             AND period_from <= period_to
             AND (period_to - period_from + 1) <= 12)
        ),
        CONSTRAINT CHK_Time_Range CHECK (end_time > start_time)
    );
    PRINT '✓ Table created: timetable_sessions';
END
ELSE
    PRINT '✓ Table already exists: timetable_sessions';
GO

-- Indexes cho tra cứu nhanh & chống trùng cơ bản
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TS_Lecturer_Time' AND object_id = OBJECT_ID('timetable_sessions'))
    CREATE INDEX IX_TS_Lecturer_Time ON timetable_sessions(lecturer_id, weekday, start_time);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TS_Room_Time' AND object_id = OBJECT_ID('timetable_sessions'))
    CREATE INDEX IX_TS_Room_Time ON timetable_sessions(room_id, weekday, start_time);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TS_Class' AND object_id = OBJECT_ID('timetable_sessions'))
    CREATE INDEX IX_TS_Class ON timetable_sessions(class_id, week_no);
GO

PRINT '========================================';
PRINT '✅ TIMETABLE TABLES READY';
PRINT '========================================';
PRINT '';

-- ===========================================
-- ALTER TABLES: Ensure school_year_id exists in gpas (for backward compatibility)
-- Note: school_year_id is now included in the CREATE TABLE statement above,
-- so this section is kept only for cases where the table was created before the fix
-- ===========================================
-- Add school_year_id column to gpas table if not exists (for backward compatibility)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.gpas') 
    AND name = 'school_year_id'
)
BEGIN
    ALTER TABLE dbo.gpas 
    ADD school_year_id VARCHAR(50) NULL 
        FOREIGN KEY REFERENCES dbo.school_years(school_year_id);
    
    PRINT '✅ Added school_year_id to gpas table';
END
ELSE
BEGIN
    PRINT 'ℹ️  Column school_year_id already exists in gpas table';
END
GO

-- Drop old constraint if it exists (for backward compatibility)
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'uk_gpa_student_year_semester' AND parent_object_id = OBJECT_ID('dbo.gpas'))
BEGIN
    ALTER TABLE dbo.gpas DROP CONSTRAINT uk_gpa_student_year_semester;
    PRINT '✅ Dropped old constraint uk_gpa_student_year_semester';
END
GO

-- Ensure the constraint exists (for backward compatibility)
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'uk_gpa_student_schoolyear_semester' AND parent_object_id = OBJECT_ID('dbo.gpas'))
BEGIN
    ALTER TABLE dbo.gpas 
    ADD CONSTRAINT uk_gpa_student_schoolyear_semester 
    UNIQUE (student_id, school_year_id, semester);
    PRINT '✅ Created constraint uk_gpa_student_schoolyear_semester';
END
ELSE
BEGIN
    PRINT 'ℹ️  Constraint uk_gpa_student_schoolyear_semester already exists';
END
GO

-- ===========================================
-- 20. BẢNG GRADE_APPEALS (Phúc khảo điểm)
-- ===========================================
IF OBJECT_ID('dbo.grade_appeals', 'U') IS NOT NULL DROP TABLE dbo.grade_appeals;
GO

CREATE TABLE dbo.grade_appeals (
    appeal_id          VARCHAR(50) PRIMARY KEY,
    grade_id           VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.grades(grade_id),
    enrollment_id      VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.enrollments(enrollment_id),
    student_id         VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.students(student_id),
    class_id           VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.classes(class_id),
    
    -- Thông tin yêu cầu
    appeal_reason      NVARCHAR(1000) NOT NULL, -- Lý do phúc khảo
    current_score      DECIMAL(4,2) NULL,        -- Điểm hiện tại
    expected_score     DECIMAL(4,2) NULL,        -- Điểm mong muốn (nếu có)
    supporting_docs     NVARCHAR(500) NULL,       -- Tài liệu đính kèm (file paths)
    
    -- Workflow
    status             NVARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, REVIEWING, APPROVED, REJECTED, CANCELLED
    priority           NVARCHAR(10) NULL DEFAULT 'NORMAL',     -- LOW, NORMAL, HIGH, URGENT
    
    -- Phản hồi từ giảng viên
    lecturer_response  NVARCHAR(1000) NULL,
    lecturer_id        VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.lecturers(lecturer_id),
    lecturer_decision  NVARCHAR(20) NULL, -- APPROVE, REJECT, NEED_REVIEW
    
    -- Duyệt từ cố vấn (nếu cần)
    advisor_id        VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.lecturers(lecturer_id),
    advisor_response   NVARCHAR(1000) NULL,
    advisor_decision   NVARCHAR(20) NULL, -- APPROVE, REJECT
    
    -- Kết quả cuối cùng
    final_score        DECIMAL(4,2) NULL,  -- Điểm sau phúc khảo
    resolution_notes   NVARCHAR(1000) NULL, -- Ghi chú giải quyết
    
    -- Audit fields
    created_at         DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by         VARCHAR(50) NULL, -- Student ID
    updated_at         DATETIME NULL,
    updated_by         VARCHAR(50) NULL,
    resolved_at        DATETIME NULL,
    resolved_by        VARCHAR(50) NULL,
    deleted_at         DATETIME NULL,
    deleted_by         VARCHAR(50) NULL,
    
    -- Constraints
    CONSTRAINT CHK_Appeal_Status CHECK (status IN ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT CHK_Appeal_Priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    CONSTRAINT CHK_Appeal_LecturerDecision CHECK (lecturer_decision IN ('APPROVE', 'REJECT', 'NEED_REVIEW') OR lecturer_decision IS NULL),
    CONSTRAINT CHK_Appeal_AdvisorDecision CHECK (advisor_decision IN ('APPROVE', 'REJECT') OR advisor_decision IS NULL)
);
GO

-- Indexes for grade_appeals
CREATE INDEX IX_Appeal_Student ON grade_appeals(student_id, status);
CREATE INDEX IX_Appeal_Grade ON grade_appeals(grade_id);
CREATE INDEX IX_Appeal_Lecturer ON grade_appeals(lecturer_id, status);
CREATE INDEX IX_Appeal_Advisor ON grade_appeals(advisor_id, status);
CREATE INDEX IX_Appeal_Status ON grade_appeals(status, created_at);
CREATE INDEX IX_Appeal_Enrollment ON grade_appeals(enrollment_id);
GO

PRINT '✅ Table created: grade_appeals';
GO

-- ===========================================
-- 21. BẢNG GRADE_FORMULA_CONFIG (Cấu hình công thức tính điểm)
-- ===========================================
IF OBJECT_ID('dbo.grade_formula_config', 'U') IS NOT NULL DROP TABLE dbo.grade_formula_config;
GO

CREATE TABLE dbo.grade_formula_config (
    config_id          VARCHAR(50) PRIMARY KEY,
    
    -- Phạm vi áp dụng (có thể config theo subject hoặc class)
    subject_id         VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.subjects(subject_id),
    class_id           VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.classes(class_id),
    school_year_id     VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.school_years(school_year_id),
    
    -- Công thức tính điểm
    -- Format: total_score = (midterm_score * midterm_weight) + (final_score * final_weight) + (other_components)
    midterm_weight     DECIMAL(5,2) NOT NULL DEFAULT 0.30 CHECK (midterm_weight >= 0 AND midterm_weight <= 1),
    final_weight       DECIMAL(5,2) NOT NULL DEFAULT 0.70 CHECK (final_weight >= 0 AND final_weight <= 1),
    assignment_weight  DECIMAL(5,2) NULL DEFAULT 0.00 CHECK (assignment_weight >= 0 AND assignment_weight <= 1),
    quiz_weight        DECIMAL(5,2) NULL DEFAULT 0.00 CHECK (quiz_weight >= 0 AND quiz_weight <= 1),
    project_weight     DECIMAL(5,2) NULL DEFAULT 0.00 CHECK (project_weight >= 0 AND project_weight <= 1),
    
    -- Công thức tùy chỉnh (JSON hoặc formula string)
    custom_formula     NVARCHAR(500) NULL, -- Ví dụ: "midterm*0.3 + final*0.7 + assignment*0.1"
    
    -- Quy tắc làm tròn
    rounding_method    NVARCHAR(20) NULL DEFAULT 'STANDARD', -- STANDARD, CEILING, FLOOR, NONE
    decimal_places     INT NULL DEFAULT 2 CHECK (decimal_places >= 0 AND decimal_places <= 4),
    
    -- Mô tả
    description        NVARCHAR(500) NULL,
    is_default         BIT NOT NULL DEFAULT 0, -- Công thức mặc định
    
    -- Audit fields
    created_at         DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by         VARCHAR(50) NULL,
    updated_at         DATETIME NULL,
    updated_by         VARCHAR(50) NULL,
    deleted_at         DATETIME NULL,
    deleted_by         VARCHAR(50) NULL,
    
    -- Constraints
    CONSTRAINT CHK_Formula_WeightSum CHECK (
        (midterm_weight + final_weight + ISNULL(assignment_weight, 0) + ISNULL(quiz_weight, 0) + ISNULL(project_weight, 0)) <= 1.0
    ),
    CONSTRAINT CHK_Formula_Rounding CHECK (rounding_method IN ('STANDARD', 'CEILING', 'FLOOR', 'NONE')),
    CONSTRAINT CHK_Formula_Scope CHECK (
        (subject_id IS NOT NULL) OR (class_id IS NOT NULL) OR (school_year_id IS NOT NULL)
    )
);
GO

-- Indexes for grade_formula_config
CREATE INDEX IX_Formula_Subject ON grade_formula_config(subject_id, is_default);
CREATE INDEX IX_Formula_Class ON grade_formula_config(class_id, is_default);
CREATE INDEX IX_Formula_SchoolYear ON grade_formula_config(school_year_id, is_default);
CREATE INDEX IX_Formula_Default ON grade_formula_config(is_default, deleted_at);
GO

PRINT '✅ Table created: grade_formula_config';
GO

-- ===========================================
-- 22. BẢNG PERIOD_CLASSES (Liên kết đợt đăng ký và lớp học phần)
-- ===========================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'period_classes')
BEGIN
    PRINT 'Creating table: period_classes';
    
    CREATE TABLE dbo.period_classes (
        period_class_id VARCHAR(50) PRIMARY KEY,
        period_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT(GETDATE()),
        created_by VARCHAR(50) NULL,
        updated_at DATETIME NULL,
        updated_by VARCHAR(50) NULL,
        deleted_at DATETIME NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_PeriodClass_Period 
            FOREIGN KEY (period_id) REFERENCES registration_periods(period_id),
        CONSTRAINT FK_PeriodClass_Class 
            FOREIGN KEY (class_id) REFERENCES classes(class_id),
        
        -- Unique constraint: một lớp chỉ có thể thêm vào một đợt một lần
        CONSTRAINT UQ_PeriodClass_PeriodClass 
            UNIQUE (period_id, class_id)
    );
    
    -- Indexes
    CREATE INDEX IX_PeriodClass_Period ON period_classes(period_id);
    CREATE INDEX IX_PeriodClass_Class ON period_classes(class_id);
    CREATE INDEX IX_PeriodClass_Active ON period_classes(is_active, deleted_at);
    
    PRINT '✓ Table created: period_classes';
END
ELSE
BEGIN
    PRINT '✓ Table already exists: period_classes';
END
GO

-- ===========================================
-- 23. BẢNG RETAKE_RECORDS (Học lại)
-- ===========================================
IF OBJECT_ID('dbo.retake_records', 'U') IS NOT NULL DROP TABLE dbo.retake_records;
GO

CREATE TABLE dbo.retake_records (
    retake_id          VARCHAR(50) PRIMARY KEY,
    enrollment_id      VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.enrollments(enrollment_id),
    student_id         VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.students(student_id),
    class_id           VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.classes(class_id),
    subject_id         VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.subjects(subject_id),
    
    -- Thông tin học lại
    reason             NVARCHAR(20) NOT NULL, -- ATTENDANCE, GRADE, BOTH
    threshold_value    DECIMAL(5,2) NULL,     -- Giá trị ngưỡng (20% cho vắng, 4.0 cho điểm)
    current_value      DECIMAL(5,2) NULL,     -- Giá trị hiện tại (absence rate hoặc grade)
    
    -- Workflow
    status             NVARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, COMPLETED
    advisor_notes      NVARCHAR(1000) NULL,   -- Ghi chú từ advisor
    
    -- Audit fields
    created_at         DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by         VARCHAR(50) NULL,      -- System hoặc user tạo
    updated_at         DATETIME NULL,
    updated_by         VARCHAR(50) NULL,
    resolved_at       DATETIME NULL,
    resolved_by        VARCHAR(50) NULL,     -- Advisor ID
    deleted_at         DATETIME NULL,
    deleted_by         VARCHAR(50) NULL,
    
    -- Constraints
    CONSTRAINT CHK_Retake_Reason CHECK (reason IN ('ATTENDANCE', 'GRADE', 'BOTH')),
    CONSTRAINT CHK_Retake_Status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'))
);
GO

-- Indexes for retake_records
CREATE INDEX IX_Retake_Student ON retake_records(student_id, status);
CREATE INDEX IX_Retake_Enrollment ON retake_records(enrollment_id);
CREATE INDEX IX_Retake_Class ON retake_records(class_id, status);
CREATE INDEX IX_Retake_Status ON retake_records(status, created_at);
CREATE INDEX IX_Retake_Subject ON retake_records(subject_id);
GO

PRINT '✅ Table created: retake_records';
GO

-- ===========================================
-- 24. BẢNG EXAM_SCHEDULES (Lịch thi)
-- ===========================================
IF OBJECT_ID('dbo.exam_schedules', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.exam_schedules (
        exam_id VARCHAR(50) PRIMARY KEY,
        class_id VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.classes(class_id),
        subject_id VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.subjects(subject_id),
        exam_date DATE NOT NULL,
        exam_time TIME NOT NULL, -- Giờ bắt đầu
        end_time TIME NOT NULL, -- Giờ kết thúc
        room_id VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.rooms(room_id),
        exam_type NVARCHAR(20) NOT NULL CHECK (exam_type IN ('GIỮA_HỌC_PHẦN', 'KẾT_THÚC_HỌC_PHẦN')),
        session_no INT NULL, -- Ca thi (1, 2, 3, ...)
        proctor_lecturer_id VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.lecturers(lecturer_id),
        duration INT NOT NULL, -- Thời lượng thi (phút)
        max_students INT NULL, -- Số lượng tối đa sinh viên trong ca thi này
        notes NVARCHAR(500) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
        school_year_id VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.school_years(school_year_id),
        semester INT NULL,
        created_at DATETIME NOT NULL DEFAULT(GETDATE()),
        created_by VARCHAR(50) NULL,
        updated_at DATETIME NULL,
        updated_by VARCHAR(50) NULL,
        deleted_at DATETIME NULL,
        deleted_by VARCHAR(50) NULL,
        -- Constraints
        CONSTRAINT CHK_Exam_Time_Range CHECK (end_time > exam_time),
        CONSTRAINT CHK_Exam_Duration CHECK (duration > 0 AND duration <= 600) -- Tối đa 10 giờ
    );
    PRINT '✓ Table created: exam_schedules';
END
ELSE
BEGIN
    PRINT '✓ Table already exists: exam_schedules';
END
GO

-- Indexes cho exam_schedules
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ExamSchedules_Date' AND object_id = OBJECT_ID('exam_schedules'))
    CREATE INDEX IX_ExamSchedules_Date ON exam_schedules(exam_date, school_year_id, semester);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ExamSchedules_Room_Time' AND object_id = OBJECT_ID('exam_schedules'))
    CREATE INDEX IX_ExamSchedules_Room_Time ON exam_schedules(room_id, exam_date, exam_time);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ExamSchedules_Class' AND object_id = OBJECT_ID('exam_schedules'))
    CREATE INDEX IX_ExamSchedules_Class ON exam_schedules(class_id, exam_type);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ExamSchedules_Subject' AND object_id = OBJECT_ID('exam_schedules'))
    CREATE INDEX IX_ExamSchedules_Subject ON exam_schedules(subject_id, exam_date);
GO

-- ===========================================
-- 25. BẢNG EXAM_ASSIGNMENTS (Phân công thi)
-- ===========================================
IF OBJECT_ID('dbo.exam_assignments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.exam_assignments (
        assignment_id VARCHAR(50) PRIMARY KEY,
        exam_id VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.exam_schedules(exam_id),
        enrollment_id VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.enrollments(enrollment_id),
        student_id VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.students(student_id),
        seat_number INT NULL, -- Số ghế (nếu có)
        status NVARCHAR(20) NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'NOT_QUALIFIED', 'ATTENDED', 'ABSENT', 'EXCUSED')),
        -- NOT_QUALIFIED: Không đủ điều kiện dự thi (vắng mặt > 20%)
        -- ASSIGNED: Đã phân vào ca thi và đủ điều kiện
        -- ATTENDED: Đã dự thi
        -- ABSENT: Vắng thi không lý do
        -- EXCUSED: Vắng thi có lý do
        notes NVARCHAR(500) NULL,
        created_at DATETIME NOT NULL DEFAULT(GETDATE()),
        created_by VARCHAR(50) NULL,
        deleted_at DATETIME NULL,
        deleted_by VARCHAR(50) NULL
    );
    PRINT '✓ Table created: exam_assignments';
END
ELSE
BEGIN
    PRINT '✓ Table already exists: exam_assignments';
END
GO

-- Indexes cho exam_assignments
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ExamAssignments_Exam' AND object_id = OBJECT_ID('exam_assignments'))
    CREATE INDEX IX_ExamAssignments_Exam ON exam_assignments(exam_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ExamAssignments_Student' AND object_id = OBJECT_ID('exam_assignments'))
    CREATE INDEX IX_ExamAssignments_Student ON exam_assignments(student_id, exam_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ExamAssignments_Enrollment' AND object_id = OBJECT_ID('exam_assignments'))
    CREATE INDEX IX_ExamAssignments_Enrollment ON exam_assignments(enrollment_id);
GO

-- ===========================================
-- 26. BẢNG STUDENT_CLASS_TRANSFERS (Lịch sử chuyển lớp)
-- ===========================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'student_class_transfers')
BEGIN
    CREATE TABLE dbo.student_class_transfers (
        -- Primary Key
        transfer_id          VARCHAR(50) PRIMARY KEY,
        
        -- Student Information
        student_id           VARCHAR(50) NOT NULL,
        
        -- Class Information
        from_admin_class_id  VARCHAR(50) NULL,  -- Lớp cũ (NULL nếu chưa có lớp)
        to_admin_class_id    VARCHAR(50) NOT NULL,  -- Lớp mới
        
        -- Transfer Details
        transfer_reason      NVARCHAR(500) NULL,  -- Lý do chuyển lớp
        transfer_date        DATETIME NOT NULL DEFAULT(GETDATE()),  -- Ngày chuyển
        
        -- Audit Fields
        transferred_by       VARCHAR(50) NOT NULL,  -- Người thực hiện chuyển lớp
        created_at           DATETIME NOT NULL DEFAULT(GETDATE()),
        
        -- Foreign Keys
        FOREIGN KEY (student_id) REFERENCES dbo.students(student_id),
        FOREIGN KEY (from_admin_class_id) REFERENCES dbo.administrative_classes(admin_class_id),
        FOREIGN KEY (to_admin_class_id) REFERENCES dbo.administrative_classes(admin_class_id)
    );
    
    -- Indexes
    CREATE INDEX IX_StudentClassTransfer_StudentId ON dbo.student_class_transfers(student_id);
    CREATE INDEX IX_StudentClassTransfer_FromClass ON dbo.student_class_transfers(from_admin_class_id);
    CREATE INDEX IX_StudentClassTransfer_ToClass ON dbo.student_class_transfers(to_admin_class_id);
    CREATE INDEX IX_StudentClassTransfer_Date ON dbo.student_class_transfers(transfer_date);
    
    PRINT '✓ Table created: student_class_transfers';
END
ELSE
BEGIN
    PRINT '✓ Table already exists: student_class_transfers';
END
GO

