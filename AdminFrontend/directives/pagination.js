// Pagination Directive - Reusable pagination component
app.directive('pagination', function() {
    return {
        restrict: 'E',
        scope: {
            pagination: '=',
            onPageChange: '&'
        },
        template: 
            '<div class="pagination-container" ng-if="pagination">' +
                '<div class="pagination-info">' +
                    '<span ng-if="pagination.totalItems > 0">Hiển thị {{pagination.startItem || 0}}-{{pagination.endItem || 0}} / {{pagination.totalItems || 0}}</span>' +
                    '<span ng-if="!pagination.totalItems || pagination.totalItems === 0">Không có dữ liệu</span>' +
                '</div>' +
                '<div class="pagination-controls">' +
                    '<select ng-model="pagination.pageSize" ng-change="changePageSize()" class="page-size-select" ng-if="pagination.pageSizeOptions">' +
                        '<option ng-repeat="size in pagination.pageSizeOptions" value="{{size}}">{{size}} / trang</option>' +
                    '</select>' +
                    '<div class="pagination-buttons">' +
                        '<button ng-click="goToPage(1)" ng-disabled="!pagination.currentPage || pagination.currentPage === 1" class="btn btn-sm">' +
                            '<i class="fas fa-angle-double-left"></i>' +
                        '</button>' +
                        '<button ng-click="goToPage((pagination.currentPage || 1) - 1)" ng-disabled="!pagination.currentPage || pagination.currentPage === 1" class="btn btn-sm">' +
                            '<i class="fas fa-angle-left"></i>' +
                        '</button>' +
                        '<button ng-repeat="page in pageNumbers" ' +
                                'ng-click="goToPage(page)" ' +
                                'ng-class="{\'active\': page === (pagination.currentPage || 1)}" ' +
                                'class="btn btn-sm page-number">' +
                            '{{page}}' +
                        '</button>' +
                        '<button ng-click="goToPage((pagination.currentPage || 1) + 1)" ng-disabled="!pagination.currentPage || !pagination.totalPages || pagination.currentPage === pagination.totalPages" class="btn btn-sm">' +
                            '<i class="fas fa-angle-right"></i>' +
                        '</button>' +
                        '<button ng-click="goToPage(pagination.totalPages || 1)" ng-disabled="!pagination.currentPage || !pagination.totalPages || pagination.currentPage === pagination.totalPages" class="btn btn-sm">' +
                            '<i class="fas fa-angle-double-right"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>',
        link: function(scope) {
            // Calculate page numbers
            scope.updatePageNumbers = function() {
                // Check if pagination object exists
                if (!scope.pagination) {
                    scope.pageNumbers = [];
                    return;
                }
                
                var pages = [];
                var maxPages = 5;
                var startPage, endPage;
                
                // Ensure totalPages is a valid number
                var totalPages = scope.pagination.totalPages || 0;
                var currentPage = scope.pagination.currentPage || 1;
                
                if (totalPages <= maxPages) {
                    startPage = 1;
                    endPage = totalPages;
                } else {
                    if (currentPage <= 3) {
                        startPage = 1;
                        endPage = maxPages;
                    } else if (currentPage + 2 >= totalPages) {
                        startPage = totalPages - maxPages + 1;
                        endPage = totalPages;
                    } else {
                        startPage = currentPage - 2;
                        endPage = currentPage + 2;
                    }
                }
                
                for (var i = startPage; i <= endPage; i++) {
                    pages.push(i);
                }
                
                scope.pageNumbers = pages;
            };
            
            scope.goToPage = function(page) {
                if (!scope.pagination) return;
                
                var totalPages = scope.pagination.totalPages || 0;
                var currentPage = scope.pagination.currentPage || 1;
                
                if (page < 1 || page > totalPages || page === currentPage) {
                    return;
                }
                scope.pagination.currentPage = page;
                scope.updatePageNumbers();
                if (scope.onPageChange) {
                    scope.onPageChange();
                }
            };
            
            scope.changePageSize = function() {
                if (!scope.pagination) return;
                
                scope.pagination.currentPage = 1;
                scope.updatePageNumbers();
                if (scope.onPageChange) {
                    scope.onPageChange();
                }
            };
            
            // Watch for changes
            scope.$watch('pagination', function(newVal, oldVal) {
                if (newVal) {
                    scope.updatePageNumbers();
                }
            }, true);
            
            scope.$watch('pagination.totalPages', function(newVal) {
                if (scope.pagination && newVal !== undefined) {
                    scope.updatePageNumbers();
                }
            });
            
            scope.$watch('pagination.currentPage', function(newVal) {
                if (scope.pagination && newVal !== undefined) {
                    scope.updatePageNumbers();
                }
            });
        }
    };
});

