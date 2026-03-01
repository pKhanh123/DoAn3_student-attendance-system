// Toast Service - Show success/error/info notifications
app.service('ToastService', ['$timeout', function($timeout) {
    var toasts = [];
    var toastId = 0;
    var listeners = [];
    
    // Toast types
    var TYPES = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };
    
    // Show toast notification
    this.show = function(message, type, duration) {
        type = type || TYPES.INFO;
        duration = duration || 3000; // Default 3 seconds
        
        var toast = {
            id: ++toastId,
            message: message,
            type: type,
            visible: true,
            timestamp: new Date()
        };
        
        toasts.push(toast);
        notifyListeners();
        
        // Auto hide after duration
        $timeout(function() {
            hideToast(toast.id);
        }, duration);
        
        return toast.id;
    };
    
    // Shorthand methods
    this.success = function(message, duration) {
        return this.show(message, TYPES.SUCCESS, duration);
    };
    
    this.error = function(message, duration) {
        return this.show(message, TYPES.ERROR, duration || 4000); // Error shows longer
    };
    
    this.warning = function(message, duration) {
        return this.show(message, TYPES.WARNING, duration);
    };
    
    this.info = function(message, duration) {
        return this.show(message, TYPES.INFO, duration);
    };
    
    // Hide specific toast
    var hideToast = function(id) {
        var index = toasts.findIndex(function(t) { return t.id === id; });
        if (index > -1) {
            toasts[index].visible = false;
            notifyListeners();
            
            // Remove from array after animation
            $timeout(function() {
                toasts.splice(index, 1);
                notifyListeners();
            }, 300);
        }
    };
    
    this.hide = function(id) {
        hideToast(id);
    };
    
    // Get all toasts
    this.getToasts = function() {
        return toasts;
    };
    
    // Subscribe to toast changes
    this.subscribe = function(callback) {
        listeners.push(callback);
        return function unsubscribe() {
            var index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    };
    
    // Notify all listeners
    var notifyListeners = function() {
        listeners.forEach(function(callback) {
            callback(toasts);
        });
    };
    
    // Clear all toasts
    this.clear = function() {
        toasts = [];
        notifyListeners();
    };
}]);

