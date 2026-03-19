// Cache Service for API Response Caching
app.service('CacheService', [function() {
    var cache = {};
    var DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default
    
    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {object|null} - Cached data or null if expired/not found
     */
    this.get = function(key) {
        var item = cache[key];
        if (!item) {
            return null;
        }
        
        // Check if expired
        if (Date.now() - item.timestamp > item.ttl) {
            delete cache[key];
            return null;
        }
        
        return item.data;
    };
    
    /**
     * Set cache data
     * @param {string} key - Cache key
     * @param {object} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    this.set = function(key, data, ttl) {
        cache[key] = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl || DEFAULT_TTL
        };
    };
    
    /**
     * Remove specific cache entry
     * @param {string} key - Cache key
     */
    this.remove = function(key) {
        delete cache[key];
    };
    
    /**
     * Clear all cache
     */
    this.clear = function() {
        cache = {};
    };
    
    /**
     * Clear cache by pattern (e.g., 'students:*')
     * @param {string} pattern - Pattern to match (supports * wildcard)
     */
    this.clearByPattern = function(pattern) {
        var regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        for (var key in cache) {
            if (regex.test(key)) {
                delete cache[key];
            }
        }
    };
    
    /**
     * Get cache size (number of entries)
     * @returns {number}
     */
    this.size = function() {
        return Object.keys(cache).length;
    };
    
    /**
     * Clean expired entries
     */
    this.cleanExpired = function() {
        var now = Date.now();
        for (var key in cache) {
            if (now - cache[key].timestamp > cache[key].ttl) {
                delete cache[key];
            }
        }
    };
}]);

