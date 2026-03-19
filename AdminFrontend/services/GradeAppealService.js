// @ts-check
/* global angular */
'use strict';

// Grade Appeal Service
app.service('GradeAppealService', ['ApiService', function(ApiService) {
    var CACHE_PREFIX = 'grade-appeals:';
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
     * Create a new grade appeal
     * @param {Object} appealData
     * @returns {Promise<any>}
     */
    this.create = function(appealData) {
        return ApiService.post('/grade-appeals', appealData, {
            cache: false
        }).then(function(response) {
            // Clear cache after creating
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Get all grade appeals with filters
     * @param {Object} filters
     * @param {number} page
     * @param {number} pageSize
     * @returns {Promise<{appeals: Array, totalCount: number, page: number, pageSize: number}>}
     */
    this.getAll = function(filters, page, pageSize) {
        filters = filters || {};
        page = page || 1;
        pageSize = pageSize || 20;

        var params = {
            page: page,
            pageSize: pageSize
        };

        if (filters.status) params.status = filters.status;
        if (filters.studentId) params.studentId = filters.studentId;
        if (filters.lecturerId) params.lecturerId = filters.lecturerId;
        if (filters.advisorId) params.advisorId = filters.advisorId;
        if (filters.classId) params.classId = filters.classId;

        var cacheKey = CACHE_PREFIX + JSON.stringify(params);
        return ApiService.get('/grade-appeals', params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            var data = unwrap(response, { data: [], totalCount: 0, page: 1, pageSize: 20 });
            return {
                appeals: data.data || data || [],
                totalCount: data.totalCount || 0,
                page: data.page || page,
                pageSize: data.pageSize || pageSize
            };
        });
    };

    /**
     * Get grade appeal by ID
     * @param {string} appealId
     * @returns {Promise<any>}
     */
    this.getById = function(appealId) {
        if (!appealId) {
            return Promise.reject(new Error('Appeal ID is required'));
        }

        var cacheKey = CACHE_PREFIX + 'id:' + appealId;
        return ApiService.get('/grade-appeals/' + appealId, {}, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            return unwrap(response, null);
        });
    };

    /**
     * Update lecturer response
     * @param {string} appealId
     * @param {Object} responseData
     * @returns {Promise<any>}
     */
    this.updateLecturerResponse = function(appealId, responseData) {
        if (!appealId) {
            return Promise.reject(new Error('Appeal ID is required'));
        }

        return ApiService.put('/grade-appeals/' + appealId + '/lecturer-response', responseData, {
            cache: false
        }).then(function(response) {
            // Clear cache after updating
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Update advisor decision
     * @param {string} appealId
     * @param {Object} decisionData
     * @returns {Promise<any>}
     */
    this.updateAdvisorDecision = function(appealId, decisionData) {
        if (!appealId) {
            return Promise.reject(new Error('Appeal ID is required'));
        }

        return ApiService.put('/grade-appeals/' + appealId + '/advisor-decision', decisionData, {
            cache: false
        }).then(function(response) {
            // Clear cache after updating
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Cancel grade appeal
     * @param {string} appealId
     * @param {string} cancelledBy
     * @returns {Promise<any>}
     */
    this.cancel = function(appealId, cancelledBy) {
        if (!appealId) {
            return Promise.reject(new Error('Appeal ID is required'));
        }

        return ApiService.put('/grade-appeals/' + appealId + '/cancel', {
            cancelledBy: cancelledBy
        }, {
            cache: false
        }).then(function(response) {
            // Clear cache after cancelling
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

