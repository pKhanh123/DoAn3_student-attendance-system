// Major Controller
app.controller('MajorController', ['$scope', '$location', '$routeParams', '$timeout', 'MajorService', 'FacultyService', 'PaginationService',
    function($scope, $location, $routeParams, $timeout, MajorService, FacultyService, PaginationService) {
    
    $scope.majors = [];
    $scope.displayedMajors = [];
    $scope.faculties = [];
    $scope.major = {};
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    
    // Pagination
    $scope.pagination = PaginationService.init(10);
    
    // Load majors with server-side pagination
    $scope.loadMajors = function() {
        $scope.loading = true;
        $scope.error = null;
        
        var params = {
            page: $scope.pagination.currentPage,
            pageSize: $scope.pagination.pageSize,
            search: $scope.pagination.searchTerm || null
        };
        
        // Remove empty values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '' || params[key] === undefined) {
                delete params[key];
            }
        });
        
        MajorService.getAll(params)
            .then(function(response) {
                var result = response.data;
                
                // Update displayed majors
                $scope.displayedMajors = result.data || [];
                $scope.majors = result.data || [];
                
                // Update pagination info from server
                if (result.totalCount !== undefined) {
                    $scope.pagination.totalItems = result.totalCount;
                    $scope.pagination.totalPages = result.totalPages;
                    $scope.pagination.currentPage = result.page;
                    $scope.pagination.pageSize = result.pageSize;
                }
                
                // Recalculate pagination UI
                $scope.pagination = PaginationService.calculate($scope.pagination);
                
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải danh sách ngành';
                $scope.loading = false;
            });
    };
    
    // Search handler
    $scope.handleSearch = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadMajors();
    };
    
    // Page change handler
    $scope.handlePageChange = function(page) {
        $scope.pagination.currentPage = page;
        $scope.loadMajors();
    };
    
    // Page size change handler
    $scope.handlePageSizeChange = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadMajors();
    };
    
    // Load faculties for dropdown
    $scope.loadFaculties = function() {
        FacultyService.getAll()
            .then(function(response) {
                $scope.faculties = response.data;
            })
            .catch(function(error) {
                // Error handled silently
            });
    };
    
    // Load major by ID for editing
    $scope.loadMajor = function(id) {
        $scope.loading = true;
        MajorService.getById(id)
            .then(function(response) {
                $scope.major = response.data;
                $scope.isEditMode = true;
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải thông tin ngành';
                $scope.loading = false;
            });
    };
    
    // Create or update major
    $scope.saveMajor = function() {
        $scope.error = null;
        $scope.loading = true;
        
        var savePromise;
        if ($scope.isEditMode) {
            savePromise = MajorService.update($scope.major.majorId, $scope.major);
        } else {
            savePromise = MajorService.create($scope.major);
        }
        
        savePromise
            .then(function(response) {
                $scope.success = 'Lưu ngành thành công';
                $scope.loading = false;
                $timeout(function() {
                    $location.path('/majors');
                }, 1500);
            })
            .catch(function(error) {
                $scope.error = error.data?.message || 'Không thể lưu ngành';
                $scope.loading = false;
            });
    };
    
    // Delete major
    $scope.deleteMajor = function(majorId) {
        if (!confirm('Bạn có chắc chắn muốn xóa ngành này?')) {
            return;
        }
        
        MajorService.delete(majorId)
            .then(function(response) {
                $scope.success = 'Xóa ngành thành công';
                $scope.loadMajors();
            })
            .catch(function(error) {
                $scope.error = 'Không thể xóa ngành';
            });
    };
    
    // Navigation
    $scope.goToCreate = function() {
        $location.path('/majors/create');
    };
    
    $scope.goToEdit = function(majorId) {
        $location.path('/majors/edit/' + majorId);
    };
    
    $scope.cancel = function() {
        $location.path('/majors');
    };
    
    // Initialize based on route
    if ($location.path() === '/majors') {
        $scope.loadMajors();
    } else if ($routeParams.id) {
        $scope.loadMajor($routeParams.id);
        $scope.loadFaculties();
    } else {
        $scope.loadFaculties();
    }
}]);

