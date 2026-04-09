-- ============================================================
-- GRADUATION MODULE - STORED PROCEDURES
-- Created: 2026-05-02
-- Purpose: Business logic for Graduation Workflow
-- ============================================================

-- ============================================================
-- SP 1: sp_CheckGraduationEligibility
-- Purpose: Kiểm tra đủ điều kiện: đủ tín chỉ theo ngành, GPA ≥ min, không nợ môn/tiền, đủ thời gian đào tạo
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CheckGraduationEligibility
    @StudentId VARCHAR(50),
    @AcademicYearId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MajorId VARCHAR(50);
    DECLARE @CohortYear INT;
    DECLARE @ProgramDuration INT;
    DECLARE @RequiredCredits INT;
    DECLARE @MinGPA10 DECIMAL(4,2);
    DECLARE @MinGPA4 DECIMAL(3,2);
    DECLARE @TotalCredits INT;
    DECLARE @AccumulatedCredits INT;
    DECLARE @CurrentGPA10 DECIMAL(4,2);
    DECLARE @CurrentGPA4 DECIMAL(3,2);
    DECLARE @FailedSubjectsCount INT;
    DECLARE @HasDebt BIT;
    DECLARE @TotalDebt DECIMAL(18,2);
    DECLARE @IsEligible BIT = 1;
    DECLARE @EligibilityNote NVARCHAR(2000) = '';

    -- Get student info
    SELECT
        @MajorId = s.major_id,
        @CohortYear = s.cohort_year
    FROM students s
    WHERE s.student_id = @StudentId AND s.deleted_at IS NULL;

    IF @MajorId IS NULL
    BEGIN
        SELECT 0 AS is_eligible, 'Sinh viên không tồn tại' AS eligibility_note;
        RETURN;
    END

    -- Get graduation config for major
    SELECT TOP 1
        @RequiredCredits = required_credits,
        @MinGPA10 = minimum_gpa10,
        @MinGPA4 = minimum_gpa4,
        @ProgramDuration = program_duration_years
    FROM graduation_requirements
    WHERE major_id = @MajorId
      AND is_active = 1
      AND deleted_at IS NULL
    ORDER BY created_at DESC;

    IF @RequiredCredits IS NULL
    BEGIN
        SELECT 0 AS is_eligible, 'Chưa cấu hình điều kiện tốt nghiệp cho ngành này' AS eligibility_note;
        RETURN;
    END

    -- Get student's credit summary
    SELECT
        @TotalCredits = ISNULL(SUM(s.credits), 0),
        @AccumulatedCredits = ISNULL(SUM(CASE WHEN g.total_score >= 5.0 THEN s.credits ELSE 0 END), 0)
    FROM enrollments e
    INNER JOIN classes c ON e.class_id = c.class_id
    INNER JOIN subjects s ON c.subject_id = s.subject_id
    INNER JOIN grades g ON e.enrollment_id = g.enrollment_id
    WHERE e.student_id = @StudentId
      AND e.enrollment_status = 'APPROVED'
      AND e.deleted_at IS NULL
      AND g.deleted_at IS NULL;

    -- Get current GPA
    SELECT TOP 1
        @CurrentGPA10 = gpa10,
        @CurrentGPA4 = gpa4
    FROM gpas
    WHERE student_id = @StudentId
      AND (@AcademicYearId IS NULL OR academic_year_id = @AcademicYearId)
    ORDER BY created_at DESC;

    IF @CurrentGPA10 IS NULL
        SELECT TOP 1
            @CurrentGPA10 = gpa10,
            @CurrentGPA4 = gpa4
        FROM gpas
        WHERE student_id = @StudentId
        ORDER BY created_at DESC;

    -- Count failed subjects (grade < 5.0)
    SELECT @FailedSubjectsCount = COUNT(DISTINCT s.subject_id)
    FROM enrollments e
    INNER JOIN classes c ON e.class_id = c.class_id
    INNER JOIN subjects s ON c.subject_id = s.subject_id
    INNER JOIN grades g ON e.enrollment_id = g.enrollment_id
    WHERE e.student_id = @StudentId
      AND e.enrollment_status = 'APPROVED'
      AND g.total_score < 5.0
      AND e.deleted_at IS NULL
      AND g.deleted_at IS NULL;

    -- Check debt
    SELECT @TotalDebt = ISNULL(SUM(debt_amount), 0)
    FROM invoices
    WHERE student_id = @StudentId
      AND status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
      AND deleted_at IS NULL;

    IF @TotalDebt > 0
        SET @HasDebt = 1;
    ELSE
        SET @HasDebt = 0;

    -- Check eligibility
    IF @AccumulatedCredits < @RequiredCredits
    BEGIN
        SET @IsEligible = 0;
        SET @EligibilityNote = @EligibilityNote + 'Thiếu ' + CAST(@RequiredCredits - @AccumulatedCredits AS VARCHAR(10)) + ' tín chỉ; ';
    END

    IF @CurrentGPA10 < @MinGPA10
    BEGIN
        SET @IsEligible = 0;
        SET @EligibilityNote = @EligibilityNote + 'GPA10 ' + CAST(@CurrentGPA10 AS VARCHAR(5)) + ' < mức tối thiểu ' + CAST(@MinGPA10 AS VARCHAR(5)) + '; ';
    END

    IF @CurrentGPA4 < @MinGPA4
    BEGIN
        SET @IsEligible = 0;
        SET @EligibilityNote = @EligibilityNote + 'GPA4 ' + CAST(@CurrentGPA4 AS VARCHAR(4)) + ' < mức tối thiểu ' + CAST(@MinGPA4 AS VARCHAR(4)) + '; ';
    END

    IF @FailedSubjectsCount > 0
    BEGIN
        SET @IsEligible = 0;
        SET @EligibilityNote = @EligibilityNote + 'Còn ' + CAST(@FailedSubjectsCount AS VARCHAR(5)) + ' môn chưa đạt; ';
    END

    IF @HasDebt = 1
    BEGIN
        SET @IsEligible = 0;
        SET @EligibilityNote = @EligibilityNote + 'Sinh viên còn nợ học phí ' + CAST(@TotalDebt AS VARCHAR(20)) + ' VNĐ; ';
    END

    -- Check program duration (cohort_year + duration <= current year)
    DECLARE @CurrentYear INT = YEAR(GETDATE());
    IF @CohortYear + @ProgramDuration > @CurrentYear
    BEGIN
        SET @IsEligible = 0;
        SET @EligibilityNote = @EligibilityNote + 'Chưa đủ thời gian đào tạo (' + CAST(@ProgramDuration AS VARCHAR(2)) + ' năm); ';
    END

    IF @EligibilityNote = ''
        SET @EligibilityNote = 'Đủ điều kiện xét tốt nghiệp';

    -- Return eligibility result
    SELECT
        @IsEligible AS is_eligible,
        @EligibilityNote AS eligibility_note,
        @TotalCredits AS total_credits,
        @AccumulatedCredits AS accumulated_credits,
        @RequiredCredits AS required_credits,
        @CurrentGPA10 AS current_gpa10,
        @MinGPA10 AS min_gpa10,
        @CurrentGPA4 AS current_gpa4,
        @MinGPA4 AS min_gpa4,
        @FailedSubjectsCount AS failed_subjects_count,
        @HasDebt AS has_debt,
        @TotalDebt AS total_debt,
        @CohortYear AS cohort_year,
        @ProgramDuration AS program_duration_years,
        (@CohortYear + @ProgramDuration) AS expected_graduation_year;
END;
GO

-- ============================================================
-- SP 2: sp_GetGraduationConfigByMajor
-- Purpose: Lấy cấu hình tốt nghiệp theo major_id
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetGraduationConfigByMajor
    @MajorId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        gr.requirement_id,
        gr.major_id,
        m.major_code,
        m.major_name,
        gr.academic_year_id,
        ay.year_name AS academic_year_name,
        gr.required_credits,
        gr.minimum_gpa10,
        gr.minimum_gpa4,
        gr.program_duration_years,
        gr.is_active,
        gr.created_at,
        gr.created_by
    FROM graduation_requirements gr
    INNER JOIN majors m ON gr.major_id = m.major_id
    LEFT JOIN academic_years ay ON gr.academic_year_id = ay.academic_year_id
    WHERE gr.major_id = @MajorId
      AND gr.is_active = 1
      AND gr.deleted_at IS NULL
    ORDER BY gr.created_at DESC;
END;
GO

-- ============================================================
-- SP 3: sp_GetStudentCreditSummary
-- Purpose: Tổng tín chỉ đã tích lũy, tín chỉ yêu cầu, tín chỉ còn thiếu
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentCreditSummary
    @StudentId VARCHAR(50),
    @MajorId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RequiredCredits INT;
    DECLARE @TotalCredits INT;
    DECLARE @AccumulatedCredits INT;
    DECLARE @CurrentGPA10 DECIMAL(4,2);
    DECLARE @CurrentGPA4 DECIMAL(3,2);

    -- Get major if not provided
    IF @MajorId IS NULL
        SELECT @MajorId = major_id FROM students WHERE student_id = @StudentId;

    -- Get required credits
    SELECT TOP 1 @RequiredCredits = required_credits
    FROM graduation_requirements
    WHERE major_id = @MajorId AND is_active = 1 AND deleted_at IS NULL
    ORDER BY created_at DESC;

    IF @RequiredCredits IS NULL
        SET @RequiredCredits = 120; -- Default

    -- Calculate credits
    SELECT
        @TotalCredits = ISNULL(SUM(s.credits), 0),
        @AccumulatedCredits = ISNULL(SUM(CASE WHEN g.total_score >= 5.0 THEN s.credits ELSE 0 END), 0)
    FROM enrollments e
    INNER JOIN classes c ON e.class_id = c.class_id
    INNER JOIN subjects s ON c.subject_id = s.subject_id
    INNER JOIN grades g ON e.enrollment_id = g.enrollment_id
    WHERE e.student_id = @StudentId
      AND e.enrollment_status = 'APPROVED'
      AND e.deleted_at IS NULL
      AND g.deleted_at IS NULL;

    -- Get GPA
    SELECT TOP 1
        @CurrentGPA10 = gpa10,
        @CurrentGPA4 = gpa4
    FROM gpas
    WHERE student_id = @StudentId
    ORDER BY created_at DESC;

    SELECT
        @TotalCredits AS total_credits,
        @AccumulatedCredits AS accumulated_credits,
        @RequiredCredits AS required_credits,
        (@RequiredCredits - @AccumulatedCredits) AS credits_remaining,
        @CurrentGPA10 AS current_gpa10,
        @CurrentGPA4 AS current_gpa4,
        CASE WHEN @AccumulatedCredits >= @RequiredCredits THEN 1 ELSE 0 END AS credits_met,
        CASE WHEN @CurrentGPA10 >= 5.0 THEN 1 ELSE 0 END AS gpa_met;
END;
GO

-- ============================================================
-- SP 4: sp_CreateGraduationRequest
-- Purpose: Sinh viên tạo yêu cầu xét tốt nghiệp
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CreateGraduationRequest
    @RequestId VARCHAR(50) OUTPUT,
    @StudentId VARCHAR(50),
    @AcademicYearId VARCHAR(50),
    @CreatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Check if request already exists
        IF EXISTS (
            SELECT 1 FROM graduation_requests
            WHERE student_id = @StudentId
              AND academic_year_id = @AcademicYearId
              AND status NOT IN ('REJECTED', 'CANCELLED')
              AND deleted_at IS NULL
        )
        BEGIN
            THROW 50001, 'Sinh viên đã có yêu cầu xét tốt nghiệp cho năm học này', 1;
        END

        -- Check eligibility
        DECLARE @IsEligible BIT;
        DECLARE @EligibilityNote NVARCHAR(2000);
        DECLARE @TotalCredits INT;
        DECLARE @AccumulatedCredits INT;
        DECLARE @RequiredCredits INT;
        DECLARE @CurrentGPA10 DECIMAL(4,2);
        DECLARE @CurrentGPA4 DECIMAL(3,2);
        DECLARE @FailedSubjectsCount INT;
        DECLARE @HasDebt BIT;

        -- Create temp table to store eligibility result
        CREATE TABLE #EligibilityResult (
            is_eligible BIT,
            eligibility_note NVARCHAR(2000),
            total_credits INT,
            accumulated_credits INT,
            required_credits INT,
            current_gpa10 DECIMAL(4,2),
            current_gpa4 DECIMAL(3,2),
            failed_subjects_count INT,
            has_debt BIT
        );

        INSERT INTO #EligibilityResult
        EXEC sp_CheckGraduationEligibility @StudentId, @AcademicYearId;

        SELECT
            @IsEligible = is_eligible,
            @EligibilityNote = eligibility_note,
            @TotalCredits = total_credits,
            @AccumulatedCredits = accumulated_credits,
            @RequiredCredits = required_credits,
            @CurrentGPA10 = current_gpa10,
            @CurrentGPA4 = current_gpa4,
            @FailedSubjectsCount = failed_subjects_count,
            @HasDebt = has_debt
        FROM #EligibilityResult;

        DROP TABLE #EligibilityResult;

        -- Generate ID
        IF @RequestId IS NULL OR @RequestId = ''
            SET @RequestId = 'GRAD' + CONVERT(VARCHAR(36), NEWID());

        -- Insert request
        INSERT INTO graduation_requests (
            request_id, student_id, academic_year_id,
            is_eligible, total_credits, current_gpa10, current_gpa4,
            missing_credits, failed_subjects_count, has_debt,
            eligibility_note, status, request_date,
            created_at, created_by
        )
        VALUES (
            @RequestId, @StudentId, @AcademicYearId,
            @IsEligible, @AccumulatedCredits, @CurrentGPA10, @CurrentGPA4,
            (@RequiredCredits - @AccumulatedCredits), @FailedSubjectsCount, @HasDebt,
            @EligibilityNote, 'PENDING', GETDATE(),
            GETDATE(), @CreatedBy
        );

        COMMIT TRANSACTION;

        -- Return request details
        SELECT
            r.request_id,
            r.student_id,
            s.student_code,
            s.full_name,
            r.academic_year_id,
            ay.year_name AS academic_year_name,
            m.major_name,
            r.is_eligible,
            r.total_credits,
            r.current_gpa10,
            r.current_gpa4,
            r.eligibility_note,
            r.status,
            r.request_date
        FROM graduation_requests r
        INNER JOIN students s ON r.student_id = s.student_id
        INNER JOIN majors m ON s.major_id = m.major_id
        INNER JOIN academic_years ay ON r.academic_year_id = ay.academic_year_id
        WHERE r.request_id = @RequestId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
-- SP 5: sp_GetGraduationRequestsByStudent
-- Purpose: Lấy hồ sơ tốt nghiệp của sinh viên
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetGraduationRequestsByStudent
    @StudentId VARCHAR(50),
    @Status VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.request_id,
        r.student_id,
        s.student_code,
        s.full_name,
        r.academic_year_id,
        ay.year_name AS academic_year_name,
        m.major_name,
        r.is_eligible,
        r.total_credits,
        r.current_gpa10,
        r.current_gpa4,
        r.eligibility_note,
        r.status,
        r.request_date,
        r.verified_by,
        r.verified_at,
        r.verified_note,
        r.approved_by,
        r.approved_at,
        r.approved_note,
        r.rejected_by,
        r.rejected_at,
        r.rejected_reason,
        r.diploma_number,
        r.diploma_issued_date
    FROM graduation_requests r
    INNER JOIN students s ON r.student_id = s.student_id
    INNER JOIN majors m ON s.major_id = m.major_id
    INNER JOIN academic_years ay ON r.academic_year_id = ay.academic_year_id
    WHERE r.student_id = @StudentId
      AND (@Status IS NULL OR r.status = @Status)
      AND r.deleted_at IS NULL
    ORDER BY r.request_date DESC;
END;
GO

-- ============================================================
-- SP 6: sp_UpdateGraduationStatus
-- Purpose: Cập nhật trạng thái: PENDING → VERIFIED (Advisor) → APPROVED (Admin) → DIPLOMA_ISSUED
-- ============================================================
CREATE OR ALTER PROCEDURE sp_UpdateGraduationStatus
    @RequestId VARCHAR(50),
    @NewStatus VARCHAR(20),
    @UserId VARCHAR(50),
    @Note NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @CurrentStatus VARCHAR(20);
        DECLARE @StudentId VARCHAR(50);

        SELECT @CurrentStatus = status, @StudentId = student_id
        FROM graduation_requests
        WHERE request_id = @RequestId AND deleted_at IS NULL;

        IF @CurrentStatus IS NULL
            THROW 50001, 'Yêu cầu tốt nghiệp không tồn tại', 1;

        -- Validate status transition
        IF @NewStatus = 'VERIFIED' AND @CurrentStatus != 'PENDING'
            THROW 50002, 'Chỉ có thể xác nhận yêu cầu ở trạng thái PENDING', 1;

        IF @NewStatus = 'APPROVED' AND @CurrentStatus NOT IN ('PENDING', 'VERIFIED')
            THROW 50003, 'Chỉ có thể phê duyệt yêu cầu ở trạng thái PENDING hoặc VERIFIED', 1;

        IF @NewStatus = 'DIPLOMA_ISSUED' AND @CurrentStatus != 'APPROVED'
            THROW 50004, 'Chỉ có thể cấp bằng cho yêu cầu đã được phê duyệt', 1;

        IF @NewStatus = 'REJECTED' AND @CurrentStatus NOT IN ('PENDING', 'VERIFIED')
            THROW 50005, 'Chỉ có thể từ chối yêu cầu ở trạng thái PENDING hoặc VERIFIED', 1;

        -- Update
        IF @NewStatus = 'VERIFIED'
        BEGIN
            UPDATE graduation_requests
            SET status = 'VERIFIED',
                verified_by = @UserId,
                verified_at = GETDATE(),
                verified_note = @Note,
                updated_at = GETDATE(),
                updated_by = @UserId
            WHERE request_id = @RequestId;
        END
        ELSE IF @NewStatus = 'APPROVED'
        BEGIN
            UPDATE graduation_requests
            SET status = 'APPROVED',
                approved_by = @UserId,
                approved_at = GETDATE(),
                approved_note = @Note,
                updated_at = GETDATE(),
                updated_by = @UserId
            WHERE request_id = @RequestId;
        END
        ELSE IF @NewStatus = 'DIPLOMA_ISSUED'
        BEGIN
            DECLARE @DiplomaNumber VARCHAR(50) = 'DIPLOMA-' + CONVERT(VARCHAR(10), YEAR(GETDATE())) + '-' + RIGHT('000000' + CAST(NEXT VALUE FOR diploma_sequence AS VARCHAR(6)), 6);

            UPDATE graduation_requests
            SET status = 'DIPLOMA_ISSUED',
                diploma_number = @DiplomaNumber,
                diploma_issued_date = GETDATE(),
                updated_at = GETDATE(),
                updated_by = @UserId
            WHERE request_id = @RequestId;
        END
        ELSE IF @NewStatus = 'REJECTED'
        BEGIN
            UPDATE graduation_requests
            SET status = 'REJECTED',
                rejected_by = @UserId,
                rejected_at = GETDATE(),
                rejected_reason = @Note,
                updated_at = GETDATE(),
                updated_by = @UserId
            WHERE request_id = @RequestId;
        END

        COMMIT TRANSACTION;

        -- Return updated request
        EXEC sp_GetGraduationRequestsByStudent @StudentId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
-- SP 7: sp_GetGraduationCandidateList
-- Purpose: Danh sách sinh viên đủ điều kiện tốt nghiệp (cho admin batch)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetGraduationCandidateList
    @AcademicYearId VARCHAR(50) = NULL,
    @MajorId VARCHAR(50) = NULL,
    @Status VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.student_id,
        s.student_code,
        s.full_name,
        m.major_code,
        m.major_name,
        ay.year_name AS cohort_year_name,
        s.cohort_year,
        ISNULL(gr.required_credits, 120) AS required_credits,
        ISNULL(credit_summary.accumulated_credits, 0) AS accumulated_credits,
        ISNULL(credit_summary.current_gpa10, 0) AS current_gpa10,
        ISNULL(credit_summary.current_gpa4, 0) AS current_gpa4,
        CASE WHEN ISNULL(credit_summary.accumulated_credits, 0) >= ISNULL(gr.required_credits, 120) THEN 1 ELSE 0 END AS credits_met,
        CASE WHEN ISNULL(credit_summary.current_gpa10, 0) >= ISNULL(gr.minimum_gpa10, 5.0) THEN 1 ELSE 0 END AS gpa_met,
        ISNULL(debt_summary.total_debt, 0) AS total_debt,
        CASE WHEN ISNULL(debt_summary.total_debt, 0) > 0 THEN 1 ELSE 0 END AS has_debt,
        gr.status AS graduation_status,
        gr.request_date
    FROM students s
    INNER JOIN majors m ON s.major_id = m.major_id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.academic_year_id
    LEFT JOIN graduation_requirements gr ON s.major_id = gr.major_id AND gr.is_active = 1 AND gr.deleted_at IS NULL
    OUTER APPLY (
        SELECT
            ISNULL(SUM(CASE WHEN g.total_score >= 5.0 THEN subj.credits ELSE 0 END), 0) AS accumulated_credits,
            MAX(gpa.gpa10) AS current_gpa10,
            MAX(gpa.gpa4) AS current_gpa4
        FROM enrollments e
        INNER JOIN classes c ON e.class_id = c.class_id
        INNER JOIN subjects subj ON c.subject_id = subj.subject_id
        INNER JOIN grades g ON e.enrollment_id = g.enrollment_id
        LEFT JOIN gpas gpa ON e.student_id = gpa.student_id
        WHERE e.student_id = s.student_id
          AND e.enrollment_status = 'APPROVED'
          AND e.deleted_at IS NULL
          AND g.deleted_at IS NULL
    ) AS credit_summary
    OUTER APPLY (
        SELECT ISNULL(SUM(debt_amount), 0) AS total_debt
        FROM invoices
        WHERE student_id = s.student_id
          AND status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
          AND deleted_at IS NULL
    ) AS debt_summary
    LEFT JOIN graduation_requests gr2 ON s.student_id = gr2.student_id
    WHERE s.is_active = 1
      AND s.deleted_at IS NULL
      AND (@MajorId IS NULL OR s.major_id = @MajorId)
      AND (@AcademicYearId IS NULL OR s.academic_year_id = @AcademicYearId)
      AND (@Status IS NULL OR gr2.status = @Status)
    ORDER BY m.major_name, s.student_code;
END;
GO

-- ============================================================
-- Create sequence for diploma numbers if not exists
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'diploma_sequence')
BEGIN
    CREATE SEQUENCE diploma_sequence
        AS INT
        START WITH 1
        INCREMENT BY 1
        MINVALUE 1
        NO MAXVALUE;
END
GO
