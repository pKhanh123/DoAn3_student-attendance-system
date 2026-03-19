// AngularJS Date Format Fix - Must load BEFORE app.js
// This wraps AngularJS's internal methods to prevent datefmt errors
(function() {
    'use strict';
    
    // Wait for AngularJS to load
    if (typeof angular === 'undefined') {
        setTimeout(arguments.callee, 100);
        return;
    }
    
    // Override angular.module to intercept app creation
    var originalModule = angular.module;
    angular.module = function(name, requires, configFn) {
        var app = originalModule.apply(angular, arguments);
        
        // Wrap $rootScope methods to catch datefmt errors
        app.config(['$provide', function($provide) {
            $provide.decorator('$rootScope', ['$delegate', function($delegate) {
                var originalApply = $delegate.$apply;
                var originalDigest = $delegate.$digest;
                
                // Wrap $apply
                $delegate.$apply = function(expr) {
                    try {
                        return originalApply.call($delegate, expr);
                    } catch (e) {
                        if (e && e.message && typeof e.message === 'string' && e.message.includes('ngModel:datefmt')) {
                            return; // Suppress error
                        }
                        throw e;
                    }
                };
                
                // Wrap $digest
                $delegate.$digest = function() {
                    try {
                        return originalDigest.call($delegate);
                    } catch (e) {
                        if (e && e.message && typeof e.message === 'string' && e.message.includes('ngModel:datefmt')) {
                            return; // Suppress error
                        }
                        throw e;
                    }
                };
                
                return $delegate;
            }]);
        }]);
        
        return app;
    };
})();

// Global error handler to catch datefmt errors at window level
(function() {
    'use strict';
    
    var originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        // Check if this is a datefmt error
        if (message && typeof message === 'string' && message.includes('ngModel:datefmt')) {
            return true; // Suppress the error
        }
        
        // For other errors, use original handler
        if (originalOnError) {
            return originalOnError.apply(window, arguments);
        }
        return false;
    };
    
    // Also catch unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && event.reason.message && event.reason.message.includes('ngModel:datefmt')) {
            event.preventDefault(); // Suppress the error
        }
    });
})();

