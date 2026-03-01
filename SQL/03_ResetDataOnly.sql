-- ===========================================
-- 🎓 HỆ THỐNG QUẢN LÝ ĐIỂM DANH SINH VIÊN
-- 📋 File: RESET DATA ONLY (KHÔNG DROP DATABASE)
-- ===========================================
-- 
-- Script này CHỈ XÓA DATA từ các bảng và INSERT lại seed data
-- KHÔNG DROP database, tables, hoặc stored procedures
--
-- ===========================================

USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
GO

PRINT '';
PRINT '╔════════════════════════════════════════════════╗';
PRINT '║     ⚠️  RESET DATA ONLY - DELETE & RESEED     ║';
PRINT '╚════════════════════════════════════════════════╝';
PRINT '';
PRINT '⚠️  Script này sẽ XÓA TẤT CẢ DATA và INSERT lại seed data';
PRINT '';
GO

-- ===========================================
-- STEP 1: DISABLE FOREIGN KEY CONSTRAINTS (tạm thời)
-- ===========================================
PRINT '🔧 Step 1: Disabling foreign key constraints...';
GO

-- Disable all foreign keys temporarily
EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL";
PRINT '   ✅ Foreign key constraints disabled';
GO

-- ===========================================
-- STEP 2: DELETE DATA (theo thứ tự ngược lại FK)
-- ===========================================
PRINT '';
PRINT '🔧 Step 2: Deleting data from all tables...';
GO

-- Delete từ các bảng con trước (có FK references)
-- Lưu ý: Thứ tự xóa theo thứ tự ngược lại của foreign key dependencies
DELETE FROM dbo.notifications;
DELETE FROM dbo.role_permissions;
DELETE FROM dbo.grade_appeals;
DELETE FROM dbo.retake_records;
DELETE FROM dbo.grade_formula_config;
DELETE FROM dbo.grades;
DELETE FROM dbo.attendances;
DELETE FROM dbo.gpas;
DELETE FROM dbo.enrollments;
DELETE FROM dbo.period_classes;
DELETE FROM dbo.timetable_sessions;
DELETE FROM dbo.subject_prerequisites;
DELETE FROM dbo.classes;
DELETE FROM dbo.refresh_tokens;
DELETE FROM dbo.audit_logs;
DELETE FROM dbo.registration_periods;
DELETE FROM dbo.administrative_classes;
DELETE FROM dbo.subjects;
DELETE FROM dbo.students;
DELETE FROM dbo.lecturers;
DELETE FROM dbo.school_years;
DELETE FROM dbo.academic_years;
DELETE FROM dbo.majors;
DELETE FROM dbo.departments;
DELETE FROM dbo.faculties;
DELETE FROM dbo.users;
DELETE FROM dbo.permissions;
DELETE FROM dbo.roles;
-- Xóa các bảng không có FK nhưng có thể có data
DELETE FROM dbo.rooms;

PRINT '   ✅ All data deleted from tables';
GO

-- ===========================================
-- STEP 3: RESET IDENTITY COLUMNS (nếu có)
-- ===========================================
PRINT '';
PRINT '🔧 Step 3: Resetting identity columns...';
GO

-- Reset identity cho audit_logs
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_logs') AND name = 'log_id')
BEGIN
    DBCC CHECKIDENT ('audit_logs', RESEED, 0);
    PRINT '   ✅ Reset audit_logs.log_id';
END
GO

PRINT '   ✅ Identity columns reset';
GO

-- ===========================================
-- STEP 4: RE-ENABLE FOREIGN KEY CONSTRAINTS
-- ===========================================
PRINT '';
PRINT '🔧 Step 4: Re-enabling foreign key constraints...';
GO

-- Re-enable all foreign keys
EXEC sp_MSforeachtable "ALTER TABLE ? CHECK CONSTRAINT ALL";
PRINT '   ✅ Foreign key constraints re-enabled';
GO

-- ===========================================
-- STEP 5: INSERT SEED DATA
-- ===========================================
PRINT '';
PRINT '🔧 Step 5: Inserting seed data...';
PRINT '';
GO

-- ===========================================
-- 1. ROLES (4 roles)
-- ===========================================
PRINT '👥 Seeding Roles...';

INSERT INTO dbo.roles (role_id, role_name, description, is_active) VALUES
('ROLE_ADMIN', N'Admin', N'Quản trị viên hệ thống', 1),
('ROLE_LECTURER', N'Lecturer', N'Giảng viên', 1),
('ROLE_STUDENT', N'Student', N'Sinh viên', 1),
('ROLE_ADVISOR', N'Advisor', N'Cố vấn học tập & Nhân viên phòng đào tạo', 1);

PRINT '   ✅ 4 roles created';
GO

-- ===========================================
-- 2. USERS
-- ===========================================
PRINT '👤 Seeding Users...';

-- Admin password: "admin123" 
-- BCrypt hash: $2a$10$h5gvrNjE2bhwhHn6Ofofq.Ppr0hvpLY5Q3mbY1OjkkGL8CMxm2VBm
-- Other users password: "password123"
-- BCrypt hash: $2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue
INSERT INTO dbo.users (user_id, username, password_hash, email, phone, full_name, role_id, is_active) VALUES
('USER001', 'admin', '$2a$10$h5gvrNjE2bhwhHn6Ofofq.Ppr0hvpLY5Q3mbY1OjkkGL8CMxm2VBm', 'admin@example.com', '0901234567', N'Nguyễn Văn Admin', 'ROLE_ADMIN', 1),
('USER002', 'lecturer01', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'lecturer01@example.com', '0902222222', N'Trần Thị Hoa', 'ROLE_LECTURER', 1),
('USER003', 'student_k21_01', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'student.k21.01@example.com', '0903333333', N'Lê Văn An', 'ROLE_STUDENT', 1),
('USER004', 'student_k21_02', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'student.k21.02@example.com', '0904444444', N'Phạm Thị Bình', 'ROLE_STUDENT', 1),
('USER005', 'student_k22_01', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'student.k22.01@example.com', '0905555555', N'Nguyễn Văn Cường', 'ROLE_STUDENT', 1),
('USER006', 'student_k23_01', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'student.k23.01@example.com', '0906666666', N'Hoàng Thị Dung', 'ROLE_STUDENT', 1),
('USER007', 'student_k24_01', '$2a$10$Ya6MFL1CGpg2/y088u6t7.ACYkMJdmA1869rbBmAnyn6OQi0hTBue', 'student.k24.01@example.com', '0907777777', N'Đinh Văn Em', 'ROLE_STUDENT', 1);

PRINT '   ✅ 7 users created (1 admin, 1 lecturer, 5 students from different cohorts)';
GO

-- ===========================================
-- 3. FACULTIES (1 faculty)
-- ===========================================
PRINT '🏛️  Seeding Faculties...';

INSERT INTO dbo.faculties (faculty_id, faculty_code, faculty_name, description, is_active) VALUES
('FAC001', 'CNTT', N'Công nghệ Thông tin', N'Khoa Công nghệ Thông tin', 1);

PRINT '   ✅ 1 faculty created';
GO

-- ===========================================
-- 4. DEPARTMENTS (2 departments)
-- ===========================================
PRINT '🏢 Seeding Departments...';

INSERT INTO dbo.departments (department_id, department_code, department_name, faculty_id, description) VALUES
('DEPT001', 'DEPT001', N'Khoa học Máy tính', 'FAC001', N'Bộ môn Khoa học Máy tính'),
('DEPT002', 'DEPT002', N'Hệ thống Thông tin', 'FAC001', N'Bộ môn Hệ thống Thông tin');

PRINT '   ✅ 2 departments created';
GO

-- ===========================================
-- 5. MAJORS (2 majors)
-- ===========================================
PRINT '📚 Seeding Majors...';

INSERT INTO dbo.majors (major_id, major_name, major_code, faculty_id, description) VALUES
('MAJ001', N'Công nghệ Phần mềm', 'SE', 'FAC001', N'Chuyên ngành Công nghệ Phần mềm'),
('MAJ002', N'Khoa học Dữ liệu', 'DS', 'FAC001', N'Chuyên ngành Khoa học Dữ liệu');

PRINT '   ✅ 2 majors created';
GO

-- ===========================================
-- 6. ACADEMIC YEARS (NIÊN KHÓA) - 4 COHORTS
-- ===========================================
PRINT '📅 Seeding Academic Years (Cohorts - 4 years each)...';

-- Use stored procedure to auto-create cohorts
BEGIN TRY
    -- K21: 2021-2025
    EXEC sp_AutoCreateCohort @StartYear = 2021, @DurationYears = 4, @CreatedBy = 'system';
    
    -- K22: 2022-2026
    EXEC sp_AutoCreateCohort @StartYear = 2022, @DurationYears = 4, @CreatedBy = 'system';
    
    -- K23: 2023-2027
    EXEC sp_AutoCreateCohort @StartYear = 2023, @DurationYears = 4, @CreatedBy = 'system';
    
    -- K24: 2024-2028
    EXEC sp_AutoCreateCohort @StartYear = 2024, @DurationYears = 4, @CreatedBy = 'system';
    
    PRINT '   ✅ 4 cohorts created (K21, K22, K23, K24) with 16 school years total';
END TRY
BEGIN CATCH
    PRINT CONCAT('   ⚠️  Error creating cohorts: ', ERROR_MESSAGE());
    -- Try to continue - maybe some were created successfully
END CATCH
GO

-- Verify academic year AY2024 exists (needed for SY2024)
IF NOT EXISTS (SELECT 1 FROM academic_years WHERE academic_year_id = 'AY2024')
BEGIN
    PRINT '   ⚠️  AY2024 not found, creating it...';
    INSERT INTO academic_years (academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, created_at, created_by)
    VALUES ('AY2024', '2024-2028', 'K24', 2024, 2028, 4, 0, GETDATE(), 'system');
    PRINT '   ✅ Created AY2024';
END

-- Verify school years were created, especially SY2024
DECLARE @SchoolYearCount INT;
SELECT @SchoolYearCount = COUNT(*) 
FROM school_years 
WHERE deleted_at IS NULL;

IF @SchoolYearCount = 0
BEGIN
    PRINT '   ⚠️  No school years found! Creating SY2024 manually...';
    BEGIN TRY
        EXEC sp_AutoCreateSchoolYear @StartYear = 2024, @AcademicYearId = 'AY2024', @CreatedBy = 'system';
        PRINT '   ✅ Created SY2024 manually';
    END TRY
    BEGIN CATCH
        PRINT CONCAT('   ❌ Failed to create SY2024: ', ERROR_MESSAGE());
    END CATCH
END
ELSE IF NOT EXISTS (SELECT 1 FROM school_years WHERE school_year_id = 'SY2024' AND deleted_at IS NULL)
BEGIN
    PRINT '   ⚠️  SY2024 not found! Creating it...';
    BEGIN TRY
        EXEC sp_AutoCreateSchoolYear @StartYear = 2024, @AcademicYearId = 'AY2024', @CreatedBy = 'system';
        PRINT '   ✅ Created SY2024';
    END TRY
    BEGIN CATCH
        PRINT CONCAT('   ❌ Failed to create SY2024: ', ERROR_MESSAGE());
    END CATCH
END
ELSE
BEGIN
    PRINT '   ✅ Verified: SY2024 exists';
END
GO

-- Activate current school year (2024-2025 or nearest future school year)
DECLARE @CurrentYear INT = YEAR(GETDATE());
DECLARE @SchoolYearToActivate VARCHAR(50);
DECLARE @SemesterToSet INT;

-- Try to find school year that covers current date or nearest future
SELECT TOP 1 
    @SchoolYearToActivate = school_year_id,
    @SemesterToSet = CASE 
        WHEN CAST(GETDATE() AS DATE) BETWEEN semester1_start AND semester1_end THEN 1
        WHEN CAST(GETDATE() AS DATE) BETWEEN semester2_start AND semester2_end THEN 2
        WHEN CAST(GETDATE() AS DATE) < semester1_start THEN 1  -- Before semester 1, set to 1
        WHEN CAST(GETDATE() AS DATE) > semester2_end THEN 2   -- After semester 2, set to 2
        ELSE 1
    END
FROM school_years
WHERE deleted_at IS NULL
    AND (
        -- Current date is within school year range
        (CAST(GETDATE() AS DATE) BETWEEN start_date AND end_date)
        -- OR current date is before school year starts (nearest future)
        OR (CAST(GETDATE() AS DATE) < start_date)
    )
ORDER BY 
    CASE WHEN CAST(GETDATE() AS DATE) BETWEEN start_date AND end_date THEN 0 ELSE 1 END,
    start_date ASC;

-- If no match, activate SY2024 if exists
IF @SchoolYearToActivate IS NULL
BEGIN
    IF EXISTS (SELECT 1 FROM school_years WHERE school_year_id = 'SY2024')
    BEGIN
        SET @SchoolYearToActivate = 'SY2024';
        SET @SemesterToSet = 1;
    END
END

-- Activate the school year
IF @SchoolYearToActivate IS NOT NULL
BEGIN
    -- Deactivate all other school years first
    UPDATE school_years 
    SET is_active = 0
    WHERE school_year_id != @SchoolYearToActivate;
    
    -- Activate target school year
    UPDATE school_years 
    SET is_active = 1, 
        current_semester = @SemesterToSet
    WHERE school_year_id = @SchoolYearToActivate;
    
    PRINT CONCAT('   ✅ Activated school year: ', @SchoolYearToActivate, ' (Semester ', CAST(@SemesterToSet AS VARCHAR), ')');
END
ELSE
BEGIN
    PRINT '   ⚠️  No school year found to activate - ensure school years exist for current/future dates';
END
GO

-- ===========================================
-- 7. LECTURERS (1 lecturer)
-- ===========================================
PRINT '👨‍🏫 Seeding Lecturers...';

INSERT INTO dbo.lecturers (lecturer_id, lecturer_code, full_name, email, phone, department_id, user_id) VALUES
('LEC001', 'GV001', N'Trần Thị Hoa', 'lecturer01@example.com', '0902222222', 'DEPT001', 'USER002');

PRINT '   ✅ 1 lecturer created';
GO

-- ===========================================
-- 8. STUDENTS - DISTRIBUTED ACROSS COHORTS
-- ===========================================
PRINT '👨‍🎓 Seeding Students (5 students from K21, K22, K23, K24)...';

-- Verify academic years exist before inserting students
IF NOT EXISTS (SELECT 1 FROM academic_years WHERE academic_year_id = 'AY2021')
BEGIN
    INSERT INTO academic_years (academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, created_at, created_by)
    VALUES ('AY2021', '2021-2025', 'K21', 2021, 2025, 4, 0, GETDATE(), 'system');
END

IF NOT EXISTS (SELECT 1 FROM academic_years WHERE academic_year_id = 'AY2022')
BEGIN
    INSERT INTO academic_years (academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, created_at, created_by)
    VALUES ('AY2022', '2022-2026', 'K22', 2022, 2026, 4, 0, GETDATE(), 'system');
END

IF NOT EXISTS (SELECT 1 FROM academic_years WHERE academic_year_id = 'AY2023')
BEGIN
    INSERT INTO academic_years (academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, created_at, created_by)
    VALUES ('AY2023', '2023-2027', 'K23', 2023, 2027, 4, 0, GETDATE(), 'system');
END

IF NOT EXISTS (SELECT 1 FROM academic_years WHERE academic_year_id = 'AY2024')
BEGIN
    INSERT INTO academic_years (academic_year_id, year_name, cohort_code, start_year, end_year, duration_years, is_active, created_at, created_by)
    VALUES ('AY2024', '2024-2028', 'K24', 2024, 2028, 4, 0, GETDATE(), 'system');
END

INSERT INTO dbo.students (student_id, user_id, student_code, full_name, gender, date_of_birth, email, phone, major_id, academic_year_id, is_active) VALUES
-- K21 students (2021-2025) - Year 4 now
('STU001', 'USER003', 'SV2021001', N'Lê Văn An', N'Nam', '2003-05-15', 'student.k21.01@example.com', '0903333333', 'MAJ001', 'AY2021', 1),
('STU002', 'USER004', 'SV2021002', N'Phạm Thị Bình', N'Nữ', '2003-08-20', 'student.k21.02@example.com', '0904444444', 'MAJ001', 'AY2021', 1),

-- K22 student (2022-2026) - Year 3 now
('STU003', 'USER005', 'SV2022001', N'Nguyễn Văn Cường', N'Nam', '2004-03-10', 'student.k22.01@example.com', '0905555555', 'MAJ002', 'AY2022', 1),

-- K23 student (2023-2027) - Year 2 now
('STU004', 'USER006', 'SV2023001', N'Hoàng Thị Dung', N'Nữ', '2005-07-25', 'student.k23.01@example.com', '0906666666', 'MAJ001', 'AY2023', 1),

-- K24 student (2024-2028) - Year 1 now (freshman)
('STU005', 'USER007', 'SV2024001', N'Đinh Văn Em', N'Nam', '2006-11-30', 'student.k24.01@example.com', '0907777777', 'MAJ002', 'AY2024', 1);

PRINT '   ✅ 5 students created (2 from K21, 1 from K22, 1 from K23, 1 from K24)';
GO

-- ===========================================
-- 9. SUBJECTS (4 subjects - for different years)
-- ===========================================
PRINT '📖 Seeding Subjects...';

INSERT INTO dbo.subjects (subject_id, subject_code, subject_name, credits, department_id, description) VALUES
('SUB001', 'CS101', N'Lập trình C#', 3, 'DEPT001', N'Nhập môn lập trình C# - Năm 1'),
('SUB002', 'CS102', N'Cơ sở dữ liệu', 3, 'DEPT001', N'Hệ quản trị cơ sở dữ liệu - Năm 1'),
('SUB003', 'CS201', N'Cấu trúc dữ liệu', 4, 'DEPT001', N'Cấu trúc dữ liệu và giải thuật - Năm 2'),
('SUB004', 'CS301', N'Công nghệ Web', 4, 'DEPT001', N'Lập trình Web nâng cao - Năm 3');

PRINT '   ✅ 4 subjects created';
GO

-- ===========================================
-- 10. CLASSES - FOR SCHOOL YEAR 2024-2025 (SEMESTER 1)
-- ===========================================
PRINT '🏫 Seeding Classes (School Year 2024-2025, Semester 1)...';

-- Ensure SY2024 exists, if not create it
IF NOT EXISTS (SELECT 1 FROM school_years WHERE school_year_id = 'SY2024')
BEGIN
    PRINT '   ⚠️  SY2024 not found, creating it...';
    EXEC sp_AutoCreateSchoolYear @StartYear = 2024, @AcademicYearId = 'AY2024', @CreatedBy = 'system';
END

-- Get the actual school year ID (could be SY2024 or current active one)
DECLARE @TargetSchoolYearId VARCHAR(50);

-- Try to get SY2024 first
IF EXISTS (SELECT 1 FROM school_years WHERE school_year_id = 'SY2024' AND deleted_at IS NULL)
BEGIN
    SET @TargetSchoolYearId = 'SY2024';
END
ELSE
BEGIN
    -- Fallback: Get the first available school year for 2024-2025
    SELECT TOP 1 @TargetSchoolYearId = school_year_id
    FROM school_years
    WHERE year_code LIKE '2024%' AND deleted_at IS NULL
    ORDER BY start_date ASC;
    
    IF @TargetSchoolYearId IS NULL
    BEGIN
        -- Last resort: Get any active school year
        SELECT TOP 1 @TargetSchoolYearId = school_year_id
        FROM school_years
        WHERE deleted_at IS NULL
        ORDER BY start_date DESC;
    END
END

IF @TargetSchoolYearId IS NOT NULL
BEGIN
    -- Link to NEW school_year_id instead of old academic_year_id
    INSERT INTO dbo.classes (class_id, class_code, class_name, subject_id, lecturer_id, academic_year_id, school_year_id, semester, max_students, schedule, room) VALUES
    -- Semester 1 classes for 2024-2025
    ('CLS001', 'CS101-01-2024', N'Lập trình C# - Lớp 01 (2024-2025 HK1)', 'SUB001', 'LEC001', 'AY2024', @TargetSchoolYearId, 1, 40, N'Thứ 2, 7:00-9:00', 'A101'),
    ('CLS002', 'CS102-01-2024', N'Cơ sở dữ liệu - Lớp 01 (2024-2025 HK1)', 'SUB002', 'LEC001', 'AY2024', @TargetSchoolYearId, 1, 40, N'Thứ 4, 7:00-9:00', 'A102'),
    ('CLS003', 'CS201-01-2024', N'Cấu trúc dữ liệu - Lớp 01 (2024-2025 HK1)', 'SUB003', 'LEC001', 'AY2023', @TargetSchoolYearId, 1, 35, N'Thứ 3, 13:00-15:00', 'B201'),
    ('CLS004', 'CS301-01-2024', N'Công nghệ Web - Lớp 01 (2024-2025 HK1)', 'SUB004', 'LEC001', 'AY2022', @TargetSchoolYearId, 1, 30, N'Thứ 5, 15:00-17:00', 'C301');
    
    PRINT CONCAT('   ✅ 4 classes created for school year: ', @TargetSchoolYearId);
END
ELSE
BEGIN
    PRINT '   ❌ ERROR: No school year available to create classes!';
    PRINT '   ⚠️  Please ensure school years are created before inserting classes.';
END
GO

-- ===========================================
-- 11. ENROLLMENTS - Students register for classes
-- ===========================================
PRINT '📝 Seeding Enrollments...';

INSERT INTO dbo.enrollments (enrollment_id, student_id, class_id, status, enrollment_status, enrollment_date) VALUES
-- K24 student (freshman) takes year 1 courses
('ENR001', 'STU005', 'CLS001', N'Đang học', 'APPROVED', GETDATE()),  -- CS101
('ENR002', 'STU005', 'CLS002', N'Đang học', 'APPROVED', GETDATE()),  -- CS102

-- K23 student (year 2) takes year 2 course
('ENR003', 'STU004', 'CLS003', N'Đang học', 'APPROVED', GETDATE()),  -- CS201

-- K22 student (year 3) takes year 3 course
('ENR004', 'STU003', 'CLS004', N'Đang học', 'APPROVED', GETDATE()),  -- CS301

-- K21 students (year 4) also take some courses
('ENR005', 'STU001', 'CLS004', N'Đang học', 'APPROVED', GETDATE()),  -- CS301
('ENR006', 'STU002', 'CLS003', N'Đang học', 'APPROVED', GETDATE());  -- CS201

PRINT '   ✅ 6 enrollments created';
GO

-- ===========================================
-- 12. GRADES - Sample grades for current semester
-- ===========================================
PRINT '💯 Seeding Grades...';

INSERT INTO dbo.grades (grade_id, enrollment_id, midterm_score, final_score, total_score, letter_grade) VALUES
('GRD001', 'ENR001', 8.5, 9.0, 8.8, 'A'),
('GRD002', 'ENR002', 7.0, 7.5, 7.3, 'B'),
('GRD003', 'ENR003', 9.0, 9.5, 9.3, 'A'),
('GRD004', 'ENR004', 6.5, 7.0, 6.8, 'C'),
('GRD005', 'ENR005', 8.0, 8.5, 8.3, 'A'),
('GRD006', 'ENR006', 7.5, 8.0, 7.8, 'B');

PRINT '   ✅ 6 grades created';
GO

-- ===========================================
-- 13. PERMISSIONS (Essential permissions only)
-- ===========================================
PRINT '🔐 Seeding Permissions...';

INSERT INTO dbo.permissions (permission_id, permission_code, permission_name, description) VALUES
('PERM001', 'USER_VIEW', N'Xem người dùng', N'Xem danh sách người dùng'),
('PERM002', 'USER_CREATE', N'Tạo người dùng', N'Tạo người dùng mới'),
('PERM003', 'USER_UPDATE', N'Sửa người dùng', N'Cập nhật thông tin người dùng'),
('PERM004', 'USER_DELETE', N'Xóa người dùng', N'Xóa người dùng'),
('PERM005', 'STUDENT_VIEW', N'Xem sinh viên', N'Xem danh sách sinh viên'),
('PERM006', 'STUDENT_MANAGE', N'Quản lý sinh viên', N'Thêm/sửa/xóa sinh viên'),
('PERM007', 'CLASS_VIEW', N'Xem lớp học', N'Xem danh sách lớp học'),
('PERM008', 'CLASS_MANAGE', N'Quản lý lớp học', N'Thêm/sửa/xóa lớp học'),
('PERM009', 'GRADE_VIEW', N'Xem điểm', N'Xem điểm sinh viên'),
('PERM010', 'GRADE_MANAGE', N'Quản lý điểm', N'Nhập/sửa điểm'),
('PERM011', 'VIEW_ACADEMIC_YEARS', N'Xem niên khóa', N'Xem danh sách niên khóa'),
('PERM012', 'MANAGE_ACADEMIC_YEARS', N'Quản lý niên khóa', N'Thêm/sửa/xóa niên khóa'),
('PERM013', 'VIEW_SCHOOL_YEARS', N'Xem năm học', N'Xem danh sách năm học'),
('PERM014', 'MANAGE_SCHOOL_YEARS', N'Quản lý năm học', N'Thêm/sửa/xóa năm học');

PRINT '   ✅ 14 permissions created';
GO

-- ===========================================
-- 14. ROLE_PERMISSIONS
-- ===========================================
PRINT '🔗 Assigning Permissions to Roles...';

-- Admin: All permissions
INSERT INTO dbo.role_permissions (role_id, permission_id) VALUES
('ROLE_ADMIN', 'PERM001'), ('ROLE_ADMIN', 'PERM002'), ('ROLE_ADMIN', 'PERM003'),
('ROLE_ADMIN', 'PERM004'), ('ROLE_ADMIN', 'PERM005'), ('ROLE_ADMIN', 'PERM006'),
('ROLE_ADMIN', 'PERM007'), ('ROLE_ADMIN', 'PERM008'), ('ROLE_ADMIN', 'PERM009'),
('ROLE_ADMIN', 'PERM010'), ('ROLE_ADMIN', 'PERM011'), ('ROLE_ADMIN', 'PERM012'),
('ROLE_ADMIN', 'PERM013'), ('ROLE_ADMIN', 'PERM014');

-- Lecturer: View students, manage grades
INSERT INTO dbo.role_permissions (role_id, permission_id) VALUES
('ROLE_LECTURER', 'PERM005'), ('ROLE_LECTURER', 'PERM007'),
('ROLE_LECTURER', 'PERM009'), ('ROLE_LECTURER', 'PERM010');

-- Student: View only
INSERT INTO dbo.role_permissions (role_id, permission_id) VALUES
('ROLE_STUDENT', 'PERM007'), ('ROLE_STUDENT', 'PERM009');

PRINT '   ✅ Permissions assigned to roles';
GO

-- ===========================================
-- 15. SAMPLE NOTIFICATION
-- ===========================================
PRINT '🔔 Seeding Notifications...';

INSERT INTO dbo.notifications (notification_id, user_id, title, message, is_read) VALUES
('NOTIF001', 'USER003', N'Chào mừng K21', N'Chào mừng bạn đến với năm cuối cùng của Khóa 21!', 0),
('NOTIF002', 'USER007', N'Chào mừng K24', N'Chào mừng tân sinh viên Khóa 24! Chúc bạn có 4 năm học tập thật tốt!', 0);

PRINT '   ✅ 2 notifications created';
GO

PRINT '';
PRINT '╔════════════════════════════════════════════════╗';
PRINT '║     ✅ DATA RESET & RESEED COMPLETED!          ║';
PRINT '╚════════════════════════════════════════════════╝';
PRINT '';
PRINT '📊 Summary:';
PRINT '   ✅ 4 Roles';
PRINT '   ✅ 7 Users (1 Admin, 1 Lecturer, 5 Students)';
PRINT '   ✅ 1 Faculty';
PRINT '   ✅ 2 Departments';
PRINT '   ✅ 2 Majors';
PRINT '   ✅ 4 Cohorts (K21, K22, K23, K24) - 16 school years total';
PRINT '   ✅ Active: School Year (auto-detected based on current date)';
PRINT '   ✅ 1 Lecturer';
PRINT '   ✅ 5 Students (distributed across K21-K24)';
PRINT '   ✅ 4 Subjects (year 1-3 courses)';
PRINT '   ✅ 4 Classes (2024-2025 HK1)';
PRINT '   ✅ 6 Enrollments';
PRINT '   ✅ 6 Grades';
PRINT '   ✅ 14 Permissions';
PRINT '';
PRINT '🔑 Login Credentials:';
PRINT '   👤 Admin:        admin / admin123';
PRINT '   👨‍🏫 Lecturer:     lecturer01 / password123';
PRINT '   👨‍🎓 Student K21:  student_k21_01, student_k21_02 (Year 4) / password123';
PRINT '   👨‍🎓 Student K22:  student_k22_01 (Year 3) / password123';
PRINT '   👨‍🎓 Student K23:  student_k23_01 (Year 2) / password123';
PRINT '   👨‍🎓 Student K24:  student_k24_01 (Year 1 - Freshman) / password123';
PRINT '';
GO

