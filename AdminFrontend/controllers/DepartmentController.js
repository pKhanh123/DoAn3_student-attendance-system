// Department Controller
app.controller('DepartmentController', ['$scope', '$location', '$routeParams', '$timeout', 'DepartmentService', 'FacultyService', 'PaginationService',
    function($scope, $location, $routeParams, $timeout, DepartmentService, FacultyService, PaginationService) {
    
    $scope.departments = [];
    $scope.displayedDepartments = [];
    $scope.department = {};
    $scope.faculties = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    
    // Pagination
    $scope.pagination = PaginationService.init(10);
    
    // ============================================================
    // 🔹 Load danh sách khoa (cho dropdown)
    // ============================================================
    $scope.loadFaculties = function() {
        FacultyService.getAll()
            .then(function(response) {
                $scope.faculties = response.data;
            })
            .catch(function(error) {
                // Error handled silently
            });
    };
    
    // ============================================================
    // 🔹 Load danh sách bộ môn với server-side pagination
    // ============================================================
    $scope.loadDepartments = function() {
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
        
        DepartmentService.getAll(params)
            .then(function(response) {
                var result = response.data;
                
                // Update displayed departments
                $scope.displayedDepartments = result.data || [];
                $scope.departments = result.data || [];
                
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
                $scope.error = 'Không thể tải danh sách bộ môn';
                $scope.loading = false;
            });
    };
    
    // Search handler
    $scope.handleSearch = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadDepartments();
    };
    
    // Page change handler
    $scope.handlePageChange = function(page) {
        $scope.pagination.currentPage = page;
        $scope.loadDepartments();
    };
    
    // Page size change handler
    $scope.handlePageSizeChange = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadDepartments();
    };
    
    // ============================================================
    // 🔹 Load bộ môn theo ID (cho chỉnh sửa)
    // ============================================================
    $scope.loadDepartment = function(id) {
        $scope.loading = true;
        DepartmentService.getById(id)
            .then(function(response) {
                $scope.department = response.data;
                $scope.isEditMode = true;
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải thông tin bộ môn';
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 Lưu bộ môn (tạo mới hoặc cập nhật)
    // ============================================================
    $scope.saveDepartment = function() {
        $scope.error = null;
        $scope.loading = true;
        
        var savePromise;
        if ($scope.isEditMode) {
            savePromise = DepartmentService.update($scope.department.departmentId, $scope.department);
        } else {
            savePromise = DepartmentService.create($scope.department);
        }
        
        savePromise
            .then(function(response) {
                $scope.success = 'Lưu bộ môn thành công';
                $scope.loading = false;
                $timeout(function() {
                    $location.path('/departments');
                }, 1500);
            })
            .catch(function(error) {
                $scope.error = error.data?.message || 'Không thể lưu bộ môn';
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 Xóa bộ môn
    // ============================================================
    $scope.deleteDepartment = function(departmentId, departmentName) {
        if (!confirm('Bạn có chắc chắn muốn xóa bộ môn "' + departmentName + '"?\n\n' +
            'Lưu ý: Chỉ có thể xóa bộ môn không có môn học hoặc giảng viên liên kết.')) {
            return;
        }
        
        $scope.loading = true;
        DepartmentService.delete(departmentId)
            .then(function(response) {
                $scope.success = 'Xóa bộ môn thành công';
                $scope.loadDepartments();
            })
            .catch(function(error) {
                $scope.error = error.data?.message || 'Không thể xóa bộ môn';
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 Navigation
    // ============================================================
    $scope.goToCreate = function() {
        $location.path('/departments/create');
    };
    
    $scope.goToEdit = function(departmentId) {
        $location.path('/departments/edit/' + departmentId);
    };
    
    $scope.cancel = function() {
        $location.path('/departments');
    };
    
    // ============================================================
    // 🔹 Initialize
    // ============================================================
    if ($location.path() === '/departments') {
        $scope.loadDepartments();
    } else if ($location.path().indexOf('/departments/edit/') === 0 && $routeParams.id) {
        $scope.loadFaculties();
        $scope.loadDepartment($routeParams.id);
    } else if ($location.path() === '/departments/create') {
        $scope.loadFaculties();
        $scope.department.isActive = true; // Mặc định là active
    }
}]);

