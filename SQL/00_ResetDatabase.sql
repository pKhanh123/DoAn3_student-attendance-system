-- ===========================================
-- 🎓 HỆ THỐNG QUẢN LÝ ĐIỂM DANH SINH VIÊN
-- 📋 File 0: RESET DATABASE (DROP & RECREATE)

USE master;
GO

PRINT '';
PRINT '╔════════════════════════════════════════════════╗';
PRINT '║      ⚠️  DATABASE RESET - DROP & RECREATE      ║';
PRINT '╚════════════════════════════════════════════════╝';
PRINT '';
PRINT '⚠️  Script này sẽ XÓA HOÀN TOÀN database!';
PRINT '';
GO

-- ===========================================
-- STEP 1: DROP DATABASE (nếu tồn tại)
-- ===========================================
PRINT '🔧 Step 1: Dropping database...';
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'EducationManagement')
BEGIN
    -- Đóng tất cả connections
    ALTER DATABASE EducationManagement SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    PRINT '   ✅ Closed all active connections';
    
    -- Drop database
    DROP DATABASE EducationManagement;
    PRINT '   ✅ Dropped database: EducationManagement';
    PRINT '';
END
ELSE
BEGIN
    PRINT '   ⚠️  Database EducationManagement does not exist';
    PRINT '   ℹ️  Nothing to drop';
    PRINT '';
END
GO

-- ===========================================
-- STEP 2: CREATE DATABASE
-- ===========================================
PRINT '🔧 Step 2: Creating new database...';
GO

CREATE DATABASE EducationManagement;
GO

PRINT '   ✅ Created database: EducationManagement';
PRINT '';
GO

USE EducationManagement;
GO

-- ===========================================
-- STEP 3: VERIFY
-- ===========================================
PRINT '🔧 Step 3: Verifying...';
GO

DECLARE @DbId INT = DB_ID('EducationManagement');
DECLARE @DbName NVARCHAR(128) = DB_NAME();

IF @DbId IS NOT NULL
BEGIN
    PRINT CONCAT('   ✅ Database ID: ', CAST(@DbId AS VARCHAR));
    PRINT CONCAT('   ✅ Current Database: ', @DbName);
    PRINT '   ✅ Status: Online and Ready';
END
ELSE
BEGIN
    PRINT '   ❌ Failed to create database!';
END
GO

-- ===========================================
-- COMPLETED
-- ===========================================
PRINT '';
PRINT '╔════════════════════════════════════════════════╗';
PRINT '║           ✅ RESET COMPLETED!                  ║';
PRINT '╚════════════════════════════════════════════════╝';
PRINT '';
PRINT '📋 Database EducationManagement đã được tạo mới (rỗng)';
PRINT '';
PRINT '📋 NEXT STEPS - Chạy lần lượt:';
PRINT '   1. SQL/01_CreateTables.sql          (Tạo tables)';
PRINT '   2. SQL/02_StoredProcedures.sql      (Tạo SPs + automation)';
PRINT '   3. SQL/03_SeedData.sql              (Tạo data mẫu)';
PRINT '';
PRINT '⏱️  Total time: ~3-5 minutes';
PRINT '';
PRINT '═══════════════════════════════════════════════';
GO
