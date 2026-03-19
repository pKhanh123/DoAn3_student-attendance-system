// Audit Log Service
app.service('AuditLogService', ['ApiService', function(ApiService) {
    
    this.getAll = function(params) {
        return ApiService.get('/audit-logs', params);
    };
    
    this.getById = function(id) {
        return ApiService.get('/audit-logs/' + id);
    };
    
    this.getByUser = function(userId, params) {
        return ApiService.get('/audit-logs/user/' + userId, params);
    };
    
    this.getByEntity = function(entityType, entityId, params) {
        return ApiService.get('/audit-logs/entity/' + entityType + '/' + entityId, params);
    };
    
    this.create = function(auditLog) {
        return ApiService.post('/audit-logs', auditLog);
    };
}]);

