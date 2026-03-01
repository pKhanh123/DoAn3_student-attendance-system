// User Service
app.service('UserService', ['ApiService', function(ApiService) {
    
    this.getAll = function() {
        return ApiService.get('/account-management').then(function(response) {
            // Xử lý response format từ backend
            if (response.data && response.data.data) {
                response.data = response.data.data;
            }
            return response;
        });
    };
    
    this.getById = function(id) {
        return ApiService.get('/account-management/' + id);
    };
    
    this.create = function(user) {
        return ApiService.post('/account-management', user);
    };
    
    this.update = function(id, user) {
        return ApiService.put('/account-management/' + id, user);
    };
    
    this.delete = function(id) {
        return ApiService.delete('/account-management/' + id);
    };
    
    this.getRoles = function() {
        return ApiService.get('/roles').then(function(response) {
            if (response.data && response.data.data) {
                response.data = response.data.data;
            }
            return response;
        });
    };
}]);

