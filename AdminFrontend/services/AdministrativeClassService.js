// Administrative Class Service
app.service('AdministrativeClassService', ['ApiService', function(ApiService) {
    
    // ============================================================
    // 1️⃣ GET ALL (with pagination & filters)
    // ============================================================
    this.getAll = function(page, pageSize, search, majorId, cohortYear, advisorId) {
        const params = {
            page: page || 1,
            pageSize: pageSize || 10
        };
        
        if (search) params.search = search;
        if (majorId) params.majorId = majorId;
        if (cohortYear) params.cohortYear = cohortYear;
        if (advisorId) params.advisorId = advisorId;
        
        return ApiService.get('/admin-classes', params);
    };
    
    // ============================================================
    // 2️⃣ GET BY ID
    // ============================================================
    this.getById = function(id) {
        return ApiService.get('/admin-classes/' + id);
    };
    
    // ============================================================
    // 3️⃣ GET STUDENTS BY CLASS
    // ============================================================
    this.getStudents = function(classId) {
        return ApiService.get('/admin-classes/' + classId + '/students');
    };
    
    // ============================================================
    // 4️⃣ GET CLASS REPORT
    // ============================================================
    this.getReport = function(classId, semester, academicYearId) {
        const params = {};
        if (semester) params.semester = semester;
        if (academicYearId) params.academicYearId = academicYearId;
        
        return ApiService.get('/admin-classes/' + classId + '/report', params);
    };
    
    // ============================================================
    // 5️⃣ CREATE
    // ============================================================
    this.create = function(adminClass) {
        return ApiService.post('/admin-classes', adminClass);
    };
    
    // ============================================================
    // 6️⃣ UPDATE
    // ============================================================
    this.update = function(id, adminClass) {
        return ApiService.put('/admin-classes/' + id, adminClass);
    };
    
    // ============================================================
    // 7️⃣ DELETE
    // ============================================================
    this.delete = function(id) {
        return ApiService.delete('/admin-classes/' + id);
    };
    
    // ============================================================
    // 8️⃣ ASSIGN STUDENTS
    // ============================================================
    this.assignStudents = function(classId, studentIds) {
        return ApiService.post('/admin-classes/' + classId + '/assign-students', {
            studentIds: studentIds
        });
    };
    
    // ============================================================
    // 9️⃣ REMOVE STUDENT
    // ============================================================
    this.removeStudent = function(classId, studentId) {
        return ApiService.delete('/admin-classes/' + classId + '/students/' + studentId);
    };
    
    // ============================================================
    // 🔟 TRANSFER STUDENT TO CLASS
    // ============================================================
    this.transferStudent = function(toClassId, studentId, transferReason) {
        return ApiService.post('/admin-classes/' + toClassId + '/transfer-student', {
            studentId: studentId,
            transferReason: transferReason
        });
    };
}]);

