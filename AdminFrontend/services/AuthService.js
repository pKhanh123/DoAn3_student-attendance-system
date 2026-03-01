// Authentication Service
app.service('AuthService', ['$http', '$window', '$location', '$rootScope', 'API_CONFIG', '$q', function($http, $window, $location, $rootScope, API_CONFIG, $q) {
    var TOKEN_KEY = 'auth_token';
    var REFRESH_TOKEN_KEY = 'refresh_token';
    var USER_KEY = 'user_info';
    var REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration
    
    // Flag to prevent multiple simultaneous refresh requests
    var isRefreshing = false;
    var refreshPromise = null;
    
    // Helper function to get the appropriate storage
    var getStorage = function() {
        // Check if we have data in localStorage first (remember me was checked)
        if ($window.localStorage.getItem(TOKEN_KEY)) {
            return $window.localStorage;
        }
        // Otherwise use sessionStorage
        return $window.sessionStorage;
    };
    
    /**
     * Decode JWT token (without verification)
     * @param {string} token - JWT token
     * @returns {object|null} - Decoded payload or null if invalid
     */
    var decodeToken = function(token) {
        if (!token) return null;
        
        try {
            var parts = token.split('.');
            if (parts.length !== 3) return null;
            
            // Decode payload (second part)
            var payload = parts[1];
            // Replace URL-safe base64 characters
            payload = payload.replace(/-/g, '+').replace(/_/g, '/');
            // Add padding if needed
            while (payload.length % 4) {
                payload += '=';
            }
            
            return JSON.parse(atob(payload));
        } catch (e) {
            return null;
        }
    };
    
    /**
     * Validate token format (JWT structure)
     * @param {string} token - JWT token
     * @returns {boolean} - True if valid format
     */
    var isValidTokenFormat = function(token) {
        if (!token || typeof token !== 'string') return false;
        
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
            var payload = decodeToken(token);
            return payload !== null && payload.exp !== undefined;
        } catch (e) {
            return false;
        }
    };
    
    /**
     * Check if token is expired
     * @param {string} token - JWT token
     * @returns {boolean} - True if expired
     */
    var isTokenExpired = function(token) {
        if (!token) return true;
        
        var payload = decodeToken(token);
        if (!payload || !payload.exp) return true;
        
        // exp is in seconds, convert to milliseconds
        var expirationTime = payload.exp * 1000;
        return Date.now() >= expirationTime;
    };
    
    /**
     * Check if token is expiring soon (within threshold)
     * @param {string} token - JWT token
     * @returns {boolean} - True if expiring soon
     */
    var isTokenExpiringSoon = function(token) {
        if (!token) return true;
        
        var payload = decodeToken(token);
        if (!payload || !payload.exp) return true;
        
        // exp is in seconds, convert to milliseconds
        var expirationTime = payload.exp * 1000;
        var timeUntilExpiration = expirationTime - Date.now();
        
        return timeUntilExpiration <= REFRESH_THRESHOLD;
    };
    
    this.login = function(username, password, rememberMe) {
        return $http.post(API_CONFIG.BASE_URL + '/auth/login', {
            username: username,
            password: password
        }).then(function(response) {
            if (response.data && response.data.data) {
                var loginData = response.data.data;
                
                // Choose storage based on rememberMe
                var storage = rememberMe ? $window.localStorage : $window.sessionStorage;
                
                // Clear any existing tokens from both storages
                $window.localStorage.removeItem(TOKEN_KEY);
                $window.localStorage.removeItem(REFRESH_TOKEN_KEY);
                $window.localStorage.removeItem(USER_KEY);
                $window.sessionStorage.removeItem(TOKEN_KEY);
                $window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
                $window.sessionStorage.removeItem(USER_KEY);
                
                // Save to the chosen storage
                storage.setItem(TOKEN_KEY, loginData.token);
                if (loginData.refreshToken) {
                    storage.setItem(REFRESH_TOKEN_KEY, loginData.refreshToken);
                }
                storage.setItem(USER_KEY, JSON.stringify(loginData));
                
                return loginData;
            }
            throw new Error('Invalid response format');
        });
    };
    
    this.logout = function() {
        // Broadcast logout event (for RoleService to clear cache)
        $rootScope.$broadcast('user:logout');
        
        // Get refresh token before clearing
        var refreshToken = this.getRefreshToken();
        
        // Clear from both storages
        $window.localStorage.removeItem(TOKEN_KEY);
        $window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        $window.localStorage.removeItem(USER_KEY);
        $window.sessionStorage.removeItem(TOKEN_KEY);
        $window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        $window.sessionStorage.removeItem(USER_KEY);
        
        // Call logout API to revoke refresh token (non-blocking)
        if (refreshToken) {
            $http.post(API_CONFIG.BASE_URL + '/auth/logout', {
                refreshToken: refreshToken
            }).catch(function() {
                // Ignore errors on logout
            });
        }
        
        // Reset refresh flag
        isRefreshing = false;
        refreshPromise = null;
        
        // Redirect to login page
        $location.path('/login');
    };
    
    this.getToken = function() {
        // Check both storages
        return $window.localStorage.getItem(TOKEN_KEY) || 
               $window.sessionStorage.getItem(TOKEN_KEY);
    };
    
    this.getRefreshToken = function() {
        // Check both storages
        return $window.localStorage.getItem(REFRESH_TOKEN_KEY) || 
               $window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
    };
    
    this.getCurrentUser = function() {
        // Check both storages
        var userJson = $window.localStorage.getItem(USER_KEY) || 
                      $window.sessionStorage.getItem(USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    };
    
    /**
     * Check if token is valid (exists, valid format, not expired)
     * @returns {boolean} - True if token is valid
     */
    this.isTokenValid = function() {
        var token = this.getToken();
        if (!token) return false;
        
        // Check format
        if (!isValidTokenFormat(token)) return false;
        
        // Check expiration
        if (isTokenExpired(token)) return false;
        
        return true;
    };
    
    this.isAuthenticated = function() {
        return this.isTokenValid();
    };
    
    // Alias for isAuthenticated (used by RouteGuard)
    this.isLoggedIn = function() {
        return this.isAuthenticated();
    };
    
    /**
     * Refresh access token using refresh token
     * @returns {Promise} - Promise resolving to new token data
     */
    this.refreshToken = function() {
        // If already refreshing, return the existing promise
        if (isRefreshing && refreshPromise) {
            return refreshPromise;
        }
        
        var refreshTokenValue = this.getRefreshToken();
        if (!refreshTokenValue) {
            return $q.reject(new Error('No refresh token available'));
        }
        
        isRefreshing = true;
        refreshPromise = $http.post(API_CONFIG.BASE_URL + '/auth/refresh', {
            refreshToken: refreshTokenValue
        }).then(function(response) {
            if (response.data && response.data.token) {
                var storage = getStorage();
                
                // Save new tokens
                storage.setItem(TOKEN_KEY, response.data.token);
                if (response.data.refreshToken) {
                    storage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
                }
                
                isRefreshing = false;
                refreshPromise = null;
                
                return {
                    token: response.data.token,
                    refreshToken: response.data.refreshToken
                };
            }
            throw new Error('Invalid refresh response');
        }).catch(function(error) {
            isRefreshing = false;
            refreshPromise = null;
            
            // If refresh fails, logout
            this.logout();
            return $q.reject(error);
        }.bind(this));
        
        return refreshPromise;
    };
    
    /**
     * Check token and refresh if needed
     * @returns {Promise} - Promise resolving to valid token
     */
    this.checkAndRefreshToken = function() {
        var token = this.getToken();
        
        // No token
        if (!token) {
            return $q.reject(new Error('No token available'));
        }
        
        // Invalid format
        if (!isValidTokenFormat(token)) {
            this.logout();
            return $q.reject(new Error('Invalid token format'));
        }
        
        // Already expired - try to refresh
        if (isTokenExpired(token)) {
            return this.refreshToken().then(function(newTokens) {
                return newTokens.token;
            });
        }
        
        // Expiring soon - refresh proactively
        if (isTokenExpiringSoon(token)) {
            return this.refreshToken().then(function(newTokens) {
                return newTokens.token;
            });
        }
        
        // Token is still valid
        return $q.resolve(token);
    };
    
    // ============================================================
    // FORGOT PASSWORD FLOW (OTP-based)
    // ============================================================
    
    // Step 1: Send OTP to email
    this.forgotPassword = function(email) {
        return $http.post(API_CONFIG.BASE_URL + '/auth/forgot-password', {
            email: email
        });
    };
    
    // Step 2: Verify OTP
    this.verifyOTP = function(email, otp) {
        return $http.post(API_CONFIG.BASE_URL + '/auth/verify-otp', {
            email: email,
            otp: otp
        });
    };
    
    // Step 3: Reset Password (after OTP verified)
    this.resetPassword = function(email, newPassword, confirmPassword) {
        return $http.post(API_CONFIG.BASE_URL + '/auth/reset-password', {
            email: email,
            newPassword: newPassword,
            confirmPassword: confirmPassword
        });
    };
    
    // Get remaining OTP time (for countdown)
    this.getOTPRemainingTime = function(email) {
        return $http.get(API_CONFIG.BASE_URL + '/auth/otp-remaining-time?email=' + encodeURIComponent(email));
    };
    
    // Change Password (for logged in users)
    this.changePassword = function(currentPassword, newPassword) {
        return $http.post(API_CONFIG.BASE_URL + '/auth/change-password', {
            currentPassword: currentPassword,
            newPassword: newPassword
        });
    };
    
    // Update User Info (in storage)
    this.updateUser = function(userData) {
        var storage = getStorage();
        storage.setItem(USER_KEY, JSON.stringify(userData));
    };
    
    // Expose helper functions for external use
    this.decodeToken = decodeToken;
    this.isValidTokenFormat = isValidTokenFormat;
    this.isTokenExpired = isTokenExpired;
    this.isTokenExpiringSoon = isTokenExpiringSoon;
}]);

