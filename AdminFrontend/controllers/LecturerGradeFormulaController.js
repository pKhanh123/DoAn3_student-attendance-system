// Lecturer Grade Formula Controller (Read-only)
app.controller('LecturerGradeFormulaController', [
    '$scope',
    'AuthService',
    'GradeFormulaConfigService',
    'SubjectService',
    'ClassService',
    'CurrentSemesterHelper',
    'ToastService',
    'LoggerService',
    'PaginationService',
    function($scope, AuthService, GradeFormulaConfigService, SubjectService, ClassService, CurrentSemesterHelper, ToastService, LoggerService, PaginationService) {
        $scope.currentUser = AuthService.getCurrentUser();
        
        // Configs list
        $scope.configs = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.filters = {
            subjectId: null,
            classId: null
        };
        
        // Pagination
        $scope.pagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0
        };
        
        // Filter options
        $scope.subjects = [];
        $scope.classes = [];
        $scope.loadingFilters = false;
        
        // Load configs
        function loadConfigs() {
            $scope.loading = true;
            $scope.error = null;
            
            var filters = {};
            if ($scope.filters.subjectId) filters.subjectId = $scope.filters.subjectId;
            if ($scope.filters.classId) filters.classId = $scope.filters.classId;
            
            GradeFormulaConfigService.getAll(filters, $scope.pagination.page, $scope.pagination.pageSize)
                .then(function(response) {
                    var data = response.data || response;
                    $scope.configs = (data.data || data.configs || []);
                    $scope.pagination.totalCount = data.totalCount || $scope.configs.length;
                })
                .catch(function(error) {
                    LoggerService.error('Load grade formula configs error', error);
                    $scope.error = 'Không thể tải danh sách công thức điểm';
                    ToastService.error('Không thể tải danh sách công thức điểm');
                })
                .finally(function() {
                    $scope.loading = false;
                });
        }
        
        // Load filter options
        function loadFilterOptions() {
            $scope.loadingFilters = true;
            
            var lecturerId = $scope.currentUser && ($scope.currentUser.lecturerId || $scope.currentUser.userId);
            
            // Load classes for lecturer (filtered by current semester)
            if (lecturerId) {
                // Lấy thông tin học kỳ hiện tại trước
                CurrentSemesterHelper.getCurrentSemesterInfo()
                    .then(function(currentSemesterInfo) {
                        $scope.currentSemesterInfo = currentSemesterInfo;
                        
                        return ClassService.getByLecturer(lecturerId);
                    })
                    .then(function(response) {
                        var allClasses = (response.data && response.data.data) || [];
                        
                        // Filter theo học kỳ hiện tại (ưu tiên hiển thị học kỳ hiện tại)
                        if ($scope.currentSemesterInfo && $scope.currentSemesterInfo.semester) {
                            $scope.classes = CurrentSemesterHelper.filterClassesByCurrentSemester(
                                allClasses,
                                $scope.currentSemesterInfo,
                                { filterOnly: false, sortByCurrent: true }
                            );
                        } else {
                            $scope.classes = allClasses;
                        }
                        
                        // Extract unique subjects from filtered classes
                        var subjectMap = {};
                        $scope.classes.forEach(function(c) {
                            if (c.subjectId && !subjectMap[c.subjectId]) {
                                subjectMap[c.subjectId] = {
                                    subjectId: c.subjectId,
                                    subjectCode: c.subjectCode,
                                    subjectName: c.subjectName
                                };
                            }
                        });
                        $scope.subjects = Object.values(subjectMap);
                    })
                    .catch(function(error) {
                        LoggerService.warn('Load classes error', error);
                    })
                    .finally(function() {
                        $scope.loadingFilters = false;
                    });
            } else {
                $scope.loadingFilters = false;
            }
        }
        
        // Get scope description
        $scope.getScopeDescription = function(config) {
            if (config.classId && config.className) {
                return 'Lớp: ' + config.className;
            }
            if (config.classId && config.classCode) {
                return 'Lớp: ' + config.classCode;
            }
            if (config.subjectId && config.subjectName) {
                return 'Môn: ' + config.subjectName;
            }
            if (config.subjectId && config.subjectCode) {
                return 'Môn: ' + config.subjectCode;
            }
            if (config.schoolYearId && config.schoolYearName) {
                return 'Năm học: ' + config.schoolYearName;
            }
            if (config.isDefault) {
                return 'Công thức mặc định';
            }
            return 'Không xác định';
        };
        
        // Apply filters
        $scope.applyFilters = function() {
            $scope.pagination.page = 1;
            loadConfigs();
        };
        
        // Clear filters
        $scope.clearFilters = function() {
            $scope.filters = {
                subjectId: null,
                classId: null
            };
            $scope.pagination.page = 1;
            loadConfigs();
        };
        
        // Handle page change
        $scope.handlePageChange = function() {
            loadConfigs();
        };
        
        // Initialize
        loadFilterOptions();
        loadConfigs();
    }
]);

