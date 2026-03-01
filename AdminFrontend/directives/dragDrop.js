// Drag and Drop Directives
app.directive('ngDrop', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.on('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var fn = scope.$eval(attrs.ngDrop);
                if (typeof fn === 'function') {
                    scope.$evalAsync(function() {
                        fn(e.originalEvent || e);
                    });
                }
            });
        }
    };
});

app.directive('ngDragover', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.on('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var fn = scope.$eval(attrs.ngDragover);
                if (typeof fn === 'function') {
                    scope.$evalAsync(function() {
                        fn(e.originalEvent || e);
                    });
                }
            });
        }
    };
});

app.directive('ngDragleave', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.on('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var fn = scope.$eval(attrs.ngDragleave);
                if (typeof fn === 'function') {
                    scope.$evalAsync(function() {
                        fn(e.originalEvent || e);
                    });
                }
            });
        }
    };
});

