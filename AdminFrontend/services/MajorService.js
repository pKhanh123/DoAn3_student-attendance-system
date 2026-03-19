// Major Service
app.service('MajorService', ['ApiService', function(ApiService) {
    
    this.getAll = function(params) {
        return ApiService.get('/majors', { params: params });
    };

    this.getByFaculty = function(facultyId) {
        return ApiService.get('/majors/by-faculty/' + facultyId);
    };
    
    this.getById = function(id) {
        return ApiService.get('/majors/' + id);
    };
    
    this.create = function(major) {
        return ApiService.post('/majors', major);
    };
    
    this.update = function(id, major) {
        return ApiService.put('/majors/' + id, major);
    };
    
    this.delete = function(id) {
        return ApiService.delete('/majors/' + id);
    };
}]);

