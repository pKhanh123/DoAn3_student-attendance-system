-- ===========================================
-- Stored Procedure: Tính GPA cho tất cả sinh viên theo School Year và Semester
-- ===========================================
-- Mục đích: Tính GPA cho tất cả sinh viên trong một school_year và semester cụ thể
-- Khác với sp_CalculateAllStudentGPA (dùng academic_year_id), procedure này dùng school_year_id
-- ===========================================

USE EducationManagement;
GO

IF OBJECT_ID('sp_CalculateAllStudentGPABySchoolYear', 'P') IS NOT NULL 
    DROP PROCEDURE sp_CalculateAllStudentGPABySchoolYear;
GO

CREATE PROCEDURE sp_CalculateAllStudentGPABySchoolYear
    @SchoolYearId VARCHAR(50),
    @Semester INT,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @StudentId VARCHAR(50);
    DECLARE @ProcessedCount INT = 0;
    DECLARE @ErrorCount INT = 0;
    DECLARE @SemesterStr VARCHAR(20) = CAST(@Semester AS VARCHAR(20));
    
    -- Cursor để lấy tất cả sinh viên có lớp trong school_year và semester này
    DECLARE student_cursor CURSOR LOCAL STATIC READ_ONLY FORWARD_ONLY
    FOR
        SELECT DISTINCT s.student_id
        FROM dbo.students s
        INNER JOIN dbo.enrollments e ON s.student_id = e.student_id
        INNER JOIN dbo.classes c ON e.class_id = c.class_id
        WHERE c.school_year_id = @SchoolYearId
            AND c.semester = @Semester
            AND s.deleted_at IS NULL
            AND e.deleted_at IS NULL
            AND c.deleted_at IS NULL;
    
    OPEN student_cursor;
    FETCH NEXT FROM student_cursor INTO @StudentId;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            -- Tính GPA cho từng sinh viên
            EXEC sp_CalculateGPABySchoolYear 
                @StudentId = @StudentId,
                @SchoolYearId = @SchoolYearId,
                @Semester = @SemesterStr,
                @CreatedBy = @CreatedBy;
            
            SET @ProcessedCount = @ProcessedCount + 1;
        END TRY
        BEGIN CATCH
            SET @ErrorCount = @ErrorCount + 1;
            -- Log error nhưng tiếp tục với sinh viên tiếp theo
            PRINT CONCAT('   ⚠️  Error calculating GPA for student ', @StudentId, ': ', ERROR_MESSAGE());
        END CATCH
        
        FETCH NEXT FROM student_cursor INTO @StudentId;
    END
    
    CLOSE student_cursor;
    DEALLOCATE student_cursor;
    
    -- Return result
    SELECT 
        'SUCCESS' as Status,
        @ProcessedCount as TotalStudentsProcessed,
        @ErrorCount as ErrorCount,
        CONCAT('Đã tính GPA cho ', @ProcessedCount, ' sinh viên', 
               CASE WHEN @ErrorCount > 0 THEN CONCAT(' (', @ErrorCount, ' lỗi)') ELSE '' END) as Message;
END
GO

PRINT '✅ Created stored procedure: sp_CalculateAllStudentGPABySchoolYear';
GO
