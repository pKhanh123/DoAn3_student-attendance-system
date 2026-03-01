// @ts-check
/* global angular */
'use strict';

// Advisor Service
app.service('AdvisorService', ['ApiService', function(ApiService) {
    
    /**
     * Remove Vietnamese accents from text
     * @param {string} str - Input string
     * @returns {string} - String without accents
     */
    function removeVietnameseAccents(str) {
        if (!str) return str;
        
        // Normalize Unicode characters (decompose accented characters)
        return str.normalize('NFD')
            // Remove combining diacritical marks (accents)
            .replace(/[\u0300-\u036f]/g, '')
            // Replace đ/Đ with d/D
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    }
    
    /**
     * Get dashboard statistics
     * @param {object} filters - { facultyId, majorId, classId }
     * @param {boolean} useCache - Whether to use cache (default: true)
     */
    this.getDashboardStats = function(filters, useCache) {
        filters = filters || {};
        
        var queryParams = {
            facultyId: filters.facultyId || null,
            majorId: filters.majorId || null,
            classId: filters.classId || null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        var cacheKey = 'advisor:dashboard:stats:' + JSON.stringify(queryParams);
        
        var options = {
            cache: useCache !== false,
            cacheKey: cacheKey,
            cacheTTL: 5 * 60 * 1000 // 5 minutes
        };
        
        return ApiService.get('/advisor/dashboard/stats', queryParams, options).then(function(response) {
            return response.data.data;
        });
    };
    
    /**
     * Get warning students (students with attendance or academic issues)
     * @param {object} params - { page, pageSize, facultyId, majorId, classId }
     * @param {boolean} useCache - Whether to use cache (default: false for pagination)
     */
    this.getWarningStudents = function(params, useCache) {
        params = params || {};
        
        var queryParams = {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            facultyId: params.facultyId || null,
            majorId: params.majorId || null,
            classId: params.classId || null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        var options = {
            cache: useCache !== false && false, // Don't cache paginated results by default
            cacheTTL: 2 * 60 * 1000 // 2 minutes
        };
        
        return ApiService.get('/advisor/dashboard/warning-students', queryParams, options).then(function(response) {
            return response.data;
        });
    };
    
    /**
     * Get student detail with academic summary
     * @param {string} studentId
     * @param {boolean} useCache - Whether to use cache (default: true)
     */
    this.getStudentDetail = function(studentId, useCache) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }
        
        var cacheKey = 'advisor:student:detail:' + studentId;
        var options = {
            cache: useCache !== false,
            cacheKey: cacheKey,
            cacheTTL: 5 * 60 * 1000 // 5 minutes
        };
        
        return ApiService.get('/advisor/students/' + studentId, null, options).then(function(response) {
            return response.data.data;
        });
    };
    
    /**
     * Get student grades with filters (mandatory filter validation)
     * @param {string} studentId
     * @param {object} filters - { schoolYearId, semester, subjectId } - at least one required
     * @param {boolean} useCache - Whether to use cache (default: false)
     */
    this.getStudentGrades = function(studentId, filters, useCache) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }
        
        filters = filters || {};
        
        // Validate at least one filter
        if (!filters.schoolYearId && !filters.semester && !filters.subjectId) {
            return Promise.reject(new Error('Filter is required. Please provide at least one filter (schoolYearId, semester, or subjectId)'));
        }
        
        var queryParams = {
            schoolYearId: filters.schoolYearId || null,
            semester: filters.semester || null,
            subjectId: filters.subjectId || null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        var options = {
            cache: useCache !== false && false, // Don't cache by default
            cacheTTL: 2 * 60 * 1000 // 2 minutes
        };
        
        return ApiService.get('/advisor/students/' + studentId + '/grades', queryParams, options).then(function(response) {
            return response.data;
        });
    };
    
    /**
     * Get student attendance with filters (mandatory filter validation)
     * @param {string} studentId
     * @param {object} filters - { schoolYearId, semester, subjectId } - at least one required
     * @param {boolean} useCache - Whether to use cache (default: false)
     */
    this.getStudentAttendance = function(studentId, filters, useCache) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }
        
        filters = filters || {};
        
        // Validate at least one filter
        if (!filters.schoolYearId && !filters.semester && !filters.subjectId) {
            return Promise.reject(new Error('Filter is required. Please provide at least one filter (schoolYearId, semester, or subjectId)'));
        }
        
        var queryParams = {
            schoolYearId: filters.schoolYearId || null,
            semester: filters.semester || null,
            subjectId: filters.subjectId || null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        var options = {
            cache: useCache !== false && false, // Don't cache by default
            cacheTTL: 2 * 60 * 1000 // 2 minutes
        };
        
        return ApiService.get('/advisor/students/' + studentId + '/attendance', queryParams, options).then(function(response) {
            return response.data.data;
        });
    };
    
    /**
     * Get students list with filters (mandatory filter validation)
     * @param {object} params - { page, pageSize, filters } - filters must contain at least one filter
     * @param {boolean} useCache - Whether to use cache (default: false for pagination)
     */
    this.getStudents = function(params, useCache) {
        console.log('[AdvisorService] 🔍 getStudents() - Bắt đầu');
        console.log('[AdvisorService] 📥 Params nhận được:', params);
        
        params = params || {};
        
        // Validate at least one filter (unless showAll is true)
        var filters = params.filters || {};
        var showAll = params.showAll === true || filters.showAll === true;
        var hasFilter = false;
        
        if (filters.facultyId || filters.majorId || filters.classId || filters.cohortYear || 
            filters.search || filters.warningStatus || 
            filters.gpaMin !== undefined || filters.gpaMax !== undefined ||
            filters.attendanceRateMin !== undefined || filters.attendanceRateMax !== undefined) {
            hasFilter = true;
        }
        
        console.log('[AdvisorService] 📊 Validation:', {
            showAll: showAll,
            hasFilter: hasFilter,
            filters: filters
        });
        
        if (!hasFilter && !showAll) {
            console.error('[AdvisorService] ❌ Không có filter và showAll = false');
            return Promise.reject(new Error('Filter is required. Please provide at least one filter (faculty, major, class, cohort, search, warningStatus, gpa, or attendanceRate), or set showAll=true to view all students'));
        }
        
        var queryParams = {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            facultyId: filters.facultyId || null,
            majorId: filters.majorId || null,
            classId: filters.classId || null,
            cohortYear: filters.cohortYear || null,
            search: filters.search ? removeVietnameseAccents(filters.search) : null,
            warningStatus: filters.warningStatus || null,
            gpaMin: filters.gpaMin !== undefined ? filters.gpaMin : null,
            gpaMax: filters.gpaMax !== undefined ? filters.gpaMax : null,
            attendanceRateMin: filters.attendanceRateMin !== undefined ? filters.attendanceRateMin : null,
            attendanceRateMax: filters.attendanceRateMax !== undefined ? filters.attendanceRateMax : null,
            showAll: showAll ? true : null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        console.log('[AdvisorService] 📤 Query params sau khi xử lý:', queryParams);
        console.log('[AdvisorService] 🌐 Gọi API: GET /advisor/students');
        
        var options = {
            cache: useCache !== false && false, // Don't cache paginated results by default
            cacheTTL: 2 * 60 * 1000 // 2 minutes
        };
        
        return ApiService.get('/advisor/students', queryParams, options).then(function(response) {
            console.log('[AdvisorService] ✅ API response:', response);
            console.log('[AdvisorService] 📊 Response data:', {
                hasData: !!response.data,
                dataType: typeof response.data,
                dataKeys: response.data ? Object.keys(response.data) : []
            });
            return response.data;
        }).catch(function(error) {
            console.error('[AdvisorService] ❌ API error:', error);
            console.error('[AdvisorService] ❌ Error details:', {
                message: error.message,
                data: error.data,
                status: error.status,
                statusText: error.statusText
            });
            throw error;
        });
    };
    
    /**
     * Get student GPA progress
     * @param {string} studentId - Student ID
     * @param {string} schoolYearId - Optional school year ID filter
     * @param {boolean} useCache - Whether to use cache
     */
    this.getStudentGpaProgress = function(studentId, schoolYearId, useCache) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }
        
        var queryParams = {};
        if (schoolYearId) {
            queryParams.schoolYearId = schoolYearId;
        }
        
        var cacheKey = 'advisor:student:gpa-progress:' + studentId + (schoolYearId ? ':' + schoolYearId : '');
        var options = {
            cache: useCache !== false,
            cacheKey: cacheKey,
            cacheTTL: 5 * 60 * 1000 // 5 minutes
        };
        
        return ApiService.get('/advisor/students/' + studentId + '/progress/gpa', queryParams, options).then(function(response) {
            return response.data.data;
        });
    };
    
    /**
     * Get student attendance progress
     * @param {string} studentId - Student ID
     * @param {string} schoolYearId - Optional school year ID filter
     * @param {boolean} useCache - Whether to use cache
     */
    this.getStudentAttendanceProgress = function(studentId, schoolYearId, useCache) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }
        
        var queryParams = {};
        if (schoolYearId) {
            queryParams.schoolYearId = schoolYearId;
        }
        
        var cacheKey = 'advisor:student:attendance-progress:' + studentId + (schoolYearId ? ':' + schoolYearId : '');
        var options = {
            cache: useCache !== false,
            cacheKey: cacheKey,
            cacheTTL: 5 * 60 * 1000 // 5 minutes
        };
        
        return ApiService.get('/advisor/students/' + studentId + '/progress/attendance', queryParams, options).then(function(response) {
            return response.data.data;
        });
    };
    
    /**
     * Get student trends and alerts
     * @param {string} studentId - Student ID
     * @param {boolean} useCache - Whether to use cache
     */
    this.getStudentTrends = function(studentId, useCache) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }
        
        var cacheKey = 'advisor:student:trends:' + studentId;
        var options = {
            cache: useCache !== false,
            cacheKey: cacheKey,
            cacheTTL: 5 * 60 * 1000 // 5 minutes
        };
        
        return ApiService.get('/advisor/students/' + studentId + '/progress/trends', null, options).then(function(response) {
            return response.data.data;
        });
    };
    
    /**
     * Get attendance warnings
     * @param {object} params - { page, pageSize, attendanceThreshold, filters }
     * @param {boolean} useCache - Whether to use cache
     */
    this.getAttendanceWarnings = function(params, useCache) {
        params = params || {};
        
        var queryParams = {
            page: params.page || 1,
            pageSize: params.pageSize || 100,
            attendanceThreshold: params.attendanceThreshold !== undefined ? params.attendanceThreshold : null,
            facultyId: params.filters?.facultyId || null,
            majorId: params.filters?.majorId || null,
            classId: params.filters?.classId || null,
            cohortYear: params.filters?.cohortYear || null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        var options = {
            cache: useCache !== false && false, // Don't cache by default
            cacheTTL: 2 * 60 * 1000 // 2 minutes
        };
        
        return ApiService.get('/advisor/warnings/attendance', queryParams, options).then(function(response) {
            return response.data;
        });
    };
    
    /**
     * Get academic warnings
     * @param {object} params - { page, pageSize, gpaThreshold, filters }
     * @param {boolean} useCache - Whether to use cache
     */
    this.getAcademicWarnings = function(params, useCache) {
        params = params || {};
        
        var queryParams = {
            page: params.page || 1,
            pageSize: params.pageSize || 100,
            gpaThreshold: params.gpaThreshold !== undefined ? params.gpaThreshold : null,
            facultyId: params.filters?.facultyId || null,
            majorId: params.filters?.majorId || null,
            classId: params.filters?.classId || null,
            cohortYear: params.filters?.cohortYear || null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        var options = {
            cache: useCache !== false && false, // Don't cache by default
            cacheTTL: 2 * 60 * 1000 // 2 minutes
        };
        
        return ApiService.get('/advisor/warnings/academic', queryParams, options).then(function(response) {
            return response.data;
        });
    };
    
    /**
     * Send warning email (single or bulk)
     * @param {object} params - { studentIds, warningType, customSubject, customMessage }
     */
    this.sendWarningEmail = function(params) {
        if (!params || !params.studentIds || params.studentIds.length === 0) {
            return Promise.reject(new Error('Student IDs are required'));
        }
        
        if (!params.warningType) {
            return Promise.reject(new Error('Warning type is required'));
        }
        
        var request = {
            studentIds: params.studentIds,
            warningType: params.warningType,
            customSubject: params.customSubject || null,
            customMessage: params.customMessage || null
        };
        
        return ApiService.post('/advisor/warnings/send-email', request).then(function(response) {
            return response.data;
        });
    };
    
    /**
     * Get warning configuration
     * @param {boolean} useCache - Whether to use cache
     */
    this.getWarningConfig = function(useCache) {
        var cacheKey = 'advisor:warning-config';
        var options = {
            cache: useCache !== false,
            cacheKey: cacheKey,
            cacheTTL: 10 * 60 * 1000 // 10 minutes
        };
        
        return ApiService.get('/advisor/warning-config', null, options).then(function(response) {
            return response.data.data;
        });
    };
    
    /**
     * Update warning configuration
     * @param {object} config - { attendanceThreshold, gpaThreshold, emailTemplate, emailSubject, autoSendEmails }
     */
    this.updateWarningConfig = function(config) {
        return ApiService.put('/advisor/warning-config', config).then(function(response) {
            return response.data;
        });
    };
}]);

