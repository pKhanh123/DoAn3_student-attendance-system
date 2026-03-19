// Faculty Service
app.service('FacultyService', ['ApiService', function(ApiService) {
    
    this.getAll = function(page, pageSize, search, options) {
        options = options || {};
        var params = {
            page: page || 1,
            pageSize: pageSize || 10
        };
        
        if (search) {
            params.search = search;
        }
        
        // ✅ Add cache-busting timestamp if forceRefresh is requested
        if (options.forceRefresh) {
            params._t = new Date().getTime();
        }
        
        return ApiService.get('/faculties', { params: params }, {
            cache: !options.forceRefresh, // Disable cache if forceRefresh
            cacheTTL: options.cacheTTL || 5 * 60 * 1000 // 5 minutes default
        });
    };
    
    this.getById = function(id) {
        return ApiService.get('/faculties/' + id);
    };
    
    this.create = function(faculty) {
        return ApiService.post('/faculties', faculty);
    };
    
    this.update = function(id, faculty) {
        return ApiService.put('/faculties/' + id, faculty);
    };
    
    this.delete = function(id) {
        return ApiService.delete('/faculties/' + id);
    };
}]);

