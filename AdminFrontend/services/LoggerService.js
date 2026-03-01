// Logger Service - Centralized logging with production/development modes
app.service('LoggerService', ['$window', function($window) {
    var isDevelopment = false; // Set to false to disable console output
    var logs = []; // Store logs for debugging
    
    // Check if in development mode (can check from environment config later)
    this.isDevelopment = function() {
        // In production, you can set this from build config or environment variable
        return isDevelopment;
    };
    
    /**
     * Log info message
     */
    this.log = function(message, data) {
        if (this.isDevelopment()) {
            console.log('[LOG]', message, data || '');
        }
        logs.push({ level: 'log', message: message, data: data, timestamp: new Date() });
    };
    
    /**
     * Log warning message
     */
    this.warn = function(message, data) {
        if (this.isDevelopment()) {
            console.warn('[WARN]', message, data || '');
        }
        logs.push({ level: 'warn', message: message, data: data, timestamp: new Date() });
    };
    
    /**
     * Log error message
     */
    this.error = function(message, error) {
        // Always log errors, but format nicely
        var errorMessage = message;
        var errorData = null;
        
        if (error) {
            if (error.data && error.data.message) {
                errorMessage += ': ' + error.data.message;
                errorData = error.data;
            } else if (error.message) {
                errorMessage += ': ' + error.message;
                errorData = error;
            } else {
                errorData = error;
            }
        }
        
        if (this.isDevelopment()) {
            console.error('[ERROR]', errorMessage, errorData || '');
        }
        
        logs.push({ 
            level: 'error', 
            message: errorMessage, 
            data: errorData, 
            timestamp: new Date() 
        });
    };
    
    /**
     * Log debug message (only in development)
     */
    this.debug = function(message, data) {
        if (this.isDevelopment()) {
            console.debug('[DEBUG]', message, data || '');
        }
    };
    
    /**
     * Get all logs (for debugging)
     */
    this.getLogs = function() {
        return logs;
    };
    
    /**
     * Clear logs
     */
    this.clearLogs = function() {
        logs = [];
    };
    
    /**
     * Export logs to file (for debugging)
     */
    this.exportLogs = function() {
        var logText = logs.map(function(log) {
            return '[' + log.timestamp.toISOString() + '] [' + log.level.toUpperCase() + '] ' + log.message;
        }).join('\n');
        
        var blob = new Blob([logText], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = $window.document.createElement('a');
        a.href = url;
        a.download = 'app-logs-' + new Date().toISOString().split('T')[0] + '.txt';
        a.click();
        URL.revokeObjectURL(url);
    };
}]);

