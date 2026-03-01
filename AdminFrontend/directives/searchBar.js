// Search Bar Directive - Unified version with button
app.directive('searchBar', function() {
    return {
        restrict: 'E',
        scope: {
            placeholder: '@',
            searchTerm: '=',
            onSearch: '&'
        },
        template: 
            '<div class="unified-search-bar">' +
                '<div class="search-input-wrapper">' +
                    '<i class="fas fa-search search-icon-inside"></i>' +
                    '<input type="text" ' +
                           'ng-model="searchTerm" ' +
                           'ng-keyup="$event.keyCode === 13 && handleSearch()" ' +
                           'placeholder="{{placeholder || \'Tìm kiếm...\'}}" ' +
                           'class="search-input">' +
                    '<button ng-if="searchTerm" ng-click="clearSearch()" class="search-clear-btn" title="Xóa">' +
                        '<i class="fas fa-times"></i>' +
                    '</button>' +
                '</div>' +
                '<button ng-click="handleSearch()" class="search-submit-btn">' +
                    '<i class="fas fa-search"></i>' +
                    ' Tìm kiếm' +
                '</button>' +
            '</div>',
        link: function(scope) {
            scope.handleSearch = function() {
                scope.onSearch();
            };
            
            scope.clearSearch = function() {
                scope.searchTerm = '';
                scope.onSearch();
            };
        }
    };
});

