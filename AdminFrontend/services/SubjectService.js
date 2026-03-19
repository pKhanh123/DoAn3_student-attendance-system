// Subject Service
app.service('SubjectService', ['ApiService', function(ApiService) {
    
    // Get all subjects (unwrap { data } format if present)
    this.getAll = function(params) {
        return ApiService.get('/subjects', { params: params }).then(function(response) {
            // Response structure: { success: true, data: [...], totalCount, page, pageSize, totalPages }
            return response;
        });
    };
    
    this.getById = function(id) {
        return ApiService.get('/subjects/' + id);
    };
    
    // Get subjects by department
    this.getByDepartment = function(departmentId) {
        return ApiService.get('/subjects/by-department/' + departmentId).then(function(response) {
            if (response.data && response.data.data) {
                response.data = response.data.data;
            }
            return response;
        });
    };
    
    this.create = function(subject) {
        return ApiService.post('/subjects', subject);
    };
    
    this.update = function(id, subject) {
        return ApiService.put('/subjects/' + id, subject);
    };
    
    this.delete = function(id) {
        return ApiService.delete('/subjects/' + id);
    };
    
    // Get lecturers teaching this subject
    this.getLecturersBySubject = function(subjectId) {
        return ApiService.get('/lecturer-subjects/subject/' + subjectId);
    };

    // NEW: Get all subjects with lecturer count (aggregate)
    this.getAllWithLecturerCount = function() {
        return ApiService.get('/subjects/with-lecturer-count');
    };
}]);

