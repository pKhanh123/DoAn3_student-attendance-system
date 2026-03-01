// Lecturer Subject Service
app.service('LecturerSubjectService', ['ApiService', function(ApiService) {
    
    // ============================================================
    // 🔹 Lấy danh sách môn học của giảng viên
    // ============================================================
    this.getSubjectsByLecturer = function(lecturerId) {
        return ApiService.get('/lecturer-subjects/lecturer/' + lecturerId);
    };
    
    // ============================================================
    // 🔹 Lấy danh sách giảng viên có thể dạy môn học
    // ============================================================
    this.getLecturersBySubject = function(subjectId) {
        return ApiService.get('/lecturer-subjects/subject/' + subjectId);
    };
    
    // ============================================================
    // 🔹 Lấy giảng viên khả dụng cho môn học (khi tạo lớp)
    // ============================================================
    this.getAvailableLecturersForSubject = function(subjectId) {
        return ApiService.get('/lecturer-subjects/available/' + subjectId);
    };
    
    // ============================================================
    // 🔹 Phân môn cho giảng viên
    // ============================================================
    this.assignSubject = function(assignment) {
        return ApiService.post('/lecturer-subjects', assignment);
    };
    
    // ============================================================
    // 🔹 Cập nhật phân môn
    // ============================================================
    this.update = function(id, assignment) {
        return ApiService.put('/lecturer-subjects/' + id, assignment);
    };
    
    // ============================================================
    // 🔹 Xóa phân môn
    // ============================================================
    this.delete = function(id) {
        return ApiService.delete('/lecturer-subjects/' + id);
    };
}]);

