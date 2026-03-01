-- ===========================================
-- 02_SP_Curriculum.sql
-- ===========================================
-- Description: Subjects, Classes, and Enrollments Management
-- ===========================================

USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '========================================';
PRINT 'Starting: 02_SP_Curriculum.sql';
PRINT 'Curriculum Management SPs';
PRINT '========================================';
GO

IF OBJECT_ID('sp_CheckSubjectCodeExists', 'P') IS NOT NULL DROP PROCEDURE sp_CheckSubjectCodeExists;
GO
CREATE PROCEDURE sp_CheckSubjectCodeExists
    @SubjectCode VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM dbo.subjects 
        WHERE subject_code = @SubjectCode AND deleted_at IS NULL
    ) THEN 1 ELSE 0 END;
END
GO

IF OBJECT_ID('sp_CreateClass', 'P') IS NOT NULL DROP PROCEDURE sp_CreateClass;
GO
CREATE PROCEDURE sp_CreateClass
    @ClassId VARCHAR(50),
    @ClassCode VARCHAR(20),
    @ClassName NVARCHAR(200),
    @SubjectId VARCHAR(50),
    @LecturerId VARCHAR(50) = NULL,
    @AcademicYearId VARCHAR(50) = NULL,
    @Semester INT = NULL,
    @MaxStudents INT = NULL,
    @Schedule NVARCHAR(500) = NULL,
    @Room NVARCHAR(100) = NULL,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    INSERT INTO dbo.classes (class_id, class_code, class_name, subject_id, lecturer_id,
                             academic_year_id, semester, max_students, schedule, room,
                             created_at, created_by)
    VALUES (@ClassId, @ClassCode, @ClassName, @SubjectId, @LecturerId, @AcademicYearId,
            @Semester, @MaxStudents, @Schedule, @Room, GETDATE(), @CreatedBy);
    SELECT @ClassId AS class_id;
END
GO

-- sp_CreateEnrollment đã được di chuyển sang 02_SP_Scheduling.sql (phiên bản đầy đủ hơn với enrollment_status, drop_deadline, notes)

IF OBJECT_ID('sp_CreateSubject', 'P') IS NOT NULL DROP PROCEDURE sp_CreateSubject;
GO
CREATE PROCEDURE sp_CreateSubject
    @SubjectId VARCHAR(50),
    @SubjectCode VARCHAR(20),
    @SubjectName NVARCHAR(200),
    @Credits INT,
    @DepartmentId VARCHAR(50) = NULL,
    @Description NVARCHAR(500) = NULL,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    INSERT INTO dbo.subjects (subject_id, subject_code, subject_name, credits,
                              department_id, description, created_at, created_by)
    VALUES (@SubjectId, @SubjectCode, @SubjectName, @Credits, @DepartmentId,
            @Description, GETDATE(), @CreatedBy);
END
GO

IF OBJECT_ID('sp_DeleteClass', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteClass;
GO
CREATE PROCEDURE sp_DeleteClass
    @ClassId VARCHAR(50),
    @DeletedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.classes
    SET deleted_at = GETDATE(), deleted_by = @DeletedBy
    WHERE class_id = @ClassId;
END
GO

IF OBJECT_ID('sp_DeleteEnrollment', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteEnrollment;
GO
CREATE PROCEDURE sp_DeleteEnrollment
    @EnrollmentId VARCHAR(50),
    @DeletedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.enrollments
    SET deleted_at = GETDATE(), deleted_by = @DeletedBy
    WHERE enrollment_id = @EnrollmentId;
END
GO

IF OBJECT_ID('sp_DeleteSubject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteSubject;
GO
CREATE PROCEDURE sp_DeleteSubject
    @SubjectId VARCHAR(50),
    @DeletedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.subjects
    SET deleted_at = GETDATE(), deleted_by = @DeletedBy
    WHERE subject_id = @SubjectId;
END
GO

IF OBJECT_ID('sp_GetAllClasses', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllClasses;
GO
CREATE PROCEDURE sp_GetAllClasses
    @Page INT = 1,
    @PageSize INT = 10,
    @Search NVARCHAR(255) = NULL,
    @SubjectId VARCHAR(50) = NULL,
    @LecturerId VARCHAR(50) = NULL,
    @AcademicYearId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    -- Total count
    SELECT COUNT(*) AS TotalCount
    FROM dbo.classes c
    LEFT JOIN dbo.subjects s ON c.subject_id = s.subject_id
    LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
    LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
    WHERE c.deleted_at IS NULL
        AND (@Search IS NULL OR 
             c.class_code LIKE '%' + @Search + '%' OR 
             c.class_name LIKE '%' + @Search + '%' OR
             s.subject_name LIKE '%' + @Search + '%' OR
             l.full_name LIKE '%' + @Search + '%')
        AND (@SubjectId IS NULL OR c.subject_id = @SubjectId)
        AND (@LecturerId IS NULL OR c.lecturer_id = @LecturerId)
        AND (@AcademicYearId IS NULL OR c.academic_year_id = @AcademicYearId);
    
    -- Data with pagination
    SELECT c.*, 
           s.subject_name, 
           l.full_name as lecturer_name, 
           ay.year_name,
           -- Tính toán is_active động dựa trên registration_period
           CASE 
               WHEN EXISTS (
                   SELECT 1 FROM registration_periods rp
                   WHERE rp.academic_year_id = c.academic_year_id
                   AND rp.semester = CAST(c.semester AS INT)
                   AND rp.status = 'OPEN'
                   AND GETDATE() BETWEEN rp.start_date AND rp.end_date
                   AND rp.deleted_at IS NULL
                   AND rp.is_active = 1
               ) THEN 1
               ELSE 0
           END AS is_active_computed
    FROM dbo.classes c
    LEFT JOIN dbo.subjects s ON c.subject_id = s.subject_id
    LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
    LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
    WHERE c.deleted_at IS NULL
        AND (@Search IS NULL OR 
             c.class_code LIKE '%' + @Search + '%' OR 
             c.class_name LIKE '%' + @Search + '%' OR
             s.subject_name LIKE '%' + @Search + '%' OR
             l.full_name LIKE '%' + @Search + '%')
        AND (@SubjectId IS NULL OR c.subject_id = @SubjectId)
        AND (@LecturerId IS NULL OR c.lecturer_id = @LecturerId)
        AND (@AcademicYearId IS NULL OR c.academic_year_id = @AcademicYearId)
    ORDER BY c.created_at DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('sp_GetAllEnrollments', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllEnrollments;
GO
CREATE PROCEDURE sp_GetAllEnrollments
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        e.enrollment_id,
        e.student_id,
        e.class_id,
        e.enrollment_date,
        e.status,
        e.enrollment_status,
        e.drop_deadline,
        e.notes,
        e.drop_reason,
        e.created_at,
        e.created_by,
        e.updated_at,
        e.updated_by,
        s.student_code,
        s.full_name as student_name,
        c.class_code,
        c.class_name,
        sub.subject_code,
        sub.subject_name
    FROM dbo.enrollments e
    INNER JOIN dbo.students s ON e.student_id = s.student_id
    INNER JOIN dbo.classes c ON e.class_id = c.class_id
    LEFT JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
    WHERE e.deleted_at IS NULL
    ORDER BY e.enrollment_date DESC;
END
GO

IF OBJECT_ID('sp_GetAllSubjects', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllSubjects;
GO
CREATE PROCEDURE sp_GetAllSubjects
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
    FROM dbo.subjects s
    LEFT JOIN dbo.departments d ON s.department_id = d.department_id
    WHERE s.deleted_at IS NULL
        AND (@Search IS NULL OR 
             s.subject_code LIKE '%' + @Search + '%' OR 
             s.subject_name LIKE '%' + @Search + '%' OR
             s.description LIKE '%' + @Search + '%')
        AND (@DepartmentId IS NULL OR s.department_id = @DepartmentId);
    
    -- Data with pagination
    SELECT s.*, d.department_name, f.faculty_name
    FROM dbo.subjects s
    LEFT JOIN dbo.departments d ON s.department_id = d.department_id
    LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
    WHERE s.deleted_at IS NULL
        AND (@Search IS NULL OR 
             s.subject_code LIKE '%' + @Search + '%' OR 
             s.subject_name LIKE '%' + @Search + '%' OR
             s.description LIKE '%' + @Search + '%')
        AND (@DepartmentId IS NULL OR s.department_id = @DepartmentId)
    ORDER BY s.subject_name
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('sp_GetClassById', 'P') IS NOT NULL DROP PROCEDURE sp_GetClassById;
GO
CREATE PROCEDURE sp_GetClassById
    @ClassId VARCHAR(50)
AS
BEGIN
    SELECT c.*, s.subject_name, l.full_name as lecturer_name, ay.year_name
    FROM dbo.classes c
    LEFT JOIN dbo.subjects s ON c.subject_id = s.subject_id
    LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
    LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
    WHERE c.class_id = @ClassId AND c.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetClassesByLecturer', 'P') IS NOT NULL DROP PROCEDURE sp_GetClassesByLecturer;
GO
CREATE PROCEDURE sp_GetClassesByLecturer
    @LecturerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.class_id,
        c.class_code,
        c.class_name,
        c.subject_id,
        c.lecturer_id,
        c.academic_year_id,
        c.school_year_id,
        c.semester,
        c.max_students,
        c.current_enrollment,
        -- ✅ CẬP NHẬT: Lấy lịch học từ timetable_sessions thay vì c.schedule (DEPRECATED)
        (SELECT STRING_AGG(schedule_info, ', ')
         FROM (
             SELECT DISTINCT 
                 CASE 
                     WHEN ts.weekday = 1 THEN N'CN'
                     WHEN ts.weekday = 2 THEN N'T2'
                     WHEN ts.weekday = 3 THEN N'T3'
                     WHEN ts.weekday = 4 THEN N'T4'
                     WHEN ts.weekday = 5 THEN N'T5'
                     WHEN ts.weekday = 6 THEN N'T6'
                     WHEN ts.weekday = 7 THEN N'T7'
                     ELSE N'?'
                 END + 
                 CASE 
                     WHEN ts.period_from IS NOT NULL AND ts.period_to IS NOT NULL 
                     THEN N' Tiết ' + CAST(ts.period_from AS NVARCHAR(2)) + N'-' + CAST(ts.period_to AS NVARCHAR(2))
                     ELSE N' ' + CAST(ts.start_time AS NVARCHAR(5)) + N'-' + CAST(ts.end_time AS NVARCHAR(5))
                 END as schedule_info
             FROM dbo.timetable_sessions ts
             WHERE ts.class_id = c.class_id AND ts.deleted_at IS NULL
         ) AS schedule_list
        ) as schedule,
        -- ✅ CẬP NHẬT: Lấy thông tin phòng từ timetable_sessions thay vì c.room (DEPRECATED)
        (SELECT STRING_AGG(room_info, ', ')
         FROM (
             SELECT DISTINCT 
                 r.room_code + CASE WHEN r.building IS NOT NULL THEN ' (' + r.building + ')' ELSE '' END as room_info
             FROM dbo.timetable_sessions ts
             INNER JOIN dbo.rooms r ON ts.room_id = r.room_id AND r.deleted_at IS NULL
             WHERE ts.class_id = c.class_id AND ts.deleted_at IS NULL
         ) AS room_list
        ) as room,
        c.created_at,
        c.created_by,
        s.subject_code,
        s.subject_name,
        l.full_name as lecturer_name,
        ay.year_name,
        sy.year_code as school_year_code
    FROM dbo.classes c
    LEFT JOIN dbo.subjects s ON c.subject_id = s.subject_id
    LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
    LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
    LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
    WHERE c.lecturer_id = @LecturerId AND c.deleted_at IS NULL
    ORDER BY c.created_at DESC;
END
GO

IF OBJECT_ID('sp_GetClassesByStudent', 'P') IS NOT NULL DROP PROCEDURE sp_GetClassesByStudent;
GO
CREATE PROCEDURE sp_GetClassesByStudent
    @StudentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.class_id,
        c.class_code,
        c.class_name,
        c.subject_id,
        c.lecturer_id,
        c.academic_year_id,
        c.semester,
        c.max_students,
        c.current_enrollment,
        -- ✅ CẬP NHẬT: Lấy lịch học từ timetable_sessions thay vì c.schedule (DEPRECATED)
        (SELECT STRING_AGG(schedule_info, ', ')
         FROM (
             SELECT DISTINCT 
                 CASE 
                     WHEN ts.weekday = 1 THEN N'CN'
                     WHEN ts.weekday = 2 THEN N'T2'
                     WHEN ts.weekday = 3 THEN N'T3'
                     WHEN ts.weekday = 4 THEN N'T4'
                     WHEN ts.weekday = 5 THEN N'T5'
                     WHEN ts.weekday = 6 THEN N'T6'
                     WHEN ts.weekday = 7 THEN N'T7'
                     ELSE N'?'
                 END + 
                 CASE 
                     WHEN ts.period_from IS NOT NULL AND ts.period_to IS NOT NULL 
                     THEN N' Tiết ' + CAST(ts.period_from AS NVARCHAR(2)) + N'-' + CAST(ts.period_to AS NVARCHAR(2))
                     ELSE N' ' + CAST(ts.start_time AS NVARCHAR(5)) + N'-' + CAST(ts.end_time AS NVARCHAR(5))
                 END as schedule_info
             FROM dbo.timetable_sessions ts
             WHERE ts.class_id = c.class_id AND ts.deleted_at IS NULL
         ) AS schedule_list
        ) as schedule,
        -- ✅ CẬP NHẬT: Lấy thông tin phòng từ timetable_sessions thay vì c.room (DEPRECATED)
        (SELECT STRING_AGG(room_info, ', ')
         FROM (
             SELECT DISTINCT 
                 r.room_code + CASE WHEN r.building IS NOT NULL THEN ' (' + r.building + ')' ELSE '' END as room_info
             FROM dbo.timetable_sessions ts
             INNER JOIN dbo.rooms r ON ts.room_id = r.room_id AND r.deleted_at IS NULL
             WHERE ts.class_id = c.class_id AND ts.deleted_at IS NULL
         ) AS room_list
        ) as room,
        c.created_at,
        e.enrollment_id,
        e.enrollment_date,
        e.enrollment_status,
        s.subject_code,
        s.subject_name,
        l.full_name as lecturer_name,
        ay.year_name
    FROM dbo.classes c
    INNER JOIN dbo.enrollments e ON c.class_id = e.class_id
    LEFT JOIN dbo.subjects s ON c.subject_id = s.subject_id
    LEFT JOIN dbo.lecturers l ON c.lecturer_id = l.lecturer_id
    LEFT JOIN dbo.academic_years ay ON c.academic_year_id = ay.academic_year_id
    WHERE e.student_id = @StudentId AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    ORDER BY c.created_at DESC;
END
GO

IF OBJECT_ID('sp_GetEnrollmentById', 'P') IS NOT NULL DROP PROCEDURE sp_GetEnrollmentById;
GO
CREATE PROCEDURE sp_GetEnrollmentById
    @EnrollmentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        e.enrollment_id,
        e.student_id,
        e.class_id,
        e.enrollment_date,
        e.status,
        e.enrollment_status,
        e.drop_deadline,
        e.notes,
        e.drop_reason,
        e.created_at,
        e.created_by,
        e.updated_at,
        e.updated_by,
        s.student_code,
        s.full_name as student_name,
        c.class_code,
        c.class_name,
        sub.subject_code,
        sub.subject_name
    FROM dbo.enrollments e
    INNER JOIN dbo.students s ON e.student_id = s.student_id
    INNER JOIN dbo.classes c ON e.class_id = c.class_id
    LEFT JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
    WHERE e.enrollment_id = @EnrollmentId AND e.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetSubjectById', 'P') IS NOT NULL DROP PROCEDURE sp_GetSubjectById;
GO
CREATE PROCEDURE sp_GetSubjectById
    @SubjectId VARCHAR(50)
AS
BEGIN
    SELECT s.*, d.department_name
    FROM dbo.subjects s
    LEFT JOIN dbo.departments d ON s.department_id = d.department_id
    WHERE s.subject_id = @SubjectId AND s.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetSubjectsAvailableForStudent', 'P') IS NOT NULL DROP PROCEDURE sp_GetSubjectsAvailableForStudent;
GO
CREATE PROCEDURE sp_GetSubjectsAvailableForStudent
    @StudentId VARCHAR(50),
    @AcademicYearId VARCHAR(50) = NULL,
    @Semester INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- Get subjects that student can enroll (not already enrolled, prerequisites met)
    SELECT DISTINCT
        s.subject_id,
        s.subject_code,
        s.subject_name,
        s.credits,
        s.department_id,
        d.department_name,
        s.description,
        CASE WHEN EXISTS (
            SELECT 1 FROM dbo.enrollments e
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
            WHERE e.student_id = @StudentId 
                AND c.subject_id = s.subject_id
                AND e.deleted_at IS NULL
        ) THEN 1 ELSE 0 END AS is_already_enrolled
    FROM dbo.subjects s
    LEFT JOIN dbo.departments d ON s.department_id = d.department_id
    WHERE s.deleted_at IS NULL
        AND (@AcademicYearId IS NULL OR EXISTS (
            SELECT 1 FROM dbo.classes c 
            WHERE c.subject_id = s.subject_id 
                AND c.academic_year_id = @AcademicYearId
                AND c.deleted_at IS NULL
        ))
        AND (@Semester IS NULL OR EXISTS (
            SELECT 1 FROM dbo.classes c 
            WHERE c.subject_id = s.subject_id 
                AND c.semester = @Semester
                AND c.deleted_at IS NULL
        ))
    ORDER BY s.subject_code;
END
GO

IF OBJECT_ID('sp_GetSubjectsByDepartment', 'P') IS NOT NULL DROP PROCEDURE sp_GetSubjectsByDepartment;
GO
CREATE PROCEDURE sp_GetSubjectsByDepartment
    @DepartmentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        s.subject_id,
        s.subject_code,
        s.subject_name,
        s.credits,
        s.department_id,
        s.description,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        d.department_name,
        f.faculty_name
    FROM dbo.subjects s
    LEFT JOIN dbo.departments d ON s.department_id = d.department_id
    LEFT JOIN dbo.faculties f ON d.faculty_id = f.faculty_id
    WHERE s.department_id = @DepartmentId AND s.deleted_at IS NULL
    ORDER BY s.subject_code;
END
GO

IF OBJECT_ID('sp_UpdateClass', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateClass;
GO
CREATE PROCEDURE sp_UpdateClass
    @ClassId VARCHAR(50),
    @ClassCode VARCHAR(20),
    @ClassName NVARCHAR(200),
    @SubjectId VARCHAR(50),
    @LecturerId VARCHAR(50) = NULL,
    @Semester INT = NULL,
    @AcademicYearId VARCHAR(50) = NULL,
    @MaxStudents INT = NULL,
    @Schedule NVARCHAR(500) = NULL,
    @Room NVARCHAR(100) = NULL,
    @UpdatedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.classes
    SET class_code = @ClassCode, class_name = @ClassName, subject_id = @SubjectId,
        lecturer_id = @LecturerId, semester = @Semester, academic_year_id = @AcademicYearId,
        max_students = @MaxStudents, schedule = @Schedule, room = @Room, 
        updated_at = GETDATE(), updated_by = @UpdatedBy
    WHERE class_id = @ClassId AND deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_UpdateSubject', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateSubject;
GO
CREATE PROCEDURE sp_UpdateSubject
    @SubjectId VARCHAR(50),
    @SubjectCode VARCHAR(20),
    @SubjectName NVARCHAR(200),
    @Credits INT,
    @DepartmentId VARCHAR(50) = NULL,
    @Description NVARCHAR(500) = NULL,
    @UpdatedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.subjects
    SET subject_code = @SubjectCode, subject_name = @SubjectName, credits = @Credits,
        department_id = @DepartmentId, description = @Description,
        updated_at = GETDATE(), updated_by = @UpdatedBy
    WHERE subject_id = @SubjectId AND deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_WithdrawEnrollment', 'P') IS NOT NULL DROP PROCEDURE sp_WithdrawEnrollment;
GO
CREATE PROCEDURE sp_WithdrawEnrollment
    @EnrollmentId VARCHAR(50),
    @Reason NVARCHAR(500) = NULL,
    @WithdrawnBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.enrollments
    SET enrollment_status = 'WITHDRAWN',
        drop_reason = @Reason,
        updated_at = GETDATE(),
        updated_by = @WithdrawnBy
    WHERE enrollment_id = @EnrollmentId AND deleted_at IS NULL;
END
GO

PRINT '========================================';
PRINT '[OK] Curriculum Management SPs completed';
PRINT '========================================';
GO