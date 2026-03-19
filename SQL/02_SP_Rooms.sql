-- ===========================================
-- 02_SP_Rooms.sql
-- ===========================================
-- Description: Room Management Stored Procedures
-- ===========================================

USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '========================================';
PRINT 'Starting: 02_SP_Rooms.sql';
PRINT 'Room Management SPs';
PRINT '========================================';
GO

-- ===========================================
-- sp_GetRooms - Lấy danh sách rooms (có pagination)
-- ===========================================
IF OBJECT_ID('sp_GetRooms', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetRooms;
GO
CREATE PROCEDURE sp_GetRooms
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL,
    @Page INT = 1,
    @PageSize INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validate pagination
    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 10;
    IF @PageSize > 100 SET @PageSize = 100;
    
    -- Calculate offset
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    -- Get total count
    SELECT COUNT(*) AS TotalCount
    FROM dbo.rooms
    WHERE deleted_at IS NULL
      AND (@Search IS NULL OR room_code LIKE '%' + @Search + '%' OR building LIKE '%' + @Search + '%')
      AND (@IsActive IS NULL OR is_active = @IsActive);
    
    -- Get paged data
    SELECT 
        room_id,
        room_code,
        building,
        capacity,
        is_active,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM dbo.rooms
    WHERE deleted_at IS NULL
      AND (@Search IS NULL OR room_code LIKE '%' + @Search + '%' OR building LIKE '%' + @Search + '%')
      AND (@IsActive IS NULL OR is_active = @IsActive)
    ORDER BY room_code
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ===========================================
-- sp_GetRoomById - Lấy room theo ID
-- ===========================================
IF OBJECT_ID('sp_GetRoomById', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetRoomById;
GO
CREATE PROCEDURE sp_GetRoomById
    @RoomId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        room_id,
        room_code,
        building,
        capacity,
        is_active,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM dbo.rooms
    WHERE room_id = @RoomId AND deleted_at IS NULL;
END
GO

-- ===========================================
-- sp_GetRoomByCode - Lấy room theo code
-- ===========================================
IF OBJECT_ID('sp_GetRoomByCode', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetRoomByCode;
GO
CREATE PROCEDURE sp_GetRoomByCode
    @RoomCode NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        room_id,
        room_code,
        building,
        capacity,
        is_active,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM dbo.rooms
    WHERE room_code = @RoomCode AND deleted_at IS NULL;
END
GO

-- ===========================================
-- sp_SearchRooms - Tìm kiếm rooms (không pagination)
-- ===========================================
IF OBJECT_ID('sp_SearchRooms', 'P') IS NOT NULL
    DROP PROCEDURE sp_SearchRooms;
GO
CREATE PROCEDURE sp_SearchRooms
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        room_id,
        room_code,
        building,
        capacity,
        is_active,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM dbo.rooms
    WHERE deleted_at IS NULL
      AND (@Search IS NULL OR room_code LIKE '%' + @Search + '%' OR building LIKE '%' + @Search + '%')
      AND (@IsActive IS NULL OR is_active = @IsActive)
    ORDER BY room_code;
END
GO

-- ===========================================
-- sp_CreateRoom - Tạo room mới
-- ===========================================
IF OBJECT_ID('sp_CreateRoom', 'P') IS NOT NULL
    DROP PROCEDURE sp_CreateRoom;
GO
CREATE PROCEDURE sp_CreateRoom
    @RoomId VARCHAR(50),
    @RoomCode NVARCHAR(50),
    @Building NVARCHAR(100) = NULL,
    @Capacity INT = NULL,
    @CreatedBy VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate RoomCode không được trống
        IF @RoomCode IS NULL OR LEN(LTRIM(RTRIM(@RoomCode))) = 0
        BEGIN
            THROW 50001, N'Mã phòng học không được để trống', 1;
        END
        
        -- Validate RoomCode unique
        IF EXISTS (SELECT 1 FROM dbo.rooms WHERE room_code = @RoomCode AND deleted_at IS NULL)
        BEGIN
            DECLARE @ErrorMsg1 NVARCHAR(500) = N'Mã phòng học đã tồn tại trong hệ thống: ' + CAST(@RoomCode AS NVARCHAR(50));
            THROW 50002, @ErrorMsg1, 1;
        END
        
        -- Validate Capacity > 0 nếu có giá trị
        IF @Capacity IS NOT NULL AND @Capacity <= 0
        BEGIN
            THROW 50003, N'Sức chứa phòng học phải lớn hơn 0', 1;
        END
        
        -- Insert room
        INSERT INTO dbo.rooms (
            room_id,
            room_code,
            building,
            capacity,
            is_active,
            created_at,
            created_by
        )
        VALUES (
            @RoomId,
            @RoomCode,
            @Building,
            @Capacity,
            1, -- is_active = true by default
            GETDATE(),
            @CreatedBy
        );
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, N'Thêm phòng học thành công' AS Message;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50001, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- sp_UpdateRoom - Cập nhật room
-- ===========================================
IF OBJECT_ID('sp_UpdateRoom', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateRoom;
GO
CREATE PROCEDURE sp_UpdateRoom
    @RoomId VARCHAR(50),
    @RoomCode NVARCHAR(50),
    @Building NVARCHAR(100) = NULL,
    @Capacity INT = NULL,
    @IsActive BIT = 1,
    @UpdatedBy VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate RoomId tồn tại
        IF NOT EXISTS (SELECT 1 FROM dbo.rooms WHERE room_id = @RoomId AND deleted_at IS NULL)
        BEGIN
            DECLARE @ErrorMsg5 NVARCHAR(500) = N'Không tìm thấy phòng học với ID: ' + CAST(@RoomId AS NVARCHAR(50));
            THROW 50001, @ErrorMsg5, 1;
        END
        
        -- Validate RoomCode không được trống
        IF @RoomCode IS NULL OR LEN(LTRIM(RTRIM(@RoomCode))) = 0
        BEGIN
            THROW 50002, N'Mã phòng học không được để trống', 1;
        END
        
        -- Validate RoomCode unique (exclude chính nó)
        IF EXISTS (SELECT 1 FROM dbo.rooms WHERE room_code = @RoomCode AND room_id <> @RoomId AND deleted_at IS NULL)
        BEGIN
            DECLARE @ErrorMsg3 NVARCHAR(500) = N'Mã phòng học đã tồn tại trong hệ thống: ' + CAST(@RoomCode AS NVARCHAR(50));
            THROW 50003, @ErrorMsg3, 1;
        END
        
        -- Validate Capacity > 0 nếu có giá trị
        IF @Capacity IS NOT NULL AND @Capacity <= 0
        BEGIN
            THROW 50004, N'Sức chứa phòng học phải lớn hơn 0', 1;
        END
        
        -- Update room
        UPDATE dbo.rooms
        SET room_code = @RoomCode,
            building = @Building,
            capacity = @Capacity,
            is_active = @IsActive,
            updated_at = GETDATE(),
            updated_by = @UpdatedBy
        WHERE room_id = @RoomId AND deleted_at IS NULL;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, N'Cập nhật phòng học thành công' AS Message;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50001, @ErrorMessage, 1;
    END CATCH
END
GO

-- ===========================================
-- sp_CheckRoomInUse - Kiểm tra room có đang được sử dụng
-- ===========================================
IF OBJECT_ID('sp_CheckRoomInUse', 'P') IS NOT NULL
    DROP PROCEDURE sp_CheckRoomInUse;
GO
CREATE PROCEDURE sp_CheckRoomInUse
    @RoomId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IsInUse BIT = 0;
    
    -- Kiểm tra trong timetable_sessions (chưa bị xóa)
    IF EXISTS (
        SELECT 1 
        FROM dbo.timetable_sessions 
        WHERE room_id = @RoomId 
          AND deleted_at IS NULL
    )
    BEGIN
        SET @IsInUse = 1;
    END
    
    SELECT @IsInUse AS IsInUse;
END
GO

-- ===========================================
-- sp_DeleteRoom - Soft delete room
-- ===========================================
IF OBJECT_ID('sp_DeleteRoom', 'P') IS NOT NULL
    DROP PROCEDURE sp_DeleteRoom;
GO
CREATE PROCEDURE sp_DeleteRoom
    @RoomId VARCHAR(50),
    @DeletedBy VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate RoomId tồn tại
        IF NOT EXISTS (SELECT 1 FROM dbo.rooms WHERE room_id = @RoomId AND deleted_at IS NULL)
        BEGIN
            DECLARE @ErrorMsg4 NVARCHAR(500) = N'Không tìm thấy phòng học với ID: ' + CAST(@RoomId AS NVARCHAR(50));
            THROW 50001, @ErrorMsg4, 1;
        END
        
        -- ✅ NGHIỆP VỤ: Kiểm tra ràng buộc - Room không được sử dụng trong timetable_sessions
        -- Nếu phòng đang được sử dụng trong lịch giảng dạy, không cho phép xóa
        IF EXISTS (
            SELECT 1 
            FROM dbo.timetable_sessions 
            WHERE room_id = @RoomId 
              AND deleted_at IS NULL
        )
        BEGIN
            THROW 50002, N'Không thể xóa phòng học đang được sử dụng trong lịch giảng dạy', 1;
        END
        
        -- Soft delete
        UPDATE dbo.rooms
        SET deleted_at = GETDATE(),
            deleted_by = @DeletedBy
        WHERE room_id = @RoomId AND deleted_at IS NULL;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, N'Xóa phòng học thành công' AS Message;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50001, @ErrorMessage, 1;
    END CATCH
END
GO

PRINT '========================================';
PRINT '✅ Room Management SPs Completed!';
PRINT '========================================';
PRINT '✓ sp_GetRooms';
PRINT '✓ sp_GetRoomById';
PRINT '✓ sp_GetRoomByCode';
PRINT '✓ sp_SearchRooms';
PRINT '✓ sp_CreateRoom';
PRINT '✓ sp_UpdateRoom';
PRINT '✓ sp_CheckRoomInUse';
PRINT '✓ sp_DeleteRoom';
PRINT '========================================';
GO

