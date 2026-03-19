// Advisor Dashboard Controller
app.controller('AdvisorDashboardController', ['$scope', '$location', 'AuthService', 'AvatarService', 'AdvisorService', 'EnrollmentService', 'ToastService', function($scope, $location, AuthService, AvatarService, AdvisorService, EnrollmentService, ToastService) {
    $scope.currentUser = AuthService.getCurrentUser();
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Initialize stats
    $scope.stats = {
        totalStudents: 0,
        warningAttendanceStudents: 0,
        lowGpaStudents: 0,
        excellentStudents: 0,
        averageAttendanceRate: 0,
        averagePassRate: 0,
        averageGpa: 0,
        pendingEnrollments: 0
    };
    
    // Warning students
    $scope.warningStudents = [];
    $scope.warningStudentsPagination = {
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0
    };
    
    // Loading and error states
    $scope.loadingStats = true;
    $scope.loadingWarningStudents = true;
    $scope.loadingPendingEnrollments = false;
    $scope.errorStats = null;
    $scope.errorWarningStudents = null;
    
    // Load dashboard stats
    $scope.loadDashboardStats = function() {
        $scope.loadingStats = true;
        $scope.errorStats = null;
        
        AdvisorService.getDashboardStats(null, false).then(function(stats) {
            $scope.stats = {
                totalStudents: stats.totalStudents || 0,
                warningAttendanceStudents: stats.warningAttendanceStudents || 0,
                lowGpaStudents: stats.lowGpaStudents || 0,
                excellentStudents: stats.excellentStudents || 0,
                averageAttendanceRate: stats.averageAttendanceRate || 0,
                averagePassRate: stats.averagePassRate || 0,
                averageGpa: stats.averageGpa || 0
            };
            $scope.loadingStats = false;
        }).catch(function(error) {
            // Error('Error loading dashboard stats:', error);
            $scope.errorStats = error.data?.message || 'Lỗi khi tải thống kê';
            $scope.loadingStats = false;
            ToastService.error('Lỗi khi tải thống kê dashboard');
        });
    };
    
    // Load warning students
    $scope.loadWarningStudents = function(page) {
        if (page) {
            $scope.warningStudentsPagination.page = page;
        }
        
        $scope.loadingWarningStudents = true;
        $scope.errorWarningStudents = null;
        
        var params = {
            page: $scope.warningStudentsPagination.page,
            pageSize: $scope.warningStudentsPagination.pageSize
        };
        
        AdvisorService.getWarningStudents(params, false).then(function(response) {
            $scope.warningStudents = response.data || [];
            $scope.warningStudentsPagination = {
                page: response.pagination?.page || 1,
                pageSize: response.pagination?.pageSize || 20,
                totalCount: response.pagination?.totalCount || 0,
                totalPages: response.pagination?.totalPages || 0
            };
            $scope.loadingWarningStudents = false;
        }).catch(function(error) {
            // Error('Error loading warning students:', error);
            $scope.errorWarningStudents = error.data?.message || 'Lỗi khi tải danh sách sinh viên cảnh báo';
            $scope.loadingWarningStudents = false;
            ToastService.error('Lỗi khi tải danh sách sinh viên cảnh báo');
        });
    };
    
    // Load pending enrollments count
    $scope.loadPendingEnrollmentsCount = function() {
        $scope.loadingPendingEnrollments = true;
        
        EnrollmentService.getPendingEnrollments(null, 1, 1).then(function(response) {
            // API returns: { data: { success: true, data: [...], totalCount: X, totalPages: Y, ... } }
            var totalCount = 0;
            if (response.data && response.data.success) {
                totalCount = response.data.totalCount || 0;
            } else if (response.data) {
                // Fallback: check if totalCount exists directly
                totalCount = response.data.totalCount || 0;
            }
            $scope.stats.pendingEnrollments = totalCount;
            $scope.loadingPendingEnrollments = false;
        }).catch(function(error) {
            // Error('Error loading pending enrollments count:', error);
            $scope.stats.pendingEnrollments = 0;
            $scope.loadingPendingEnrollments = false;
            // Don't show error toast for this - it's just a count widget
        });
    };
    
    // Navigate to pending enrollments page
    $scope.goToPendingEnrollments = function() {
        $location.path('/advisor/enrollments');
    };
    
    // Refresh all data
    $scope.refreshData = function() {
        $scope.loadDashboardStats();
        $scope.loadWarningStudents();
        $scope.loadPendingEnrollmentsCount();
    };
    
    // View student detail
    $scope.viewStudentDetail = function(studentId) {
        // Navigate to student detail page
        $location.path('/advisor/students/' + studentId);
    };
    
    // Contact student
    $scope.contactStudent = function(student) {
        // TODO: Implement contact student functionality
        alert('Gửi email liên hệ đến sinh viên: ' + student.fullName);
    };
    
    // Get absence rate (100 - attendance rate)
    $scope.getAbsenceRate = function(student) {
        if (!student.attendanceRate && student.attendanceRate !== 0) {
            return 0;
        }
        return Math.max(0, 100 - student.attendanceRate);
    };
    
    // Initialize on load
    $scope.loadDashboardStats();
    $scope.loadWarningStudents();
    $scope.loadPendingEnrollmentsCount();
}]);

