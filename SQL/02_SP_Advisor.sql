-- ===========================================
-- 02_SP_Advisor.sql
-- ===========================================
-- Description: Advisor Dashboard and Student Management Stored Procedures
-- 
-- LƯU Ý VỀ VAI TRÒ ADVISOR:
-- - Cố vấn phòng đào tạo quản lý CHUNG TOÀN BỘ sinh viên của trường
-- - Advisor KHÔNG được gán vào lớp hành chính cụ thể (không có advisor_id trong administrative_classes)
-- - Advisor có thể xem tất cả sinh viên, filter theo Faculty, Major, Class, Cohort Year (để tối ưu performance)
-- - Stored procedures KHÔNG filter theo advisor_id, chỉ filter theo các tiêu chí học thuật
-- ===========================================

USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '========================================';
PRINT 'Starting: 02_SP_Advisor.sql';
PRINT 'Advisor Stored Procedures';
PRINT '========================================';
GO

-- ===========================================
-- 1. SP: GET ADVISOR DASHBOARD STATS
-- ===========================================
-- Description: Lấy thống kê dashboard cho Advisor
-- - Advisor có thể xem thống kê TOÀN BỘ sinh viên (không filter theo advisor_id)
-- - Có thể filter theo Faculty, Major, Class để xem thống kê chi tiết
-- - Nếu không có filter, trả về thống kê toàn trường
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorDashboardStats', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorDashboardStats;
GO
CREATE PROCEDURE sp_GetAdvisorDashboardStats
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @ClassId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 1. Total students (toàn trường hoặc theo filter)
        SELECT COUNT(DISTINCT s.student_id) as total_students
        FROM dbo.students s
        WHERE s.deleted_at IS NULL
            AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
            AND (@MajorId IS NULL OR s.major_id = @MajorId)
            AND (@ClassId IS NULL OR s.admin_class_id = @ClassId);
        
        -- 2. Warning attendance students (vắng > 20%)
        SELECT COUNT(DISTINCT s.student_id) as warning_attendance_count
        FROM dbo.students s
        WHERE s.deleted_at IS NULL
            AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
            AND (@MajorId IS NULL OR s.major_id = @MajorId)
            AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            AND EXISTS (
                SELECT 1
                FROM dbo.enrollments e
                INNER JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
                INNER JOIN dbo.classes c ON e.class_id = c.class_id AND c.deleted_at IS NULL
                WHERE e.student_id = s.student_id
                    AND e.deleted_at IS NULL
                GROUP BY e.student_id
                HAVING 
                    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20
            );
        
        -- 3. Low GPA students (GPA < 2.0) - Calculate from grades if gpas table is empty
        SELECT COUNT(DISTINCT s.student_id) as low_gpa_count
        FROM dbo.students s
        LEFT JOIN (
            SELECT 
                g.student_id,
                g.gpa10,
                ROW_NUMBER() OVER (PARTITION BY g.student_id ORDER BY g.created_at DESC) as rn
            FROM dbo.gpas g
            WHERE g.deleted_at IS NULL
                AND (g.semester IS NULL OR g.semester = 0) -- Cumulative GPA
        ) g ON s.student_id = g.student_id AND g.rn = 1
        LEFT JOIN (
            -- Calculate GPA from grades if not in gpas table
            SELECT 
                e.student_id,
                CAST(ROUND(SUM(g.total_score * sub.credits) / NULLIF(SUM(sub.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
            FROM dbo.enrollments e
            INNER JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
            INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
            WHERE e.deleted_at IS NULL
                AND g.total_score IS NOT NULL
            GROUP BY e.student_id
        ) calc_gpa ON s.student_id = calc_gpa.student_id
        WHERE s.deleted_at IS NULL
            AND COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) < 2.0
            AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
            AND (@MajorId IS NULL OR s.major_id = @MajorId)
            AND (@ClassId IS NULL OR s.admin_class_id = @ClassId);
        
        -- 4. Excellent students (GPA >= 3.5)
        SELECT COUNT(DISTINCT s.student_id) as excellent_count
        FROM dbo.students s
        LEFT JOIN (
            SELECT 
                g.student_id,
                g.gpa10,
                ROW_NUMBER() OVER (PARTITION BY g.student_id ORDER BY g.created_at DESC) as rn
            FROM dbo.gpas g
            WHERE g.deleted_at IS NULL
                AND (g.semester IS NULL OR g.semester = 0) -- Cumulative GPA
        ) g ON s.student_id = g.student_id AND g.rn = 1
        LEFT JOIN (
            -- Calculate GPA from grades if not in gpas table
            SELECT 
                e.student_id,
                CAST(ROUND(SUM(g.total_score * sub.credits) / NULLIF(SUM(sub.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
            FROM dbo.enrollments e
            INNER JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
            INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
            WHERE e.deleted_at IS NULL
                AND g.total_score IS NOT NULL
            GROUP BY e.student_id
        ) calc_gpa ON s.student_id = calc_gpa.student_id
        WHERE s.deleted_at IS NULL
            AND COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) >= 3.5
            AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
            AND (@MajorId IS NULL OR s.major_id = @MajorId)
            AND (@ClassId IS NULL OR s.admin_class_id = @ClassId);
        
        -- 5. Average attendance rate
        SELECT 
            CAST(AVG(attendance_rate) AS DECIMAL(5,2)) as avg_attendance_rate
        FROM (
            SELECT 
                s.student_id,
                CASE 
                    WHEN COUNT(a.attendance_id) > 0 
                    THEN (COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id))
                    ELSE 100 
                END as attendance_rate
            FROM dbo.students s
            LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
            LEFT JOIN dbo.classes c ON e.class_id = c.class_id AND c.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            GROUP BY s.student_id
        ) student_attendance;
        
        -- 6. Average pass rate
        SELECT 
            CAST(AVG(pass_rate) AS DECIMAL(5,2)) as avg_pass_rate
        FROM (
            SELECT 
                s.student_id,
                CASE 
                    WHEN COUNT(g.grade_id) > 0 
                    THEN (COUNT(CASE WHEN g.total_score >= 5.0 THEN 1 END) * 100.0 / COUNT(g.grade_id))
                    ELSE 0 
                END as pass_rate
            FROM dbo.students s
            LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            GROUP BY s.student_id
        ) student_pass_rate;
        
        -- 7. Average GPA
        SELECT CAST(AVG(COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0)) AS DECIMAL(4,2)) as avg_gpa
        FROM dbo.students s
        LEFT JOIN (
            SELECT 
                g.student_id,
                g.gpa10,
                ROW_NUMBER() OVER (PARTITION BY g.student_id ORDER BY g.created_at DESC) as rn
            FROM dbo.gpas g
            WHERE g.deleted_at IS NULL
                AND (g.semester IS NULL OR g.semester = 0) -- Cumulative GPA
        ) g ON s.student_id = g.student_id AND g.rn = 1
        LEFT JOIN (
            -- Calculate GPA from grades if not in gpas table
            SELECT 
                e.student_id,
                CAST(ROUND(SUM(g.total_score * sub.credits) / NULLIF(SUM(sub.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
            FROM dbo.enrollments e
            INNER JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
            INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
            WHERE e.deleted_at IS NULL
                AND g.total_score IS NOT NULL
            GROUP BY e.student_id
        ) calc_gpa ON s.student_id = calc_gpa.student_id
        WHERE s.deleted_at IS NULL
            AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
            AND (@MajorId IS NULL OR s.major_id = @MajorId)
            AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            AND (g.gpa10 IS NOT NULL OR calc_gpa.calculated_gpa IS NOT NULL);
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50001, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 2. SP: GET ADVISOR WARNING STUDENTS
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorWarningStudents', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorWarningStudents;
GO
CREATE PROCEDURE sp_GetAdvisorWarningStudents
    @Page INT = 1,
    @PageSize INT = 20,
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @ClassId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @Offset INT = (@Page - 1) * @PageSize;
        
        -- Get warning students with pagination
        WITH WarningStudents AS (
            SELECT 
                s.student_id,
                s.student_code,
                s.full_name,
                COALESCE(ac.class_name, N'Chưa phân lớp') as class_name,
                f.faculty_name,
                m.major_name,
                COALESCE(g.gpa10, calc_gpa.calculated_gpa) as gpa,
                CASE 
                    WHEN COUNT(a.attendance_id) > 0 
                    THEN CAST((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id)) AS DECIMAL(5,2))
                    ELSE 100 
                END as attendance_rate,
                CASE 
                    WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 'both'
                    WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 THEN 'attendance'
                    WHEN COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 'academic'
                    ELSE 'none'
                END as warning_type,
                CASE 
                    WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 3
                    WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 THEN 2
                    WHEN COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 1
                    ELSE 0
                END as priority
            FROM dbo.students s
            LEFT JOIN dbo.administrative_classes ac ON s.admin_class_id = ac.admin_class_id
            LEFT JOIN dbo.faculties f ON s.faculty_id = f.faculty_id
            LEFT JOIN dbo.majors m ON s.major_id = m.major_id
            LEFT JOIN (
                SELECT 
                    g.student_id,
                    g.gpa10,
                    ROW_NUMBER() OVER (PARTITION BY g.student_id ORDER BY g.created_at DESC) as rn
                FROM dbo.gpas g
                WHERE g.deleted_at IS NULL
                    AND (g.semester IS NULL OR g.semester = 0) -- Cumulative GPA
            ) g ON s.student_id = g.student_id AND g.rn = 1
            LEFT JOIN (
                -- Calculate GPA from grades if not in gpas table
                SELECT 
                    e2.student_id,
                    CAST(ROUND(SUM(g2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
                FROM dbo.enrollments e2
                INNER JOIN dbo.grades g2 ON e2.enrollment_id = g2.enrollment_id
                INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
                INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
                WHERE e2.deleted_at IS NULL
                    AND g2.total_score IS NOT NULL
                GROUP BY e2.student_id
            ) calc_gpa ON s.student_id = calc_gpa.student_id
            LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
            LEFT JOIN dbo.classes c ON e.class_id = c.class_id AND c.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            GROUP BY 
                s.student_id, s.student_code, s.full_name, 
                ac.class_name, f.faculty_name, m.major_name, 
                g.gpa10, calc_gpa.calculated_gpa
            HAVING (
                COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20
                OR COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) < 2.0
            )
        )
        SELECT 
            student_id,
            student_code,
            full_name,
            class_name,
            faculty_name,
            major_name,
            gpa,
            attendance_rate,
            warning_type,
            priority
        FROM WarningStudents
        ORDER BY priority DESC, gpa ASC, attendance_rate ASC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
        
        -- Get total count
        SELECT COUNT(*) as total_count
        FROM (
            SELECT s.student_id
            FROM dbo.students s
            LEFT JOIN (
                SELECT 
                    g.student_id,
                    g.gpa10,
                    ROW_NUMBER() OVER (PARTITION BY g.student_id ORDER BY g.created_at DESC) as rn
                FROM dbo.gpas g
                WHERE g.deleted_at IS NULL
                    AND (g.semester IS NULL OR g.semester = 0) -- Cumulative GPA
            ) g ON s.student_id = g.student_id AND g.rn = 1
            LEFT JOIN (
                -- Calculate GPA from grades if not in gpas table
                SELECT 
                    e.student_id,
                    CAST(ROUND(SUM(g.total_score * sub.credits) / NULLIF(SUM(sub.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
                FROM dbo.enrollments e
                INNER JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
                INNER JOIN dbo.classes c ON e.class_id = c.class_id
                INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
                WHERE e.deleted_at IS NULL
                    AND g.total_score IS NOT NULL
                GROUP BY e.student_id
            ) calc_gpa ON s.student_id = calc_gpa.student_id AND g.gpa10 IS NULL
            LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            GROUP BY s.student_id, g.gpa10, calc_gpa.calculated_gpa
            HAVING (
                COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20
                OR COALESCE(g.gpa10, calc_gpa.calculated_gpa, 0) < 2.0
            )
        ) subquery;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50002, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 3. SP: GET ADVISOR STUDENT DETAIL
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorStudentDetail', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorStudentDetail;
GO
CREATE PROCEDURE sp_GetAdvisorStudentDetail
    @StudentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        SELECT 
            s.student_id,
            s.student_code,
            s.full_name,
            s.gender,
            s.date_of_birth as dob,
            s.email,
            s.phone,
            s.faculty_id,
            f.faculty_name,
            s.major_id,
            m.major_name,
            s.academic_year_id,
            ay.year_name as academic_year_name,
            s.admin_class_id as class_id,
            COALESCE(ac.class_name, N'Chưa phân lớp') as class_name,
            s.cohort_year,
            s.is_active,
            -- GPA (from gpas table or calculated)
            COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa) as cumulative_gpa,
            -- Attendance rate
            CASE 
                WHEN COUNT(a.attendance_id) > 0 
                THEN CAST((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id)) AS DECIMAL(5,2))
                ELSE 100 
            END as attendance_rate,
            -- Credits
            COALESCE(SUM(CASE WHEN gr.total_score >= 5.0 THEN sub.credits ELSE 0 END), 0) as total_credits_earned,
            COALESCE(SUM(sub.credits), 0) as total_credits_registered,
            -- Subjects
            COUNT(DISTINCT c.class_id) as total_subjects,
            COUNT(DISTINCT CASE WHEN gr.total_score >= 5.0 THEN c.class_id END) as passed_subjects,
            COUNT(DISTINCT CASE WHEN gr.total_score < 5.0 AND gr.total_score IS NOT NULL THEN c.class_id END) as failed_subjects,
            -- Warning type
            CASE 
                WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 'both'
                WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 THEN 'attendance'
                WHEN COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 'academic'
                ELSE 'none'
            END as warning_type,
            CASE 
                WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 3
                WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 THEN 2
                WHEN COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa, 0) < 2.0 THEN 1
                ELSE 0
            END as priority
        FROM dbo.students s
        LEFT JOIN dbo.faculties f ON s.faculty_id = f.faculty_id
        LEFT JOIN dbo.majors m ON s.major_id = m.major_id
        LEFT JOIN dbo.academic_years ay ON s.academic_year_id = ay.academic_year_id
        LEFT JOIN dbo.administrative_classes ac ON s.admin_class_id = ac.admin_class_id
        LEFT JOIN (
            SELECT 
                gp.student_id,
                gp.gpa10,
                ROW_NUMBER() OVER (PARTITION BY gp.student_id ORDER BY gp.created_at DESC) as rn
            FROM dbo.gpas gp
            WHERE gp.deleted_at IS NULL
                AND (gp.semester IS NULL OR gp.semester = 0) -- Cumulative GPA
        ) gpa_table ON s.student_id = gpa_table.student_id AND gpa_table.rn = 1
        LEFT JOIN (
            -- Calculate GPA from grades if not in gpas table
            SELECT 
                e2.student_id,
                CAST(ROUND(SUM(gr2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
            FROM dbo.enrollments e2
            INNER JOIN dbo.grades gr2 ON e2.enrollment_id = gr2.enrollment_id
            INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
            INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
            WHERE e2.deleted_at IS NULL
                AND gr2.total_score IS NOT NULL
            GROUP BY e2.student_id
        ) calc_gpa ON s.student_id = calc_gpa.student_id AND (gpa_table.gpa10 IS NULL OR gpa_table.rn IS NULL)
        LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
        LEFT JOIN dbo.classes c ON e.class_id = c.class_id AND c.deleted_at IS NULL
        LEFT JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
        LEFT JOIN dbo.grades gr ON e.enrollment_id = gr.enrollment_id
        LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
        WHERE s.student_id = @StudentId
            AND s.deleted_at IS NULL
        GROUP BY 
            s.student_id, s.student_code, s.full_name, s.gender, s.date_of_birth, s.email, s.phone,
            s.faculty_id, f.faculty_name, s.major_id, m.major_name,
            s.academic_year_id, ay.year_name, s.admin_class_id, ac.class_name,
            s.cohort_year, s.is_active,
            gpa_table.gpa10, calc_gpa.calculated_gpa;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50003, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 4. SP: GET ADVISOR STUDENT GRADES (with filters)
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorStudentGrades', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorStudentGrades;
GO
CREATE PROCEDURE sp_GetAdvisorStudentGrades
    @StudentId VARCHAR(50),
    @SchoolYearId VARCHAR(50) = NULL,
    @Semester INT = NULL,
    @SubjectId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get grades
        SELECT 
            g.grade_id,
            g.enrollment_id,
            e.class_id,
            c.class_code,
            c.class_name,
            c.subject_id,
            sub.subject_code,
            sub.subject_name,
            sub.credits,
            sy.school_year_id,
            sy.year_code as school_year_code,
            sy.year_name as school_year_name,
            c.semester,
            g.midterm_score,
            g.final_score,
            g.total_score,
            g.letter_grade,
            g.created_at
        FROM dbo.grades g
        INNER JOIN dbo.enrollments e ON g.enrollment_id = e.enrollment_id
        INNER JOIN dbo.classes c ON e.class_id = c.class_id
        INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
        LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
        WHERE e.student_id = @StudentId
            AND e.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
            AND (@Semester IS NULL OR c.semester = @Semester)
            AND (@SubjectId IS NULL OR c.subject_id = @SubjectId)
        ORDER BY sy.start_date DESC, c.semester, sub.subject_code;
        
        -- Get summary
        SELECT 
            -- Semester GPA (if filtered by semester)
            CASE 
                WHEN @Semester IS NOT NULL AND @SchoolYearId IS NOT NULL
                THEN CAST(ROUND(SUM(CASE WHEN g.total_score IS NOT NULL THEN g.total_score * sub.credits ELSE 0 END) / NULLIF(SUM(CASE WHEN g.total_score IS NOT NULL THEN sub.credits ELSE 0 END), 0), 2) AS DECIMAL(4,2))
                ELSE NULL
            END as semester_gpa,
            -- Cumulative GPA
            CAST(ROUND(SUM(CASE WHEN g.total_score IS NOT NULL THEN g.total_score * sub.credits ELSE 0 END) / NULLIF(SUM(CASE WHEN g.total_score IS NOT NULL THEN sub.credits ELSE 0 END), 0), 2) AS DECIMAL(4,2)) as cumulative_gpa,
            -- Credits
            SUM(sub.credits) as total_credits,
            SUM(CASE WHEN g.total_score >= 5.0 THEN sub.credits ELSE 0 END) as passed_credits,
            SUM(CASE WHEN g.total_score < 5.0 AND g.total_score IS NOT NULL THEN sub.credits ELSE 0 END) as failed_credits,
            -- Subjects
            COUNT(DISTINCT c.class_id) as total_subjects,
            COUNT(DISTINCT CASE WHEN g.total_score >= 5.0 THEN c.class_id END) as passed_subjects,
            COUNT(DISTINCT CASE WHEN g.total_score < 5.0 AND g.total_score IS NOT NULL THEN c.class_id END) as failed_subjects
        FROM dbo.enrollments e
        INNER JOIN dbo.classes c ON e.class_id = c.class_id
        INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
        LEFT JOIN dbo.grades g ON e.enrollment_id = g.enrollment_id
        LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
        WHERE e.student_id = @StudentId
            AND e.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
            AND (@Semester IS NULL OR c.semester = @Semester)
            AND (@SubjectId IS NULL OR c.subject_id = @SubjectId);
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50004, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 5. SP: GET ADVISOR STUDENT ATTENDANCE (with filters)
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorStudentAttendance', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorStudentAttendance;
GO
CREATE PROCEDURE sp_GetAdvisorStudentAttendance
    @StudentId VARCHAR(50),
    @SchoolYearId VARCHAR(50) = NULL,
    @Semester INT = NULL,
    @SubjectId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get attendance records
        SELECT 
            a.attendance_id,
            e.enrollment_id,
            e.class_id,
            c.class_code,
            c.class_name,
            c.subject_id,
            sub.subject_code,
            sub.subject_name,
            sy.school_year_id,
            sy.year_code as school_year_code,
            c.semester,
            a.schedule_id,
            a.attendance_date,
            sch.start_time as schedule_start_time,
            sch.room,
            a.status,
            a.notes,
            a.marked_by,
            u.full_name as marked_by_name
        FROM dbo.attendances a
        INNER JOIN dbo.enrollments e ON a.enrollment_id = e.enrollment_id
        INNER JOIN dbo.classes c ON e.class_id = c.class_id
        INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
        LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
        LEFT JOIN dbo.schedules sch ON a.schedule_id = sch.schedule_id
        LEFT JOIN dbo.users u ON a.marked_by = u.user_id
        WHERE e.student_id = @StudentId
            AND a.deleted_at IS NULL
            AND e.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
            AND (@Semester IS NULL OR c.semester = @Semester)
            AND (@SubjectId IS NULL OR c.subject_id = @SubjectId)
        ORDER BY a.attendance_date DESC, sub.subject_code;
        
        -- Get summary by subject
        SELECT 
            c.subject_id,
            sub.subject_code,
            sub.subject_name,
            e.class_id,
            c.class_name,
            sy.school_year_id,
            sy.year_code as school_year_code,
            c.semester,
            COUNT(a.attendance_id) as total_sessions,
            COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
            COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
            COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
            COUNT(CASE WHEN a.status = 'Excused' THEN 1 END) as excused_count,
            CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)), 2) AS DECIMAL(5,2)) as attendance_rate,
            CAST(ROUND((COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)), 2) AS DECIMAL(5,2)) as absence_rate
        FROM dbo.enrollments e
        INNER JOIN dbo.classes c ON e.class_id = c.class_id
        INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
        LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
        LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
        WHERE e.student_id = @StudentId
            AND e.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
            AND (@Semester IS NULL OR c.semester = @Semester)
            AND (@SubjectId IS NULL OR c.subject_id = @SubjectId)
        GROUP BY 
            c.subject_id, sub.subject_code, sub.subject_name,
            e.class_id, c.class_name,
            sy.school_year_id, sy.year_code, c.semester;
        
        -- Get overall summary
        SELECT 
            COUNT(a.attendance_id) as total_sessions,
            COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
            COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
            COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
            COUNT(CASE WHEN a.status = 'Excused' THEN 1 END) as excused_count,
            CAST(ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)), 2) AS DECIMAL(5,2)) as attendance_rate,
            CAST(ROUND((COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)), 2) AS DECIMAL(5,2)) as absence_rate,
            COUNT(DISTINCT c.subject_id) as total_subjects
        FROM dbo.attendances a
        INNER JOIN dbo.enrollments e ON a.enrollment_id = e.enrollment_id
        INNER JOIN dbo.classes c ON e.class_id = c.class_id
        LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
        WHERE e.student_id = @StudentId
            AND a.deleted_at IS NULL
            AND e.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
            AND (@Semester IS NULL OR c.semester = @Semester)
            AND (@SubjectId IS NULL OR c.subject_id = @SubjectId);
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50005, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 6. SP: GET ADVISOR STUDENTS LIST (with mandatory filters)
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorStudents', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorStudents;
GO
CREATE PROCEDURE sp_GetAdvisorStudents
    @Page INT = 1,
    @PageSize INT = 20,
    @Search NVARCHAR(200) = NULL,
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @ClassId VARCHAR(50) = NULL,
    @CohortYear VARCHAR(10) = NULL,
    @WarningStatus VARCHAR(20) = NULL, -- 'attendance', 'academic', 'both', 'none'
    @GpaMin DECIMAL(4,2) = NULL,
    @GpaMax DECIMAL(4,2) = NULL,
    @AttendanceRateMin DECIMAL(5,2) = NULL,
    @AttendanceRateMax DECIMAL(5,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @Offset INT = (@Page - 1) * @PageSize;
        
        -- Get students with filters
        WITH StudentList AS (
            SELECT 
                s.student_id,
                s.student_code,
                s.full_name,
                COALESCE(ac.class_name, N'Chưa phân lớp') as class_name,
                f.faculty_name,
                m.major_name,
                COALESCE(s.cohort_year, ay.start_year) as cohort_year,
                COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0.0) as gpa,
                CASE 
                    WHEN COUNT(a.attendance_id) > 0 
                    THEN CAST((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id)) AS DECIMAL(5,2))
                    ELSE 100.0 
                END as attendance_rate,
                CASE 
                    WHEN COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0 
                         AND COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 
                    THEN 'both'
                    WHEN COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0 
                    THEN 'academic'
                    WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 
                    THEN 'attendance'
                    ELSE 'none'
                END as warning_type,
                CASE 
                    WHEN COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0 
                         AND COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 
                    THEN 1
                    WHEN COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0 
                    THEN 2
                    WHEN COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 
                    THEN 3
                    ELSE 0
                END as priority
            FROM dbo.students s
            LEFT JOIN dbo.administrative_classes ac ON s.admin_class_id = ac.admin_class_id
            LEFT JOIN dbo.majors m ON s.major_id = m.major_id
            LEFT JOIN dbo.faculties f ON COALESCE(s.faculty_id, m.faculty_id) = f.faculty_id
            LEFT JOIN dbo.academic_years ay ON s.academic_year_id = ay.academic_year_id
            LEFT JOIN (
                SELECT 
                    gp.student_id,
                    gp.gpa4, -- Dùng gpa4 (thang điểm 4) thay vì gpa10
                    ROW_NUMBER() OVER (PARTITION BY gp.student_id ORDER BY gp.created_at DESC) as rn
                FROM dbo.gpas gp
                WHERE gp.deleted_at IS NULL
                    AND (gp.semester IS NULL OR gp.semester = 0) -- Cumulative GPA
            ) gpa_table ON s.student_id = gpa_table.student_id AND gpa_table.rn = 1
            LEFT JOIN (
                -- Calculate GPA from grades if not in gpas table
                -- total_score là thang điểm 10, chuyển sang thang điểm 4: total_score / 10 * 4
                SELECT 
                    e2.student_id,
                    CAST(ROUND(SUM(gr2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0) / 10.0 * 4.0, 2) AS DECIMAL(4,2)) as calculated_gpa
                FROM dbo.enrollments e2
                INNER JOIN dbo.grades gr2 ON e2.enrollment_id = gr2.enrollment_id
                INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
                INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
                WHERE e2.deleted_at IS NULL
                    AND gr2.total_score IS NOT NULL
                GROUP BY e2.student_id
            ) calc_gpa ON s.student_id = calc_gpa.student_id AND (gpa_table.gpa4 IS NULL OR gpa_table.rn IS NULL)
            LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR COALESCE(s.faculty_id, m.faculty_id) = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
                AND (@CohortYear IS NULL OR COALESCE(s.cohort_year, ay.start_year) = @CohortYear)
                AND (@Search IS NULL OR s.student_code LIKE '%' + @Search + '%' OR s.full_name LIKE '%' + @Search + '%')
            GROUP BY 
                s.student_id, s.student_code, s.full_name, 
                ac.class_name, f.faculty_name, m.major_name, s.cohort_year, ay.start_year,
                gpa_table.gpa4, calc_gpa.calculated_gpa
            HAVING 
                -- Warning status filter
                (@WarningStatus IS NULL OR 
                 (@WarningStatus = 'attendance' AND COUNT(a.attendance_id) > 0 AND COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) >= 2.0) OR
                 (@WarningStatus = 'academic' AND (COUNT(a.attendance_id) = 0 OR COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) <= 20) AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0) OR
                 (@WarningStatus = 'both' AND COUNT(a.attendance_id) > 0 AND COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0) OR
                 (@WarningStatus = 'none' AND (COUNT(a.attendance_id) = 0 OR COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) <= 20) AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) >= 2.0))
                AND
                -- GPA range filter
                (@GpaMin IS NULL OR COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) >= @GpaMin)
                AND (@GpaMax IS NULL OR COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) <= @GpaMax)
                AND
                -- Attendance rate filter
                (@AttendanceRateMin IS NULL OR 
                 CASE 
                     WHEN COUNT(a.attendance_id) > 0 
                     THEN (COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id))
                     ELSE 100 
                 END >= @AttendanceRateMin)
                AND (@AttendanceRateMax IS NULL OR 
                 CASE 
                     WHEN COUNT(a.attendance_id) > 0 
                     THEN (COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id))
                     ELSE 100 
                 END <= @AttendanceRateMax)
        )
        SELECT 
            student_id,
            student_code,
            full_name,
            class_name,
            faculty_name,
            major_name,
            cohort_year,
            gpa,
            attendance_rate,
            warning_type,
            priority
        FROM StudentList
        ORDER BY full_name ASC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
        
        -- Get total count
        SELECT COUNT(*) as total_count
        FROM (
            SELECT s.student_id
            FROM dbo.students s
            LEFT JOIN dbo.administrative_classes ac ON s.admin_class_id = ac.admin_class_id
            LEFT JOIN dbo.majors m ON s.major_id = m.major_id
            LEFT JOIN dbo.faculties f ON COALESCE(s.faculty_id, m.faculty_id) = f.faculty_id
            LEFT JOIN dbo.academic_years ay ON s.academic_year_id = ay.academic_year_id
            LEFT JOIN (
                SELECT 
                    gp.student_id,
                    gp.gpa4, -- Dùng gpa4 (thang điểm 4) thay vì gpa10
                    ROW_NUMBER() OVER (PARTITION BY gp.student_id ORDER BY gp.created_at DESC) as rn
                FROM dbo.gpas gp
                WHERE gp.deleted_at IS NULL
                    AND (gp.semester IS NULL OR gp.semester = 0)
            ) gpa_table ON s.student_id = gpa_table.student_id AND gpa_table.rn = 1
            LEFT JOIN (
                SELECT 
                    e2.student_id,
                    -- total_score là thang điểm 10, chuyển sang thang điểm 4: total_score / 10 * 4
                    CAST(ROUND(SUM(gr2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0) / 10.0 * 4.0, 2) AS DECIMAL(4,2)) as calculated_gpa
                FROM dbo.enrollments e2
                INNER JOIN dbo.grades gr2 ON e2.enrollment_id = gr2.enrollment_id
                INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
                INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
                WHERE e2.deleted_at IS NULL
                    AND gr2.total_score IS NOT NULL
                GROUP BY e2.student_id
            ) calc_gpa ON s.student_id = calc_gpa.student_id AND (gpa_table.gpa4 IS NULL OR gpa_table.rn IS NULL)
            LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR COALESCE(s.faculty_id, m.faculty_id) = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
                AND (@CohortYear IS NULL OR COALESCE(s.cohort_year, ay.start_year) = @CohortYear)
                AND (@Search IS NULL OR s.student_code LIKE '%' + @Search + '%' OR s.full_name LIKE '%' + @Search + '%')
            GROUP BY s.student_id, gpa_table.gpa4, calc_gpa.calculated_gpa
            HAVING 
                (@WarningStatus IS NULL OR 
                 (@WarningStatus = 'attendance' AND COUNT(a.attendance_id) > 0 AND COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) >= 2.0) OR
                 (@WarningStatus = 'academic' AND (COUNT(a.attendance_id) = 0 OR COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) <= 20) AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0) OR
                 (@WarningStatus = 'both' AND COUNT(a.attendance_id) > 0 AND COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) > 20 AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) < 2.0) OR
                 (@WarningStatus = 'none' AND (COUNT(a.attendance_id) = 0 OR COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0) <= 20) AND COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) >= 2.0))
                AND
                (@GpaMin IS NULL OR COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) >= @GpaMin)
                AND (@GpaMax IS NULL OR COALESCE(gpa_table.gpa4, calc_gpa.calculated_gpa, 0) <= @GpaMax)
                AND
                (@AttendanceRateMin IS NULL OR 
                 CASE 
                     WHEN COUNT(a.attendance_id) > 0 
                     THEN (COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id))
                     ELSE 100 
                 END >= @AttendanceRateMin)
                AND (@AttendanceRateMax IS NULL OR 
                 CASE 
                     WHEN COUNT(a.attendance_id) > 0 
                     THEN (COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id))
                     ELSE 100 
                 END <= @AttendanceRateMax)
        ) subquery;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50006, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 7. SP: GET ADVISOR STUDENT GPA PROGRESS
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorStudentGpaProgress', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorStudentGpaProgress;
GO
CREATE PROCEDURE sp_GetAdvisorStudentGpaProgress
    @StudentId VARCHAR(50),
    @SchoolYearId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get student info
        SELECT 
            s.student_id,
            s.student_code,
            s.full_name
        FROM dbo.students s
        WHERE s.student_id = @StudentId
            AND s.deleted_at IS NULL;
        
        -- Get GPA progress by semester
        SELECT 
            semesters.school_year_id,
            sy.year_code as school_year_code,
            semesters.semester,
            COALESCE(gp.gpa10, calc_gpa.calculated_gpa) as gpa,
            class_avg.class_average_gpa,
            COALESCE(gp.created_at, (SELECT MAX(e4.created_at) FROM dbo.enrollments e4 INNER JOIN dbo.classes c4 ON e4.class_id = c4.class_id WHERE e4.student_id = @StudentId AND c4.school_year_id = semesters.school_year_id AND c4.semester = semesters.semester AND e4.deleted_at IS NULL)) as calculated_at
        FROM (
            SELECT DISTINCT 
                c.school_year_id,
                c.semester
            FROM dbo.enrollments e
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
            WHERE e.student_id = @StudentId
                AND e.deleted_at IS NULL
                AND c.deleted_at IS NULL
                AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
        ) semesters
        LEFT JOIN dbo.school_years sy ON semesters.school_year_id = sy.school_year_id
        LEFT JOIN dbo.gpas gp ON gp.student_id = @StudentId
            AND (gp.school_year_id = semesters.school_year_id OR (gp.school_year_id IS NULL AND semesters.school_year_id IS NULL))
            AND (gp.semester = semesters.semester OR (gp.semester IS NULL AND semesters.semester IS NULL))
            AND gp.deleted_at IS NULL
        LEFT JOIN (
            -- Calculate GPA from grades if not in gpas table
            SELECT 
                c2.school_year_id,
                c2.semester,
                CAST(ROUND(SUM(gr2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
            FROM dbo.enrollments e2
            INNER JOIN dbo.grades gr2 ON e2.enrollment_id = gr2.enrollment_id
            INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
            INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
            WHERE e2.student_id = @StudentId
                AND e2.deleted_at IS NULL
                AND gr2.total_score IS NOT NULL
                AND (@SchoolYearId IS NULL OR c2.school_year_id = @SchoolYearId)
            GROUP BY c2.school_year_id, c2.semester
        ) calc_gpa ON calc_gpa.school_year_id = semesters.school_year_id
            AND calc_gpa.semester = semesters.semester
        LEFT JOIN (
            -- Calculate class average GPA by semester
            SELECT 
                c3.school_year_id,
                c3.semester,
                CAST(ROUND(AVG(COALESCE(gp3.gpa10, calc3.calc_gpa)), 2) AS DECIMAL(4,2)) as class_average_gpa
            FROM dbo.enrollments e3
            INNER JOIN dbo.classes c3 ON e3.class_id = c3.class_id
            INNER JOIN dbo.students s3 ON e3.student_id = s3.student_id
            LEFT JOIN dbo.gpas gp3 ON gp3.student_id = s3.student_id
                AND (gp3.school_year_id = c3.school_year_id OR (gp3.school_year_id IS NULL AND c3.school_year_id IS NULL))
                AND (gp3.semester = c3.semester OR (gp3.semester IS NULL AND c3.semester IS NULL))
                AND gp3.deleted_at IS NULL
            LEFT JOIN (
                SELECT 
                    c4.school_year_id,
                    c4.semester,
                    e4.student_id,
                    CAST(ROUND(SUM(gr4.total_score * sub4.credits) / NULLIF(SUM(sub4.credits), 0), 2) AS DECIMAL(4,2)) as calc_gpa
                FROM dbo.enrollments e4
                INNER JOIN dbo.grades gr4 ON e4.enrollment_id = gr4.enrollment_id
                INNER JOIN dbo.classes c4 ON e4.class_id = c4.class_id
                INNER JOIN dbo.subjects sub4 ON c4.subject_id = sub4.subject_id
                WHERE e4.deleted_at IS NULL
                    AND gr4.total_score IS NOT NULL
                GROUP BY c4.school_year_id, c4.semester, e4.student_id
            ) calc3 ON calc3.student_id = s3.student_id
                AND calc3.school_year_id = c3.school_year_id
                AND calc3.semester = c3.semester
            WHERE e3.deleted_at IS NULL
                AND c3.deleted_at IS NULL
                AND s3.deleted_at IS NULL
                AND s3.admin_class_id = (SELECT admin_class_id FROM dbo.students WHERE student_id = @StudentId)
                AND (@SchoolYearId IS NULL OR c3.school_year_id = @SchoolYearId)
            GROUP BY c3.school_year_id, c3.semester
        ) class_avg ON class_avg.school_year_id = semesters.school_year_id
            AND class_avg.semester = semesters.semester
        ORDER BY 
            semesters.school_year_id,
            semesters.semester;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50007, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 8. SP: GET ADVISOR STUDENT ATTENDANCE PROGRESS
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorStudentAttendanceProgress', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorStudentAttendanceProgress;
GO
CREATE PROCEDURE sp_GetAdvisorStudentAttendanceProgress
    @StudentId VARCHAR(50),
    @SchoolYearId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get student info
        SELECT 
            s.student_id,
            s.student_code,
            s.full_name
        FROM dbo.students s
        WHERE s.student_id = @StudentId
            AND s.deleted_at IS NULL;
        
        -- Get attendance progress by semester
        SELECT 
            student_attendance.school_year_id,
            student_attendance.school_year_code,
            student_attendance.semester,
            student_attendance.attendance_rate,
            class_avg.class_average_attendance_rate,
            student_attendance.total_sessions,
            student_attendance.present_count,
            student_attendance.absent_count
        FROM (
            SELECT 
                c.school_year_id,
                sy.year_code as school_year_code,
                c.semester,
                CAST((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)) AS DECIMAL(5,2)) as attendance_rate,
                COUNT(a.attendance_id) as total_sessions,
                COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) as present_count,
                COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count
            FROM dbo.enrollments e
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
                AND c.deleted_at IS NULL
            LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id
                AND a.deleted_at IS NULL
            WHERE e.student_id = @StudentId
                AND e.deleted_at IS NULL
                AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
            GROUP BY 
                c.school_year_id,
                sy.year_code,
                c.semester
            HAVING COUNT(a.attendance_id) > 0
        ) student_attendance
        LEFT JOIN (
            -- Calculate class average attendance rate by semester
            SELECT 
                c2.school_year_id,
                c2.semester,
                CAST(AVG(CAST(student_rates.attendance_rate AS DECIMAL(5,2))) AS DECIMAL(5,2)) as class_average_attendance_rate
            FROM dbo.enrollments e2
            INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
            INNER JOIN dbo.students s2 ON e2.student_id = s2.student_id
            INNER JOIN (
                SELECT 
                    e3.enrollment_id,
                    c3.school_year_id,
                    c3.semester,
                    CAST((COUNT(CASE WHEN a3.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / NULLIF(COUNT(a3.attendance_id), 0)) AS DECIMAL(5,2)) as attendance_rate
                FROM dbo.enrollments e3
                INNER JOIN dbo.classes c3 ON e3.class_id = c3.class_id
                LEFT JOIN dbo.attendances a3 ON e3.enrollment_id = a3.enrollment_id
                    AND a3.deleted_at IS NULL
                WHERE e3.deleted_at IS NULL
                    AND c3.deleted_at IS NULL
                GROUP BY e3.enrollment_id, c3.school_year_id, c3.semester
                HAVING COUNT(a3.attendance_id) > 0
            ) student_rates ON student_rates.enrollment_id = e2.enrollment_id
            WHERE e2.deleted_at IS NULL
                AND c2.deleted_at IS NULL
                AND s2.deleted_at IS NULL
                AND s2.admin_class_id = (SELECT admin_class_id FROM dbo.students WHERE student_id = @StudentId)
                AND (@SchoolYearId IS NULL OR c2.school_year_id = @SchoolYearId)
            GROUP BY c2.school_year_id, c2.semester
        ) class_avg ON class_avg.school_year_id = student_attendance.school_year_id
            AND class_avg.semester = student_attendance.semester
        ORDER BY student_attendance.school_year_id, student_attendance.semester;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50008, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 9. SP: GET ADVISOR STUDENT TRENDS
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorStudentTrends', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorStudentTrends;
GO
CREATE PROCEDURE sp_GetAdvisorStudentTrends
    @StudentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get student info
        SELECT 
            s.student_id,
            s.student_code,
            s.full_name
        FROM dbo.students s
        WHERE s.student_id = @StudentId
            AND s.deleted_at IS NULL;
        
        -- Get GPA trends (last 3 semesters)
        WITH GpaTrends AS (
            SELECT 
                COALESCE(gp.school_year_id, c.school_year_id) as school_year_id,
                COALESCE(gp.semester, c.semester, 0) as semester,
                COALESCE(gp.gpa10, calc_gpa.calculated_gpa) as gpa,
                ROW_NUMBER() OVER (ORDER BY COALESCE(gp.school_year_id, c.school_year_id) DESC, COALESCE(gp.semester, c.semester, 0) DESC) as rn
            FROM dbo.enrollments e
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
            LEFT JOIN dbo.gpas gp ON gp.student_id = @StudentId
                AND gp.school_year_id = c.school_year_id
                AND gp.semester = c.semester
                AND gp.deleted_at IS NULL
            LEFT JOIN (
                SELECT 
                    c2.school_year_id,
                    c2.semester,
                    CAST(ROUND(SUM(gr2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
                FROM dbo.enrollments e2
                INNER JOIN dbo.grades gr2 ON e2.enrollment_id = gr2.enrollment_id
                INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
                INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
                WHERE e2.student_id = @StudentId
                    AND e2.deleted_at IS NULL
                    AND gr2.total_score IS NOT NULL
                GROUP BY c2.school_year_id, c2.semester
            ) calc_gpa ON calc_gpa.school_year_id = c.school_year_id
                AND calc_gpa.semester = c.semester
            WHERE e.student_id = @StudentId
                AND e.deleted_at IS NULL
                AND c.deleted_at IS NULL
                AND (gp.gpa10 IS NOT NULL OR calc_gpa.calculated_gpa IS NOT NULL)
            GROUP BY 
                COALESCE(gp.school_year_id, c.school_year_id),
                COALESCE(gp.semester, c.semester, 0),
                COALESCE(gp.gpa10, calc_gpa.calculated_gpa)
        )
        SELECT 
            'gpa' as trend_type,
            CASE 
                WHEN COUNT(*) >= 3 THEN
                    CASE 
                        WHEN MAX(CASE WHEN rn = 1 THEN gpa END) < MAX(CASE WHEN rn = 2 THEN gpa END) 
                             AND MAX(CASE WHEN rn = 2 THEN gpa END) < MAX(CASE WHEN rn = 3 THEN gpa END)
                        THEN 'increasing'
                        WHEN MAX(CASE WHEN rn = 1 THEN gpa END) > MAX(CASE WHEN rn = 2 THEN gpa END) 
                             AND MAX(CASE WHEN rn = 2 THEN gpa END) > MAX(CASE WHEN rn = 3 THEN gpa END)
                        THEN 'decreasing'
                        ELSE 'stable'
                    END
                ELSE 'stable'
            END as trend,
            CASE 
                WHEN COUNT(*) >= 2 AND MAX(CASE WHEN rn = 1 THEN gpa END) > MAX(CASE WHEN rn = 2 THEN gpa END) 
                THEN 1
                ELSE 0
            END as has_decline,
            CASE 
                WHEN COUNT(*) >= 2 AND MAX(CASE WHEN rn = 1 THEN gpa END) < MAX(CASE WHEN rn = 2 THEN gpa END) 
                THEN 1
                ELSE 0
            END as has_improvement
        FROM GpaTrends
        WHERE rn <= 3;
        
        -- Get attendance trends (last 3 semesters)
        WITH AttendanceTrends AS (
            SELECT 
                c.school_year_id,
                c.semester,
                CAST((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)) AS DECIMAL(5,2)) as attendance_rate,
                ROW_NUMBER() OVER (ORDER BY c.school_year_id DESC, c.semester DESC) as rn
            FROM dbo.enrollments e
            INNER JOIN dbo.classes c ON e.class_id = c.class_id
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id
                AND a.deleted_at IS NULL
            WHERE e.student_id = @StudentId
                AND e.deleted_at IS NULL
                AND c.deleted_at IS NULL
            GROUP BY c.school_year_id, c.semester
            HAVING COUNT(a.attendance_id) > 0
        )
        SELECT 
            'attendance' as trend_type,
            CASE 
                WHEN COUNT(*) >= 3 THEN
                    CASE 
                        WHEN MAX(CASE WHEN rn = 1 THEN attendance_rate END) < MAX(CASE WHEN rn = 2 THEN attendance_rate END) 
                             AND MAX(CASE WHEN rn = 2 THEN attendance_rate END) < MAX(CASE WHEN rn = 3 THEN attendance_rate END)
                        THEN 'increasing'
                        WHEN MAX(CASE WHEN rn = 1 THEN attendance_rate END) > MAX(CASE WHEN rn = 2 THEN attendance_rate END) 
                             AND MAX(CASE WHEN rn = 2 THEN attendance_rate END) > MAX(CASE WHEN rn = 3 THEN attendance_rate END)
                        THEN 'decreasing'
                        ELSE 'stable'
                    END
                ELSE 'stable'
            END as trend,
            CASE 
                WHEN COUNT(*) >= 2 AND MAX(CASE WHEN rn = 1 THEN attendance_rate END) > MAX(CASE WHEN rn = 2 THEN attendance_rate END) 
                THEN 1
                ELSE 0
            END as has_decline,
            CASE 
                WHEN COUNT(*) >= 2 AND MAX(CASE WHEN rn = 1 THEN attendance_rate END) < MAX(CASE WHEN rn = 2 THEN attendance_rate END) 
                THEN 1
                ELSE 0
            END as has_improvement
        FROM AttendanceTrends
        WHERE rn <= 3;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50009, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 10. SP: GET ADVISOR ATTENDANCE WARNINGS
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorAttendanceWarnings', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorAttendanceWarnings;
GO
CREATE PROCEDURE sp_GetAdvisorAttendanceWarnings
    @Page INT = 1,
    @PageSize INT = 100,
    @AttendanceThreshold DECIMAL(5,2) = 20.0, -- Default: 20% absence rate
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @ClassId VARCHAR(50) = NULL,
    @CohortYear VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @Offset INT = (@Page - 1) * @PageSize;
        DECLARE @HasFilter BIT = 0;
        
        -- Check if any filter is provided
        IF @FacultyId IS NOT NULL OR @MajorId IS NOT NULL OR @ClassId IS NOT NULL OR @CohortYear IS NOT NULL
            SET @HasFilter = 1;
        
        -- If no filter, limit to 100 results
        IF @HasFilter = 0
            SET @PageSize = CASE WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;
        
        -- Get attendance warnings
        SELECT 
            s.student_id,
            s.student_code,
            s.full_name,
            s.email,
            COALESCE(ac.class_name, N'Chưa phân lớp') as class_name,
            f.faculty_name,
            m.major_name,
            s.cohort_year,
            CASE 
                WHEN COUNT(a.attendance_id) > 0 
                THEN CAST((COUNT(CASE WHEN a.status IN ('Present', 'Late', 'Excused') THEN 1 END) * 100.0 / COUNT(a.attendance_id)) AS DECIMAL(5,2))
                ELSE 100 
            END as attendance_rate,
            CAST((COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)) AS DECIMAL(5,2)) as absence_rate,
            COUNT(a.attendance_id) as total_sessions,
            COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count
        FROM dbo.students s
        LEFT JOIN dbo.administrative_classes ac ON s.admin_class_id = ac.admin_class_id
        LEFT JOIN dbo.faculties f ON s.faculty_id = f.faculty_id
        LEFT JOIN dbo.majors m ON s.major_id = m.major_id
        LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
        LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
            AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
            AND (@MajorId IS NULL OR s.major_id = @MajorId)
            AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            AND (@CohortYear IS NULL OR s.cohort_year = @CohortYear)
        GROUP BY 
            s.student_id, s.student_code, s.full_name, s.email,
            ac.class_name, f.faculty_name, m.major_name, s.cohort_year
        HAVING 
            COUNT(a.attendance_id) > 0
            AND (COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)) > @AttendanceThreshold
        ORDER BY 
            (COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)) DESC,
            s.full_name ASC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
        
        -- Get total count
        SELECT COUNT(*) as total_count
        FROM (
            SELECT s.student_id
            FROM dbo.students s
            LEFT JOIN dbo.enrollments e ON s.student_id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id AND a.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
                AND (@CohortYear IS NULL OR s.cohort_year = @CohortYear)
            GROUP BY s.student_id
            HAVING 
                COUNT(a.attendance_id) > 0
                AND (COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / NULLIF(COUNT(a.attendance_id), 0)) > @AttendanceThreshold
        ) subquery;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50010, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- 11. SP: GET ADVISOR ACADEMIC WARNINGS
-- ===========================================
IF OBJECT_ID('sp_GetAdvisorAcademicWarnings', 'P') IS NOT NULL DROP PROCEDURE sp_GetAdvisorAcademicWarnings;
GO
CREATE PROCEDURE sp_GetAdvisorAcademicWarnings
    @Page INT = 1,
    @PageSize INT = 100,
    @GpaThreshold DECIMAL(4,2) = 2.0, -- Default: 2.0 GPA
    @FacultyId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @ClassId VARCHAR(50) = NULL,
    @CohortYear VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @Offset INT = (@Page - 1) * @PageSize;
        DECLARE @HasFilter BIT = 0;
        
        -- Check if any filter is provided
        IF @FacultyId IS NOT NULL OR @MajorId IS NOT NULL OR @ClassId IS NOT NULL OR @CohortYear IS NOT NULL
            SET @HasFilter = 1;
        
        -- If no filter, limit to 100 results
        IF @HasFilter = 0
            SET @PageSize = CASE WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;
        
        -- Get academic warnings
        SELECT 
            s.student_id,
            s.student_code,
            s.full_name,
            s.email,
            COALESCE(ac.class_name, N'Chưa phân lớp') as class_name,
            f.faculty_name,
            m.major_name,
            s.cohort_year,
            COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa) as gpa
        FROM dbo.students s
        LEFT JOIN dbo.administrative_classes ac ON s.admin_class_id = ac.admin_class_id
        LEFT JOIN dbo.faculties f ON s.faculty_id = f.faculty_id
        LEFT JOIN dbo.majors m ON s.major_id = m.major_id
        LEFT JOIN (
            SELECT 
                gp.student_id,
                gp.gpa10,
                ROW_NUMBER() OVER (PARTITION BY gp.student_id ORDER BY gp.created_at DESC) as rn
            FROM dbo.gpas gp
            WHERE gp.deleted_at IS NULL
                AND (gp.semester IS NULL OR gp.semester = 0) -- Cumulative GPA
        ) gpa_table ON s.student_id = gpa_table.student_id AND gpa_table.rn = 1
        LEFT JOIN (
            -- Calculate GPA from grades if not in gpas table
            SELECT 
                e2.student_id,
                CAST(ROUND(SUM(gr2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
            FROM dbo.enrollments e2
            INNER JOIN dbo.grades gr2 ON e2.enrollment_id = gr2.enrollment_id
            INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
            INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
            WHERE e2.deleted_at IS NULL
                AND gr2.total_score IS NOT NULL
            GROUP BY e2.student_id
        ) calc_gpa ON s.student_id = calc_gpa.student_id AND (gpa_table.gpa10 IS NULL OR gpa_table.rn IS NULL)
        WHERE s.deleted_at IS NULL
            AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
            AND (@MajorId IS NULL OR s.major_id = @MajorId)
            AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
            AND (@CohortYear IS NULL OR s.cohort_year = @CohortYear)
            AND COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa, 10) < @GpaThreshold
        ORDER BY 
            COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa, 10) ASC,
            s.full_name ASC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
        
        -- Get total count
        SELECT COUNT(*) as total_count
        FROM (
            SELECT s.student_id
            FROM dbo.students s
            LEFT JOIN (
                SELECT 
                    gp.student_id,
                    gp.gpa10,
                    ROW_NUMBER() OVER (PARTITION BY gp.student_id ORDER BY gp.created_at DESC) as rn
                FROM dbo.gpas gp
                WHERE gp.deleted_at IS NULL
                    AND (gp.semester IS NULL OR gp.semester = 0)
            ) gpa_table ON s.student_id = gpa_table.student_id AND gpa_table.rn = 1
            LEFT JOIN (
                SELECT 
                    e2.student_id,
                    CAST(ROUND(SUM(gr2.total_score * sub2.credits) / NULLIF(SUM(sub2.credits), 0), 2) AS DECIMAL(4,2)) as calculated_gpa
                FROM dbo.enrollments e2
                INNER JOIN dbo.grades gr2 ON e2.enrollment_id = gr2.enrollment_id
                INNER JOIN dbo.classes c2 ON e2.class_id = c2.class_id
                INNER JOIN dbo.subjects sub2 ON c2.subject_id = sub2.subject_id
                WHERE e2.deleted_at IS NULL
                    AND gr2.total_score IS NOT NULL
                GROUP BY e2.student_id
            ) calc_gpa ON s.student_id = calc_gpa.student_id AND (gpa_table.gpa10 IS NULL OR gpa_table.rn IS NULL)
            WHERE s.deleted_at IS NULL
                AND (@FacultyId IS NULL OR s.faculty_id = @FacultyId)
                AND (@MajorId IS NULL OR s.major_id = @MajorId)
                AND (@ClassId IS NULL OR s.admin_class_id = @ClassId)
                AND (@CohortYear IS NULL OR s.cohort_year = @CohortYear)
                AND COALESCE(gpa_table.gpa10, calc_gpa.calculated_gpa, 10) < @GpaThreshold
        ) subquery;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50011, @ErrorMessage, 1;
    END CATCH
END
GO

PRINT '';
PRINT '✅ Đã tạo xong Advisor Stored Procedures!';
PRINT '   - sp_GetAdvisorDashboardStats: Lấy thống kê dashboard';
PRINT '   - sp_GetAdvisorWarningStudents: Lấy danh sách sinh viên cần cảnh báo';
PRINT '   - sp_GetAdvisorStudentDetail: Lấy chi tiết sinh viên';
PRINT '   - sp_GetAdvisorStudentGrades: Lấy bảng điểm sinh viên (có filter)';
PRINT '   - sp_GetAdvisorStudentAttendance: Lấy điểm danh sinh viên (có filter)';
PRINT '   - sp_GetAdvisorStudents: Lấy danh sách sinh viên với mandatory filters';
PRINT '   - sp_GetAdvisorStudentGpaProgress: Lấy tiến độ GPA theo học kỳ';
PRINT '   - sp_GetAdvisorStudentAttendanceProgress: Lấy tiến độ chuyên cần theo học kỳ';
PRINT '   - sp_GetAdvisorStudentTrends: Lấy xu hướng và cảnh báo';
PRINT '   - sp_GetAdvisorAttendanceWarnings: Lấy danh sách cảnh báo chuyên cần';
PRINT '   - sp_GetAdvisorAcademicWarnings: Lấy danh sách cảnh báo học tập';
PRINT '';
GO

