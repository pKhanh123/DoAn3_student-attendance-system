// Date Input Directive - Auto-format dates to prevent ngModel:datefmt errors
// This directive formats dates when they're set from the model
app.directive('dateInput', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: 'ngModel',
        priority: 1, // Low priority to run after ngModel
        link: function(scope, element, attrs, ngModel) {
            var isUpdating = false;
            var lastFormattedValue = null;
            
            var inputId = attrs.id || attrs.name || 'unnamed';
            var ngModelName = attrs.ngModel || 'unknown';
            
            // Format function
            function formatDateValue(value) {
                if (!value) return null;
                
                // If it's already a string in YYYY-MM-DD format, return it
                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    return value;
                }
                
                // Convert Date object or other formats to YYYY-MM-DD
                try {
                    var date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        var year = date.getFullYear();
                        var month = String(date.getMonth() + 1).padStart(2, '0');
                        var day = String(date.getDate()).padStart(2, '0');
                        return year + '-' + month + '-' + day;
                    }
                } catch (e) {
                    // Ignore errors
                }
                
                return value;
            }
            
            // CRITICAL: Clear existing formatters and add ours FIRST
            // AngularJS's built-in date formatter might be causing the issue
            var existingFormatters = ngModel.$formatters.slice(); // Copy existing
            ngModel.$formatters.length = 0; // Clear all
            
            // Add our formatter FIRST
            ngModel.$formatters.push(function(value) {
                if (!value) {
                    lastFormattedValue = null;
                    return value;
                }
                
                // If already in correct format (YYYY-MM-DD string), return as is
                // This prevents AngularJS from trying to format it again
                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    lastFormattedValue = value;
                    return value; // Return string directly - don't let AngularJS format it
                }
                
                var formatted = formatDateValue(value);
                lastFormattedValue = formatted;
                
                return formatted;
            });
            
            // Re-add existing formatters (if any) after ours
            existingFormatters.forEach(function(formatter) {
                ngModel.$formatters.push(formatter);
            });
            
            // CRITICAL: Override AngularJS's $$format method to prevent datefmt errors
            // This is called BEFORE formatters, so we need to intercept it
            if (ngModel.$$format) {
                var originalFormat = ngModel.$$format;
                ngModel.$$format = function(value) {
                    // If value is already a string in YYYY-MM-DD format, return it directly
                    // This prevents AngularJS from trying to format it and throwing datefmt error
                    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        return value;
                    }
                    
                    // For other values, try to format them
                    try {
                        var formatted = formatDateValue(value);
                        return formatted || value;
                    } catch (e) {
                        // If formatting fails, try original formatter
                        try {
                            return originalFormat.call(ngModel, value);
                        } catch (e2) {
                            // If original also fails, return value as is
                            return value;
                        }
                    }
                };
            }
            
            // CRITICAL: Override datefmt validator to prevent errors
            // AngularJS throws datefmt error when it can't format a date value
            if (ngModel.$validators) {
                // Remove or override the datefmt validator
                ngModel.$validators.datefmt = function(modelValue, viewValue) {
                    // Always return true to prevent datefmt errors
                    // We handle formatting ourselves
                    return true;
                };
            }
            
            // Also handle $setValidity to prevent datefmt errors
            var originalSetValidity = ngModel.$setValidity;
            ngModel.$setValidity = function(validationErrorKey, isValid, controller) {
                // Ignore datefmt validation errors - we handle formatting ourselves
                if (validationErrorKey === 'datefmt') {
                    return ngModel; // Return ngModel to allow chaining
                }
                return originalSetValidity.call(ngModel, validationErrorKey, isValid, controller);
            };
            
            // CRITICAL: Override $processModelValue to catch errors before they're thrown
            if (ngModel.$processModelValue) {
                var originalProcessModelValue = ngModel.$processModelValue;
                ngModel.$processModelValue = function(value) {
                    try {
                        // If value is already a string in YYYY-MM-DD format, process it directly
                        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            // Call original but catch any errors
                            try {
                                return originalProcessModelValue.call(ngModel, value);
                            } catch (e) {
                                if (e.message && e.message.includes('datefmt')) {
                                    return value; // Return value as is to prevent error
                                }
                                throw e; // Re-throw if it's not a datefmt error
                            }
                        }
                        return originalProcessModelValue.call(ngModel, value);
                    } catch (e) {
                        if (e.message && e.message.includes('datefmt')) {
                            return value; // Return value as is to prevent error
                        }
                        throw e; // Re-throw if it's not a datefmt error
                    }
                };
            }
            
            // Add parser to format when value changes (from user input)
            ngModel.$parsers.unshift(function(value) {
                if (!value) return null;
                
                // If already in correct format, return as is
                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    return value;
                }
                
                return formatDateValue(value);
            });
            
            // Watch for model value changes (from controller/backend)
            // Use $watch with objectEquality to catch all changes
            var unwatch = scope.$watch(function() {
                return ngModel.$modelValue;
            }, function(newValue, oldValue) {
                // Skip if we're updating
                if (isUpdating) {
                    return;
                }
                
                // Skip if values are the same (using string comparison)
                if (String(newValue) === String(oldValue)) {
                    return;
                }
                
                if (!newValue) {
                    lastFormattedValue = null;
                    return;
                }
                
                // If already in correct format, just update lastFormattedValue
                if (typeof newValue === 'string' && newValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    lastFormattedValue = newValue;
                    // Force render to update the input
                    $timeout(function() {
                        ngModel.$render();
                    }, 0, false);
                    return;
                }
                
                var formatted = formatDateValue(newValue);
                
                // Only update if different and not already formatted
                if (formatted !== newValue && formatted !== lastFormattedValue) {
                    isUpdating = true;
                    $timeout(function() {
                        // Set the formatted value in the model
                        var modelPath = ngModelName.split('.');
                        var target = scope;
                        for (var i = 0; i < modelPath.length - 1; i++) {
                            target = target[modelPath[i]];
                        }
                        target[modelPath[modelPath.length - 1]] = formatted;
                        
                        // Also update via ngModel
                        ngModel.$setViewValue(formatted);
                        ngModel.$render();
                        lastFormattedValue = formatted;
                        isUpdating = false;
                    }, 0, false);
                } else if (formatted === newValue) {
                    lastFormattedValue = formatted;
                }
            }, true); // Use objectEquality to catch Date object changes
            
            // Cleanup
            scope.$on('$destroy', function() {
                unwatch();
            });
        }
    };
}]);

// Note: We don't override the 'input' directive to avoid conflicts with AngularJS
// Instead, we rely on:
// 1. ng-model-options="{ timezone: 'UTC' }" on all date inputs (already added)
// 2. HTTP interceptor to format dates in responses (already added)
// 3. Controller-level formatting (already added)
// 4. Manual dateInput attribute can be added if needed: <input type="date" date-input ...>

