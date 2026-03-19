// Advisor Student Controller - Chi tiết sinh viên
app.controller('AdvisorStudentController', [
    '$scope', 
    '$routeParams', 
    '$location',
    'AdvisorService', 
    'SchoolYearService', 
    'SubjectService',
    'ToastService',
    function($scope, $routeParams, $location, AdvisorService, SchoolYearService, SubjectService, ToastService) {
    
    // Get student ID from route params
    $scope.studentId = $routeParams.studentId;
    
    if (!$scope.studentId) {
        ToastService.error('Không tìm thấy mã sinh viên');
        $location.path('/advisor/dashboard');
        return;
    }
    
    // Active tab
    $scope.activeTab = 'detail';
    
    // Student detail
    $scope.student = null;
    $scope.loadingStudent = true;
    $scope.errorStudent = null;
    
    // Grades
    $scope.grades = [];
    $scope.gradesSummary = {};
    $scope.loadingGrades = false;
    $scope.errorGrades = null;
    $scope.gradesFilters = {
        schoolYearId: null,
        semester: null,
        subjectId: null
    };
    
    // Attendance
    $scope.attendance = {
        attendances: [],
        summaries: [],
        overall: {}
    };
    $scope.loadingAttendance = false;
    $scope.errorAttendance = null;
    $scope.attendanceFilters = {
        schoolYearId: null,
        semester: null,
        subjectId: null
    };
    
    // Filter options
    $scope.schoolYears = [];
    $scope.subjects = [];
    
    // Loading states
    $scope.loadingFilters = false;
    
    // Switch tab
    $scope.switchTab = function(tab) {
        $scope.activeTab = tab;
        
        // Load data when switching tabs
        if (tab === 'grades' && $scope.grades.length === 0) {
            // Don't auto-load, require filter
        } else if (tab === 'attendance' && $scope.attendance.attendances.length === 0) {
            // Don't auto-load, require filter
        }
    };
    
    // Load student detail
    $scope.loadStudentDetail = function() {
        $scope.loadingStudent = true;
        $scope.errorStudent = null;
        
        AdvisorService.getStudentDetail($scope.studentId, false).then(function(student) {
            $scope.student = student;
            $scope.loadingStudent = false;
        }).catch(function(error) {
            // Error('Error loading student detail:', error);
            $scope.errorStudent = error.message || error.data?.message || 'Lỗi khi tải thông tin sinh viên';
            $scope.loadingStudent = false;
            ToastService.error('Lỗi khi tải thông tin sinh viên');
        });
    };
    
    // Load filter options
    $scope.loadFilters = function() {
        $scope.loadingFilters = true;
        
        // Load school years
        SchoolYearService.getAll({ forceRefresh: false }).then(function(response) {
            var data = response.data?.data || response.data || [];
            $scope.schoolYears = Array.isArray(data) ? data : [];
        }).catch(function(error) {
            // Error('Error loading school years:', error);
        });
        
        // Load subjects
        SubjectService.getAll().then(function(response) {
            var data = response.data?.data || response.data || [];
            $scope.subjects = Array.isArray(data) ? data : [];
        }).catch(function(error) {
            // Error('Error loading subjects:', error);
        }).finally(function() {
            $scope.loadingFilters = false;
        });
    };
    
    // Load grades
    $scope.loadGrades = function() {
        // Validate filters
        if (!$scope.gradesFilters.schoolYearId && !$scope.gradesFilters.semester && !$scope.gradesFilters.subjectId) {
            ToastService.warning('Vui lòng chọn ít nhất một bộ lọc (Năm học, Học kỳ, hoặc Môn học)');
            return;
        }
        
        $scope.loadingGrades = true;
        $scope.errorGrades = null;
        
        AdvisorService.getStudentGrades($scope.studentId, $scope.gradesFilters, false).then(function(response) {
            $scope.grades = response.data || [];
            $scope.gradesSummary = response.summary || {};
            $scope.loadingGrades = false;
        }).catch(function(error) {
            // Error('Error loading grades:', error);
            $scope.errorGrades = error.message || error.data?.message || 'Lỗi khi tải bảng điểm';
            $scope.loadingGrades = false;
            ToastService.error('Lỗi khi tải bảng điểm');
        });
    };
    
    // Load attendance
    $scope.loadAttendance = function() {
        // Validate filters
        if (!$scope.attendanceFilters.schoolYearId && !$scope.attendanceFilters.semester && !$scope.attendanceFilters.subjectId) {
            ToastService.warning('Vui lòng chọn ít nhất một bộ lọc (Năm học, Học kỳ, hoặc Môn học)');
            return;
        }
        
        $scope.loadingAttendance = true;
        $scope.errorAttendance = null;
        
        AdvisorService.getStudentAttendance($scope.studentId, $scope.attendanceFilters, false).then(function(response) {
            $scope.attendance = {
                attendances: response.attendances || [],
                summaries: response.summaries || [],
                overall: response.overall || {}
            };
            $scope.loadingAttendance = false;
        }).catch(function(error) {
            // Error('Error loading attendance:', error);
            $scope.errorAttendance = error.message || error.data?.message || 'Lỗi khi tải điểm danh';
            $scope.loadingAttendance = false;
            ToastService.error('Lỗi khi tải điểm danh');
        });
    };
    
    // Clear grades filters
    $scope.clearGradesFilters = function() {
        $scope.gradesFilters = {
            schoolYearId: null,
            semester: null,
            subjectId: null
        };
        $scope.grades = [];
        $scope.gradesSummary = {};
    };
    
    // Clear attendance filters
    $scope.clearAttendanceFilters = function() {
        $scope.attendanceFilters = {
            schoolYearId: null,
            semester: null,
            subjectId: null
        };
        $scope.attendance = {
            attendances: [],
            summaries: [],
            overall: {}
        };
    };
    
    // Get warning badge class
    $scope.getWarningBadgeClass = function(warningType) {
        switch(warningType) {
            case 'attendance':
                return 'badge-danger';
            case 'academic':
                return 'badge-warning';
            case 'both':
                return 'badge-danger';
            default:
                return 'badge-success';
        }
    };
    
    // Get warning text
    $scope.getWarningText = function(warningType) {
        switch(warningType) {
            case 'attendance':
                return 'Cảnh báo chuyên cần';
            case 'academic':
                return 'Cảnh báo học tập';
            case 'both':
                return 'Cảnh báo cả hai';
            default:
                return 'Bình thường';
        }
    };
    
    // Get status badge class for attendance
    $scope.getAttendanceStatusBadge = function(status) {
        switch(status) {
            case 'Present':
                return 'badge-success';
            case 'Late':
                return 'badge-warning';
            case 'Excused':
                return 'badge-info';
            case 'Absent':
                return 'badge-danger';
            default:
                return 'badge-secondary';
        }
    };
    
    // Get status text for attendance
    $scope.getAttendanceStatusText = function(status) {
        switch(status) {
            case 'Present':
                return 'Có mặt';
            case 'Late':
                return 'Muộn';
            case 'Excused':
                return 'Có phép';
            case 'Absent':
                return 'Vắng';
            default:
                return status;
        }
    };
    
    // Format date
    $scope.formatDate = function(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('vi-VN');
    };
    
    // Navigate to progress
    $scope.viewProgress = function() {
        $location.path('/advisor/students/' + $scope.studentId + '/progress');
    };
    
    // Initialize
    $scope.loadStudentDetail();
    $scope.loadFilters();
}]);

