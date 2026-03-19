// Report Service - Thống kê & Báo cáo
app.service('ReportService', ['ApiService', function(ApiService) {
    
    /**
     * Get statistics for Admin reports
     * GET /api-edu/reports/admin
     */
    this.getAdminReports = function(filters) {
        filters = filters || {};
        var params = {
            schoolYearId: filters.schoolYearId || null,
            semester: filters.semester || null,
            facultyId: filters.facultyId || null,
            majorId: filters.majorId || null
        };
        
        // Remove null values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '') {
                delete params[key];
            }
        });
        
        return ApiService.get('/reports/admin', params);
    };
    
    /**
     * Get statistics for Advisor reports
     * GET /api-edu/reports/advisor
     */
    this.getAdvisorReports = function(filters) {
        filters = filters || {};
        var params = {
            schoolYearId: filters.schoolYearId || null,
            semester: filters.semester || null,
            facultyId: filters.facultyId || null,
            majorId: filters.majorId || null,
            classId: filters.classId || null,
            cohortYear: filters.cohortYear || null
        };
        
        // Remove null values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '') {
                delete params[key];
            }
        });
        
        return ApiService.get('/reports/advisor', params);
    };
    
    /**
     * Get statistics for Lecturer reports
     * GET /api-edu/reports/lecturer
     */
    this.getLecturerReports = function(filters) {
        filters = filters || {};
        var params = {
            schoolYearId: filters.schoolYearId || null,
            semester: filters.semester || null,
            classId: filters.classId || null
        };
        
        // Remove null values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '') {
                delete params[key];
            }
        });
        
        return ApiService.get('/reports/lecturer', params);
    };
    
    /**
     * Get statistics for Student reports
     * GET /api-edu/reports/student
     */
    this.getStudentReports = function(filters) {
        filters = filters || {};
        
        var params = {
            schoolYearId: filters.schoolYearId || null,
            semester: filters.semester || null
        };
        
        // Remove null values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '') {
                delete params[key];
            }
        });
        
        return ApiService.get('/reports/student', params);
    };
    
    /**
     * Export report to Excel
     * GET /api-edu/reports/export/:role
     */
    this.exportReport = function(role, filters) {
        filters = filters || {};
        var params = {
            schoolYearId: filters.schoolYearId || null,
            semester: filters.semester || null,
            facultyId: filters.facultyId || null,
            majorId: filters.majorId || null,
            classId: filters.classId || null,
            cohortYear: filters.cohortYear || null
        };
        
        // Remove null values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '') {
                delete params[key];
            }
        });
        
        // Build query string
        var queryString = Object.keys(params).map(function(key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }).join('&');
        
        var url = ApiService.getBaseUrl() + '/reports/export/' + role;
        if (queryString) {
            url += '?' + queryString;
        }
        
        // Open in new window to trigger download
        window.open(url, '_blank');
    };
}]);

