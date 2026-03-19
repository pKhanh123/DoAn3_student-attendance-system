// Academic Year Service
app.service('AcademicYearService', ['ApiService', function(ApiService) {
    
    this.getAll = function() {
        return ApiService.get('/academic-years').then(function(response) {
            if (response.data && response.data.data) {
                response.data = response.data.data;
            }
            return response;
        });
    };
    
    this.getById = function(id) {
        return ApiService.get('/academic-years/' + id);
    };
    
    this.create = function(academicYear) {
        return ApiService.post('/academic-years', academicYear);
    };
    
    this.update = function(id, academicYear) {
        return ApiService.put('/academic-years/' + id, academicYear);
    };
    
    this.delete = function(id) {
        return ApiService.delete('/academic-years/' + id);
    };
}]);

