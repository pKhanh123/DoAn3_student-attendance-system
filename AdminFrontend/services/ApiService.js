// Generic API Service with Caching Support
app.service('ApiService', ['$http', '$q', 'API_CONFIG', 'CacheService', function($http, $q, API_CONFIG, CacheService) {
    
    /**
     * GET request with optional caching
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @param {object} options - Options { cache: boolean, cacheKey: string, cacheTTL: number }
     */
    this.get = function(endpoint, params, options) {
        options = options || {};
        
        // Check cache first
        if (options.cache !== false) {
            var cacheKey = options.cacheKey || endpoint + '?' + JSON.stringify(params || {});
            var cached = CacheService.get(cacheKey);
            if (cached !== null) {
                return $q.resolve({ data: cached, fromCache: true });
            }
        }
        
        // Wrap params trong { params: ... } để Angular $http convert thành query string
        var config = params ? { params: params } : {};
        var fullUrl = API_CONFIG.BASE_URL + endpoint;
        
        return $http.get(fullUrl, config).then(function(response) {
            // Cache the response if caching is enabled
            if (options.cache !== false) {
                var cacheKey = options.cacheKey || endpoint + '?' + JSON.stringify(params || {});
                CacheService.set(cacheKey, response.data, options.cacheTTL);
            }
            return response;
        }).catch(function(error) {
            // Suppress 403 errors (permission errors are expected for non-admin users)
            // The error will still be returned to the caller for proper handling
            return $q.reject(error);
        });
    };
    
    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {object} options - Options { invalidateCache: string|array } - Cache keys to invalidate
     */
    this.post = function(endpoint, data, options) {
        options = options || {};
        var promise = $http.post(API_CONFIG.BASE_URL + endpoint, data);
        
        // Invalidate cache if specified
        if (options.invalidateCache) {
            promise = promise.then(function(response) {
                if (Array.isArray(options.invalidateCache)) {
                    options.invalidateCache.forEach(function(key) {
                        CacheService.clearByPattern(key);
                    });
                } else {
                    CacheService.clearByPattern(options.invalidateCache);
                }
                return response;
            });
        }
        
        return promise.catch(function(error) {
            // Suppress 403 errors (permission errors are expected)
            return $q.reject(error);
        });
    };
    
    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {object} options - Options { invalidateCache: string|array }
     */
    this.put = function(endpoint, data, options) {
        options = options || {};
        var promise = $http.put(API_CONFIG.BASE_URL + endpoint, data);
        
        // Invalidate cache if specified
        if (options.invalidateCache) {
            promise = promise.then(function(response) {
                if (Array.isArray(options.invalidateCache)) {
                    options.invalidateCache.forEach(function(key) {
                        CacheService.clearByPattern(key);
                    });
                } else {
                    CacheService.clearByPattern(options.invalidateCache);
                }
                return response;
            });
        }
        
        return promise.catch(function(error) {
            // Suppress 403 errors (permission errors are expected)
            return $q.reject(error);
        });
    };
    
    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {object} options - Options { invalidateCache: string|array }
     */
    this.delete = function(endpoint, data, options) {
        options = options || {};
        var promise = $http.delete(API_CONFIG.BASE_URL + endpoint, {
            headers: {'Content-Type': 'application/json'},
            data: data
        });
        
        // Invalidate cache if specified
        if (options.invalidateCache) {
            promise = promise.then(function(response) {
                if (Array.isArray(options.invalidateCache)) {
                    options.invalidateCache.forEach(function(key) {
                        CacheService.clearByPattern(key);
                    });
                } else {
                    CacheService.clearByPattern(options.invalidateCache);
                }
                return response;
            });
        }
        
        return promise.catch(function(error) {
            // Suppress 403 errors (permission errors are expected)
            return $q.reject(error);
        });
    };
    
    /**
     * Upload file
     */
    this.uploadFile = function(endpoint, formData) {
        return $http.post(API_CONFIG.BASE_URL + endpoint, formData, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        });
    };
    
    /**
     * Clear cache manually
     * @param {string} pattern - Pattern to clear (optional, clears all if not provided)
     */
    this.clearCache = function(pattern) {
        if (pattern) {
            CacheService.clearByPattern(pattern);
        } else {
            CacheService.clear();
        }
    };
    
    /**
     * Get base URL for manual URL construction
     */
    this.getBaseUrl = function() {
        return API_CONFIG.BASE_URL;
    };
}]);

