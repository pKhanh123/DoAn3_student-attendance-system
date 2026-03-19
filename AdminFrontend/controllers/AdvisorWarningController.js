// Advisor Warning Controller - Cảnh báo và gửi email
app.controller('AdvisorWarningController', [
    '$scope',
    '$location',
    'AdvisorService',
    'FacultyService',
    'MajorService',
    'AdministrativeClassService',
    'ToastService',
    function($scope, $location, AdvisorService, FacultyService, MajorService, AdministrativeClassService, ToastService) {
    
    // Active tab
    $scope.activeTab = 'attendance';
    
    // Loading states
    $scope.loading = {
        attendance: false,
        academic: false,
        sending: false,
        config: false,
        filters: false
    };
    
    // Error states
    $scope.error = {
        attendance: null,
        academic: null,
        sending: null,
        config: null
    };
    
    // Data
    $scope.attendanceWarnings = [];
    $scope.academicWarnings = [];
    $scope.warningConfig = null;
    
    // Pagination
    $scope.pagination = {
        attendance: {
            page: 1,
            pageSize: 100,
            totalCount: 0,
            totalPages: 0
        },
        academic: {
            page: 1,
            pageSize: 100,
            totalCount: 0,
            totalPages: 0
        }
    };
    
    // Filters
    $scope.filters = {
        attendance: {
            facultyId: null,
            majorId: null,
            classId: null,
            cohortYear: null,
            attendanceThreshold: 20.0
        },
        academic: {
            facultyId: null,
            majorId: null,
            classId: null,
            cohortYear: null,
            gpaThreshold: 2.0
        }
    };
    
    // Filter options
    $scope.faculties = [];
    $scope.majors = [];
    $scope.classes = [];
    $scope.cohortYears = [];
    
    // Selected students for bulk email
    $scope.selectedStudents = {
        attendance: [],
        academic: []
    };
    
    // Email form
    $scope.emailForm = {
        customSubject: null,
        customMessage: null,
        warningType: 'attendance'
    };
    
    // Initialize cohort years
    $scope.initCohortYears = function() {
        var currentYear = new Date().getFullYear();
        $scope.cohortYears = [];
        for (var i = 0; i < 10; i++) {
            $scope.cohortYears.push((currentYear - i).toString());
        }
    };
    
    // Load faculties
    $scope.loadFaculties = function() {
        $scope.loading.filters = true;
        FacultyService.getAll().then(function(response) {
            var data = response.data?.data || response.data || [];
            $scope.faculties = Array.isArray(data) ? data : [];
        }).catch(function(error) {
            // Error('Error loading faculties:', error);
            $scope.faculties = [];
        }).finally(function() {
            $scope.loading.filters = false;
        });
    };
    
    // Load majors by faculty
    $scope.loadMajors = function(type) {
        var facultyId = type === 'attendance' ? $scope.filters.attendance.facultyId : $scope.filters.academic.facultyId;
        if (facultyId) {
            $scope.loading.filters = true;
            MajorService.getByFaculty(facultyId).then(function(response) {
                var data = response.data?.data || response.data || [];
                $scope.majors = Array.isArray(data) ? data : [];
            }).catch(function(error) {
                // Error('Error loading majors:', error);
                $scope.majors = [];
            }).finally(function() {
                $scope.loading.filters = false;
            });
        } else {
            $scope.majors = [];
        }
        $scope.loadClasses(type);
    };
    
    // Load classes by major
    $scope.loadClasses = function(type) {
        var majorId = type === 'attendance' ? $scope.filters.attendance.majorId : $scope.filters.academic.majorId;
        if (majorId) {
            $scope.loading.filters = true;
            AdministrativeClassService.getAll(1, 1000, null, majorId, null, null).then(function(response) {
                var data = response.data?.data || response.data || [];
                $scope.classes = Array.isArray(data) ? data : [];
            }).catch(function(error) {
                // Error('Error loading classes:', error);
                $scope.classes = [];
            }).finally(function() {
                $scope.loading.filters = false;
            });
        } else {
            $scope.classes = [];
        }
    };
    
    // Load attendance warnings
    $scope.loadAttendanceWarnings = function(page) {
        if (page) {
            $scope.pagination.attendance.page = page;
        }
        
        $scope.loading.attendance = true;
        $scope.error.attendance = null;
        
        var params = {
            page: $scope.pagination.attendance.page,
            pageSize: $scope.pagination.attendance.pageSize,
            attendanceThreshold: $scope.filters.attendance.attendanceThreshold,
            filters: {
                facultyId: $scope.filters.attendance.facultyId,
                majorId: $scope.filters.attendance.majorId,
                classId: $scope.filters.attendance.classId,
                cohortYear: $scope.filters.attendance.cohortYear
            }
        };
        
        AdvisorService.getAttendanceWarnings(params, false).then(function(response) {
            $scope.attendanceWarnings = response.data || [];
            $scope.pagination.attendance = {
                page: response.pagination?.page || 1,
                pageSize: response.pagination?.pageSize || 100,
                totalCount: response.pagination?.totalCount || 0,
                totalPages: response.pagination?.totalPages || 0
            };
            $scope.loading.attendance = false;
        }).catch(function(error) {
            // Error('Error loading attendance warnings:', error);
            $scope.error.attendance = error.message || error.data?.message || 'Lỗi khi tải danh sách cảnh báo chuyên cần';
            $scope.loading.attendance = false;
            ToastService.error('Lỗi khi tải danh sách cảnh báo chuyên cần');
        });
    };
    
    // Load academic warnings
    $scope.loadAcademicWarnings = function(page) {
        if (page) {
            $scope.pagination.academic.page = page;
        }
        
        $scope.loading.academic = true;
        $scope.error.academic = null;
        
        var params = {
            page: $scope.pagination.academic.page,
            pageSize: $scope.pagination.academic.pageSize,
            gpaThreshold: $scope.filters.academic.gpaThreshold,
            filters: {
                facultyId: $scope.filters.academic.facultyId,
                majorId: $scope.filters.academic.majorId,
                classId: $scope.filters.academic.classId,
                cohortYear: $scope.filters.academic.cohortYear
            }
        };
        
        AdvisorService.getAcademicWarnings(params, false).then(function(response) {
            $scope.academicWarnings = response.data || [];
            $scope.pagination.academic = {
                page: response.pagination?.page || 1,
                pageSize: response.pagination?.pageSize || 100,
                totalCount: response.pagination?.totalCount || 0,
                totalPages: response.pagination?.totalPages || 0
            };
            $scope.loading.academic = false;
        }).catch(function(error) {
            // Error('Error loading academic warnings:', error);
            $scope.error.academic = error.message || error.data?.message || 'Lỗi khi tải danh sách cảnh báo học tập';
            $scope.loading.academic = false;
            ToastService.error('Lỗi khi tải danh sách cảnh báo học tập');
        });
    };
    
    // Switch tab
    $scope.switchTab = function(tab) {
        $scope.activeTab = tab;
        
        // Load data for the tab if not already loaded
        if (tab === 'attendance' && $scope.attendanceWarnings.length === 0 && !$scope.error.attendance) {
            $scope.loadAttendanceWarnings();
        } else if (tab === 'academic' && $scope.academicWarnings.length === 0 && !$scope.error.academic) {
            $scope.loadAcademicWarnings();
        } else if (tab === 'config' && !$scope.warningConfig && !$scope.error.config) {
            $scope.loadWarningConfig();
        }
    };
    
    // Toggle select student
    $scope.toggleSelectStudent = function(studentId, type) {
        var selected = type === 'attendance' ? $scope.selectedStudents.attendance : $scope.selectedStudents.academic;
        var index = selected.indexOf(studentId);
        if (index > -1) {
            selected.splice(index, 1);
        } else {
            selected.push(studentId);
        }
    };
    
    // Check if student is selected
    $scope.isSelected = function(studentId, type) {
        var selected = type === 'attendance' ? $scope.selectedStudents.attendance : $scope.selectedStudents.academic;
        return selected.indexOf(studentId) > -1;
    };
    
    // Select all
    $scope.selectAll = function(type) {
        var warnings = type === 'attendance' ? $scope.attendanceWarnings : $scope.academicWarnings;
        var selected = type === 'attendance' ? $scope.selectedStudents.attendance : $scope.selectedStudents.academic;
        
        if (selected.length === warnings.length) {
            selected.length = 0;
        } else {
            selected.length = 0;
            warnings.forEach(function(warning) {
                selected.push(warning.studentId);
            });
        }
    };
    
    // Send email to single student
    $scope.sendEmailToStudent = function(studentId, warningType) {
        if (!confirm('Bạn có chắc chắn muốn gửi email cảnh báo cho sinh viên này?')) {
            return;
        }
        
        $scope.loading.sending = true;
        $scope.error.sending = null;
        
        var params = {
            studentIds: [studentId],
            warningType: warningType,
            customSubject: $scope.emailForm.customSubject,
            customMessage: $scope.emailForm.customMessage
        };
        
        AdvisorService.sendWarningEmail(params).then(function(response) {
            $scope.loading.sending = false;
            ToastService.success('Email đã được gửi thành công');
        }).catch(function(error) {
            // Error('Error sending email:', error);
            $scope.error.sending = error.message || error.data?.message || 'Lỗi khi gửi email';
            $scope.loading.sending = false;
            ToastService.error('Lỗi khi gửi email');
        });
    };
    
    // Send bulk email
    $scope.sendBulkEmail = function(warningType) {
        var selected = warningType === 'attendance' ? $scope.selectedStudents.attendance : $scope.selectedStudents.academic;
        
        if (selected.length === 0) {
            ToastService.warning('Vui lòng chọn ít nhất một sinh viên');
            return;
        }
        
        if (!confirm('Bạn có chắc chắn muốn gửi email cảnh báo cho ' + selected.length + ' sinh viên đã chọn?')) {
            return;
        }
        
        $scope.loading.sending = true;
        $scope.error.sending = null;
        
        var params = {
            studentIds: selected,
            warningType: warningType,
            customSubject: $scope.emailForm.customSubject,
            customMessage: $scope.emailForm.customMessage
        };
        
        AdvisorService.sendWarningEmail(params).then(function(response) {
            $scope.loading.sending = false;
            ToastService.success('Đã gửi email cho ' + selected.length + ' sinh viên');
            // Clear selected
            selected.length = 0;
        }).catch(function(error) {
            // Error('Error sending bulk email:', error);
            $scope.error.sending = error.message || error.data?.message || 'Lỗi khi gửi email';
            $scope.loading.sending = false;
            ToastService.error('Lỗi khi gửi email');
        });
    };
    
    // Load warning config
    $scope.loadWarningConfig = function() {
        $scope.loading.config = true;
        $scope.error.config = null;
        
        AdvisorService.getWarningConfig(true).then(function(config) {
            $scope.warningConfig = config;
            // Update filters with config values
            $scope.filters.attendance.attendanceThreshold = config.attendanceThreshold || 20.0;
            $scope.filters.academic.gpaThreshold = config.gpaThreshold || 2.0;
            $scope.loading.config = false;
        }).catch(function(error) {
            // Error('Error loading warning config:', error);
            $scope.error.config = error.message || error.data?.message || 'Lỗi khi tải cấu hình';
            $scope.loading.config = false;
        });
    };
    
    // Save warning config
    $scope.saveWarningConfig = function() {
        if (!$scope.warningConfig) {
            return;
        }
        
        $scope.loading.config = true;
        
        AdvisorService.updateWarningConfig($scope.warningConfig).then(function(response) {
            $scope.loading.config = false;
            ToastService.success('Cấu hình đã được lưu thành công');
            // Update filters
            $scope.filters.attendance.attendanceThreshold = $scope.warningConfig.attendanceThreshold;
            $scope.filters.academic.gpaThreshold = $scope.warningConfig.gpaThreshold;
        }).catch(function(error) {
            // Error('Error saving warning config:', error);
            $scope.loading.config = false;
            ToastService.error('Lỗi khi lưu cấu hình');
        });
    };
    
    // View student detail
    $scope.viewStudentDetail = function(studentId) {
        $location.path('/advisor/students/' + studentId);
    };
    
    // Get page numbers for pagination
    $scope.getPageNumbers = function(type) {
        var pagination = type === 'attendance' ? $scope.pagination.attendance : $scope.pagination.academic;
        var pages = [];
        var totalPages = pagination.totalPages;
        var currentPage = pagination.page;
        var maxPages = 10;
        
        if (totalPages <= maxPages) {
            for (var i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            var startPage = Math.max(2, currentPage - 2);
            var endPage = Math.min(totalPages - 1, currentPage + 2);
            
            if (startPage > 2) {
                pages.push('...');
            }
            
            for (var j = startPage; j <= endPage; j++) {
                pages.push(j);
            }
            
            if (endPage < totalPages - 1) {
                pages.push('...');
            }
            
            pages.push(totalPages);
        }
        
        return pages;
    };
    
    // Initialize
    $scope.initCohortYears();
    $scope.loadFaculties();
    $scope.loadWarningConfig(); // Load config on init
    $scope.loadAttendanceWarnings(); // Load default tab
}]);

