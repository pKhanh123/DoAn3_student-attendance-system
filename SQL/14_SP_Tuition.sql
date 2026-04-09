-- ============================================================
-- TUITION MODULE - STORED PROCEDURES
-- Created: 2026-05-02
-- Purpose: Business logic for Tuition Fee Management
-- ============================================================

-- ============================================================
-- SP 1: sp_CreateTuitionFeeConfig
-- Purpose: Tạo/cập nhật cấu hình đơn giá tín chỉ theo năm học
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CreateTuitionFeeConfig
    @ConfigId VARCHAR(50) OUTPUT,
    @AcademicYearId VARCHAR(50),
    @FeePerCredit DECIMAL(18,2),
    @EffectiveFrom DATE,
    @EffectiveTo DATE = NULL,
    @CreatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validate
        IF NOT EXISTS (SELECT 1 FROM academic_years WHERE academic_year_id = @AcademicYearId)
            THROW 50001, 'Năm học không tồn tại', 1;

        IF @FeePerCredit <= 0
            THROW 50002, 'Đơn giá tín chỉ phải lớn hơn 0', 1;

        -- Generate ID if not provided
        IF @ConfigId IS NULL OR @ConfigId = ''
            SET @ConfigId = 'TF' + CONVERT(VARCHAR(36), NEWID());

        -- Insert
        INSERT INTO tuition_fee_configs (
            config_id, academic_year_id, fee_per_credit, effective_from, effective_to,
            is_active, created_at, created_by
        )
        VALUES (
            @ConfigId, @AcademicYearId, @FeePerCredit, @EffectiveFrom, @EffectiveTo,
            1, GETDATE(), @CreatedBy
        );

        COMMIT TRANSACTION;
        SELECT @ConfigId AS config_id, 'SUCCESS' AS status;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
-- SP 2: sp_GetTuitionFeeConfig
-- Purpose: Lấy đơn giá tín chỉ theo năm học
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetTuitionFeeConfig
    @AcademicYearId VARCHAR(50),
    @EffectiveDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @EffectiveDate IS NULL
        SET @EffectiveDate = GETDATE();

    SELECT
        config_id,
        academic_year_id,
        fee_per_credit,
        effective_from,
        effective_to,
        is_active,
        created_at,
        created_by
    FROM tuition_fee_configs
    WHERE academic_year_id = @AcademicYearId
      AND is_active = 1
      AND effective_from <= @EffectiveDate
      AND (effective_to IS NULL OR effective_to >= @EffectiveDate)
      AND deleted_at IS NULL
    ORDER BY effective_from DESC;
END;
GO

-- ============================================================
-- SP 3: sp_CalculateStudentTuition
-- Purpose: Tính học phí = SUM(enrolled credits) × fee_per_credit
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CalculateStudentTuition
    @StudentId VARCHAR(50),
    @SchoolYearId VARCHAR(50),
    @Semester TINYINT,
    @TotalCredits INT OUTPUT,
    @FeePerCredit DECIMAL(18,2) OUTPUT,
    @TotalAmount DECIMAL(18,2) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AcademicYearId VARCHAR(50);

    -- Get academic_year_id from school_year
    SELECT @AcademicYearId = academic_year_id
    FROM school_years
    WHERE school_year_id = @SchoolYearId;

    IF @AcademicYearId IS NULL
        THROW 50001, 'Năm học không tồn tại', 1;

    -- Get fee config
    SELECT TOP 1 @FeePerCredit = fee_per_credit
    FROM tuition_fee_configs
    WHERE academic_year_id = @AcademicYearId
      AND is_active = 1
      AND deleted_at IS NULL
    ORDER BY effective_from DESC;

    IF @FeePerCredit IS NULL
        THROW 50002, 'Chưa cấu hình đơn giá tín chỉ cho năm học này', 1;

    -- Calculate total credits from APPROVED enrollments
    SELECT @TotalCredits = ISNULL(SUM(s.credits), 0)
    FROM enrollments e
    INNER JOIN classes c ON e.class_id = c.class_id
    INNER JOIN subjects s ON c.subject_id = s.subject_id
    WHERE e.student_id = @StudentId
      AND c.school_year_id = @SchoolYearId
      AND c.semester = @Semester
      AND e.enrollment_status = 'APPROVED'
      AND e.deleted_at IS NULL;

    -- Calculate total amount
    SET @TotalAmount = @TotalCredits * @FeePerCredit;

    SELECT
        @TotalCredits AS total_credits,
        @FeePerCredit AS fee_per_credit,
        @TotalAmount AS total_amount;
END;
GO

-- ============================================================
-- SP 4: sp_CreateInvoice
-- Purpose: Tạo hóa đơn học phí cho sinh viên
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CreateInvoice
    @InvoiceId VARCHAR(50) OUTPUT,
    @StudentId VARCHAR(50),
    @SchoolYearId VARCHAR(50),
    @Semester TINYINT,
    @DueDate DATE,
    @CreatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @TotalCredits INT;
        DECLARE @FeePerCredit DECIMAL(18,2);
        DECLARE @TotalAmount DECIMAL(18,2);

        -- Check if invoice already exists
        IF EXISTS (
            SELECT 1 FROM invoices
            WHERE student_id = @StudentId
              AND school_year_id = @SchoolYearId
              AND semester = @Semester
              AND deleted_at IS NULL
        )
            THROW 50001, 'Hóa đơn đã tồn tại cho kỳ học này', 1;

        -- Calculate tuition
        EXEC sp_CalculateStudentTuition
            @StudentId, @SchoolYearId, @Semester,
            @TotalCredits OUTPUT, @FeePerCredit OUTPUT, @TotalAmount OUTPUT;

        IF @TotalCredits = 0
            THROW 50002, 'Sinh viên chưa có môn học nào được duyệt trong kỳ này', 1;

        -- Generate ID
        IF @InvoiceId IS NULL OR @InvoiceId = ''
            SET @InvoiceId = 'INV' + CONVERT(VARCHAR(36), NEWID());

        -- Insert invoice
        INSERT INTO invoices (
            invoice_id, student_id, school_year_id, semester,
            total_credits, fee_per_credit, total_amount, paid_amount,
            status, due_date, invoice_date, created_at, created_by
        )
        VALUES (
            @InvoiceId, @StudentId, @SchoolYearId, @Semester,
            @TotalCredits, @FeePerCredit, @TotalAmount, 0,
            'UNPAID', @DueDate, CAST(GETDATE() AS DATE), GETDATE(), @CreatedBy
        );

        COMMIT TRANSACTION;

        -- Return invoice details
        SELECT
            invoice_id, student_id, school_year_id, semester,
            total_credits, fee_per_credit, total_amount, paid_amount, debt_amount,
            status, due_date, invoice_date
        FROM invoices
        WHERE invoice_id = @InvoiceId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
-- SP 5: sp_GetInvoicesByStudent
-- Purpose: Lấy danh sách hóa đơn của sinh viên
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetInvoicesByStudent
    @StudentId VARCHAR(50),
    @Status VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.invoice_id,
        i.student_id,
        s.student_code,
        s.full_name AS student_name,
        i.school_year_id,
        sy.year_code AS school_year_name,
        i.semester,
        i.total_credits,
        i.fee_per_credit,
        i.total_amount,
        i.paid_amount,
        i.debt_amount,
        i.status,
        i.due_date,
        i.invoice_date,
        i.note,
        i.created_at
    FROM invoices i
    INNER JOIN students s ON i.student_id = s.student_id
    INNER JOIN school_years sy ON i.school_year_id = sy.school_year_id
    WHERE i.student_id = @StudentId
      AND (@Status IS NULL OR i.status = @Status)
      AND i.deleted_at IS NULL
    ORDER BY i.invoice_date DESC, i.semester DESC;
END;
GO

-- ============================================================
-- SP 6: sp_CreatePayment
-- Purpose: Ghi nhận thanh toán, cập nhật paid_amount + status
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CreatePayment
    @PaymentId VARCHAR(50) OUTPUT,
    @InvoiceId VARCHAR(50),
    @StudentId VARCHAR(50),
    @Amount DECIMAL(18,2),
    @PaymentMethod VARCHAR(20),
    @TransactionRef NVARCHAR(100) = NULL,
    @Note NVARCHAR(500) = NULL,
    @CreatedBy VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @TotalAmount DECIMAL(18,2);
        DECLARE @PaidAmount DECIMAL(18,2);
        DECLARE @NewPaidAmount DECIMAL(18,2);
        DECLARE @NewStatus VARCHAR(20);

        -- Validate invoice
        SELECT @TotalAmount = total_amount, @PaidAmount = paid_amount
        FROM invoices
        WHERE invoice_id = @InvoiceId AND deleted_at IS NULL;

        IF @TotalAmount IS NULL
            THROW 50001, 'Hóa đơn không tồn tại', 1;

        IF @Amount <= 0
            THROW 50002, 'Số tiền thanh toán phải lớn hơn 0', 1;

        IF @PaidAmount + @Amount > @TotalAmount
            THROW 50003, 'Số tiền thanh toán vượt quá số tiền còn nợ', 1;

        -- Generate payment ID
        IF @PaymentId IS NULL OR @PaymentId = ''
            SET @PaymentId = 'PAY' + CONVERT(VARCHAR(36), NEWID());

        -- Insert payment
        INSERT INTO payments (
            payment_id, invoice_id, student_id, amount, payment_date,
            payment_method, transaction_ref, note, created_at, created_by
        )
        VALUES (
            @PaymentId, @InvoiceId, @StudentId, @Amount, GETDATE(),
            @PaymentMethod, @TransactionRef, @Note, GETDATE(), @CreatedBy
        );

        -- Update invoice
        SET @NewPaidAmount = @PaidAmount + @Amount;

        IF @NewPaidAmount >= @TotalAmount
            SET @NewStatus = 'PAID';
        ELSE IF @NewPaidAmount > 0
            SET @NewStatus = 'PARTIAL';
        ELSE
            SET @NewStatus = 'UNPAID';

        UPDATE invoices
        SET paid_amount = @NewPaidAmount,
            status = @NewStatus,
            updated_at = GETDATE(),
            updated_by = @CreatedBy
        WHERE invoice_id = @InvoiceId;

        COMMIT TRANSACTION;

        -- Return payment details
        SELECT
            p.payment_id,
            p.invoice_id,
            p.student_id,
            p.amount,
            p.payment_date,
            p.payment_method,
            p.transaction_ref,
            p.note,
            i.total_amount,
            i.paid_amount,
            i.debt_amount,
            i.status
        FROM payments p
        INNER JOIN invoices i ON p.invoice_id = i.invoice_id
        WHERE p.payment_id = @PaymentId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
-- SP 7: sp_GetPaymentHistoryByStudent
-- Purpose: Lịch sử thanh toán của sinh viên
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetPaymentHistoryByStudent
    @StudentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.payment_id,
        p.invoice_id,
        p.student_id,
        s.student_code,
        s.full_name AS student_name,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.transaction_ref,
        p.note,
        i.school_year_id,
        sy.year_code AS school_year_name,
        i.semester,
        i.total_amount AS invoice_total,
        i.paid_amount AS invoice_paid,
        i.debt_amount AS invoice_debt
    FROM payments p
    INNER JOIN students s ON p.student_id = s.student_id
    INNER JOIN invoices i ON p.invoice_id = i.invoice_id
    INNER JOIN school_years sy ON i.school_year_id = sy.school_year_id
    WHERE p.student_id = @StudentId
    ORDER BY p.payment_date DESC;
END;
GO

-- ============================================================
-- SP 8: sp_GetUnpaidInvoices
-- Purpose: Danh sách hóa đơn quá hạn/chưa thanh toán (cho admin)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetUnpaidInvoices
    @Status VARCHAR(20) = NULL,
    @OverdueOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.invoice_id,
        i.student_id,
        s.student_code,
        s.full_name AS student_name,
        s.email,
        s.phone_number,
        i.school_year_id,
        sy.year_code AS school_year_name,
        i.semester,
        i.total_amount,
        i.paid_amount,
        i.debt_amount,
        i.status,
        i.due_date,
        i.invoice_date,
        DATEDIFF(DAY, i.due_date, GETDATE()) AS days_overdue
    FROM invoices i
    INNER JOIN students s ON i.student_id = s.student_id
    INNER JOIN school_years sy ON i.school_year_id = sy.school_year_id
    WHERE i.deleted_at IS NULL
      AND i.status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
      AND (@Status IS NULL OR i.status = @Status)
      AND (@OverdueOnly = 0 OR i.due_date < CAST(GETDATE() AS DATE))
    ORDER BY i.due_date ASC, i.debt_amount DESC;
END;
GO

-- ============================================================
-- SP 9: sp_CheckStudentDebt
-- Purpose: Kiểm tra sinh viên có nợ học phí không
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CheckStudentDebt
    @StudentId VARCHAR(50),
    @HasDebt BIT OUTPUT,
    @TotalDebt DECIMAL(18,2) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @TotalDebt = ISNULL(SUM(debt_amount), 0)
    FROM invoices
    WHERE student_id = @StudentId
      AND status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
      AND deleted_at IS NULL;

    IF @TotalDebt > 0
        SET @HasDebt = 1;
    ELSE
        SET @HasDebt = 0;

    SELECT
        @HasDebt AS has_debt,
        @TotalDebt AS total_debt,
        COUNT(*) AS unpaid_invoice_count
    FROM invoices
    WHERE student_id = @StudentId
      AND status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
      AND deleted_at IS NULL;
END;
GO
