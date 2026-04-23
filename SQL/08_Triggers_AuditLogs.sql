-- ===========================================
-- 🎓 HỆ THỐNG QUẢN LÝ ĐIỂM DANH SINH VIÊN
-- 📋 File 8/??: TRIGGERS TỰ ĐỘNG GHI AUDIT LOGS
-- ===========================================

USE EducationManagement;
GO

SET NOCOUNT ON;
PRINT '=========================================';
PRINT 'Bắt đầu tạo Triggers tự động ghi Audit Logs';
PRINT '=========================================';
GO

-- ===========================================
-- MẪU 1: Trigger cho bảng có audit fields chuẩn
-- Cột: created_at, created_by, updated_at, updated_by, deleted_at, deleted_by
-- ===========================================

-- Hàm helper: lấy Old Values JSON
IF OBJECT_ID('dbo.fn_GetAuditOldValues', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_GetAuditOldValues;
GO
CREATE FUNCTION dbo.fn_GetAuditOldValues()
RETURNS NVARCHAR(MAX)
AS
BEGIN
    RETURN N'{}'; -- Placeholder, sẽ được thay bằng logic trong từng trigger
END
GO

-- ===========================================
-- 1. TRIGGER: students
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_students_audit') DROP TRIGGER trg_students_audit;
GO

CREATE TRIGGER trg_students_audit
ON dbo.students
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    -- INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId,
            @Action,
            'students',
            i.student_id,
            (SELECT i.student_id, i.student_code, i.full_name, i.email, i.major_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    -- DELETE
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId,
            @Action,
            'students',
            d.student_id,
            (SELECT d.student_id, d.student_code, d.full_name, d.email, d.major_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    -- UPDATE
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId,
            @Action,
            'students',
            i.student_id,
            (SELECT d.student_id, d.student_code, d.full_name, d.email, d.major_id,
                    d.is_active, d.deleted_at
             FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.student_id, i.student_code, i.full_name, i.email, i.major_id,
                    i.is_active, i.deleted_at
             FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.student_id = d.student_id;
    END
END
GO
PRINT '   ✅ Created: trg_students_audit';
GO

-- ===========================================
-- 2. TRIGGER: users
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_users_audit') DROP TRIGGER trg_users_audit;
GO

CREATE TRIGGER trg_users_audit
ON dbo.users
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'users', i.user_id,
            (SELECT i.user_id, i.username, i.email, i.role_id, i.is_active FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'users', d.user_id,
            (SELECT d.user_id, d.username, d.email, d.role_id, d.is_active FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'users', i.user_id,
            (SELECT d.username, d.email, d.role_id, d.is_active, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.username, i.email, i.role_id, i.is_active, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.user_id = d.user_id;
    END
END
GO
PRINT '   ✅ Created: trg_users_audit';
GO

-- ===========================================
-- 3. TRIGGER: enrollments
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_enrollments_audit') DROP TRIGGER trg_enrollments_audit;
GO

CREATE TRIGGER trg_enrollments_audit
ON dbo.enrollments
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'enrollments', i.enrollment_id,
            (SELECT i.enrollment_id, i.student_id, i.class_id, i.enrollment_status, i.enrollment_date FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'enrollments', d.enrollment_id,
            (SELECT d.enrollment_id, d.student_id, d.class_id, d.enrollment_status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'enrollments', i.enrollment_id,
            (SELECT d.student_id, d.class_id, d.enrollment_status, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.student_id, i.class_id, i.enrollment_status, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.enrollment_id = d.enrollment_id;
    END
END
GO
PRINT '   ✅ Created: trg_enrollments_audit';
GO

-- ===========================================
-- 4. TRIGGER: grades
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_grades_audit') DROP TRIGGER trg_grades_audit;
GO

CREATE TRIGGER trg_grades_audit
ON dbo.grades
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'grades', i.grade_id,
            (SELECT i.grade_id, i.enrollment_id, i.midterm_score, i.final_score, i.total_score,
                    i.letter_grade, i.attendance_score FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'grades', d.grade_id,
            (SELECT d.grade_id, d.enrollment_id, d.midterm_score, d.final_score, d.total_score FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'grades', i.grade_id,
            (SELECT d.midterm_score, d.final_score, d.total_score, d.letter_grade, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.midterm_score, i.final_score, i.total_score, i.letter_grade, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.grade_id = d.grade_id;
    END
END
GO
PRINT '   ✅ Created: trg_grades_audit';
GO

-- ===========================================
-- 5. TRIGGER: attendances
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_attendances_audit') DROP TRIGGER trg_attendances_audit;
GO

CREATE TRIGGER trg_attendances_audit
ON dbo.attendances
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'attendances', i.attendance_id,
            (SELECT i.attendance_id, i.enrollment_id, i.class_id, i.attendance_date, i.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'attendances', d.attendance_id,
            (SELECT d.attendance_id, d.enrollment_id, d.attendance_date, d.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'attendances', i.attendance_id,
            (SELECT d.attendance_date, d.status, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.attendance_date, i.status, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.attendance_id = d.attendance_id;
    END
END
GO
PRINT '   ✅ Created: trg_attendances_audit';
GO

-- ===========================================
-- 6. TRIGGER: classes
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_classes_audit') DROP TRIGGER trg_classes_audit;
GO

CREATE TRIGGER trg_classes_audit
ON dbo.classes
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'classes', i.class_id,
            (SELECT i.class_id, i.class_code, i.class_name, i.subject_id, i.lecturer_id,
                    i.semester, i.max_students, i.current_enrollment FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'classes', d.class_id,
            (SELECT d.class_id, d.class_code, d.class_name, d.subject_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'classes', i.class_id,
            (SELECT d.class_name, d.lecturer_id, d.semester, d.max_students,
                    d.current_enrollment, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.class_name, i.lecturer_id, i.semester, i.max_students,
                    i.current_enrollment, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.class_id = d.class_id;
    END
END
GO
PRINT '   ✅ Created: trg_classes_audit';
GO

-- ===========================================
-- 7. TRIGGER: gpas
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_gpas_audit') DROP TRIGGER trg_gpas_audit;
GO

CREATE TRIGGER trg_gpas_audit
ON dbo.gpas
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'gpas', i.gpa_id,
            (SELECT i.gpa_id, i.student_id, i.academic_year_id, i.semester, i.gpa10, i.gpa4,
                    i.total_credits, i.accumulated_credits, i.rank_text FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'gpas', d.gpa_id,
            (SELECT d.gpa_id, d.student_id, d.gpa10, d.gpa4 FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'gpas', i.gpa_id,
            (SELECT d.gpa10, d.gpa4, d.total_credits, d.accumulated_credits, d.rank_text, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.gpa10, i.gpa4, i.total_credits, i.accumulated_credits, i.rank_text, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.gpa_id = d.gpa_id;
    END
END
GO
PRINT '   ✅ Created: trg_gpas_audit';
GO

-- ===========================================
-- 8. TRIGGER: subjects
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_subjects_audit') DROP TRIGGER trg_subjects_audit;
GO

CREATE TRIGGER trg_subjects_audit
ON dbo.subjects
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'subjects', i.subject_id,
            (SELECT i.subject_id, i.subject_code, i.subject_name, i.credits FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'subjects', d.subject_id,
            (SELECT d.subject_id, d.subject_code, d.subject_name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'subjects', i.subject_id,
            (SELECT d.subject_name, d.credits, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.subject_name, i.credits, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.subject_id = d.subject_id;
    END
END
GO
PRINT '   ✅ Created: trg_subjects_audit';
GO

-- ===========================================
-- 9. TRIGGER: lecturers
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_lecturers_audit') DROP TRIGGER trg_lecturers_audit;
GO

CREATE TRIGGER trg_lecturers_audit
ON dbo.lecturers
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'lecturers', i.lecturer_id,
            (SELECT i.lecturer_id, i.lecturer_code, i.full_name, i.department_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'lecturers', d.lecturer_id,
            (SELECT d.lecturer_id, d.full_name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'lecturers', i.lecturer_id,
            (SELECT d.full_name, d.department_id, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.full_name, i.department_id, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.lecturer_id = d.lecturer_id;
    END
END
GO
PRINT '   ✅ Created: trg_lecturers_audit';
GO

-- ===========================================
-- 10. TRIGGER: notifications
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_notifications_audit') DROP TRIGGER trg_notifications_audit;
GO

CREATE TRIGGER trg_notifications_audit
ON dbo.notifications
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'notifications', i.notification_id,
            (SELECT i.notification_id, i.recipient_id, i.title, i.type, i.is_read FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'notifications', d.notification_id,
            (SELECT d.notification_id, d.recipient_id, d.title FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'notifications', i.notification_id,
            (SELECT d.is_read, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.is_read, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.notification_id = d.notification_id;
    END
END
GO
PRINT '   ✅ Created: trg_notifications_audit';
GO

-- ===========================================
-- 11. TRIGGER: registration_periods
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_registration_periods_audit') DROP TRIGGER trg_registration_periods_audit;
GO

CREATE TRIGGER trg_registration_periods_audit
ON dbo.registration_periods
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'registration_periods', i.period_id,
            (SELECT i.period_id, i.period_name, i.semester, i.status, i.start_date, i.end_date FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'registration_periods', d.period_id,
            (SELECT d.period_id, d.period_name, d.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'registration_periods', i.period_id,
            (SELECT d.period_name, d.status, d.start_date, d.end_date, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.period_name, i.status, i.start_date, i.end_date, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.period_id = d.period_id;
    END
END
GO
PRINT '   ✅ Created: trg_registration_periods_audit';
GO

-- ===========================================
-- 12. TRIGGER: exam_schedules
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_exam_schedules_audit') DROP TRIGGER trg_exam_schedules_audit;
GO

CREATE TRIGGER trg_exam_schedules_audit
ON dbo.exam_schedules
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'exam_schedules', i.exam_id,
            (SELECT i.exam_id, i.class_id, i.subject_id, i.exam_date, i.exam_type, i.room_id, i.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'exam_schedules', d.exam_id,
            (SELECT d.exam_id, d.class_id, d.subject_id, d.exam_date, d.exam_type, d.room_id, d.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'exam_schedules', i.exam_id,
            (SELECT d.exam_date, d.exam_type, d.status, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.exam_date, i.exam_type, i.status, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.exam_id = d.exam_id;
    END
END
GO
PRINT '   ✅ Created: trg_exam_schedules_audit';
GO

-- ===========================================
-- 13. TRIGGER: grade_appeals
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_grade_appeals_audit') DROP TRIGGER trg_grade_appeals_audit;
GO

CREATE TRIGGER trg_grade_appeals_audit
ON dbo.grade_appeals
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'grade_appeals', i.appeal_id,
            (SELECT i.appeal_id, i.enrollment_id, i.appeal_reason, i.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'grade_appeals', d.appeal_id,
            (SELECT d.appeal_id, d.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'grade_appeals', i.appeal_id,
            (SELECT d.status, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.status, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.appeal_id = d.appeal_id;
    END
END
GO
PRINT '   ✅ Created: trg_grade_appeals_audit';
GO

-- ===========================================
-- 14. TRIGGER: refresh_tokens
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_refresh_tokens_audit') DROP TRIGGER trg_refresh_tokens_audit;
GO

CREATE TRIGGER trg_refresh_tokens_audit
ON dbo.refresh_tokens
AFTER INSERT, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ ghi INSERT token mới, không ghi DELETE (revoke) để tránh spam
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            i.user_id, 'INSERT', 'refresh_tokens', CAST(i.id AS VARCHAR(50)),
            (SELECT CAST(i.expires_at AS NVARCHAR(30)) as expires_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END
END
GO
PRINT '   ✅ Created: trg_refresh_tokens_audit';
GO

-- ===========================================
-- 15. TRIGGER: retake_records
-- ===========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_retake_records_audit') DROP TRIGGER trg_retake_records_audit;
GO

CREATE TRIGGER trg_retake_records_audit
ON dbo.retake_records
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId VARCHAR(50);
    SET @UserId = ISNULL(SUSER_NAME(), 'System');

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'INSERT';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'retake_records', i.retake_id,
            (SELECT i.retake_id, i.enrollment_id, i.student_id, i.class_id, i.subject_id, i.reason, i.threshold_value, i.current_value, i.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i;
    END

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @Action = 'DELETE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'retake_records', d.retake_id,
            (SELECT d.retake_id, d.enrollment_id, d.student_id, d.class_id, d.subject_id, d.reason, d.status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM deleted d;
    END

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @Action = 'UPDATE';
        INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        SELECT
            @UserId, @Action, 'retake_records', i.retake_id,
            (SELECT d.status, d.advisor_notes, d.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT i.status, i.advisor_notes, i.deleted_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            NULL, NULL
        FROM inserted i
        INNER JOIN deleted d ON i.retake_id = d.retake_id;
    END
END
GO
PRINT '   ✅ Created: trg_retake_records_audit';
GO

-- ===========================================
-- KẾT QUẢ
-- ===========================================
PRINT '';
PRINT '=========================================';
PRINT '✅ Hoàn thành tạo Triggers!';
PRINT '';
PRINT 'Danh sách Triggers đã tạo:';
PRINT '  1. trg_students_audit';
PRINT '  2. trg_users_audit';
PRINT '  3. trg_enrollments_audit';
PRINT '  4. trg_grades_audit';
PRINT '  5. trg_attendances_audit';
PRINT '  6. trg_classes_audit';
PRINT '  7. trg_gpas_audit';
PRINT '  8. trg_subjects_audit';
PRINT '  9. trg_lecturers_audit';
PRINT '  10. trg_notifications_audit';
PRINT '  11. trg_registration_periods_audit';
PRINT '  12. trg_exam_schedules_audit';
PRINT '  13. trg_grade_appeals_audit';
PRINT '  14. trg_refresh_tokens_audit';
PRINT '  15. trg_retake_records_audit';
PRINT '';
PRINT '📝 Ghi chú:';
PRINT '  - Trigger ghi JSON old_values và new_values';
PRINT '  - Không ghi password_hash để bảo mật';
PRINT '  - refresh_tokens chỉ ghi INSERT, không ghi DELETE (revoke)';
PRINT '  - Trigger tự động bắt SUSER_NAME() làm user_id';
PRINT '=========================================';
GO
