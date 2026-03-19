-- ===========================================
-- 02_SP_Grade_Appeals_And_Formula.sql
-- ===========================================
-- Description: Grade Appeals and Grade Formula Configuration Stored Procedures
-- ===========================================

USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '========================================';
PRINT 'Starting: 02_SP_Grade_Appeals_And_Formula.sql';
PRINT 'Grade Appeals and Formula Config SPs';
PRINT '========================================';
GO

-- ===========================================
-- GRADE APPEALS STORED PROCEDURES
-- ===========================================

-- 1. CREATE GRADE APPEAL
IF OBJECT_ID('sp_CreateGradeAppeal', 'P') IS NOT NULL DROP PROCEDURE sp_CreateGradeAppeal;
GO
CREATE PROCEDURE sp_CreateGradeAppeal
    @AppealId VARCHAR(50),
    @GradeId VARCHAR(50),
    @EnrollmentId VARCHAR(50),
    @StudentId VARCHAR(50),
    @ClassId VARCHAR(50),
    @AppealReason NVARCHAR(1000),
    @CurrentScore DECIMAL(4,2) = NULL,
    @ExpectedScore DECIMAL(4,2) = NULL,
    @ComponentType NVARCHAR(20) = NULL, -- MIDTERM, FINAL, ATTENDANCE, ASSIGNMENT
    @CreatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Validate grade exists
        IF NOT EXISTS (SELECT 1 FROM dbo.grades WHERE grade_id = @GradeId)
        BEGIN
            THROW 50001, 'Không tìm thấy điểm số', 1;
        END
        
        -- Validate enrollment belongs to student
        IF NOT EXISTS (SELECT 1 FROM dbo.enrollments WHERE enrollment_id = @EnrollmentId AND student_id = @StudentId AND deleted_at IS NULL)
        BEGIN
            THROW 50002, 'Đăng ký học phần không thuộc về sinh viên này', 1;
        END
        
        -- Validate component type
        IF @ComponentType IS NOT NULL AND @ComponentType NOT IN ('MIDTERM', 'FINAL', 'ATTENDANCE', 'ASSIGNMENT')
        BEGIN
            THROW 50003, 'Loại điểm thành phần không hợp lệ. Phải là: MIDTERM, FINAL, ATTENDANCE, hoặc ASSIGNMENT', 1;
        END
        
        INSERT INTO dbo.grade_appeals (
            appeal_id, grade_id, enrollment_id, student_id, class_id,
            appeal_reason, current_score, expected_score, component_type,
            status, created_at, created_by
        )
        VALUES (
            @AppealId, @GradeId, @EnrollmentId, @StudentId, @ClassId,
            @AppealReason, @CurrentScore, @ExpectedScore, @ComponentType,
            'PENDING', GETDATE(), @CreatedBy
        );
        
        SELECT @AppealId as appeal_id;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- 2. GET GRADE APPEAL BY ID
IF OBJECT_ID('sp_GetGradeAppealById', 'P') IS NOT NULL DROP PROCEDURE sp_GetGradeAppealById;
GO
CREATE PROCEDURE sp_GetGradeAppealById
    @AppealId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
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
    WHERE a.appeal_id = @AppealId AND a.deleted_at IS NULL;
END
GO

-- 3. GET ALL GRADE APPEALS (with filters)
IF OBJECT_ID('sp_GetAllGradeAppeals', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllGradeAppeals;
GO
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
GO

-- 4. UPDATE GRADE APPEAL (Lecturer Response)
-- ✅ NGHIỆP VỤ: Giảng viên chỉ đề xuất, không quyết định cuối cùng
-- Tất cả lecturer decisions đều chuyển status sang REVIEWING (chờ advisor quyết định)
-- Chỉ advisor mới có quyền update điểm và quyết định cuối cùng
IF OBJECT_ID('sp_UpdateGradeAppealLecturer', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateGradeAppealLecturer;
GO
CREATE PROCEDURE sp_UpdateGradeAppealLecturer
    @AppealId VARCHAR(50),
    @LecturerId VARCHAR(50),
    @LecturerResponse NVARCHAR(1000) = NULL,
    @LecturerDecision NVARCHAR(20), -- APPROVE (đề xuất chấp nhận), REJECT (đề xuất từ chối), NEED_REVIEW (cần xem xét thêm)
    @UpdatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.grade_appeals WHERE appeal_id = @AppealId AND deleted_at IS NULL)
        BEGIN
            THROW 50001, 'Không tìm thấy yêu cầu phúc khảo', 1;
        END
        
        -- ✅ TẤT CẢ lecturer decisions đều chuyển status sang REVIEWING (chờ advisor quyết định)
        UPDATE dbo.grade_appeals
        SET lecturer_id = @LecturerId,
            lecturer_response = @LecturerResponse,
            lecturer_decision = @LecturerDecision,
            status = 'REVIEWING', -- ✅ Luôn chuyển sang REVIEWING để chờ advisor quyết định
            updated_at = GETDATE(),
            updated_by = @UpdatedBy
        WHERE appeal_id = @AppealId;
        
        -- ❌ BỎ PHẦN UPDATE ĐIỂM: Chỉ advisor mới có quyền update điểm khi quyết định cuối cùng
        -- Lecturer chỉ đề xuất, không update điểm trực tiếp
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- 5. UPDATE GRADE APPEAL (Advisor Decision)
IF OBJECT_ID('sp_UpdateGradeAppealAdvisor', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateGradeAppealAdvisor;
GO
CREATE PROCEDURE sp_UpdateGradeAppealAdvisor
    @AppealId VARCHAR(50),
    @AdvisorId VARCHAR(50),
    @AdvisorResponse NVARCHAR(1000) = NULL,
    @AdvisorDecision NVARCHAR(20), -- APPROVE, REJECT
    @FinalScore DECIMAL(4,2) = NULL,
    @ResolutionNotes NVARCHAR(1000) = NULL,
    @UpdatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.grade_appeals WHERE appeal_id = @AppealId AND deleted_at IS NULL)
        BEGIN
            THROW 50001, 'Không tìm thấy yêu cầu phúc khảo', 1;
        END
        
        UPDATE dbo.grade_appeals
        SET advisor_id = @AdvisorId,
            advisor_response = @AdvisorResponse,
            advisor_decision = @AdvisorDecision,
            final_score = @FinalScore,
            resolution_notes = @ResolutionNotes,
            status = CASE 
                WHEN @AdvisorDecision = 'APPROVE' THEN 'APPROVED'
                WHEN @AdvisorDecision = 'REJECT' THEN 'REJECTED'
                ELSE status
            END,
            resolved_at = GETDATE(),
            resolved_by = @UpdatedBy,
            updated_at = GETDATE(),
            updated_by = @UpdatedBy
        WHERE appeal_id = @AppealId;
        
        -- If approved by advisor, update grade component
        IF @AdvisorDecision = 'APPROVE' AND @FinalScore IS NOT NULL
        BEGIN
            DECLARE @GradeIdToUpdate VARCHAR(50);
            DECLARE @ComponentTypeToUpdate NVARCHAR(20);
            
            SELECT @GradeIdToUpdate = grade_id, @ComponentTypeToUpdate = component_type
            FROM dbo.grade_appeals 
            WHERE appeal_id = @AppealId;
            
            -- Update specific component based on component_type
            IF @ComponentTypeToUpdate = 'MIDTERM'
            BEGIN
                UPDATE dbo.grades
                SET midterm_score = @FinalScore,
                    updated_at = GETDATE(),
                    updated_by = @UpdatedBy
                WHERE grade_id = @GradeIdToUpdate;
            END
            ELSE IF @ComponentTypeToUpdate = 'FINAL'
            BEGIN
                UPDATE dbo.grades
                SET final_score = @FinalScore,
                    updated_at = GETDATE(),
                    updated_by = @UpdatedBy
                WHERE grade_id = @GradeIdToUpdate;
            END
            ELSE IF @ComponentTypeToUpdate = 'ATTENDANCE'
            BEGIN
                UPDATE dbo.grades
                SET attendance_score = @FinalScore,
                    updated_at = GETDATE(),
                    updated_by = @UpdatedBy
                WHERE grade_id = @GradeIdToUpdate;
            END
            ELSE IF @ComponentTypeToUpdate = 'ASSIGNMENT'
            BEGIN
                UPDATE dbo.grades
                SET assignment_score = @FinalScore,
                    updated_at = GETDATE(),
                    updated_by = @UpdatedBy
                WHERE grade_id = @GradeIdToUpdate;
            END
            
            -- Recalculate total_score using grade formula (if exists)
            -- This will be handled by a trigger or separate procedure
            -- For now, we'll just update the component score
        END
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- 6. CANCEL GRADE APPEAL
IF OBJECT_ID('sp_CancelGradeAppeal', 'P') IS NOT NULL DROP PROCEDURE sp_CancelGradeAppeal;
GO
CREATE PROCEDURE sp_CancelGradeAppeal
    @AppealId VARCHAR(50),
    @CancelledBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.grade_appeals
    SET status = 'CANCELLED',
        updated_at = GETDATE(),
        updated_by = @CancelledBy
    WHERE appeal_id = @AppealId AND deleted_at IS NULL;
END
GO

-- ===========================================
-- GRADE FORMULA CONFIG STORED PROCEDURES
-- ===========================================

-- 7. CREATE GRADE FORMULA CONFIG
IF OBJECT_ID('sp_CreateGradeFormulaConfig', 'P') IS NOT NULL DROP PROCEDURE sp_CreateGradeFormulaConfig;
GO
CREATE PROCEDURE sp_CreateGradeFormulaConfig
    @ConfigId VARCHAR(50),
    @SubjectId VARCHAR(50) = NULL,
    @ClassId VARCHAR(50) = NULL,
    @SchoolYearId VARCHAR(50) = NULL,
    @MidtermWeight DECIMAL(5,2) = 0.30,
    @FinalWeight DECIMAL(5,2) = 0.70,
    @AssignmentWeight DECIMAL(5,2) = 0.00,
    @QuizWeight DECIMAL(5,2) = 0.00,
    @ProjectWeight DECIMAL(5,2) = 0.00,
    @CustomFormula NVARCHAR(500) = NULL,
    @RoundingMethod NVARCHAR(20) = 'STANDARD',
    @DecimalPlaces INT = 2,
    @Description NVARCHAR(500) = NULL,
    @IsDefault BIT = 0,
    @CreatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Validate weight sum
        DECLARE @TotalWeight DECIMAL(5,2) = @MidtermWeight + @FinalWeight + 
            ISNULL(@AssignmentWeight, 0) + ISNULL(@QuizWeight, 0) + ISNULL(@ProjectWeight, 0);
        
        IF @TotalWeight > 1.0
        BEGIN
            THROW 50001, 'Tổng trọng số không được vượt quá 1.0', 1;
        END
        
        -- If setting as default, unset other defaults for same scope
        IF @IsDefault = 1
        BEGIN
            UPDATE dbo.grade_formula_config
            SET is_default = 0,
                updated_at = GETDATE(),
                updated_by = @CreatedBy
            WHERE (
                (@SubjectId IS NOT NULL AND subject_id = @SubjectId) OR
                (@ClassId IS NOT NULL AND class_id = @ClassId) OR
                (@SchoolYearId IS NOT NULL AND school_year_id = @SchoolYearId)
            )
            AND deleted_at IS NULL
            AND config_id != @ConfigId;
        END
        
        INSERT INTO dbo.grade_formula_config (
            config_id, subject_id, class_id, school_year_id,
            midterm_weight, final_weight, assignment_weight, quiz_weight, project_weight,
            custom_formula, rounding_method, decimal_places, description, is_default,
            created_at, created_by
        )
        VALUES (
            @ConfigId, @SubjectId, @ClassId, @SchoolYearId,
            @MidtermWeight, @FinalWeight, @AssignmentWeight, @QuizWeight, @ProjectWeight,
            @CustomFormula, @RoundingMethod, @DecimalPlaces, @Description, @IsDefault,
            GETDATE(), @CreatedBy
        );
        
        SELECT @ConfigId as config_id;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- 8. GET GRADE FORMULA CONFIG BY ID
IF OBJECT_ID('sp_GetGradeFormulaConfigById', 'P') IS NOT NULL DROP PROCEDURE sp_GetGradeFormulaConfigById;
GO
CREATE PROCEDURE sp_GetGradeFormulaConfigById
    @ConfigId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        c.config_id,
        c.subject_id,
        c.class_id,
        c.school_year_id,
        c.midterm_weight,
        c.final_weight,
        c.assignment_weight,
        c.quiz_weight,
        c.project_weight,
        c.custom_formula,
        c.rounding_method,
        c.decimal_places,
        c.description,
        c.is_default,
        c.created_at,
        c.created_by,
        c.updated_at,
        c.updated_by,
        -- Subject info
        sub.subject_code,
        sub.subject_name,
        -- Class info
        cl.class_code,
        cl.class_name,
        -- School year info
        sy.year_code,
        sy.year_name
    FROM dbo.grade_formula_config c
    LEFT JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
    LEFT JOIN dbo.classes cl ON c.class_id = cl.class_id
    LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
    WHERE c.config_id = @ConfigId AND c.deleted_at IS NULL;
END
GO

-- 9. GET GRADE FORMULA CONFIG (with priority: class > subject > school_year > default)
IF OBJECT_ID('sp_GetGradeFormulaConfig', 'P') IS NOT NULL DROP PROCEDURE sp_GetGradeFormulaConfig;
GO
CREATE PROCEDURE sp_GetGradeFormulaConfig
    @ClassId VARCHAR(50) = NULL,
    @SubjectId VARCHAR(50) = NULL,
    @SchoolYearId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Priority: class > subject > school_year > default
    SELECT TOP 1
        c.config_id,
        c.subject_id,
        c.class_id,
        c.school_year_id,
        c.midterm_weight,
        c.final_weight,
        c.assignment_weight,
        c.quiz_weight,
        c.project_weight,
        c.custom_formula,
        c.rounding_method,
        c.decimal_places,
        c.description,
        c.is_default,
        c.created_at,
        c.created_by,
        c.updated_at,
        c.updated_by
    FROM dbo.grade_formula_config c
    WHERE c.deleted_at IS NULL
        AND (
            (@ClassId IS NOT NULL AND c.class_id = @ClassId) OR
            (@SubjectId IS NOT NULL AND c.subject_id = @SubjectId AND c.class_id IS NULL) OR
            (@SchoolYearId IS NOT NULL AND c.school_year_id = @SchoolYearId AND c.class_id IS NULL AND c.subject_id IS NULL) OR
            (c.is_default = 1 AND c.class_id IS NULL AND c.subject_id IS NULL AND c.school_year_id IS NULL)
        )
    ORDER BY
        CASE 
            WHEN c.class_id IS NOT NULL THEN 1
            WHEN c.subject_id IS NOT NULL THEN 2
            WHEN c.school_year_id IS NOT NULL THEN 3
            WHEN c.is_default = 1 THEN 4
        END;
END
GO

-- 10. GET ALL GRADE FORMULA CONFIGS
IF OBJECT_ID('sp_GetAllGradeFormulaConfigs', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllGradeFormulaConfigs;
GO
CREATE PROCEDURE sp_GetAllGradeFormulaConfigs
    @Page INT = 1,
    @PageSize INT = 20,
    @SubjectId VARCHAR(50) = NULL,
    @ClassId VARCHAR(50) = NULL,
    @SchoolYearId VARCHAR(50) = NULL,
    @IsDefault BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    -- Get total count
    SELECT COUNT(*) as total_count
    FROM dbo.grade_formula_config c
    WHERE c.deleted_at IS NULL
        AND (@SubjectId IS NULL OR c.subject_id = @SubjectId)
        AND (@ClassId IS NULL OR c.class_id = @ClassId)
        AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
        AND (@IsDefault IS NULL OR c.is_default = @IsDefault);
    
    -- Get paginated results
    SELECT 
        c.config_id,
        c.subject_id,
        c.class_id,
        c.school_year_id,
        c.midterm_weight,
        c.final_weight,
        c.assignment_weight,
        c.quiz_weight,
        c.project_weight,
        c.custom_formula,
        c.rounding_method,
        c.decimal_places,
        c.description,
        c.is_default,
        c.created_at,
        c.created_by,
        c.updated_at,
        c.updated_by,
        -- Subject info
        sub.subject_code,
        sub.subject_name,
        -- Class info
        cl.class_code,
        cl.class_name,
        -- School year info
        sy.year_code,
        sy.year_name
    FROM dbo.grade_formula_config c
    LEFT JOIN dbo.subjects sub ON c.subject_id = sub.subject_id
    LEFT JOIN dbo.classes cl ON c.class_id = cl.class_id
    LEFT JOIN dbo.school_years sy ON c.school_year_id = sy.school_year_id
    WHERE c.deleted_at IS NULL
        AND (@SubjectId IS NULL OR c.subject_id = @SubjectId)
        AND (@ClassId IS NULL OR c.class_id = @ClassId)
        AND (@SchoolYearId IS NULL OR c.school_year_id = @SchoolYearId)
        AND (@IsDefault IS NULL OR c.is_default = @IsDefault)
    ORDER BY c.is_default DESC, c.created_at DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- 11. UPDATE GRADE FORMULA CONFIG
IF OBJECT_ID('sp_UpdateGradeFormulaConfig', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateGradeFormulaConfig;
GO
CREATE PROCEDURE sp_UpdateGradeFormulaConfig
    @ConfigId VARCHAR(50),
    @MidtermWeight DECIMAL(5,2) = NULL,
    @FinalWeight DECIMAL(5,2) = NULL,
    @AssignmentWeight DECIMAL(5,2) = NULL,
    @QuizWeight DECIMAL(5,2) = NULL,
    @ProjectWeight DECIMAL(5,2) = NULL,
    @CustomFormula NVARCHAR(500) = NULL,
    @RoundingMethod NVARCHAR(20) = NULL,
    @DecimalPlaces INT = NULL,
    @Description NVARCHAR(500) = NULL,
    @IsDefault BIT = NULL,
    @UpdatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Validate weight sum if weights are provided
        IF @MidtermWeight IS NOT NULL OR @FinalWeight IS NOT NULL OR 
           @AssignmentWeight IS NOT NULL OR @QuizWeight IS NOT NULL OR @ProjectWeight IS NOT NULL
        BEGIN
            DECLARE @CurrentMidterm DECIMAL(5,2);
            DECLARE @CurrentFinal DECIMAL(5,2);
            DECLARE @CurrentAssignment DECIMAL(5,2);
            DECLARE @CurrentQuiz DECIMAL(5,2);
            DECLARE @CurrentProject DECIMAL(5,2);
            
            SELECT 
                @CurrentMidterm = midterm_weight,
                @CurrentFinal = final_weight,
                @CurrentAssignment = assignment_weight,
                @CurrentQuiz = quiz_weight,
                @CurrentProject = project_weight
            FROM dbo.grade_formula_config
            WHERE config_id = @ConfigId;
            
            DECLARE @TotalWeight DECIMAL(5,2) = 
                ISNULL(@MidtermWeight, @CurrentMidterm) + 
                ISNULL(@FinalWeight, @CurrentFinal) + 
                ISNULL(@AssignmentWeight, @CurrentAssignment) + 
                ISNULL(@QuizWeight, @CurrentQuiz) + 
                ISNULL(@ProjectWeight, @CurrentProject);
            
            IF @TotalWeight > 1.0
            BEGIN
                THROW 50001, 'Tổng trọng số không được vượt quá 1.0', 1;
            END
        END
        
        -- If setting as default, unset other defaults for same scope
        IF @IsDefault = 1
        BEGIN
            DECLARE @SubjectId VARCHAR(50);
            DECLARE @ClassId VARCHAR(50);
            DECLARE @SchoolYearId VARCHAR(50);
            
            SELECT @SubjectId = subject_id, @ClassId = class_id, @SchoolYearId = school_year_id
            FROM dbo.grade_formula_config
            WHERE config_id = @ConfigId;
            
            UPDATE dbo.grade_formula_config
            SET is_default = 0,
                updated_at = GETDATE(),
                updated_by = @UpdatedBy
            WHERE (
                (@SubjectId IS NOT NULL AND subject_id = @SubjectId) OR
                (@ClassId IS NOT NULL AND class_id = @ClassId) OR
                (@SchoolYearId IS NOT NULL AND school_year_id = @SchoolYearId)
            )
            AND deleted_at IS NULL
            AND config_id != @ConfigId;
        END
        
        UPDATE dbo.grade_formula_config
        SET midterm_weight = ISNULL(@MidtermWeight, midterm_weight),
            final_weight = ISNULL(@FinalWeight, final_weight),
            assignment_weight = ISNULL(@AssignmentWeight, assignment_weight),
            quiz_weight = ISNULL(@QuizWeight, quiz_weight),
            project_weight = ISNULL(@ProjectWeight, project_weight),
            custom_formula = ISNULL(@CustomFormula, custom_formula),
            rounding_method = ISNULL(@RoundingMethod, rounding_method),
            decimal_places = ISNULL(@DecimalPlaces, decimal_places),
            description = ISNULL(@Description, description),
            is_default = ISNULL(@IsDefault, is_default),
            updated_at = GETDATE(),
            updated_by = @UpdatedBy
        WHERE config_id = @ConfigId AND deleted_at IS NULL;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- 12. DELETE GRADE FORMULA CONFIG
IF OBJECT_ID('sp_DeleteGradeFormulaConfig', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteGradeFormulaConfig;
GO
CREATE PROCEDURE sp_DeleteGradeFormulaConfig
    @ConfigId VARCHAR(50),
    @DeletedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.grade_formula_config
    SET deleted_at = GETDATE(),
        deleted_by = @DeletedBy
    WHERE config_id = @ConfigId AND deleted_at IS NULL;
END
GO

-- 13. CALCULATE GRADE USING FORMULA
IF OBJECT_ID('sp_CalculateGradeWithFormula', 'P') IS NOT NULL DROP PROCEDURE sp_CalculateGradeWithFormula;
GO
CREATE PROCEDURE sp_CalculateGradeWithFormula
    @GradeId VARCHAR(50),
    @ClassId VARCHAR(50) = NULL,
    @SubjectId VARCHAR(50) = NULL,
    @SchoolYearId VARCHAR(50) = NULL,
    @MidtermScore DECIMAL(4,2) = NULL,
    @FinalScore DECIMAL(4,2) = NULL,
    @AssignmentScore DECIMAL(4,2) = NULL,
    @QuizScore DECIMAL(4,2) = NULL,
    @ProjectScore DECIMAL(4,2) = NULL,
    @UpdatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get formula config
        DECLARE @ConfigId VARCHAR(50);
        DECLARE @MidtermWeight DECIMAL(5,2);
        DECLARE @FinalWeight DECIMAL(5,2);
        DECLARE @AssignmentWeight DECIMAL(5,2);
        DECLARE @QuizWeight DECIMAL(5,2);
        DECLARE @ProjectWeight DECIMAL(5,2);
        DECLARE @CustomFormula NVARCHAR(500);
        DECLARE @RoundingMethod NVARCHAR(20);
        DECLARE @DecimalPlaces INT;
        
        EXEC sp_GetGradeFormulaConfig 
            @ClassId = @ClassId,
            @SubjectId = @SubjectId,
            @SchoolYearId = @SchoolYearId;
        
        -- If no config found, use default (30% midterm, 70% final)
        IF @ConfigId IS NULL
        BEGIN
            SET @MidtermWeight = 0.30;
            SET @FinalWeight = 0.70;
            SET @AssignmentWeight = 0.00;
            SET @QuizWeight = 0.00;
            SET @ProjectWeight = 0.00;
            SET @RoundingMethod = 'STANDARD';
            SET @DecimalPlaces = 2;
        END
        ELSE
        BEGIN
            SELECT 
                @MidtermWeight = midterm_weight,
                @FinalWeight = final_weight,
                @AssignmentWeight = ISNULL(assignment_weight, 0),
                @QuizWeight = ISNULL(quiz_weight, 0),
                @ProjectWeight = ISNULL(project_weight, 0),
                @CustomFormula = custom_formula,
                @RoundingMethod = rounding_method,
                @DecimalPlaces = decimal_places
            FROM dbo.grade_formula_config
            WHERE config_id = @ConfigId;
        END
        
        -- Calculate total score
        DECLARE @TotalScore DECIMAL(4,2);
        
        IF @CustomFormula IS NOT NULL
        BEGIN
            -- Use custom formula (simplified - in production, use proper formula parser)
            SET @TotalScore = 
                ISNULL(@MidtermScore, 0) * @MidtermWeight +
                ISNULL(@FinalScore, 0) * @FinalWeight +
                ISNULL(@AssignmentScore, 0) * @AssignmentWeight +
                ISNULL(@QuizScore, 0) * @QuizWeight +
                ISNULL(@ProjectScore, 0) * @ProjectWeight;
        END
        ELSE
        BEGIN
            -- Standard formula
            SET @TotalScore = 
                ISNULL(@MidtermScore, 0) * @MidtermWeight +
                ISNULL(@FinalScore, 0) * @FinalWeight +
                ISNULL(@AssignmentScore, 0) * @AssignmentWeight +
                ISNULL(@QuizScore, 0) * @QuizWeight +
                ISNULL(@ProjectScore, 0) * @ProjectWeight;
        END
        
        -- Apply rounding
        IF @RoundingMethod = 'CEILING'
            SET @TotalScore = CEILING(@TotalScore * POWER(10, @DecimalPlaces)) / POWER(10, @DecimalPlaces);
        ELSE IF @RoundingMethod = 'FLOOR'
            SET @TotalScore = FLOOR(@TotalScore * POWER(10, @DecimalPlaces)) / POWER(10, @DecimalPlaces);
        ELSE IF @RoundingMethod = 'STANDARD'
            SET @TotalScore = ROUND(@TotalScore, @DecimalPlaces);
        -- ELSE NONE - no rounding
        
        -- Ensure score is within valid range
        IF @TotalScore < 0 SET @TotalScore = 0;
        IF @TotalScore > 10 SET @TotalScore = 10;
        
        -- Update grade
        UPDATE dbo.grades
        SET midterm_score = ISNULL(@MidtermScore, midterm_score),
            final_score = ISNULL(@FinalScore, final_score),
            total_score = @TotalScore,
            updated_at = GETDATE(),
            updated_by = @UpdatedBy
        WHERE grade_id = @GradeId;
        
        SELECT @TotalScore as calculated_score;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

PRINT '========================================';
PRINT '[OK] Grade Appeals and Formula Config SPs completed';
PRINT '========================================';
GO

