// School Year Controller
app.controller('SchoolYearController', ['$scope', '$location', '$routeParams', '$timeout', 'SchoolYearService', 'AcademicYearService', 'AuthService', 'AvatarService', 'ToastService', 'LoggerService',
    function($scope, $location, $routeParams, $timeout, SchoolYearService, AcademicYearService, AuthService, AvatarService, ToastService, LoggerService) {
    
    $scope.schoolYears = [];
    $scope.currentSchoolYear = null;
    $scope.currentSemesterInfo = null;
    $scope.schoolYear = {};
    $scope.academicYears = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Get current user for header
    $scope.getCurrentUser = function() {
        return AuthService.getCurrentUser();
    };
    
    // Logout function
    $scope.logout = function() {
        AuthService.logout();
    };
    
    // Load all school years
    $scope.loadSchoolYears = function() {
        $scope.loading = true;
        SchoolYearService.getAll()
            .then(function(response) {
                $scope.schoolYears = response.data;
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải danh sách năm học';
                $scope.loading = false;
                LoggerService.error('Error loading school years', error);
            });
    };
    
    // Load current school year
    $scope.loadCurrentSchoolYear = function() {
        SchoolYearService.getCurrent()
            .then(function(response) {
                // Backend may return data object or message object
                if (response.data && response.data.schoolYearId) {
                    // Valid school year object
                    $scope.currentSchoolYear = response.data;
                } else if (response.data && response.data.message) {
                    // No school year available (message only)
                    $scope.currentSchoolYear = null;
                    // Optionally show a toast notification
                    if (response.data.message) {
                        ToastService.info(response.data.message);
                    }
                } else {
                    $scope.currentSchoolYear = null;
                }
            })
            .catch(function(error) {
                // Silently handle errors - backend now handles fallback
                $scope.currentSchoolYear = null;
                if (error.status && error.status !== 200) {
                    LoggerService.warn('Could not load current school year', { status: error.status });
                }
            });
    };
    
    // Load current semester info
    $scope.loadCurrentSemesterInfo = function() {
        SchoolYearService.getCurrentSemesterInfo()
            .then(function(response) {
                if (response.data) {
                    $scope.currentSemesterInfo = response.data;
                } else {
                    $scope.currentSemesterInfo = null;
                }
            })
            .catch(function(error) {
                // Silently handle - no semester info available (expected if no school year)
                $scope.currentSemesterInfo = null;
            });
    };
    
    // Load academic years for dropdown
    $scope.loadAcademicYears = function() {
        AcademicYearService.getAll()
            .then(function(response) {
                $scope.academicYears = response.data;
            })
            .catch(function(error) {
                LoggerService.error('Error loading academic years', error);
            });
    };
    
    // Format date for date input (YYYY-MM-DD format)
    function formatDateForInput(dateString) {
        if (!dateString) return null;
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            // Format as YYYY-MM-DD for date input
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        } catch (e) {
            return null;
        }
    }
    
    // Load school year by ID for editing
    $scope.loadSchoolYear = function(id) {
        $scope.loading = true;
        SchoolYearService.getById(id)
            .then(function(response) {
                $scope.schoolYear = response.data;
                // Format dates for date inputs to avoid AngularJS datefmt error
                if ($scope.schoolYear.startDate) {
                    $scope.schoolYear.startDate = formatDateForInput($scope.schoolYear.startDate);
                }
                if ($scope.schoolYear.endDate) {
                    $scope.schoolYear.endDate = formatDateForInput($scope.schoolYear.endDate);
                }
                $scope.isEditMode = true;
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải thông tin năm học';
                $scope.loading = false;
                LoggerService.error('Error loading school year', error);
            });
    };
    
    // Activate school year
    $scope.activateSchoolYear = function(schoolYearId, semester) {
        if (!confirm('Bạn có chắc chắn muốn kích hoạt năm học này?')) {
            return;
        }
        
        var semesterToActivate = semester || 1;
        $scope.loading = true;
        
        SchoolYearService.activate(schoolYearId, semesterToActivate)
            .then(function(response) {
                ToastService.success('Đã kích hoạt năm học thành công!');
                $scope.loadSchoolYears();
                $scope.loadCurrentSchoolYear();
                $scope.loadCurrentSemesterInfo();
            })
            .catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể kích hoạt năm học');
                LoggerService.error('Error activating school year', error);
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Deactivate school year
    $scope.deactivateSchoolYear = function(schoolYearId) {
        if (!confirm('Bạn có chắc chắn muốn hủy kích hoạt năm học này?')) {
            return;
        }
        
        $scope.loading = true;
        SchoolYearService.deactivate(schoolYearId)
            .then(function(response) {
                ToastService.success('Đã hủy kích hoạt năm học!');
                $scope.loadSchoolYears();
                $scope.loadCurrentSchoolYear();
            })
            .catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể hủy kích hoạt năm học');
                LoggerService.error('Error deactivating school year', error);
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Auto-create school years for cohort
    $scope.autoCreateForCohort = function() {
        var startYear = prompt('Nhập năm bắt đầu của khóa (VD: 2025 cho K25):');
        if (!startYear || isNaN(startYear)) {
            ToastService.warning('Năm không hợp lệ!');
            return;
        }
        
        $scope.loading = true;
        SchoolYearService.autoCreateForCohort(parseInt(startYear))
            .then(function(response) {
                ToastService.success('Đã tự động tạo năm học cho khóa K' + startYear.substring(2) + '!');
                $scope.loadSchoolYears();
                $scope.loadAcademicYears();
            })
            .catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể tự động tạo năm học');
                LoggerService.error('Error auto-creating school years', error);
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Transition to next semester
    $scope.transitionToNextSemester = function() {
        if (!confirm('Bạn có chắc chắn muốn chuyển sang học kỳ tiếp theo? Hệ thống sẽ tự động xác định học kỳ dựa trên ngày hiện tại.')) {
            return;
        }
        
        $scope.loading = true;
        SchoolYearService.transitionToNextSemester()
            .then(function(response) {
                ToastService.success('Đã chuyển sang học kỳ mới thành công!');
                
                // Reload data
                $scope.loadSchoolYears();
                $scope.loadCurrentSchoolYear();
                $scope.loadCurrentSemesterInfo();
                
                // Emit event để các controller khác có thể tự động refresh
                // Lấy thông tin năm học hiện tại để emit
                SchoolYearService.getCurrent()
                    .then(function(currentResponse) {
                        if (currentResponse.data && currentResponse.data.schoolYearId) {
                            $scope.$root.$broadcast('semester:transitioned', {
                                schoolYearId: currentResponse.data.schoolYearId,
                                currentSemester: currentResponse.data.currentSemester,
                                timestamp: new Date()
                            });
                        }
                    })
                    .catch(function(err) {
                        // Ignore error, event vẫn được emit với thông tin hiện có
                        LoggerService.warn('Could not get current school year for event', err);
                    });
            })
            .catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể chuyển học kỳ');
                LoggerService.error('Error transitioning semester', error);
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Force transition to specific semester (FOR TEST ONLY)
    $scope.forceTransitionSemester = function(targetSemester) {
        var semesterName = targetSemester === 1 ? 'Học kỳ 1' : 'Học kỳ 2';
        if (!confirm('⚠️ FORCE chuyển sang ' + semesterName + '?\n\n' +
                     'Tính năng này CHỈ DÙNG CHO TEST.\n' +
                     'Hệ thống sẽ force chuyển học kỳ mà không kiểm tra ngày tháng.\n\n' +
                     'Bạn có chắc chắn muốn tiếp tục?')) {
            return;
        }
        
        $scope.loading = true;
        SchoolYearService.forceTransitionSemester(targetSemester)
            .then(function(response) {
                ToastService.success(response.data?.message || 'Đã force chuyển học kỳ thành công!');
                
                // Reload data
                $scope.loadSchoolYears();
                $scope.loadCurrentSchoolYear();
                $scope.loadCurrentSemesterInfo();
                
                // Emit event để các controller khác có thể tự động refresh
                if (response.data && response.data.schoolYearId) {
                    $scope.$root.$broadcast('semester:transitioned', {
                        schoolYearId: response.data.schoolYearId,
                        currentSemester: response.data.newSemester,
                        oldSemester: response.data.oldSemester,
                        timestamp: new Date()
                    });
                }
            })
            .catch(function(error) {
                // Log detailed error for debugging
                LoggerService.error('Error force transitioning semester', {
                    error: error,
                    status: error.status,
                    statusText: error.statusText,
                    data: error.data,
                    config: error.config
                });
                
                // Show detailed error message
                var errorMessage = 'Không thể force chuyển học kỳ';
                if (error.data) {
                    if (error.data.message) {
                        errorMessage = error.data.message;
                    } else if (typeof error.data === 'string') {
                        errorMessage = error.data;
                    } else if (error.data.errors) {
                        errorMessage = 'Lỗi validation: ' + JSON.stringify(error.data.errors);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                ToastService.error(errorMessage);
                
                // Log to console for debugging
                console.error('Force transition semester error:', {
                    status: error.status,
                    message: errorMessage,
                    fullError: error
                });
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Create or update school year
    $scope.saveSchoolYear = function() {
        $scope.error = null;
        $scope.loading = true;
        
        var savePromise;
        if ($scope.isEditMode) {
            savePromise = SchoolYearService.update($scope.schoolYear.schoolYearId, $scope.schoolYear);
        } else {
            savePromise = SchoolYearService.create($scope.schoolYear);
        }
        
        savePromise
            .then(function(response) {
                ToastService.success('Lưu năm học thành công!');
                $timeout(function() {
                    $location.path('/school-years');
                }, 1500);
            })
            .catch(function(error) {
                $scope.error = error.data?.message || 'Không thể lưu năm học';
                ToastService.error($scope.error);
                LoggerService.error('Error saving school year', error);
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Delete school year
    $scope.deleteSchoolYear = function(schoolYearId) {
        if (!confirm('Bạn có chắc chắn muốn xóa năm học này?')) {
            return;
        }
        
        $scope.loading = true;
        SchoolYearService.delete(schoolYearId)
            .then(function(response) {
                ToastService.success('Xóa năm học thành công!');
                $scope.loadSchoolYears();
            })
            .catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể xóa năm học');
                LoggerService.error('Error deleting school year', error);
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Navigation
    $scope.goToCreate = function() {
        $location.path('/school-years/create');
    };
    
    $scope.goToEdit = function(schoolYearId) {
        $location.path('/school-years/edit/' + schoolYearId);
    };
    
    $scope.cancel = function() {
        $location.path('/school-years');
    };
    
    // Utility functions
    $scope.getSemesterName = function(semester) {
        if (semester === 1) return 'Học kỳ 1 (Tháng 9 - Tháng 1)';
        if (semester === 2) return 'Học kỳ 2 (Tháng 2 - Tháng 6)';
        return 'N/A';
    };
    
    $scope.formatDateRange = function(startDate, endDate) {
        if (!startDate || !endDate) return '';
        var start = new Date(startDate);
        var end = new Date(endDate);
        return start.toLocaleDateString('vi-VN') + ' - ' + end.toLocaleDateString('vi-VN');
    };
    
    // Get current time for display
    $scope.getCurrentTime = function() {
        var now = new Date();
        return now.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Initialize based on route
    if ($location.path() === '/school-years') {
        $scope.loadSchoolYears();
        $scope.loadCurrentSchoolYear();
        $scope.loadCurrentSemesterInfo();
    } else if ($routeParams.id) {
        $scope.loadSchoolYear($routeParams.id);
        $scope.loadAcademicYears();
    } else if ($location.path() === '/school-years/create') {
        $scope.loadAcademicYears();
    }
}]);

