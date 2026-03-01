// Registration Period Service
app.service('RegistrationPeriodService', ['ApiService', function(ApiService) {
    
    // ============================================================
    // 1️⃣ GET ALL
    // ============================================================
    this.getAll = function(periodType) {
        var params = {};
        if (periodType) {
            params.periodType = periodType;
        }
        return ApiService.get('/registration-periods', params);
    };
    
    // ============================================================
    // 1️⃣.1 GET RETAKE PERIODS
    // ============================================================
    this.getRetakePeriods = function() {
        return ApiService.get('/registration-periods/retake');
    };
    
    // ============================================================
    // 2️⃣ GET ACTIVE PERIOD (Admin/Advisor)
    // ============================================================
    this.getActive = function() {
        return ApiService.get('/registration-periods/active');
    };
    
    // ============================================================
    // 2️⃣.1 GET ACTIVE PERIOD FOR STUDENT
    // ============================================================
    this.getActiveForStudent = function() {
        return ApiService.get('/registration-periods/active/student');
    };
    
    // ============================================================
    // 3️⃣ GET BY ID
    // ============================================================
    this.getById = function(id) {
        return ApiService.get('/registration-periods/' + id);
    };
    
    // ============================================================
    // 4️⃣ CREATE
    // ============================================================
    this.create = function(period) {
        return ApiService.post('/registration-periods', period);
    };
    
    // ============================================================
    // 5️⃣ UPDATE
    // ============================================================
    this.update = function(id, period) {
        return ApiService.put('/registration-periods/' + id, period);
    };
    
    // ============================================================
    // 6️⃣ DELETE
    // ============================================================
    this.delete = function(id) {
        return ApiService.delete('/registration-periods/' + id);
    };
    
    // ============================================================
    // 7️⃣ OPEN PERIOD
    // ============================================================
    this.open = function(id) {
        return ApiService.post('/registration-periods/' + id + '/open');
    };
    
    // ============================================================
    // 8️⃣ CLOSE PERIOD
    // ============================================================
    this.close = function(id) {
        return ApiService.post('/registration-periods/' + id + '/close');
    };
    
    // Period Classes Management
    this.getClassesByPeriod = function(periodId) {
        return ApiService.get('/registration-periods/' + periodId + '/classes');
    };
    
    this.getAvailableClassesForPeriod = function(periodId) {
        return ApiService.get('/registration-periods/' + periodId + '/available-classes');
    };
    
    this.addClassToPeriod = function(periodId, classId) {
        return ApiService.post('/registration-periods/' + periodId + '/classes', {
            classId: classId
        });
    };
    
    this.removeClassFromPeriod = function(periodClassId) {
        return ApiService.delete('/registration-periods/classes/' + periodClassId);
    };
}]);

