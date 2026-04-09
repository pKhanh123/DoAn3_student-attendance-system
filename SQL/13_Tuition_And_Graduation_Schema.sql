-- ============================================================
-- TUITION & GRADUATION MODULE - DATABASE SCHEMA
-- Created: 2026-05-02
-- Purpose: Add Tuition Fee Management and Graduation Workflow
-- ============================================================

-- ============================================================
-- TUITION MODULE (3 tables)
-- ============================================================

-- Table 1: tuition_fee_configs - Cấu hình đơn giá tín chỉ theo năm học
CREATE TABLE tuition_fee_configs (
    config_id VARCHAR(50) PRIMARY KEY DEFAULT ('TF' + CONVERT(VARCHAR(36), NEWID())),
    academic_year_id VARCHAR(50) NOT NULL REFERENCES academic_years(academic_year_id),
    fee_per_credit DECIMAL(18,2) NOT NULL, -- VD: 500000 (VND/tín chỉ)
    effective_from DATE NOT NULL DEFAULT GETDATE(),
    effective_to DATE NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by VARCHAR(50) NULL,
    updated_at DATETIME NULL,
    updated_by VARCHAR(50) NULL,
    deleted_at DATETIME NULL,
    deleted_by VARCHAR(50) NULL,
    CONSTRAINT UQ_TuitionFeeConfig_AcademicYear UNIQUE (academic_year_id, effective_from)
);

-- Table 2: invoices - Hóa đơn học phí
CREATE TABLE invoices (
    invoice_id VARCHAR(50) PRIMARY KEY DEFAULT ('INV' + CONVERT(VARCHAR(36), NEWID())),
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    school_year_id VARCHAR(50) NOT NULL REFERENCES school_years(school_year_id),
    semester TINYINT NOT NULL CHECK (semester IN (1,2,3)),
    total_credits INT NOT NULL, -- Số tín chỉ đã đăng ký thành công
    fee_per_credit DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL, -- total_credits * fee_per_credit
    paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    debt_amount AS (total_amount - paid_amount) PERSISTED,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID','PARTIAL','PAID','OVERDUE')),
    due_date DATE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    note NVARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by VARCHAR(50) NULL,
    updated_at DATETIME NULL,
    updated_by VARCHAR(50) NULL,
    deleted_at DATETIME NULL,
    deleted_by VARCHAR(50) NULL,
    CONSTRAINT UQ_Invoice_StudentSemester UNIQUE (student_id, school_year_id, semester)
);

-- Table 3: payments - Lịch sử thanh toán
CREATE TABLE payments (
    payment_id VARCHAR(50) PRIMARY KEY DEFAULT ('PAY' + CONVERT(VARCHAR(36), NEWID())),
    invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(invoice_id),
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    amount DECIMAL(18,2) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT GETDATE(),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH','BANK_TRANSFER','CARD','OTHER')),
    transaction_ref NVARCHAR(100) NULL,
    note NVARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by VARCHAR(50) NULL
);

-- ============================================================
-- GRADUATION MODULE (2 tables)
-- ============================================================

-- Table 4: graduation_requirements - Điều kiện tốt nghiệp theo ngành
CREATE TABLE graduation_requirements (
    requirement_id VARCHAR(50) PRIMARY KEY DEFAULT ('GR' + CONVERT(VARCHAR(36), NEWID())),
    major_id VARCHAR(50) NOT NULL REFERENCES majors(major_id),
    academic_year_id VARCHAR(50) NOT NULL REFERENCES academic_years(academic_year_id),
    required_credits INT NOT NULL, -- VD: 120 tín chỉ
    minimum_gpa10 DECIMAL(3,2) NOT NULL DEFAULT 5.0, -- VD: 5.0/10
    minimum_gpa4 DECIMAL(3,2) NOT NULL DEFAULT 2.0, -- VD: 2.0/4.0
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by VARCHAR(50) NULL,
    updated_at DATETIME NULL,
    updated_by VARCHAR(50) NULL,
    deleted_at DATETIME NULL,
    deleted_by VARCHAR(50) NULL,
    CONSTRAINT UQ_GraduationReq_MajorYear UNIQUE (major_id, academic_year_id)
);

-- Table 5: graduation_requests - Yêu cầu xét tốt nghiệp
CREATE TABLE graduation_requests (
    request_id VARCHAR(50) PRIMARY KEY DEFAULT ('GRAD' + CONVERT(VARCHAR(36), NEWID())),
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    academic_year_id VARCHAR(50) NOT NULL REFERENCES academic_years(academic_year_id),
    request_date DATETIME NOT NULL DEFAULT GETDATE(),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','APPROVED','REJECTED','DIPLOMA_ISSUED')),

    -- Eligibility check results
    is_eligible BIT NOT NULL DEFAULT 0,
    total_credits INT NULL,
    current_gpa10 DECIMAL(3,2) NULL,
    current_gpa4 DECIMAL(3,2) NULL,
    missing_credits INT NULL,
    failed_subjects_count INT NULL,
    has_debt BIT NULL,
    eligibility_note NVARCHAR(1000) NULL,

    -- Workflow tracking
    verified_by VARCHAR(50) NULL REFERENCES users(user_id),
    verified_at DATETIME NULL,
    verified_note NVARCHAR(500) NULL,

    approved_by VARCHAR(50) NULL REFERENCES users(user_id),
    approved_at DATETIME NULL,
    approved_note NVARCHAR(500) NULL,

    rejected_by VARCHAR(50) NULL REFERENCES users(user_id),
    rejected_at DATETIME NULL,
    rejected_reason NVARCHAR(500) NULL,

    -- Diploma info
    diploma_number NVARCHAR(50) NULL,
    diploma_issued_date DATE NULL,

    created_at DATETIME NOT NULL DEFAULT(GETDATE()),
    created_by VARCHAR(50) NULL,
    updated_at DATETIME NULL,
    updated_by VARCHAR(50) NULL,
    deleted_at DATETIME NULL,
    deleted_by VARCHAR(50) NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Tuition indexes
CREATE INDEX IX_TuitionFeeConfig_AcademicYear ON tuition_fee_configs(academic_year_id, is_active);
CREATE INDEX IX_Invoice_Student ON invoices(student_id, status);
CREATE INDEX IX_Invoice_Status ON invoices(status, due_date);
CREATE INDEX IX_Payment_Invoice ON payments(invoice_id);
CREATE INDEX IX_Payment_Student ON payments(student_id, payment_date);

-- Graduation indexes
CREATE INDEX IX_GraduationReq_Major ON graduation_requirements(major_id, is_active);
CREATE INDEX IX_GraduationRequest_Student ON graduation_requests(student_id, status);
CREATE INDEX IX_GraduationRequest_Status ON graduation_requests(status, request_date);

-- ============================================================
-- COMMENTS
-- ============================================================

EXEC sp_addextendedproperty
    @name = N'MS_Description', @value = N'Cấu hình đơn giá tín chỉ theo năm học',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'tuition_fee_configs';

EXEC sp_addextendedproperty
    @name = N'MS_Description', @value = N'Hóa đơn học phí theo kỳ học',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'invoices';

EXEC sp_addextendedproperty
    @name = N'MS_Description', @value = N'Lịch sử thanh toán học phí',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'payments';

EXEC sp_addextendedproperty
    @name = N'MS_Description', @value = N'Điều kiện tốt nghiệp theo ngành và năm học',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'graduation_requirements';

EXEC sp_addextendedproperty
    @name = N'MS_Description', @value = N'Yêu cầu xét tốt nghiệp của sinh viên',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'graduation_requests';

GO
