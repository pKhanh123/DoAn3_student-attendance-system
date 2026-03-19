// Toast Container Directive
app.directive('toastContainer', ['ToastService', '$timeout', function(ToastService, $timeout) {
    return {
        restrict: 'E',
        scope: {},
        template:
            '<div class="toast-container">' +
                '<div ng-repeat="toast in toasts" ' +
                     'class="toast toast-{{toast.type}}" ' +
                     'ng-class="{\'toast-visible\': toast.visible, \'toast-hidden\': !toast.visible}">' +
                    '<div class="toast-icon">' +
                        '<i ng-if="toast.type === \'success\'" class="fas fa-check-circle"></i>' +
                        '<i ng-if="toast.type === \'error\'" class="fas fa-times-circle"></i>' +
                        '<i ng-if="toast.type === \'warning\'" class="fas fa-exclamation-triangle"></i>' +
                        '<i ng-if="toast.type === \'info\'" class="fas fa-info-circle"></i>' +
                    '</div>' +
                    '<div class="toast-content">' +
                        '<div class="toast-message">{{toast.message}}</div>' +
                    '</div>' +
                    '<button class="toast-close" ng-click="closeToast(toast.id)">' +
                        '<i class="fas fa-times"></i>' +
                    '</button>' +
                '</div>' +
            '</div>',
        link: function(scope, element) {
            scope.toasts = [];
            
            // Subscribe to toast changes
            var unsubscribe = ToastService.subscribe(function(toasts) {
                $timeout(function() {
                    scope.toasts = toasts;
                });
            });
            
            // Close toast
            scope.closeToast = function(id) {
                ToastService.hide(id);
            };
            
            // Cleanup
            scope.$on('$destroy', function() {
                unsubscribe();
            });
        }
    };
}]);

