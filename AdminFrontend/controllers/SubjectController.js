// Subject Controller
app.controller('SubjectController', ['$scope', '$location', '$routeParams', '$timeout', 'SubjectService', 'DepartmentService', 'PaginationService',
    function($scope, $location, $routeParams, $timeout, SubjectService, DepartmentService, PaginationService) {
    
    $scope.subjects = [];
    $scope.displayedSubjects = [];
    $scope.subject = {};
    $scope.departments = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    $scope.filterByDepartment = '';
    
    // Pagination
    $scope.pagination = PaginationService.init(10);
    
    // Load subjects with server-side pagination
    $scope.loadSubjects = function() {
        $scope.loading = true;
        $scope.error = null;
        
        var params = {
            page: $scope.pagination.currentPage,
            pageSize: $scope.pagination.pageSize,
            search: $scope.pagination.searchTerm || null,
            departmentId: $scope.filterByDepartment || null
        };
        
        // Remove empty values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '' || params[key] === undefined) {
                delete params[key];
            }
        });
        
        SubjectService.getAll(params)
            .then(function(response) {
                var result = response.data;
                
                // Update displayed subjects
                $scope.displayedSubjects = (result.data || []).map(function(s) {
                    if (typeof s.lecturerCount === 'undefined') s.lecturerCount = 0;
                    return s;
                });
                $scope.subjects = $scope.displayedSubjects;
                
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
                $scope.error = 'Không thể tải danh sách môn học';
                $scope.loading = false;
            });
    };
    
    // Load lecturer count for subject (legacy - no longer used on list)
    $scope.loadSubjectLecturerCount = function(subject) {
        SubjectService.getLecturersBySubject(subject.subjectId)
            .then(function(response) {
                subject.lecturerCount = response.data.length;
            })
            .catch(function() {
                subject.lecturerCount = 0;
            });
    };
    
    // Filter subjects by department
    $scope.filterSubjects = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadSubjects();
    };
    
    // Search handler
    $scope.handleSearch = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadSubjects();
    };
    
    // Page change handler
    $scope.handlePageChange = function(page) {
        $scope.pagination.currentPage = page;
        $scope.loadSubjects();
    };
    
    // Page size change handler
    $scope.handlePageSizeChange = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadSubjects();
    };
    
    // Load subject by ID for editing
    $scope.loadSubject = function(id) {
        $scope.loading = true;
        SubjectService.getById(id)
            .then(function(response) {
                $scope.subject = response.data;
                $scope.isEditMode = true;
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải thông tin môn học';
                $scope.loading = false;
            });
    };
    
    // Create or update subject
    $scope.saveSubject = function() {
        $scope.error = null;
        $scope.loading = true;
        
        var savePromise;
        if ($scope.isEditMode) {
            savePromise = SubjectService.update($scope.subject.subjectId, $scope.subject);
        } else {
            savePromise = SubjectService.create($scope.subject);
        }
        
        savePromise
            .then(function(response) {
                $scope.success = 'Lưu môn học thành công';
                $scope.loading = false;
                $timeout(function() {
                    $location.path('/subjects');
                }, 1500);
            })
            .catch(function(error) {
                $scope.error = error.data?.message || 'Không thể lưu môn học';
                $scope.loading = false;
            });
    };
    
    // Delete subject
    $scope.deleteSubject = function(subjectId) {
        if (!confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
            return;
        }
        
        SubjectService.delete(subjectId)
            .then(function(response) {
                $scope.success = 'Xóa môn học thành công';
                $scope.loadSubjects();
            })
            .catch(function(error) {
                $scope.error = 'Không thể xóa môn học';
            });
    };
    
    // Navigation
    $scope.goToCreate = function() {
        $location.path('/subjects/create');
    };
    
    $scope.goToEdit = function(subjectId) {
        $location.path('/subjects/edit/' + subjectId);
    };
    
    $scope.cancel = function() {
        $location.path('/subjects');
    };
    
    // ============================================================
    // 🔹 Load danh sách bộ môn (cho dropdown)
    // ============================================================
    $scope.loadDepartments = function() {
        DepartmentService.getAll()
            .then(function(response) {
                $scope.departments = response.data;
            })
            .catch(function(error) {
                // Error handled silently
            });
    };
    
    // Initialize based on route
    if ($location.path() === '/subjects') {
        $scope.loadSubjects();
        $scope.loadDepartments(); // Load departments for filter
    } else if ($routeParams.id) {
        $scope.loadDepartments();
        $scope.loadSubject($routeParams.id);
    } else if ($location.path() === '/subjects/create') {
        $scope.loadDepartments();
    }
}]);

