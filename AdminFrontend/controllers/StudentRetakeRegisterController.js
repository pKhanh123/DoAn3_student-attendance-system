// ============================================================
// STUDENT RETAKE REGISTER CONTROLLER
// Sinh viên đăng ký lớp học lại cho các môn trượt
// ============================================================
app.controller('StudentRetakeRegisterController', [
    '$scope', 'RetakeService', 'AuthService', 'ToastService', 'AcademicYearService',
    function($scope, RetakeService, AuthService, ToastService, AcademicYearService) {
    
    // ============================================================
    // VARIABLES INITIALIZATION
    // ============================================================
    $scope.failedSubjects = [];
    $scope.selectedSubject = null;
    $scope.retakeClasses = [];
    $scope.loading = false;
    $scope.loadingClasses = false;
    $scope.studentId = null;
    $scope.academicYears = [];
    $scope.selectedSchoolYear = null;
    $scope.selectedSemester = null;
    $scope.expandedSubjectId = null; // Track which subject is expanded
    
    // ============================================================
    // GET CURRENT STUDENT
    // ============================================================
    $scope.init = function() {
        var user = AuthService.getCurrentUser();
        if (user && user.userId) {
            // Assume studentId is stored in user object
            // May need to get from profile or another service
            $scope.studentId = user.studentId || user.userId;
            $scope.loadFailedSubjects();
            $scope.loadAcademicYears();
        } else {
            ToastService.error('Không tìm thấy thông tin sinh viên');
        }
    };
    
    // ============================================================
    // LOAD ACADEMIC YEARS
    // ============================================================
    $scope.loadAcademicYears = function() {
        AcademicYearService.getAll()
            .then(function(response) {
                if (response.data) {
                    $scope.academicYears = response.data.data || response.data || [];
                    if ($scope.academicYears.length > 0) {
                        $scope.selectedSchoolYear = $scope.academicYears[0].academicYearId;
                    }
                }
            })
            .catch(function(error) {
                console.error('Error loading academic years:', error);
            });
    };
    
    // ============================================================
    // LOAD FAILED SUBJECTS
    // ============================================================
    $scope.loadFailedSubjects = function() {
        if (!$scope.studentId) return;
        
        $scope.loading = true;
        RetakeService.getFailedSubjects($scope.studentId, $scope.selectedSchoolYear, $scope.selectedSemester)
            .then(function(subjects) {
                $scope.failedSubjects = subjects || [];
                $scope.loading = false;
            })
            .catch(function(error) {
                console.error('Error loading failed subjects:', error);
                ToastService.error('Không thể tải danh sách môn trượt');
                $scope.failedSubjects = [];
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // LOAD RETAKE CLASSES FOR SUBJECT
    // ============================================================
    $scope.loadRetakeClasses = function(subjectId) {
        if (!subjectId) return;
        
        // Toggle expand/collapse
        if ($scope.expandedSubjectId === subjectId) {
            $scope.expandedSubjectId = null;
            $scope.retakeClasses = [];
            return;
        }
        
        $scope.expandedSubjectId = subjectId;
        $scope.loadingClasses = true;
        $scope.retakeClasses = [];
        
        RetakeService.getRetakeClassesForSubject(subjectId, $scope.studentId, null)
            .then(function(classes) {
                $scope.retakeClasses = classes || [];
                $scope.loadingClasses = false;
                
                if ($scope.retakeClasses.length === 0) {
                    ToastService.info('Không có lớp học lại nào cho môn này');
                }
            })
            .catch(function(error) {
                console.error('Error loading retake classes:', error);
                ToastService.error('Không thể tải danh sách lớp học lại');
                $scope.retakeClasses = [];
                $scope.loadingClasses = false;
            });
    };
    
    // ============================================================
    // REGISTER FOR RETAKE CLASS
    // ============================================================
    $scope.registerForClass = function(classId, subjectName, className) {
        if (!classId || !$scope.studentId) return;
        
        if (!confirm('Bạn có chắc chắn muốn đăng ký lớp học lại "' + className + '" cho môn "' + subjectName + '"?')) {
            return;
        }
        
        var registerData = {
            studentId: $scope.studentId,
            classId: classId,
            notes: 'Đăng ký học lại môn ' + subjectName
        };
        
        RetakeService.registerForRetakeClass(registerData)
            .then(function(response) {
                if (response.data && response.data.success) {
                    ToastService.success('Đăng ký lớp học lại thành công');
                    // Reload classes to update registration status
                    if ($scope.expandedSubjectId) {
                        $scope.loadRetakeClasses($scope.expandedSubjectId);
                    }
                } else {
                    ToastService.error(response.data?.message || 'Không thể đăng ký lớp học lại');
                }
            })
            .catch(function(error) {
                console.error('Error registering for retake class:', error);
                var errorMsg = error.data?.message || error.message || 'Không thể đăng ký lớp học lại';
                ToastService.error(errorMsg);
            });
    };
    
    // ============================================================
    // UI HELPERS
    // ============================================================
    $scope.isSubjectExpanded = function(subjectId) {
        return $scope.expandedSubjectId === subjectId;
    };
    
    $scope.getReasonText = function(reason) {
        if (!reason) return 'Không xác định';
        switch(reason.toUpperCase()) {
            case 'ATTENDANCE': return 'Vắng học quá 20%';
            case 'GRADE': return 'Điểm thấp (< 5.0)';
            case 'BOTH': return 'Vắng học và điểm thấp';
            default: return reason;
        }
    };
    
    $scope.getStatusBadge = function(status) {
        if (!status) return 'badge-secondary';
        switch(status.toUpperCase()) {
            case 'APPROVED': return 'badge-success';
            case 'PENDING': return 'badge-warning';
            case 'REJECTED': return 'badge-danger';
            case 'COMPLETED': return 'badge-info';
            default: return 'badge-secondary';
        }
    };
    
    $scope.getStatusText = function(status) {
        if (!status) return 'Không xác định';
        switch(status.toUpperCase()) {
            case 'APPROVED': return 'Đã duyệt';
            case 'PENDING': return 'Chờ duyệt';
            case 'REJECTED': return 'Từ chối';
            case 'COMPLETED': return 'Hoàn thành';
            default: return status;
        }
    };
    
    $scope.formatSemester = function(semester) {
        if (!semester) return '';
        if (semester === 1) return 'Học kỳ 1';
        if (semester === 2) return 'Học kỳ 2';
        if (semester === 3) return 'Học kỳ 3 (Hè)';
        return 'Học kỳ ' + semester;
    };
    
    // Filter by school year and semester
    $scope.applyFilter = function() {
        $scope.loadFailedSubjects();
    };
    
    // Initialize
    $scope.init();
}]);

