// Subject Prerequisite Service
app.service('SubjectPrerequisiteService', ['ApiService', function(ApiService) {
    
    // ============================================================
    // 1️⃣ GET BY SUBJECT
    // ============================================================
    this.getBySubject = function(subjectId) {
        return ApiService.get('/subject-prerequisites/by-subject/' + subjectId);
    };
    
    // ============================================================
    // 2️⃣ CHECK PREREQUISITES
    // ============================================================
    this.check = function(studentId, subjectId) {
        return ApiService.get('/subject-prerequisites/check', {
            studentId: studentId,
            subjectId: subjectId
        });
    };
    
    // ============================================================
    // 3️⃣ ADD
    // ============================================================
    this.add = function(prerequisite) {
        return ApiService.post('/subject-prerequisites', prerequisite);
    };
    
    // ============================================================
    // 4️⃣ DELETE
    // ============================================================
    this.delete = function(prerequisiteId) {
        return ApiService.delete('/subject-prerequisites/' + prerequisiteId);
    };
}]);

