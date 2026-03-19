// Sortable Table Header Directive
app.directive('sortableHeader', function() {
    return {
        restrict: 'A',
        scope: {
            field: '@sortableHeader',
            pagination: '=',
            onSort: '&'
        },
        link: function(scope, element) {
            element.addClass('sortable-header');
            
            // Add sort icon
            var iconHtml = '<i class="fas fa-sort sort-icon"></i>';
            element.append(iconHtml);
            
            var icon = element.find('.sort-icon');
            
            // Update icon based on current sort
            function updateIcon() {
                icon.removeClass('fa-sort fa-sort-up fa-sort-down');
                
                if (scope.pagination.sortField === scope.field) {
                    if (scope.pagination.sortDirection === 'asc') {
                        icon.addClass('fa-sort-up');
                    } else {
                        icon.addClass('fa-sort-down');
                    }
                } else {
                    icon.addClass('fa-sort');
                }
            }
            
            // Click handler
            element.on('click', function() {
                scope.$evalAsync(function() {
                    if (scope.pagination.sortField === scope.field) {
                        scope.pagination.sortDirection = scope.pagination.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        scope.pagination.sortField = scope.field;
                        scope.pagination.sortDirection = 'asc';
                    }
                    
                    updateIcon();
                    scope.onSort();
                });
            });
            
            // Watch for external changes
            scope.$watch('pagination.sortField', updateIcon);
            scope.$watch('pagination.sortDirection', updateIcon);
            
            updateIcon();
        }
    };
});

