-- ===========================================
-- FIX API ENDPOINTS
-- Fix 1: Create lecturer_subjects table
-- Fix 2: Create missing stored procedures
-- ===========================================

USE EducationManagement;
GO

PRINT '========================================';
PRINT 'Starting: fix_api_endpoints.sql';
PRINT '========================================';
GO

-- ===========================================
-- FIX 1: CREATE lecturer_subjects TABLE
-- ===========================================
IF OBJECT_ID('dbo.lecturer_subjects', 'U') IS NOT NULL
BEGIN
    PRINT 'Table dbo.lecturer_subjects already exists - skipping';
END
ELSE
BEGIN
    PRINT 'Creating table dbo.lecturer_subjects...';

    CREATE TABLE dbo.lecturer_subjects (
        lecturer_subject_id VARCHAR(50) PRIMARY KEY,
        lecturer_id         VARCHAR(50) NOT NULL,
        subject_id         VARCHAR(50) NOT NULL,
        is_primary         BIT DEFAULT 0,
        experience_years   INT DEFAULT 0,
        notes              NVARCHAR(500) NULL,
        certified_date     DATETIME NULL,
        is_active          BIT DEFAULT 1,
        created_at         DATETIME DEFAULT GETDATE(),
        created_by         VARCHAR(50) NULL,
        updated_at         DATETIME NULL,
        updated_by         VARCHAR(50) NULL,
        deleted_at         DATETIME NULL,
        deleted_by         VARCHAR(50) NULL
    );

    -- Foreign key constraints (skip if already exists)
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_lecturer_subjects_lecturers')
        ALTER TABLE dbo.lecturer_subjects ADD CONSTRAINT FK_lecturer_subjects_lecturers
        FOREIGN KEY (lecturer_id) REFERENCES dbo.lecturers(lecturer_id);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_lecturer_subjects_subjects')
        ALTER TABLE dbo.lecturer_subjects ADD CONSTRAINT FK_lecturer_subjects_subjects
        FOREIGN KEY (subject_id) REFERENCES dbo.subjects(subject_id);

    -- Seed data (skip if table already has data)
    -- Assign lecturers to subjects they currently teach in classes table
    IF NOT EXISTS (SELECT 1 FROM dbo.lecturer_subjects)
    INSERT INTO dbo.lecturer_subjects
        (lecturer_subject_id, lecturer_id, subject_id, is_primary, experience_years, is_active, created_at, created_by)
    SELECT
        'LS-' + CONVERT(VARCHAR(50), NEWID()),
        c.lecturer_id,
        c.subject_id,
        1,
        3,
        1,
        GETDATE(),
        'seed'
    FROM dbo.classes c
    WHERE c.deleted_at IS NULL
      AND c.lecturer_id IS NOT NULL
    GROUP BY c.lecturer_id, c.subject_id;

    PRINT 'Created table dbo.lecturer_subjects with seed data';
END
GO

-- ===========================================
-- FIX 2: CREATE sp_GetAllGradeAppeals
-- ===========================================
IF OBJECT_ID('sp_GetAllGradeAppeals', 'P') IS NOT NULL
BEGIN
    PRINT 'Stored procedure sp_GetAllGradeAppeals already exists - skipping';
END
ELSE
BEGIN
    PRINT 'Creating stored procedure sp_GetAllGradeAppeals...';

    EXEC('
    CREATE PROCEDURE sp_GetAllGradeAppeals
        @Page INT = 1,
        @PageSize INT = 20,
        @Status NVARCHAR(20) = NULL,
        @StudentId VARCHAR(50) = NULL,
        @LecturerId VARCHAR(50) = NULL,
        @AdvisorId VARCHAR(50) = NULL,
        @ClassId VARCHAR(50) = NULL
    AS
    BEGIN
        SET NOCOUNT ON;

        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        -- Get total count
        SELECT COUNT(*) as total_count
        FROM dbo.grade_appeals a
        WHERE a.deleted_at IS NULL
            AND (@Status IS NULL OR a.status = @Status)
            AND (@StudentId IS NULL OR a.student_id = @StudentId)
            AND (@LecturerId IS NULL OR a.lecturer_id = @LecturerId)
            AND (@AdvisorId IS NULL OR a.advisor_id = @AdvisorId)
            AND (@ClassId IS NULL OR a.class_id = @ClassId);

        -- Get paginated results
        SELECT
            a.appeal_id,
            a.grade_id,
            a.enrollment_id,
            a.student_id,
            a.class_id,
            a.appeal_reason,
            a.current_score,
            a.expected_score,
            a.component_type,
            a.status,
            a.lecturer_response,
            a.lecturer_id,
            a.lecturer_decision,
            a.advisor_id,
            a.advisor_response,
            a.advisor_decision,
            a.final_score,
            a.resolution_notes,
            a.created_at,
            a.created_by,
            a.updated_at,
            a.updated_by,
            a.resolved_at,
            a.resolved_by,
            -- Student info
            s.student_code,
            s.full_name as student_name,
            s.email as student_email,
            s.user_id as student_user_id,
            -- Class info
            c.class_code,
            c.class_name,
            sub.subject_name,
            sub.subject_code,
            -- Grade info
            g.midterm_score,
            g.final_score as grade_final_score,
            g.total_score,
            g.letter_grade,
            -- Lecturer info
            l.lecturer_code,
            l.full_name as lecturer_name,
            l.email as lecturer_email,
            l.user_id as lecturer_user_id,
            -- Advisor info
            adv.lecturer_code as advisor_code,
            adv.full_name as advisor_name,
            adv.email as advisor_email,
            adv.user_id as advisor_user_id
        FROM dbo.grade_appeals a
        INNER JOIN dbo.students s ON a.student_id = s.student_id
        INNER JOIN dbo.classes c ON a.class_id = c.class_id
        INNER JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
        INNER JOIN dbo.grades g ON a.grade_id = g.grade_id
        LEFT JOIN dbo.lecturers l ON a.lecturer_id = l.lecturer_id
        LEFT JOIN dbo.lecturers adv ON a.advisor_id = adv.lecturer_id
        WHERE a.deleted_at IS NULL
            AND (@Status IS NULL OR a.status = @Status)
            AND (@StudentId IS NULL OR a.student_id = @StudentId)
            AND (@LecturerId IS NULL OR a.lecturer_id = @LecturerId)
            AND (@AdvisorId IS NULL OR a.advisor_id = @AdvisorId)
            AND (@ClassId IS NULL OR a.class_id = @ClassId)
        ORDER BY a.created_at DESC
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY;
    END
    ');

    PRINT 'Created stored procedure sp_GetAllGradeAppeals';
END
GO

PRINT '========================================';
PRINT '[OK] fix_api_endpoints.sql completed';
PRINT '========================================';
GO
