USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
GO

PRINT '========================================';
PRINT 'Seed Data: Tuition & Graduation';
PRINT '========================================';

-- Tuition Fee Configs
MERGE dbo.tuition_fee_configs AS target
USING (VALUES
    ('TFC_AY2024', 'AY2024', 500000, '2024-01-01', '2024-12-31', 1),
    ('TFC_AY2023', 'AY2023', 450000, '2023-01-01', '2023-12-31', 1)
) AS src(config_id, academic_year_id, fee_per_credit, effective_from, effective_to, is_active)
ON target.config_id = src.config_id
WHEN MATCHED THEN
    UPDATE SET academic_year_id = src.academic_year_id,
               fee_per_credit = src.fee_per_credit,
               effective_from = src.effective_from,
               effective_to = src.effective_to,
               is_active = src.is_active
WHEN NOT MATCHED THEN
    INSERT (config_id, academic_year_id, fee_per_credit, effective_from, effective_to, is_active, created_by)
    VALUES (src.config_id, src.academic_year_id, src.fee_per_credit, src.effective_from, src.effective_to, src.is_active, 'seed');
GO

-- Graduation Requirements
MERGE dbo.graduation_requirements AS target
USING (VALUES
    ('GR_SE_2024', 'MAJ_SE', 'AY2024', 140, 5.0, 2.0, 1),
    ('GR_DS_2024', 'MAJ_DS', 'AY2024', 135, 5.0, 2.0, 1),
    ('GR_MKT_2024', 'MAJ_MKT', 'AY2024', 130, 5.0, 2.0, 1)
) AS src(requirement_id, major_id, academic_year_id, required_credits, minimum_gpa10, minimum_gpa4, is_active)
ON target.requirement_id = src.requirement_id
WHEN MATCHED THEN
    UPDATE SET major_id = src.major_id,
               academic_year_id = src.academic_year_id,
               required_credits = src.required_credits,
               minimum_gpa10 = src.minimum_gpa10,
               minimum_gpa4 = src.minimum_gpa4,
               is_active = src.is_active
WHEN NOT MATCHED THEN
    INSERT (requirement_id, major_id, academic_year_id, required_credits, minimum_gpa10, minimum_gpa4, is_active, created_by)
    VALUES (src.requirement_id, src.major_id, src.academic_year_id, src.required_credits, src.minimum_gpa10, src.minimum_gpa4, src.is_active, 'seed');
GO

-- Sample Invoices
MERGE dbo.invoices AS target
USING (VALUES
    ('INV_K24_001_S1', 'STU_K24_001', 'SY2024', 1, 15, 500000, 7500000, 7500000, 'PAID', '2024-09-15', '2024-08-25'),
    ('INV_K24_001_S2', 'STU_K24_001', 'SY2024', 2, 15, 500000, 7500000, 0, 'UNPAID', '2025-02-15', '2025-01-10')
) AS src(invoice_id, student_id, school_year_id, semester, total_credits, fee_per_credit, total_amount, paid_amount, status, due_date, invoice_date)
ON target.invoice_id = src.invoice_id
WHEN MATCHED THEN
    UPDATE SET student_id = src.student_id,
               school_year_id = src.school_year_id,
               semester = src.semester,
               total_credits = src.total_credits,
               fee_per_credit = src.fee_per_credit,
               total_amount = src.total_amount,
               paid_amount = src.paid_amount,
               status = src.status,
               due_date = src.due_date,
               invoice_date = src.invoice_date
WHEN NOT MATCHED THEN
    INSERT (invoice_id, student_id, school_year_id, semester, total_credits, fee_per_credit, total_amount, paid_amount, status, due_date, invoice_date, created_by)
    VALUES (src.invoice_id, src.student_id, src.school_year_id, src.semester, src.total_credits, src.fee_per_credit, src.total_amount, src.paid_amount, src.status, src.due_date, src.invoice_date, 'seed');
GO

PRINT 'Tuition & Graduation seed data completed';
GO
