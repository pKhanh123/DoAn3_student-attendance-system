// @ts-check
/* global angular */
'use strict';

// Grade Formula Config Service
app.service('GradeFormulaConfigService', ['ApiService', function(ApiService) {
    var CACHE_PREFIX = 'grade-formula-configs:';
    var DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (formulas don't change often)

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
     * Create a new grade formula config
     * @param {Object} configData
     * @returns {Promise<any>}
     */
    this.create = function(configData) {
        return ApiService.post('/grade-formula-configs', configData, {
            cache: false
        }).then(function(response) {
            // Clear cache after creating
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Get all grade formula configs with filters
     * @param {Object} filters
     * @param {number} page
     * @param {number} pageSize
     * @returns {Promise<{configs: Array, totalCount: number, page: number, pageSize: number}>}
     */
    this.getAll = function(filters, page, pageSize) {
        filters = filters || {};
        page = page || 1;
        pageSize = pageSize || 20;

        var params = {
            page: page,
            pageSize: pageSize
        };

        if (filters.subjectId) params.subjectId = filters.subjectId;
        if (filters.classId) params.classId = filters.classId;
        if (filters.schoolYearId) params.schoolYearId = filters.schoolYearId;
        if (filters.isDefault !== undefined && filters.isDefault !== null) {
            params.isDefault = filters.isDefault;
        }

        var cacheKey = CACHE_PREFIX + JSON.stringify(params);
        return ApiService.get('/grade-formula-configs', params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            var data = unwrap(response, { data: [], totalCount: 0, page: 1, pageSize: 20 });
            return {
                configs: data.data || data || [],
                totalCount: data.totalCount || 0,
                page: data.page || page,
                pageSize: data.pageSize || pageSize
            };
        });
    };

    /**
     * Get grade formula config by ID
     * @param {string} configId
     * @returns {Promise<any>}
     */
    this.getById = function(configId) {
        if (!configId) {
            return Promise.reject(new Error('Config ID is required'));
        }

        var cacheKey = CACHE_PREFIX + 'id:' + configId;
        return ApiService.get('/grade-formula-configs/' + configId, {}, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            return unwrap(response, null);
        });
    };

    /**
     * Get grade formula config by scope (priority: class > subject > school year > default)
     * @param {Object} scope
     * @returns {Promise<any>}
     */
    this.getByScope = function(scope) {
        scope = scope || {};
        var params = {};

        if (scope.classId) params.classId = scope.classId;
        if (scope.subjectId) params.subjectId = scope.subjectId;
        if (scope.schoolYearId) params.schoolYearId = scope.schoolYearId;

        var cacheKey = CACHE_PREFIX + 'scope:' + JSON.stringify(params);
        return ApiService.get('/grade-formula-configs/resolve', params, {
            cache: true,
            cacheKey: cacheKey,
            cacheTTL: DEFAULT_CACHE_TTL
        }).then(function(response) {
            return unwrap(response, null);
        });
    };

    /**
     * Update grade formula config
     * @param {string} configId
     * @param {Object} configData
     * @returns {Promise<any>}
     */
    this.update = function(configId, configData) {
        if (!configId) {
            return Promise.reject(new Error('Config ID is required'));
        }

        return ApiService.put('/grade-formula-configs/' + configId, configData, {
            cache: false
        }).then(function(response) {
            // Clear cache after updating
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Delete grade formula config
     * @param {string} configId
     * @param {string} deletedBy
     * @returns {Promise<any>}
     */
    this.delete = function(configId, deletedBy) {
        if (!configId) {
            return Promise.reject(new Error('Config ID is required'));
        }

        return ApiService.delete('/grade-formula-configs/' + configId, {
            deletedBy: deletedBy
        }, {
            cache: false
        }).then(function(response) {
            // Clear cache after deleting
            ApiService.clearCache(CACHE_PREFIX);
            return unwrap(response, null);
        });
    };

    /**
     * Calculate total weight
     * @param {Object} weights
     * @returns {number}
     */
    this.calculateTotalWeight = function(weights) {
        var total = (weights.midtermWeight || 0) +
                   (weights.finalWeight || 0) +
                   (weights.assignmentWeight || 0) +
                   (weights.quizWeight || 0) +
                   (weights.projectWeight || 0);
        return total;
    };

    /**
     * Validate weights sum
     * @param {Object} weights
     * @returns {boolean}
     */
    this.validateWeights = function(weights) {
        var total = this.calculateTotalWeight(weights);
        return total <= 1.0 && total >= 0;
    };

    /**
     * Clear all cache
     */
    this.clearCache = function() {
        ApiService.clearCache(CACHE_PREFIX);
    };
}]);

