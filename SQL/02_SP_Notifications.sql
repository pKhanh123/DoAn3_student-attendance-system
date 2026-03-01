-- ===========================================
-- 02_SP_Notifications.sql
-- Description: Stored Procedures for Notifications
-- ===========================================

PRINT 'Starting: 02_SP_Notifications.sql';
PRINT 'Notification Stored Procedures';
GO

-- ===========================================
-- 1. ALTER TABLE NOTIFICATIONS (Update schema to match C# Model)
-- ===========================================

-- Ensure table exists, if not create it
DECLARE @UsersUserIdType NVARCHAR(128);
DECLARE @NotificationsUserIdType NVARCHAR(128);

IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
    PRINT '⚠️  Table dbo.notifications does not exist. Creating it now...';
    
    -- Create notifications table with basic structure
    CREATE TABLE dbo.notifications (
        notification_id   VARCHAR(50) PRIMARY KEY,
        user_id           VARCHAR(50) NOT NULL,
        title             NVARCHAR(200) NOT NULL,
        message           NVARCHAR(MAX) NOT NULL,
        notification_type NVARCHAR(50) NULL,
        is_read           BIT NOT NULL DEFAULT 0,
        created_at        DATETIME NOT NULL DEFAULT(GETDATE())
    );
    
    PRINT '   ✓ Created table: notifications';
    
    -- Add foreign key if users table exists and constraint doesn't exist
    IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Notifications_UserId_Users')
        BEGIN
            BEGIN TRY
                -- Check if user_id column types match
                SELECT @UsersUserIdType = TYPE_NAME(system_type_id) + 
                    CASE WHEN max_length > 0 THEN '(' + CAST(max_length AS VARCHAR) + ')' ELSE '' END
                FROM sys.columns 
                WHERE object_id = OBJECT_ID('dbo.users') AND name = 'user_id';
                
                SELECT @NotificationsUserIdType = TYPE_NAME(system_type_id) + 
                    CASE WHEN max_length > 0 THEN '(' + CAST(max_length AS VARCHAR) + ')' ELSE '' END
                FROM sys.columns 
                WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'user_id';
                
                IF @UsersUserIdType = @NotificationsUserIdType
                BEGIN
                    ALTER TABLE dbo.notifications
                    ADD CONSTRAINT FK_Notifications_UserId_Users
                    FOREIGN KEY (user_id) REFERENCES dbo.users(user_id);
                    PRINT '   ✓ Added foreign key: FK_Notifications_UserId_Users';
                END
                ELSE
                BEGIN
                    PRINT '   ⚠️  Warning: user_id column types do not match. Skipping foreign key creation.';
                    PRINT CONCAT('   Users.user_id type: ', @UsersUserIdType);
                    PRINT CONCAT('   Notifications.user_id type: ', @NotificationsUserIdType);
                END
            END TRY
            BEGIN CATCH
                PRINT '   ⚠️  Warning: Could not create foreign key. Error: ' + ERROR_MESSAGE();
                PRINT '   Table will continue without foreign key constraint.';
            END CATCH
        END
        ELSE
        BEGIN
            PRINT '   ⏭️  Foreign key FK_Notifications_UserId_Users already exists';
        END
    END
    ELSE
    BEGIN
        PRINT '   ⚠️  Users table does not exist. Foreign key will be added later.';
    END
END
ELSE
BEGIN
    PRINT '   ✓ Table notifications already exists';
END
GO

-- Check if column recipient_id exists, if not add it
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'recipient_id')
BEGIN
    BEGIN TRY
        -- Add recipient_id column as nullable first
        ALTER TABLE dbo.notifications ADD recipient_id VARCHAR(50) NULL;
        PRINT '   ✓ Added column: recipient_id';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding recipient_id: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column recipient_id already exists';
GO

-- Copy data from user_id to recipient_id for existing rows (if both columns exist)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'recipient_id')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'user_id')
BEGIN
    BEGIN TRY
        UPDATE dbo.notifications SET recipient_id = user_id WHERE recipient_id IS NULL;
        PRINT '   ✓ Copied data from user_id to recipient_id';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING copying data to recipient_id: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- Check if column content exists, if not add it
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'content')
BEGIN
    BEGIN TRY
        -- Add content column as nullable first
        ALTER TABLE dbo.notifications ADD content NVARCHAR(MAX) NULL;
        PRINT '   ✓ Added column: content';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding content: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column content already exists';
GO

-- Copy data from message to content if both columns exist
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'content')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'message')
BEGIN
    BEGIN TRY
        UPDATE dbo.notifications SET content = message WHERE content IS NULL;
        PRINT '   ✓ Copied data from message to content';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING copying data to content: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- Check if column type exists, if not add it
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'type')
BEGIN
    BEGIN TRY
        -- Add type column as nullable first
        ALTER TABLE dbo.notifications ADD type NVARCHAR(50) NULL;
        PRINT '   ✓ Added column: type';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding type: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column type already exists';
GO

-- Copy data from notification_type to type if both columns exist
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'type')
    AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'notification_type')
BEGIN
    BEGIN TRY
        UPDATE dbo.notifications SET type = notification_type WHERE type IS NULL;
        PRINT '   ✓ Copied data from notification_type to type';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING copying data to type: ' + ERROR_MESSAGE();
    END CATCH
END

-- Set default value for NULL rows in type column
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'type')
BEGIN
    BEGIN TRY
        UPDATE dbo.notifications SET type = 'System' WHERE type IS NULL;
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING setting default type: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- Add sent_date if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'sent_date')
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications ADD sent_date DATETIME NULL;
        PRINT '   ✓ Added column: sent_date';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding sent_date: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column sent_date already exists';
GO

-- Add is_active if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'is_active')
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications ADD is_active BIT NOT NULL DEFAULT 1;
        PRINT '   ✓ Added column: is_active';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding is_active: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column is_active already exists';
GO

-- Add created_by if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'created_by')
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications ADD created_by VARCHAR(50) NULL;
        PRINT '   ✓ Added column: created_by';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding created_by: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column created_by already exists';
GO

-- Add updated_at if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'updated_at')
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications ADD updated_at DATETIME NULL;
        PRINT '   ✓ Added column: updated_at';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding updated_at: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column updated_at already exists';
GO

-- Add updated_by if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'updated_by')
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications ADD updated_by VARCHAR(50) NULL;
        PRINT '   ✓ Added column: updated_by';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding updated_by: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column updated_by already exists';
GO

-- Add deleted_at if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'deleted_at')
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications ADD deleted_at DATETIME NULL;
        PRINT '   ✓ Added column: deleted_at';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding deleted_at: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column deleted_at already exists';
GO

-- Add deleted_by if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'deleted_by')
BEGIN
    BEGIN TRY
        ALTER TABLE dbo.notifications ADD deleted_by VARCHAR(50) NULL;
        PRINT '   ✓ Added column: deleted_by';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  WARNING adding deleted_by: ' + ERROR_MESSAGE();
        PRINT '   Script will continue...';
    END CATCH
END
ELSE
    PRINT '   ⏭️  Column deleted_by already exists';
GO

-- Add foreign key for recipient_id if not exists (only if recipient_id column exists)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'recipient_id')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Notifications_RecipientId_Users')
    BEGIN
        BEGIN TRY
            ALTER TABLE dbo.notifications
            ADD CONSTRAINT FK_Notifications_RecipientId_Users
            FOREIGN KEY (recipient_id) REFERENCES dbo.users(user_id);
            PRINT '   ✓ Added foreign key: FK_Notifications_RecipientId_Users';
        END TRY
        BEGIN CATCH
            PRINT '   ⚠️  Could not add foreign key FK_Notifications_RecipientId_Users: ' + ERROR_MESSAGE();
        END CATCH
    END
    ELSE
        PRINT '   ⏭️  Foreign key FK_Notifications_RecipientId_Users already exists';
END

-- Verify required columns exist before creating stored procedures
PRINT '';
PRINT 'Verifying required columns exist...';
DECLARE @MissingColumns NVARCHAR(MAX) = '';
DECLARE @ErrorMessage NVARCHAR(MAX);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'recipient_id')
    SET @MissingColumns = @MissingColumns + 'recipient_id, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'content')
    SET @MissingColumns = @MissingColumns + 'content, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'type')
    SET @MissingColumns = @MissingColumns + 'type, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'sent_date')
    SET @MissingColumns = @MissingColumns + 'sent_date, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'is_active')
    SET @MissingColumns = @MissingColumns + 'is_active, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'created_by')
    SET @MissingColumns = @MissingColumns + 'created_by, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'updated_at')
    SET @MissingColumns = @MissingColumns + 'updated_at, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'updated_by')
    SET @MissingColumns = @MissingColumns + 'updated_by, ';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'deleted_at')
    SET @MissingColumns = @MissingColumns + 'deleted_at, ';

IF LEN(@MissingColumns) > 0
BEGIN
    SET @MissingColumns = LEFT(@MissingColumns, LEN(@MissingColumns) - 1); -- Remove trailing comma and space
    SET @ErrorMessage = N'Required columns are missing from notifications table. Missing: ' + @MissingColumns;
    THROW 50001, @ErrorMessage, 1;
END
ELSE
    PRINT '   ✓ All required columns verified';

GO

-- ===========================================
-- 2. CREATE NOTIFICATION STORED PROCEDURES
-- ===========================================

-- 1. CREATE NOTIFICATION
IF OBJECT_ID('sp_CreateNotification', 'P') IS NOT NULL DROP PROCEDURE sp_CreateNotification;
GO
CREATE PROCEDURE sp_CreateNotification
    @NotificationId VARCHAR(50),
    @RecipientId VARCHAR(50),
    @Title NVARCHAR(200),
    @Content NVARCHAR(MAX),
    @Type NVARCHAR(50),
    @CreatedBy VARCHAR(50) = NULL,
    @SentDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @SentDate IS NULL
            SET @SentDate = GETDATE();
        
        -- Insert into new schema columns
        INSERT INTO dbo.notifications (
            notification_id,
            recipient_id,
            title,
            content,
            type,
            is_read,
            sent_date,
            is_active,
            created_at,
            created_by,
            deleted_at
        )
        VALUES (
            @NotificationId,
            @RecipientId,
            @Title,
            @Content,
            @Type,
            0,
            @SentDate,
            1,
            GETDATE(),
            @CreatedBy,
            NULL
        );
        
        SELECT @NotificationId AS notification_id;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- 2. GET NOTIFICATIONS BY USER (Updated to use recipient_id)
IF OBJECT_ID('sp_GetNotificationsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetNotificationsByUser;
GO
CREATE PROCEDURE sp_GetNotificationsByUser
    @UserId VARCHAR(50),
    @Page INT = 1,
    @PageSize INT = 50,
    @Type NVARCHAR(50) = NULL,
    @IsRead BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    -- Get total count
    DECLARE @TotalCount INT;
    SELECT @TotalCount = COUNT(*)
    FROM dbo.notifications
    WHERE recipient_id = @UserId
        AND (deleted_at IS NULL)
        AND (is_active = 1 OR is_active IS NULL)
        AND (@Type IS NULL OR type = @Type)
        AND (@IsRead IS NULL OR is_read = @IsRead);
    
    -- Get notifications
    SELECT 
        notification_id,
        recipient_id,
        title,
        content,
        type,
        is_read,
        COALESCE(sent_date, created_at) AS sent_date,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM dbo.notifications
    WHERE recipient_id = @UserId
        AND (deleted_at IS NULL)
        AND (is_active = 1 OR is_active IS NULL)
        AND (@Type IS NULL OR type = @Type)
        AND (@IsRead IS NULL OR is_read = @IsRead)
    ORDER BY created_at DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
    
    -- Return total count
    SELECT @TotalCount AS total_count;
END
GO

-- 3. GET UNREAD NOTIFICATIONS BY USER
IF OBJECT_ID('sp_GetUnreadNotificationsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetUnreadNotificationsByUser;
GO
CREATE PROCEDURE sp_GetUnreadNotificationsByUser
    @UserId VARCHAR(50),
    @Limit INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@Limit)
        notification_id,
        recipient_id,
        title,
        content,
        type,
        is_read,
        COALESCE(sent_date, created_at) AS sent_date,
        created_at
    FROM dbo.notifications
    WHERE recipient_id = @UserId
        AND is_read = 0
        AND (deleted_at IS NULL)
        AND (is_active = 1 OR is_active IS NULL)
    ORDER BY created_at DESC;
END
GO

-- 4. GET NOTIFICATION COUNT (Unread)
IF OBJECT_ID('sp_GetNotificationCount', 'P') IS NOT NULL DROP PROCEDURE sp_GetNotificationCount;
GO
CREATE PROCEDURE sp_GetNotificationCount
    @UserId VARCHAR(50),
    @IsRead BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT COUNT(*) AS count
    FROM dbo.notifications
    WHERE recipient_id = @UserId
        AND (deleted_at IS NULL)
        AND (is_active = 1 OR is_active IS NULL)
        AND (@IsRead IS NULL OR is_read = @IsRead);
END
GO

-- 5. GET NOTIFICATION BY ID
IF OBJECT_ID('sp_GetNotificationById', 'P') IS NOT NULL DROP PROCEDURE sp_GetNotificationById;
GO
CREATE PROCEDURE sp_GetNotificationById
    @NotificationId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        notification_id,
        recipient_id,
        title,
        content,
        type,
        is_read,
        COALESCE(sent_date, created_at) AS sent_date,
        created_at,
        created_by,
        updated_at,
        updated_by,
        is_active
    FROM dbo.notifications
    WHERE notification_id = @NotificationId
        AND (deleted_at IS NULL);
END
GO

-- 6. MARK NOTIFICATION AS READ
-- ✅ This is the correct version with 2 parameters (@NotificationId and @UserId)
IF OBJECT_ID('dbo.sp_MarkNotificationAsRead', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_MarkNotificationAsRead;
GO
CREATE PROCEDURE dbo.sp_MarkNotificationAsRead
    @NotificationId VARCHAR(50),
    @UserId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Update notification to mark as read
        UPDATE dbo.notifications
        SET is_read = 1,
            updated_at = GETDATE(),
            updated_by = @UserId
        WHERE notification_id = @NotificationId
            AND (deleted_at IS NULL);
        
        -- Check if any row was updated
        IF @@ROWCOUNT = 0
            THROW 50001, 'Không tìm thấy notification hoặc đã bị xóa', 1;
        
        -- Return success indicator
        SELECT 1 AS success;
    END TRY
    BEGIN CATCH
        -- Re-throw the error to be handled by the calling code
        THROW;
    END CATCH
END
GO

-- 7. MARK ALL NOTIFICATIONS AS READ
IF OBJECT_ID('sp_MarkAllNotificationsAsRead', 'P') IS NOT NULL DROP PROCEDURE sp_MarkAllNotificationsAsRead;
GO
CREATE PROCEDURE sp_MarkAllNotificationsAsRead
    @UserId VARCHAR(50),
    @UpdatedBy VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        UPDATE dbo.notifications
        SET is_read = 1,
            updated_at = GETDATE(),
            updated_by = @UpdatedBy
        WHERE recipient_id = @UserId
            AND is_read = 0
            AND (deleted_at IS NULL)
            AND (is_active = 1 OR is_active IS NULL);
        
        SELECT @@ROWCOUNT AS updated_count;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

-- 8. DELETE NOTIFICATION (Soft Delete)
IF OBJECT_ID('sp_DeleteNotification', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteNotification;
GO
CREATE PROCEDURE sp_DeleteNotification
    @NotificationId VARCHAR(50),
    @DeletedBy VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        UPDATE dbo.notifications
        SET deleted_at = GETDATE(),
            deleted_by = @DeletedBy,
            is_active = 0,
            updated_at = GETDATE()
        WHERE notification_id = @NotificationId
            AND (deleted_at IS NULL);
        
        IF @@ROWCOUNT = 0
            THROW 50001, 'Không tìm thấy notification hoặc đã bị xóa', 1;
        
        SELECT 1 AS success;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

PRINT '[OK] Notification Stored Procedures completed';
GO

