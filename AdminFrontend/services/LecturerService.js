// Lecturer Service
app.service('LecturerService', ['ApiService', function(ApiService) {
    
    this.getAll = function() {
        return ApiService.get('/lecturers').then(function(response) {
            if (response.data && response.data.data) {
                response.data = response.data.data;
            }
            return response;
        });
    };
    
    this.getById = function(id) {
        return ApiService.get('/lecturers/' + id);
    };
    
    this.getByUserId = function(userId) {
        return ApiService.get('/lecturers/user/' + userId);
    };
    
    this.create = function(lecturer) {
        return ApiService.post('/lecturers', lecturer);
    };
    
    this.update = function(id, lecturer) {
        return ApiService.put('/lecturers/' + id, lecturer);
    };
    
    this.delete = function(id) {
        return ApiService.delete('/lecturers/' + id);
    };
}]);

