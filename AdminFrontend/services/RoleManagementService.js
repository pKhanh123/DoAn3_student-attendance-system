// Role Management Service
app.service('RoleManagementService', ['ApiService', function(ApiService) {
    
    // ============================================================
    // 🔹 ROLE CRUD OPERATIONS
    // ============================================================
    
    /**
     * Lấy danh sách tất cả roles
     */
    this.getAllRoles = function() {
        return ApiService.get('/roles').then(function(response) {
            if (response.data && response.data.data) {
                response.data = response.data.data;
            }
            return response;
        });
    };
    
    /**
     * Lấy chi tiết một role theo ID
     */
    this.getRoleById = function(roleId) {
        return ApiService.get('/roles/' + roleId);
    };
    
    /**
     * Tạo role mới
     */
    this.createRole = function(roleData) {
        return ApiService.post('/roles', roleData);
    };
    
    /**
     * Cập nhật role
     */
    this.updateRole = function(roleId, roleData) {
        return ApiService.put('/roles/' + roleId, roleData);
    };
    
    /**
     * Xóa role (soft delete)
     */
    this.deleteRole = function(roleId) {
        return ApiService.delete('/roles/' + roleId);
    };
    
    /**
     * Bật/tắt trạng thái role
     */
    this.toggleRoleStatus = function(roleId) {
        return ApiService.put('/roles/' + roleId + '/toggle-status');
    };
    
    // ============================================================
    // 🔹 PERMISSION MANAGEMENT
    // ============================================================
    
    /**
     * Lấy tất cả permissions trong hệ thống
     */
    this.getAllPermissions = function() {
        return ApiService.get('/role-permissions/all');
    };
    
    /**
     * Lấy danh sách permissions của một role
     */
    this.getPermissionsByRole = function(roleId) {
        return ApiService.get('/role-permissions/' + roleId);
    };
    
    /**
     * Gán permissions cho role
     */
    this.assignPermissions = function(roleId, permissionIds) {
        return ApiService.post('/role-permissions/' + roleId, permissionIds);
    };
    
    // ============================================================
    // 🔹 USER-ROLE ASSIGNMENT (sử dụng UserService)
    // ============================================================
    // Note: Việc gán role cho user đã có trong UserAdminController
    // Thông qua việc update user với RoleId mới
    
}]);

