// @ts-check
/* global angular */
'use strict';

// Retake Service
app.service('RetakeService', ['ApiService', function(ApiService) {
    var CACHE_PREFIX = 'retakes:';
    var DEFAULT_CACHE_TTL = 30 * 1000; // 30 seconds

    /**
     * Normalise API responses
     */
    function unwrap(response, fallback) {
        if (!response) return fallback;
        if (response.data && typeof response.data === 'object' && response.data.data !== undefined) {
            return response.data.data;
        }
        if (response.data !== undefined) {
            return response.data;
        }
        return response || fallback;
    }

    /**
     * Create a new retake record
     * @param {Object} retakeData
     * @returns {Promise<any>}
     */
    this.create = function(retakeData) {
        return ApiService.post('/retakes', retakeData, {
            cache: false
        }).then(function(response) {
            // Clear cache after creating
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Get retake records by student ID
     * @param {string} studentId
     * @param {string} status - Optional filter by status
     * @param {number} page
     * @param {number} pageSize
     * @returns {Promise<{records: Array, totalCount: number, page: number, pageSize: number}>}
     */
    this.getByStudent = function(studentId, status, page, pageSize) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }

        page = page || 1;
        pageSize = pageSize || 50;

        var params = {
            page: page,
            pageSize: pageSize
        };

        if (status) params.status = status;

        var cacheKey = CACHE_PREFIX + 'student:' + studentId + ':' + JSON.stringify(params);
        return ApiService.get('/retakes/student/' + studentId, params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            var data = unwrap(response, { data: [], pagination: { totalCount: 0, page: 1, pageSize: 50 } });
            return {
                records: data.data || data || [],
                totalCount: data.pagination ? data.pagination.totalCount : 0,
                page: data.pagination ? data.pagination.page : page,
                pageSize: data.pagination ? data.pagination.pageSize : pageSize,
                totalPages: data.pagination ? data.pagination.totalPages : 0
            };
        });
    };

    /**
     * Get retake records by class ID
     * @param {string} classId
     * @param {string} status - Optional filter by status
     * @param {number} page
     * @param {number} pageSize
     * @returns {Promise<{records: Array, totalCount: number, page: number, pageSize: number}>}
     */
    this.getByClass = function(classId, status, page, pageSize) {
        if (!classId) {
            return Promise.reject(new Error('Class ID is required'));
        }

        page = page || 1;
        pageSize = pageSize || 50;

        var params = {
            page: page,
            pageSize: pageSize
        };

        if (status) params.status = status;

        var cacheKey = CACHE_PREFIX + 'class:' + classId + ':' + JSON.stringify(params);
        return ApiService.get('/retakes/class/' + classId, params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            var data = unwrap(response, { data: [], pagination: { totalCount: 0, page: 1, pageSize: 50 } });
            return {
                records: data.data || data || [],
                totalCount: data.pagination ? data.pagination.totalCount : 0,
                page: data.pagination ? data.pagination.page : page,
                pageSize: data.pagination ? data.pagination.pageSize : pageSize,
                totalPages: data.pagination ? data.pagination.totalPages : 0
            };
        });
    };

    /**
     * Get retake record by ID
     * @param {string} retakeId
     * @returns {Promise<any>}
     */
    this.getById = function(retakeId) {
        if (!retakeId) {
            return Promise.reject(new Error('Retake ID is required'));
        }

        var cacheKey = CACHE_PREFIX + 'id:' + retakeId;
        return ApiService.get('/retakes/' + retakeId, {}, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            return unwrap(response, null);
        });
    };

    /**
     * Update retake status (approve/reject)
     * @param {string} retakeId
     * @param {Object} updateData - {status, advisorNotes}
     * @returns {Promise<any>}
     */
    this.updateStatus = function(retakeId, updateData) {
        if (!retakeId) {
            return Promise.reject(new Error('Retake ID is required'));
        }

        return ApiService.put('/retakes/' + retakeId + '/status', updateData, {
            cache: false
        }).then(function(response) {
            // Clear cache after updating
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Get all retake records with filters
     * @param {Object} filters - {studentId, classId, status}
     * @param {number} page
     * @param {number} pageSize
     * @returns {Promise<{records: Array, totalCount: number}>}
     */
    this.getAll = function(filters, page, pageSize) {
        filters = filters || {};
        page = page || 1;
        pageSize = pageSize || 50;

        var params = {
            page: page,
            pageSize: pageSize
        };

        if (filters.studentId) params.studentId = filters.studentId;
        if (filters.classId) params.classId = filters.classId;
        if (filters.status) params.status = filters.status;

        var cacheKey = CACHE_PREFIX + 'all:' + JSON.stringify(params);
        return ApiService.get('/retakes', params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            var data = unwrap(response, { data: [], pagination: { totalCount: 0 } });
            return {
                records: data.data || data || [],
                totalCount: data.pagination ? data.pagination.totalCount : 0,
                page: data.pagination ? data.pagination.page : page,
                pageSize: data.pagination ? data.pagination.pageSize : pageSize,
                totalPages: data.pagination ? data.pagination.totalPages : 0
            };
        }).catch(function(error) {
            console.error('[RETAKE SERVICE ERROR] getAll() failed:', error);
            throw error; // Re-throw để controller có thể xử lý
        });
    };

    /**
     * Get failed subjects by student ID
     * @param {string} studentId
     * @param {string} schoolYearId - Optional filter by school year
     * @param {number} semester - Optional filter by semester
     * @returns {Promise<Array>}
     */
    this.getFailedSubjects = function(studentId, schoolYearId, semester) {
        if (!studentId) {
            return Promise.reject(new Error('Student ID is required'));
        }

        var params = {};
        if (schoolYearId) params.schoolYearId = schoolYearId;
        if (semester) params.semester = semester;

        var cacheKey = CACHE_PREFIX + 'failed-subjects:' + studentId + ':' + JSON.stringify(params);
        return ApiService.get('/retakes/student/' + studentId + '/failed-subjects', params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            var data = unwrap(response, { data: [], totalCount: 0 });
            return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        });
    };

    /**
     * Get retake classes for a subject
     * @param {string} subjectId
     * @param {string} studentId - Optional: to check if student already registered
     * @param {string} periodId - Optional: specific period, otherwise uses active retake period
     * @returns {Promise<Array>}
     */
    this.getRetakeClassesForSubject = function(subjectId, studentId, periodId) {
        if (!subjectId) {
            return Promise.reject(new Error('Subject ID is required'));
        }

        var params = {};
        if (studentId) params.studentId = studentId;
        if (periodId) params.periodId = periodId;

        var cacheKey = CACHE_PREFIX + 'retake-classes:' + subjectId + ':' + JSON.stringify(params);
        return ApiService.get('/retakes/subject/' + subjectId + '/retake-classes', params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            var data = unwrap(response, { data: [], totalCount: 0 });
            return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        });
    };

    /**
     * Register for retake class
     * @param {Object} registerData - {studentId, classId, notes}
     * @returns {Promise<any>}
     */
    this.registerForRetakeClass = function(registerData) {
        if (!registerData || !registerData.studentId || !registerData.classId) {
            return Promise.reject(new Error('Student ID and Class ID are required'));
        }

        return ApiService.post('/retakes/register', registerData, {
            cache: false
        }).then(function(response) {
            // Clear cache after registering
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Clear all cache
     */
    this.clearCache = function() {
        ApiService.clearCache(CACHE_PREFIX);
    };
}]);

