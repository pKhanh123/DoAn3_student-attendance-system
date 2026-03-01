// Notification Service
app.service('NotificationService', ['ApiService', '$rootScope', '$q', function(ApiService, $rootScope, $q) {
    
    var unreadCount = 0;
    
    /**
     * Get all notifications with pagination and filters
     * @param {number} page - Page number (default: 1)
     * @param {number} pageSize - Page size (default: 50)
     * @param {string} type - Filter by type (optional)
     * @param {boolean} isRead - Filter by read status (optional)
     */
    this.getAll = function(page, pageSize, type, isRead) {
        var params = {};
        if (page !== undefined) params.page = page;
        if (pageSize !== undefined) params.pageSize = pageSize;
        if (type) params.type = type;
        if (isRead !== undefined && isRead !== null && isRead !== '') {
            params.isRead = isRead === true || isRead === 'true';
        }
        
        return ApiService.get('/notifications', params, { cache: false }).then(function(response) {
            // Backend returns: { data: [...], page: 1, pageSize: 50, totalCount: 100, totalPages: 2 }
            if (response.data && response.data.data) {
                return {
                    data: response.data.data,
                    page: response.data.page || page || 1,
                    pageSize: response.data.pageSize || pageSize || 50,
                    totalCount: response.data.totalCount || response.data.data.length,
                    totalPages: response.data.totalPages || Math.ceil((response.data.totalCount || response.data.data.length) / (response.data.pageSize || pageSize || 50))
                };
            }
            return { data: response.data || [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 };
        });
    };
    
    /**
     * Get unread notifications
     * @param {number} limit - Limit number of notifications (default: 10)
     */
    this.getUnread = function(limit) {
        var params = {};
        if (limit) params.limit = limit;
        
        return ApiService.get('/notifications/unread', params, { cache: false }).then(function(response) {
            // Backend returns: { data: [...] }
            return {
                data: response.data.data || response.data || [],
                count: (response.data.data || response.data || []).length
            };
        });
    };
    
    /**
     * Get unread count
     */
    this.getUnreadCount = function() {
        return unreadCount;
    };
    
    /**
     * Set unread count (internal)
     */
    this.setUnreadCount = function(count) {
        unreadCount = count;
        $rootScope.$broadcast('notificationCountChanged', count);
    };
    
    // Track pending request to prevent duplicate calls
    var pendingCountRequest = null;
    var lastFetchTime = 0;
    var FETCH_THROTTLE_MS = 2000; // Minimum 2 seconds between requests
    
    /**
     * Fetch unread count from API (with throttling to prevent spam)
     */
    this.fetchUnreadCount = function() {
        var self = this;
        var now = Date.now();
        
        // If there's a pending request, return it
        if (pendingCountRequest) {
            return pendingCountRequest;
        }
        
        // Throttle: don't fetch if last fetch was less than FETCH_THROTTLE_MS ago
        if (now - lastFetchTime < FETCH_THROTTLE_MS) {
            // Return cached count immediately
            return $q.resolve(unreadCount);
        }
        
        // Create new request
        pendingCountRequest = ApiService.get('/notifications/unread/count', {}, { cache: false })
            .then(function(response) {
                var count = response.data.count || 0;
                self.setUnreadCount(count);
                lastFetchTime = Date.now();
                return count;
            })
            .catch(function(error) {
                // If endpoint fails, try getting unread list and count
                return self.getUnread(1).then(function(result) {
                    // Estimate from unread list if count endpoint not available
                    self.setUnreadCount(0);
                    lastFetchTime = Date.now();
                    return 0;
                });
            })
            .finally(function() {
                // Clear pending request after a short delay to allow concurrent calls to reuse it
                setTimeout(function() {
                    pendingCountRequest = null;
                }, 100);
            });
        
        return pendingCountRequest;
    };
    
    /**
     * Get notification by ID
     * @param {string} id - Notification ID
     */
    this.getById = function(id) {
        return ApiService.get('/notifications/' + id, {}, { cache: false }).then(function(response) {
            return response.data.data || response.data;
        });
    };
    
    // Track notifications being marked as read to prevent duplicate requests
    var markingAsRead = {};
    
    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     */
    this.markAsRead = function(id) {
        // Prevent duplicate requests for the same notification
        if (markingAsRead[id]) {
            return markingAsRead[id];
        }
        
        var self = this;
        var promise = ApiService.put('/notifications/' + id + '/read', {})
            .then(function(response) {
                // Refresh unread count
                self.fetchUnreadCount();
                delete markingAsRead[id];
                return response;
            })
            .catch(function(error) {
                // Remove from tracking on error so it can be retried later if needed
                delete markingAsRead[id];
                return $q.reject(error);
            });
        
        markingAsRead[id] = promise;
        return promise;
    };
    
    /**
     * Mark all notifications as read
     */
    this.markAllAsRead = function() {
        var self = this;
        return ApiService.put('/notifications/mark-all-read', {})
            .then(function(response) {
                unreadCount = 0;
                $rootScope.$broadcast('notificationCountChanged', 0);
                return response;
            });
    };
    
    /**
     * Delete notification
     * @param {string} id - Notification ID
     */
    this.deleteNotification = function(id) {
        var self = this;
        return ApiService.delete('/notifications/' + id)
            .then(function(response) {
                // Refresh unread count in case deleted notification was unread
                self.fetchUnreadCount();
                return response;
            });
    };
    
    /**
     * Create notification (Admin only)
     * @param {object} notification - Notification object
     */
    this.create = function(notification) {
        return ApiService.post('/notifications', notification);
    };
    
    /**
     * Load unread count on init
     */
    this.loadUnreadCount = function() {
        var self = this;
        // Try to fetch count from API first
        this.fetchUnreadCount()
            .catch(function(error) {
                // Fallback: get unread list and count
                return self.getUnread(10).then(function(result) {
                    self.setUnreadCount(result.count || 0);
                });
            });
    };
}]);

