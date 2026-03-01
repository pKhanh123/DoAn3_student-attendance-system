// Room Service
app.service('RoomService', ['ApiService', function(ApiService) {
    
    this.getAll = function(page, pageSize, search, isActive, forceRefresh) {
        var params = {
            page: page || 1,
            pageSize: pageSize || 10
        };
        if (search) params.search = search;
        if (isActive !== null && isActive !== undefined) params.isActive = isActive;
        
        // Add timestamp to force refresh if needed
        if (forceRefresh) {
            params._t = Date.now();
        }
        
        var options = {
            cache: !forceRefresh, // Disable cache if forceRefresh is true
            cacheKey: '/rooms?' + JSON.stringify(params)
        };
        
        return ApiService.get('/rooms', params, options).then(function(response) {
            // ✅ Backend trả về: { success: true, data: [...], totalCount, page, pageSize, totalPages }
            // Giữ nguyên response.data để controller xử lý
            return response;
        });
    };
    
    this.getById = function(id) {
        return ApiService.get('/rooms/' + id);
    };
    
    this.search = function(search, isActive) {
        var params = {};
        if (search) params.search = search;
        if (isActive !== null && isActive !== undefined) params.isActive = isActive;
        
        return ApiService.get('/rooms/search', params);
    };
    
    this.create = function(room) {
        return ApiService.post('/rooms', room, {
            invalidateCache: '/rooms*' // Invalidate all rooms cache
        });
    };
    
    this.update = function(id, room) {
        return ApiService.put('/rooms/' + id, room, {
            invalidateCache: '/rooms*' // Invalidate all rooms cache
        });
    };
    
    this.delete = function(id) {
        return ApiService.delete('/rooms/' + id, null, {
            invalidateCache: '/rooms*' // Invalidate all rooms cache
        });
    };
}]);

