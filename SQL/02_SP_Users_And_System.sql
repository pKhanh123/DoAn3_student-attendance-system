-- ===========================================
-- 02_SP_Users_And_System.sql
-- ===========================================
-- Description: Users Management, Roles, Notifications, Audit Logs, Refresh Tokens, Permissions
-- ===========================================

USE EducationManagement;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '========================================';
PRINT 'Starting: 02_SP_Users_And_System.sql';
PRINT 'Users and System Management SPs';
PRINT '========================================';
GO

IF OBJECT_ID('sp_AssignPermissionToRole', 'P') IS NOT NULL DROP PROCEDURE sp_AssignPermissionToRole;
GO
CREATE PROCEDURE sp_AssignPermissionToRole
    @RoleId VARCHAR(50),
    @PermissionId VARCHAR(50),
    @CreatedBy VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF NOT EXISTS (
        SELECT 1 FROM dbo.role_permissions 
        WHERE role_id = @RoleId AND permission_id = @PermissionId
    )
    BEGIN
        INSERT INTO dbo.role_permissions (role_id, permission_id, created_at, created_by)
        VALUES (@RoleId, @PermissionId, GETDATE(), @CreatedBy);
    END
END
GO

IF OBJECT_ID('sp_CheckUserPermission', 'P') IS NOT NULL DROP PROCEDURE sp_CheckUserPermission;
GO
CREATE PROCEDURE sp_CheckUserPermission
    @UserId VARCHAR(50),
    @PermissionCode VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    IF EXISTS (
        SELECT 1
        FROM dbo.users u
        INNER JOIN dbo.roles r ON u.role_id = r.role_id
        INNER JOIN dbo.role_permissions rp ON r.role_id = rp.role_id
        INNER JOIN dbo.permissions p ON rp.permission_id = p.permission_id
        WHERE u.user_id = @UserId
            AND p.permission_code = @PermissionCode
            AND u.is_active = 1
            AND u.deleted_at IS NULL
            AND r.is_active = 1
            AND r.deleted_at IS NULL
    )
        SELECT 1 AS HasPermission;
    ELSE
        SELECT 0 AS HasPermission;
END
GO

IF OBJECT_ID('sp_CleanExpiredRefreshTokens', 'P') IS NOT NULL DROP PROCEDURE sp_CleanExpiredRefreshTokens;
GO
CREATE PROCEDURE sp_CleanExpiredRefreshTokens
    @DaysToKeep INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @CutoffDate DATETIME = DATEADD(DAY, -@DaysToKeep, GETDATE());
        DECLARE @DeletedCount INT;
        
        BEGIN TRANSACTION;
        
        DELETE FROM dbo.refresh_tokens
        WHERE (expires_at < GETDATE() OR revoked_at IS NOT NULL)
            AND created_at < @CutoffDate;
        
        SET @DeletedCount = @@ROWCOUNT;
        
        COMMIT TRANSACTION;
        
        PRINT CONCAT('âœ… Cleaned ', @DeletedCount, ' expired/revoked refresh tokens');
        SELECT @DeletedCount AS DeletedCount;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

IF OBJECT_ID('sp_CreateAuditLog', 'P') IS NOT NULL DROP PROCEDURE sp_CreateAuditLog;
GO
CREATE PROCEDURE sp_CreateAuditLog
    @UserId VARCHAR(50) = NULL,
    @Action VARCHAR(50),
    @EntityType VARCHAR(100),
    @EntityId VARCHAR(50) = NULL,
    @OldValues NVARCHAR(MAX) = NULL,
    @NewValues NVARCHAR(MAX) = NULL,
    @IpAddress VARCHAR(50) = NULL,
    @UserAgent VARCHAR(500) = NULL
AS
BEGIN
    INSERT INTO dbo.audit_logs (user_id, action, entity_type, entity_id, 
                                 old_values, new_values, ip_address, user_agent, created_at)
    VALUES (@UserId, @Action, @EntityType, @EntityId, 
            @OldValues, @NewValues, @IpAddress, @UserAgent, GETDATE());
    
    SELECT SCOPE_IDENTITY() AS log_id;
END
GO

IF OBJECT_ID('sp_CreateUser', 'P') IS NOT NULL DROP PROCEDURE sp_CreateUser;
GO
CREATE PROCEDURE sp_CreateUser
    @UserId VARCHAR(50),
    @Username VARCHAR(50),
    @PasswordHash VARCHAR(255),
    @Email VARCHAR(150),
    @Phone VARCHAR(20) = NULL,
    @FullName NVARCHAR(150),
    @RoleId VARCHAR(50),
    @IsActive BIT = 1,
    @AvatarUrl VARCHAR(300) = NULL,
    @CreatedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validation: Check duplicate username
        IF EXISTS (SELECT 1 FROM users WHERE username = @Username AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'Username already exists: %s', 16, 1, @Username);
            RETURN;
        END
        
        -- Validation: Check duplicate email
        IF EXISTS (SELECT 1 FROM users WHERE email = @Email AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'Email already exists: %s', 16, 1, @Email);
            RETURN;
        END
        
        -- Validation: Check role exists
        IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = @RoleId AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'Role does not exist: %s', 16, 1, @RoleId);
            RETURN;
        END
        
        -- Insert
        INSERT INTO dbo.users (user_id, username, password_hash, email, phone, full_name, 
                               role_id, is_active, avatar_url, created_at, created_by)
        VALUES (@UserId, @Username, @PasswordHash, @Email, @Phone, @FullName, 
                @RoleId, @IsActive, @AvatarUrl, GETDATE(), @CreatedBy);
        
        COMMIT TRANSACTION;
        SELECT @UserId AS user_id;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

IF OBJECT_ID('sp_DeleteAllPermissionsByRole', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteAllPermissionsByRole;
GO
CREATE PROCEDURE sp_DeleteAllPermissionsByRole
    @RoleId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM dbo.role_permissions
    WHERE role_id = @RoleId;
    
    SELECT @@ROWCOUNT AS DeletedCount;
END
GO

IF OBJECT_ID('sp_DeleteUser', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteUser;
GO
CREATE PROCEDURE sp_DeleteUser
    @UserId VARCHAR(50),
    @DeletedBy VARCHAR(50) = 'system'
AS
BEGIN
    UPDATE dbo.users
    SET deleted_at = GETDATE(), deleted_by = @DeletedBy
    WHERE user_id = @UserId;
END
GO

IF OBJECT_ID('sp_GetAllAuditLogs', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllAuditLogs;
GO
CREATE PROCEDURE sp_GetAllAuditLogs
    @Page INT = 1,
    @PageSize INT = 25,
    @Search NVARCHAR(255) = NULL,
    @Action VARCHAR(50) = NULL,
    @EntityType VARCHAR(100) = NULL,
    @UserId VARCHAR(50) = NULL,
    @FromDate DATETIME = NULL,
    @ToDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    -- Tráº£ vá» TotalCount
    SELECT COUNT(*) as TotalCount
    FROM dbo.audit_logs al
    LEFT JOIN dbo.users u ON al.user_id = u.user_id
    WHERE (@Search IS NULL OR u.full_name LIKE '%' + @Search + '%' 
           OR u.username LIKE '%' + @Search + '%'
           OR al.entity_type LIKE '%' + @Search + '%'
           OR al.action LIKE '%' + @Search + '%')
        AND (@Action IS NULL OR al.action = @Action)
        AND (@EntityType IS NULL OR al.entity_type = @EntityType)
        AND (@UserId IS NULL OR al.user_id = @UserId)
        AND (@FromDate IS NULL OR al.created_at >= @FromDate)
        AND (@ToDate IS NULL OR al.created_at <= @ToDate);
    
    -- Tráº£ vá» Data vá»›i pagination
    SELECT 
        al.log_id,
        al.user_id,
        ISNULL(u.username, 'System') as user_name,
        ISNULL(u.full_name, 'System') as user_full_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM dbo.audit_logs al
    LEFT JOIN dbo.users u ON al.user_id = u.user_id
    WHERE (@Search IS NULL OR u.full_name LIKE '%' + @Search + '%' 
           OR u.username LIKE '%' + @Search + '%'
           OR al.entity_type LIKE '%' + @Search + '%'
           OR al.action LIKE '%' + @Search + '%')
        AND (@Action IS NULL OR al.action = @Action)
        AND (@EntityType IS NULL OR al.entity_type = @EntityType)
        AND (@UserId IS NULL OR al.user_id = @UserId)
        AND (@FromDate IS NULL OR al.created_at >= @FromDate)
        AND (@ToDate IS NULL OR al.created_at <= @ToDate)
    ORDER BY al.created_at DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('sp_GetAllPermissions', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllPermissions;
GO
CREATE PROCEDURE sp_GetAllPermissions
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        permission_id,
        permission_code,
        permission_name,
        description,
        parent_code,
        icon,
        sort_order,
        is_active,
        -- ✅ Thêm is_menu_only để frontend có thể filter menu-only permissions
        ISNULL(is_menu_only, 0) AS is_menu_only,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at
    FROM dbo.permissions
    WHERE deleted_at IS NULL OR deleted_at = '1900-01-01'
    ORDER BY ISNULL(sort_order, 999), permission_code;
END
GO

IF OBJECT_ID('sp_GetAllRoles', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllRoles;
GO
CREATE PROCEDURE sp_GetAllRoles
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Total count
    SELECT COUNT(*) AS TotalCount
    FROM dbo.roles
    WHERE deleted_at IS NULL;
    
    -- Data
    SELECT role_id, role_name, description, is_active, created_at, created_by, updated_at, updated_by
    FROM dbo.roles
    WHERE deleted_at IS NULL
    ORDER BY role_name;
END
GO

IF OBJECT_ID('sp_GetAllUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllUsers;
GO
CREATE PROCEDURE sp_GetAllUsers
    @Page INT = 1,
    @PageSize INT = 10,
    @Search NVARCHAR(255) = NULL,
    @RoleId VARCHAR(50) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    SELECT COUNT(*) as TotalCount
    FROM dbo.users u
    LEFT JOIN dbo.roles r ON u.role_id = r.role_id AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
        AND (@Search IS NULL OR u.username LIKE '%' + @Search + '%' 
             OR u.full_name LIKE '%' + @Search + '%' OR u.email LIKE '%' + @Search + '%')
        AND (@RoleId IS NULL OR u.role_id = @RoleId)
        AND (@IsActive IS NULL OR u.is_active = @IsActive);
    
    SELECT u.user_id, u.username, u.full_name, u.email, u.phone, u.role_id,
           ISNULL(r.role_name, 'No Role') as role_name, u.avatar_url, u.is_active,
           u.last_login_at, u.created_at, u.created_by, u.updated_at, u.updated_by
    FROM dbo.users u
    LEFT JOIN dbo.roles r ON u.role_id = r.role_id AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
        AND (@Search IS NULL OR u.username LIKE '%' + @Search + '%' 
             OR u.full_name LIKE '%' + @Search + '%' OR u.email LIKE '%' + @Search + '%')
        AND (@RoleId IS NULL OR u.role_id = @RoleId)
        AND (@IsActive IS NULL OR u.is_active = @IsActive)
    ORDER BY u.created_at DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('sp_GetAuditLogById', 'P') IS NOT NULL DROP PROCEDURE sp_GetAuditLogById;
GO
CREATE PROCEDURE sp_GetAuditLogById
    @LogId BIGINT
AS
BEGIN
    SELECT 
        al.log_id,
        al.user_id,
        ISNULL(u.username, 'System') as user_name,
        ISNULL(u.full_name, 'System') as user_full_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM dbo.audit_logs al
    LEFT JOIN dbo.users u ON al.user_id = u.user_id
    WHERE al.log_id = @LogId;
END
GO

IF OBJECT_ID('sp_GetAuditLogsByEntity', 'P') IS NOT NULL DROP PROCEDURE sp_GetAuditLogsByEntity;
GO
CREATE PROCEDURE sp_GetAuditLogsByEntity
    @EntityType VARCHAR(100),
    @EntityId VARCHAR(50),
    @Page INT = 1,
    @PageSize INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    SELECT COUNT(*) as TotalCount
    FROM dbo.audit_logs
    WHERE entity_type = @EntityType AND entity_id = @EntityId;
    
    SELECT 
        al.log_id,
        al.user_id,
        ISNULL(u.username, 'System') as user_name,
        ISNULL(u.full_name, 'System') as user_full_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM dbo.audit_logs al
    LEFT JOIN dbo.users u ON al.user_id = u.user_id
    WHERE al.entity_type = @EntityType AND al.entity_id = @EntityId
    ORDER BY al.created_at DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('sp_GetAuditLogsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetAuditLogsByUser;
GO
CREATE PROCEDURE sp_GetAuditLogsByUser
    @UserId VARCHAR(50),
    @Page INT = 1,
    @PageSize INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    SELECT COUNT(*) as TotalCount
    FROM dbo.audit_logs
    WHERE user_id = @UserId;
    
    SELECT 
        al.log_id,
        al.user_id,
        u.username as user_name,
        u.full_name as user_full_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM dbo.audit_logs al
    LEFT JOIN dbo.users u ON al.user_id = u.user_id
    WHERE al.user_id = @UserId
    ORDER BY al.created_at DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- sp_GetNotificationsByUser has been moved to 02_SP_Notifications.sql with pagination support
-- This old version is removed to avoid conflicts
-- IF OBJECT_ID('sp_GetNotificationsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetNotificationsByUser;
-- GO
-- CREATE PROCEDURE sp_GetNotificationsByUser
--     @UserId VARCHAR(50)
-- AS
-- BEGIN
--     SELECT * FROM dbo.notifications
--     WHERE user_id = @UserId
--     ORDER BY created_at DESC;
-- END
-- GO

IF OBJECT_ID('sp_GetPermissionIdsByRole', 'P') IS NOT NULL DROP PROCEDURE sp_GetPermissionIdsByRole;
GO
CREATE PROCEDURE sp_GetPermissionIdsByRole
    @RoleId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT permission_id
    FROM dbo.role_permissions
    WHERE role_id = @RoleId;
END
GO

IF OBJECT_ID('sp_GetPermissionsByRole', 'P') IS NOT NULL DROP PROCEDURE sp_GetPermissionsByRole;
GO
CREATE PROCEDURE sp_GetPermissionsByRole
    @RoleId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        p.permission_id,
        p.permission_code,
        p.permission_name,
        p.description,
        CASE WHEN rp.permission_id IS NOT NULL THEN 1 ELSE 0 END AS is_assigned
    FROM dbo.permissions p
    LEFT JOIN dbo.role_permissions rp 
        ON p.permission_id = rp.permission_id 
        AND rp.role_id = @RoleId
    ORDER BY p.permission_code;
END
GO

IF OBJECT_ID('sp_GetPermissionsByRoleName', 'P') IS NOT NULL DROP PROCEDURE sp_GetPermissionsByRoleName;
GO
CREATE PROCEDURE sp_GetPermissionsByRoleName
    @RoleName NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Join roles -> role_permissions -> permissions
    -- ✅ Updated to include ParentCode, Icon, SortOrder for menu building
    SELECT 
        p.permission_id,
        p.permission_code,
        p.permission_name,
        p.description,
        -- ✅ Trả về NULL thay vì empty string để dễ check trong C#
        p.parent_code AS parent_code,
        -- ✅ Chỉ lấy icon nếu có, không default
        p.icon AS icon,
        p.sort_order AS sort_order,
        ISNULL(p.is_active, 1) AS is_active,
        -- ✅ Thêm is_menu_only để frontend có thể filter menu-only permissions
        ISNULL(p.is_menu_only, 0) AS is_menu_only,
        p.created_at,
        p.created_by,
        p.updated_at,
        p.updated_by,
        p.deleted_at
    FROM dbo.permissions p
    INNER JOIN dbo.role_permissions rp ON p.permission_id = rp.permission_id
    INNER JOIN dbo.roles r ON rp.role_id = r.role_id
    WHERE r.role_name = @RoleName 
        AND r.deleted_at IS NULL
        AND (p.deleted_at IS NULL OR p.deleted_at = '1900-01-01')
        AND ISNULL(p.is_active, 1) = 1
    ORDER BY ISNULL(p.sort_order, 999), p.permission_code;
END
GO

IF OBJECT_ID('sp_GetRefreshTokenByToken', 'P') IS NOT NULL DROP PROCEDURE sp_GetRefreshTokenByToken;
GO
CREATE PROCEDURE sp_GetRefreshTokenByToken
    @Token VARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        SELECT 
            id,
            user_id,
            token,
            expires_at,
            created_at,
            revoked_at,
            replaced_by_token
        FROM dbo.refresh_tokens
        WHERE token = @Token;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

IF OBJECT_ID('sp_GetRoleById', 'P') IS NOT NULL DROP PROCEDURE sp_GetRoleById;
GO
CREATE PROCEDURE sp_GetRoleById
    @RoleId VARCHAR(50)
AS
BEGIN
    SELECT * FROM dbo.roles
    WHERE role_id = @RoleId AND deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetRolesWithPermissionCount', 'P') IS NOT NULL DROP PROCEDURE sp_GetRolesWithPermissionCount;
GO
CREATE PROCEDURE sp_GetRolesWithPermissionCount
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        r.role_id,
        r.role_name,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at,
        COUNT(rp.permission_id) AS permission_count
    FROM dbo.roles r
    LEFT JOIN dbo.role_permissions rp ON r.role_id = rp.role_id
    WHERE r.deleted_at IS NULL
    GROUP BY 
        r.role_id,
        r.role_name,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at
    ORDER BY r.role_name;
END
GO

IF OBJECT_ID('sp_GetUserById', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserById;
GO
CREATE PROCEDURE sp_GetUserById
    @UserId VARCHAR(50)
AS
BEGIN
    SELECT u.user_id, u.username, u.full_name, u.email, u.phone, u.role_id,
           r.role_name, u.avatar_url, u.is_active, u.last_login_at,
           u.created_at, u.created_by, u.updated_at, u.updated_by
    FROM dbo.users u
    LEFT JOIN dbo.roles r ON u.role_id = r.role_id
    WHERE u.user_id = @UserId AND u.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetUserByUsername', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByUsername;
GO
CREATE PROCEDURE sp_GetUserByUsername
    @Username VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ✅ PERFORMANCE: Normalize username in parameter (not in query) to allow index usage
    -- Username should already be normalized to lowercase in code, but ensure here
    DECLARE @NormalizedUsername VARCHAR(50) = LOWER(LTRIM(RTRIM(@Username)));
    
    -- ✅ OPTIMIZED: Direct comparison without LOWER() to use index efficiently
    SELECT u.user_id, u.username, u.password_hash, u.full_name, u.email, 
           u.phone, u.role_id, r.role_name, u.avatar_url, u.is_active, u.last_login_at
    FROM dbo.users u
    LEFT JOIN dbo.roles r ON u.role_id = r.role_id
    WHERE u.username = @NormalizedUsername AND u.deleted_at IS NULL;
END
GO

IF OBJECT_ID('sp_GetUserPermissions', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserPermissions;
GO
CREATE PROCEDURE sp_GetUserPermissions
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT DISTINCT
        p.permission_id,
        p.permission_code,
        p.permission_name,
        p.description
    FROM dbo.users u
    INNER JOIN dbo.roles r ON u.role_id = r.role_id
    INNER JOIN dbo.role_permissions rp ON r.role_id = rp.role_id
    INNER JOIN dbo.permissions p ON rp.permission_id = p.permission_id
    WHERE u.user_id = @UserId
        AND u.is_active = 1
        AND u.deleted_at IS NULL
        AND r.is_active = 1
        AND r.deleted_at IS NULL
    ORDER BY p.permission_code;
END
GO

-- NOTE: sp_MarkNotificationAsRead is now defined in 02_SP_Notifications.sql
-- with proper signature (2 parameters: @NotificationId and @UserId)
-- This old version is removed to avoid conflicts
/*
IF OBJECT_ID('sp_MarkNotificationAsRead', 'P') IS NOT NULL DROP PROCEDURE sp_MarkNotificationAsRead;
GO
CREATE PROCEDURE sp_MarkNotificationAsRead
    @NotificationId VARCHAR(50)
AS
BEGIN
    UPDATE dbo.notifications
    SET is_read = 1
    WHERE notification_id = @NotificationId;
END
GO
*/

IF OBJECT_ID('sp_RemovePermissionFromRole', 'P') IS NOT NULL DROP PROCEDURE sp_RemovePermissionFromRole;
GO
CREATE PROCEDURE sp_RemovePermissionFromRole
    @RoleId VARCHAR(50),
    @PermissionId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM dbo.role_permissions
    WHERE role_id = @RoleId AND permission_id = @PermissionId;
END
GO

IF OBJECT_ID('sp_RevokeAllUserTokens', 'P') IS NOT NULL DROP PROCEDURE sp_RevokeAllUserTokens;
GO
CREATE PROCEDURE sp_RevokeAllUserTokens
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        UPDATE dbo.refresh_tokens
        SET revoked_at = GETDATE()
        WHERE user_id = @UserId
            AND revoked_at IS NULL;
        
        DECLARE @RevokedCount INT = @@ROWCOUNT;
        
        COMMIT TRANSACTION;
        
        SELECT @RevokedCount AS RevokedCount;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

IF OBJECT_ID('sp_RevokeRefreshToken', 'P') IS NOT NULL DROP PROCEDURE sp_RevokeRefreshToken;
GO
CREATE PROCEDURE sp_RevokeRefreshToken
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE dbo.refresh_tokens
        SET revoked_at = GETDATE()
        WHERE id = @Id;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

IF OBJECT_ID('sp_SaveRefreshToken', 'P') IS NOT NULL DROP PROCEDURE sp_SaveRefreshToken;
GO
CREATE PROCEDURE sp_SaveRefreshToken
    @Id UNIQUEIDENTIFIER,
    @UserId VARCHAR(50),
    @Token VARCHAR(500),
    @ExpiresAt DATETIME,
    @CreatedAt DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Check if user exists
        IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE user_id = @UserId AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'User does not exist: %s', 16, 1, @UserId);
            RETURN;
        END
        
        -- Insert new refresh token
        INSERT INTO dbo.refresh_tokens (id, user_id, token, expires_at, created_at)
        VALUES (@Id, @UserId, @Token, @ExpiresAt, @CreatedAt);
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

IF OBJECT_ID('sp_ToggleUserStatus', 'P') IS NOT NULL DROP PROCEDURE sp_ToggleUserStatus;
GO
CREATE PROCEDURE sp_ToggleUserStatus
    @UserId VARCHAR(50),
    @UpdatedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewStatus BIT;
    
    -- Get current status and toggle
    SELECT @NewStatus = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
    FROM dbo.users
    WHERE user_id = @UserId AND deleted_at IS NULL;
    
    IF @NewStatus IS NULL
    BEGIN
        RAISERROR(N'User does not exist: %s', 16, 1, @UserId);
        RETURN;
    END
    
    -- Update status
    UPDATE dbo.users
    SET is_active = @NewStatus,
        updated_at = GETDATE(),
        updated_by = @UpdatedBy
    WHERE user_id = @UserId;
    
    -- Return new status
    SELECT @NewStatus AS is_active;
END
GO

IF OBJECT_ID('sp_UpdateLastLogin', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateLastLogin;
GO
CREATE PROCEDURE sp_UpdateLastLogin
    @UserId VARCHAR(50)
AS
BEGIN
    UPDATE dbo.users
    SET last_login_at = GETDATE()
    WHERE user_id = @UserId;
END
GO

IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser;
GO
CREATE PROCEDURE sp_UpdateUser
    @UserId VARCHAR(50),
    @FullName NVARCHAR(150),
    @Email VARCHAR(150),
    @Phone VARCHAR(20) = NULL,
    @RoleId VARCHAR(50),
    @IsActive BIT,
    @AvatarUrl VARCHAR(300) = NULL,
    @UpdatedBy VARCHAR(50) = 'system'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validation: Check user exists
        IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = @UserId AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'User does not exist: %s', 16, 1, @UserId);
            RETURN;
        END
        
        -- Validation: Check duplicate email (except current user)
        IF EXISTS (SELECT 1 FROM users WHERE email = @Email AND user_id != @UserId AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'Email Ä‘Ă£ Ä‘Æ°á»£c sá»­ dá»¥ng bá»Ÿi user khĂ¡c: %s', 16, 1, @Email);
            RETURN;
        END
        
        -- Validation: Check role exists
        IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = @RoleId AND deleted_at IS NULL)
        BEGIN
            RAISERROR(N'Role does not exist: %s', 16, 1, @RoleId);
            RETURN;
        END
        
        -- Update
        UPDATE dbo.users
        SET full_name = @FullName, email = @Email, phone = @Phone, role_id = @RoleId,
            is_active = @IsActive, avatar_url = ISNULL(@AvatarUrl, avatar_url),
            updated_at = GETDATE(), updated_by = @UpdatedBy
        WHERE user_id = @UserId AND deleted_at IS NULL;
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT '========================================';
PRINT '[OK] Users and System Management SPs completed';
PRINT '========================================';
GO