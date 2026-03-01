// @ts-check
/* global angular */
'use strict';

// Grade Service
app.service('GradeService', ['ApiService', function(ApiService) {
    var CACHE_PREFIX = 'grades:';
    var SUMMARY_CACHE_PREFIX = 'grades-summary:';
    var CUMULATIVE_CACHE_PREFIX = 'grades-cumulative:';
    var TRANSCRIPT_CACHE_PREFIX = 'grades-transcript:';
    var DEFAULT_CACHE_TTL = 60 * 1000; // 60 seconds

    /**
     * Normalise API responses to return the actual payload.
     * @param {any} response
     * @param {any} fallback
     * @returns {any}
     */
    function unwrap(response, fallback) {
        if (!response) {
            return fallback;
        }
        if (response.data && typeof response.data === 'object' && response.data.data !== undefined) {
            return response.data.data;
        }
        if (response.data !== undefined) {
            return response.data;
        }
        return response || fallback;
    }

    /**
     * Compute cache options for the ApiService.
     * @param {string} prefix
     * @param {string} studentId
     * @param {string|null} schoolYearId
     * @param {string|null} semester
     * @param {GradeRequestOptions=} requestOptions
     */
    function buildCacheOptions(prefix, studentId, schoolYearId, semester, requestOptions) {
        var parts = [prefix, studentId];
        if (typeof schoolYearId === 'string') {
            parts.push(schoolYearId);
        } else if (schoolYearId === null) {
            parts.push('all-years');
        }
        if (typeof semester === 'string') {
            parts.push(semester);
        } else if (semester === null) {
            parts.push('all-semesters');
        }
        var cacheKey = parts.join(':');

        if (requestOptions && requestOptions.forceRefresh) {
            ApiService.clearCache(cacheKey);
        }

        return {
            cache: !(requestOptions && requestOptions.forceRefresh),
            cacheKey: cacheKey,
            cacheTTL: (requestOptions && requestOptions.cacheTTL) || DEFAULT_CACHE_TTL
        };
    }

    /**
     * Fetch grades for a student in a specific school year/semester.
     * @param {string} studentId
     * @param {string} schoolYearId
     * @param {string|null} semester
     * @param {GradeRequestOptions=} requestOptions
     * @returns {Promise<any[]>}
     */
    this.getByStudentSchoolYear = function(studentId, schoolYearId, semester, requestOptions) {
        var params = {};
        if (semester) {
            params.semester = semester;
        }
        var options = buildCacheOptions(CACHE_PREFIX, studentId, schoolYearId, semester || null, requestOptions);
        var url = '/grades/student/' + studentId + '/school-year/' + schoolYearId;
        
        return ApiService.get(url, params, options)
            .then(function(response) {
                var grades = unwrap(response, []);
                return Array.isArray(grades) ? grades : [];
            })
            .catch(function(error) {
                throw error;
            });
    };

    /**
     * Fetch grade summary for a given student/year/semester combination.
     * @param {string} studentId
     * @param {string|null} schoolYearId
     * @param {string|null} semester
     * @param {GradeRequestOptions=} requestOptions
     * @returns {Promise<any>}
     */
    this.getGradeSummary = function(studentId, schoolYearId, semester, requestOptions) {
        var params = {};
        if (schoolYearId) {
            params.schoolYearId = schoolYearId;
        }
        if (semester) {
            params.semester = semester;
        }
        var options = buildCacheOptions(SUMMARY_CACHE_PREFIX, studentId, schoolYearId || null, semester || null, requestOptions);
        var url = '/grades/student/' + studentId + '/summary';
        
        return ApiService.get(url, params, options)
            .then(function(response) {
                return unwrap(response, {});
            })
            .catch(function(error) {
                throw error;
            });
    };

    /**
     * Fetch cumulative GPA across all school years for a student.
     * @param {string} studentId
     * @param {GradeRequestOptions=} requestOptions
     * @returns {Promise<any>}
     */
    this.getCumulativeGPA = function(studentId, requestOptions) {
        var options = buildCacheOptions(CUMULATIVE_CACHE_PREFIX, studentId, null, null, requestOptions);
        return ApiService.get('/grades/student/' + studentId + '/cumulative', {}, options)
            .then(function(response) {
                return unwrap(response, {});
            });
    };

    /**
     * Fetch transcript for a student.
     * @param {string} studentId
     * @param {GradeRequestOptions=} requestOptions
     * @returns {Promise<any[]>}
     */
    this.getTranscript = function(studentId, requestOptions) {
        var options = buildCacheOptions(TRANSCRIPT_CACHE_PREFIX, studentId, null, null, requestOptions);
        return ApiService.get('/grades/student/' + studentId + '/transcript', {}, options)
            .then(function(response) {
                var transcript = unwrap(response, []);
                return Array.isArray(transcript) ? transcript : [];
            });
    };

    /**
     * Trigger GPA recalculation for a student & invalidate caches.
     * @param {string} studentId
     * @param {string} schoolYearId
     * @param {string|null} semester
     * @returns {Promise<any>}
     */
    this.calculateGPA = function(studentId, schoolYearId, semester) {
        var endpoint = '/grades/calculate/student/' + studentId + '/school-year/' + schoolYearId;
        if (semester) {
            endpoint += '?semester=' + encodeURIComponent(semester);
        }

        return ApiService.post(endpoint, {}, {
            invalidateCache: [
                CACHE_PREFIX + studentId + '*',
                SUMMARY_CACHE_PREFIX + studentId + '*',
                CUMULATIVE_CACHE_PREFIX + studentId + '*',
                TRANSCRIPT_CACHE_PREFIX + studentId + '*'
            ]
        });
    };

    /**
     * Create a new grade for a student
     * @param {Object} gradeData - { studentId, classId, gradeType, score, maxScore, weight, notes, gradedBy }
     * @returns {Promise<any>}
     */
    this.create = function(gradeData) {
        return ApiService.post('/grades', gradeData, {
            cache: false
        }).then(function(response) {
            // Clear cache after creating
            ApiService.clearCache(CACHE_PREFIX + gradeData.studentId + '*');
            ApiService.clearCache(SUMMARY_CACHE_PREFIX + gradeData.studentId + '*');
            ApiService.clearCache(CUMULATIVE_CACHE_PREFIX + gradeData.studentId + '*');
            ApiService.clearCache(TRANSCRIPT_CACHE_PREFIX + gradeData.studentId + '*');
            
            // unwrap trả về response.data hoặc response.data.data
            // Backend trả về { message: "..." } hoặc { data: { gradeId: "..." } }
            var unwrapped = unwrap(response, null);
            
            // Luôn trả về object để đảm bảo không phải null
            return unwrapped || { message: 'Tạo điểm thành công', success: true };
        });
    };

    /**
     * Update an existing grade
     * @param {string} gradeId
     * @param {Object} gradeData - { gradeType, score, maxScore, weight, notes, updatedBy }
     * @returns {Promise<any>}
     */
    this.update = function(gradeId, gradeData) {
        if (!gradeId) {
            return Promise.reject(new Error('Grade ID is required'));
        }
        
        return ApiService.put('/grades/' + gradeId, gradeData, {
            cache: false
        }).then(function(response) {
            // Clear cache after updating
            // Note: We don't have studentId in update request, so clear all grade caches
            ApiService.clearCache(CACHE_PREFIX);
            ApiService.clearCache(SUMMARY_CACHE_PREFIX);
            ApiService.clearCache(CUMULATIVE_CACHE_PREFIX);
            ApiService.clearCache(TRANSCRIPT_CACHE_PREFIX);
            
            // unwrap trả về response.data hoặc response.data.data
            // Backend trả về { message: "Cập nhật điểm thành công" }
            // nên unwrap sẽ trả về { message: "..." } hoặc null
            var unwrapped = unwrap(response, null);
            
            // Luôn trả về object để đảm bảo không phải null
            return unwrapped || { message: 'Cập nhật điểm thành công', success: true };
        });
    };

    /**
     * Get grades by class
     * @param {string} classId
     * @param {GradeRequestOptions=} requestOptions
     * @returns {Promise<any[]>}
     */
    this.getByClass = function(classId, requestOptions) {
        return ApiService.get('/grades/class/' + classId, {}, {
            cache: !(requestOptions && requestOptions.forceRefresh),
            cacheTTL: (requestOptions && requestOptions.cacheTTL) || DEFAULT_CACHE_TTL
        }).then(function(response) {
            var grades = unwrap(response, []);
            return Array.isArray(grades) ? grades : [];
        });
    };

    /**
     * Get all grades for a student
     * @param {string} studentId
     * @param {GradeRequestOptions=} requestOptions
     * @returns {Promise<any[]>}
     */
    this.getByStudent = function(studentId, requestOptions) {
        var options = buildCacheOptions(CACHE_PREFIX, studentId, null, null, requestOptions);
        return ApiService.get('/grades/student/' + studentId, {}, options)
            .then(function(response) {
                var grades = unwrap(response, []);
                return Array.isArray(grades) ? grades : [];
            });
    };

    /**
     * Allow manual cache invalidation from controllers.
     * @param {string} pattern
     */
    this.invalidateCache = function(pattern) {
        ApiService.clearCache(pattern);
    };

    /**
     * @typedef {{cacheTTL?: number, forceRefresh?: boolean}} GradeRequestOptions
     */
}]);