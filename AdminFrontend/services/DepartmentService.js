// Department Service
app.service('DepartmentService', ['ApiService', function(ApiService) {
    
    // ============================================================
    // 🔹 Lấy danh sách tất cả bộ môn
    // ============================================================
    this.getAll = function(params) {
        return ApiService.get('/departments', { params: params });
    };
    
    // ============================================================
    // 🔹 Lấy chi tiết bộ môn theo ID
    // ============================================================
    this.getById = function(id) {
        return ApiService.get('/departments/' + id);
    };
    
    // ============================================================
    // 🔹 Lấy danh sách bộ môn theo khoa
    // ============================================================
    this.getByFaculty = function(facultyId) {
        return ApiService.get('/departments/faculty/' + facultyId);
    };
    
    // ============================================================
    // 🔹 Tạo bộ môn mới
    // ============================================================
    this.create = function(department) {
        return ApiService.post('/departments', department);
    };
    
    // ============================================================
    // 🔹 Cập nhật bộ môn
    // ============================================================
    this.update = function(id, department) {
        return ApiService.put('/departments/' + id, department);
    };
    
    // ============================================================
    // 🔹 Xóa bộ môn
    // ============================================================
    this.delete = function(id) {
        return ApiService.delete('/departments/' + id);
    };
    
    // ============================================================
    // 🔹 Thống kê số môn học theo bộ môn
    // ============================================================
    this.getSubjectStats = function() {
        return ApiService.get('/departments/stats/subjects');
    };
    
    // ============================================================
    // 🔹 Thống kê số giảng viên theo bộ môn
    // ============================================================
    this.getLecturerStats = function() {
        return ApiService.get('/departments/stats/lecturers');
    };
}]);

