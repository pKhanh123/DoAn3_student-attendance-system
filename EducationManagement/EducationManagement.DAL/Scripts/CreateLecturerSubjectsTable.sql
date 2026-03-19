-- ============================================================
-- 🔹 Tạo bảng lecturer_subjects để quản lý mối quan hệ giảng viên - môn học
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lecturer_subjects')
BEGIN
    CREATE TABLE dbo.lecturer_subjects (
        lecturer_subject_id VARCHAR(50) PRIMARY KEY,
        lecturer_id VARCHAR(50) NOT NULL,
        subject_id VARCHAR(50) NOT NULL,
        is_primary BIT NOT NULL DEFAULT 0,
        experience_years INT NOT NULL DEFAULT 0,
        notes NVARCHAR(500) NULL,
        certified_date DATETIME NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        created_by VARCHAR(50) NULL,
        updated_at DATETIME NULL,
        updated_by VARCHAR(50) NULL,
        deleted_at DATETIME NULL,
        deleted_by VARCHAR(50) NULL,
        
        -- Foreign keys
        CONSTRAINT FK_lecturer_subjects_lecturer 
            FOREIGN KEY (lecturer_id) 
            REFERENCES dbo.lecturers(lecturer_id),
        CONSTRAINT FK_lecturer_subjects_subject 
            FOREIGN KEY (subject_id) 
            REFERENCES dbo.subjects(subject_id),
        
        -- Unique constraint: một giảng viên chỉ được phân một môn một lần
        CONSTRAINT UQ_lecturer_subject 
            UNIQUE (lecturer_id, subject_id)
    );

    -- Indexes for better performance
    CREATE INDEX IX_lecturer_subjects_lecturer_id 
        ON dbo.lecturer_subjects(lecturer_id) 
        WHERE deleted_at IS NULL;
    
    CREATE INDEX IX_lecturer_subjects_subject_id 
        ON dbo.lecturer_subjects(subject_id) 
        WHERE deleted_at IS NULL;

    PRINT '✅ Bảng lecturer_subjects đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT '⚠️ Bảng lecturer_subjects đã tồn tại.';
END
GO

