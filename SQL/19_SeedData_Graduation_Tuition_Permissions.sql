USE EducationManagement;
GO

PRINT '========================================';
PRINT 'Seed Data: Graduation & Tuition Permissions';
PRINT '========================================';

-- Permissions
MERGE dbo.permissions AS target
USING (VALUES
    ('PERM_GRAD_001', 'ADMIN_GRADUATION', N'Quản lý tốt nghiệp', N'Quản lý yêu cầu và hồ sơ tốt nghiệp', NULL, NULL, 1, 1, 0),
    ('PERM_GRAD_002', 'ADVISOR_GRADUATION', N'Tư vấn tốt nghiệp', N'Tư vấn và hỗ trợ sinh viên về tốt nghiệp', NULL, NULL, 2, 1, 0),
    ('PERM_GRAD_003', 'STUDENT_GRADUATION', N'Xem thông tin tốt nghiệp', N'Xem thông tin và yêu cầu tốt nghiệp của bản thân', NULL, NULL, 3, 1, 0),
    ('PERM_TUIT_001', 'ADMIN_TUITION', N'Quản lý học phí', N'Quản lý cấu hình và hóa đơn học phí', NULL, NULL, 1, 1, 0),
    ('PERM_TUIT_002', 'STUDENT_TUITION', N'Xem học phí', N'Xem thông tin học phí và thanh toán', NULL, NULL, 2, 1, 0)
) AS src(permission_id, permission_code, permission_name, description, parent_code, icon, sort_order, is_active, is_menu_only)
ON target.permission_id = src.permission_id
WHEN MATCHED THEN
    UPDATE SET permission_code = src.permission_code,
               permission_name = src.permission_name,
               description = src.description,
               is_active = src.is_active
WHEN NOT MATCHED THEN
    INSERT (permission_id, permission_code, permission_name, description, parent_code, icon, sort_order, is_active, is_menu_only, created_by)
    VALUES (src.permission_id, src.permission_code, src.permission_name, src.description, src.parent_code, src.icon, src.sort_order, src.is_active, src.is_menu_only, 'seed');
GO

-- Role Permissions (Admin gets all)
MERGE dbo.role_permissions AS target
USING (VALUES
    ('ROLE_ADMIN', 'PERM_GRAD_001'),
    ('ROLE_ADMIN', 'PERM_GRAD_002'),
    ('ROLE_ADMIN', 'PERM_GRAD_003'),
    ('ROLE_ADMIN', 'PERM_TUIT_001'),
    ('ROLE_ADMIN', 'PERM_TUIT_002')
) AS src(role_id, permission_id)
ON target.role_id = src.role_id AND target.permission_id = src.permission_id
WHEN NOT MATCHED THEN
    INSERT (role_id, permission_id, created_by)
    VALUES (src.role_id, src.permission_id, 'seed');
GO

PRINT 'Graduation & Tuition permissions completed';
GO
