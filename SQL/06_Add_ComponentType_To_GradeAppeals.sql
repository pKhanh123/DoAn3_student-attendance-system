-- ===========================================
-- Migration: Thêm component_type vào grade_appeals
-- Mục đích: Lưu loại điểm thành phần muốn phúc khảo (MIDTERM, FINAL, ATTENDANCE, ASSIGNMENT)
-- ===========================================

-- Thêm cột component_type vào bảng grade_appeals
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.grade_appeals') AND name = 'component_type')
BEGIN
    ALTER TABLE dbo.grade_appeals
    ADD component_type NVARCHAR(20) NULL CHECK (component_type IN ('MIDTERM', 'FINAL', 'ATTENDANCE', 'ASSIGNMENT'));
    
    PRINT '✅ Đã thêm cột component_type vào bảng grade_appeals';
END
ELSE
BEGIN
    PRINT '⚠️ Cột component_type đã tồn tại trong bảng grade_appeals';
END
GO

-- Thêm index cho component_type
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Appeal_ComponentType' AND object_id = OBJECT_ID('grade_appeals'))
BEGIN
    CREATE INDEX IX_Appeal_ComponentType ON grade_appeals(component_type, status);
    PRINT '✅ Đã tạo index IX_Appeal_ComponentType';
END
GO

PRINT '✅ Migration hoàn tất: Thêm component_type vào grade_appeals';
GO

