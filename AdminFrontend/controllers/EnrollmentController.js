// Enrollment Controller
app.controller('EnrollmentController', [
    '$scope', '$routeParams', 'EnrollmentService', 'StudentService', 'ClassService', 
    'RegistrationPeriodService', 'CurrentSemesterHelper', 'ToastService', 'AuthService',
    function($scope, $routeParams, EnrollmentService, StudentService, ClassService, 
             RegistrationPeriodService, CurrentSemesterHelper, ToastService, AuthService) {
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    $scope.enrollments = [];
    $scope.availableClasses = [];
    $scope.summary = null;
    $scope.activePeriod = null;
    $scope.currentStudent = null;
    $scope.loading = false;
    
    $scope.filters = {
        studentId: '',
        classId: '',
        status: ''
    };
    
    // Helper function to decode JWT token
    var decodeToken = function(token) {
        if (!token) return null;
        try {
            var parts = token.split('.');
            if (parts.length !== 3) return null;
            var payload = parts[1];
            payload = payload.replace(/-/g, '+').replace(/_/g, '/');
            while (payload.length % 4) {
                payload += '=';
            }
            return JSON.parse(atob(payload));
        } catch (e) {
            return null;
        }
    };
    
    // Helper function to get role from user object or JWT token
    var getUserRole = function(user) {
        if (!user) return null;
        
        // Try to get from user object first
        if (user.roleName) return user.roleName;
        if (user.roleId) return user.roleId;
        if (user.role) return user.role;
        if (user.Role) return user.Role;
        
        // If not found, decode JWT token
        var token = user.token || AuthService.getToken();
        if (token) {
            var decoded = decodeToken(token);
            if (decoded) {
                // Try different claim names
                var role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                           decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
                           decoded.role || decoded.Role || decoded.roleName || decoded.roleId;
                if (role) return role;
            }
        }
        
        return null;
    };
    
    // Get current user
    $scope.getCurrentUser = function() {
        return AuthService.getCurrentUser();
    };
    
    $scope.isAdmin = function() {
        const user = $scope.getCurrentUser();
        if (!user) return false;
        var role = getUserRole(user);
        return role === 'Admin' || role === 'SuperAdmin' || role === 'ROLE_ADMIN';
    };
    
    $scope.isStudent = function() {
        const user = $scope.getCurrentUser();
        if (!user) return false;
        var role = getUserRole(user);
        return role === 'Student' || role === 'ROLE_STUDENT' || role === 'Sinh viên';
    };
    
    // ============================================================
    // LOAD DATA
    // ============================================================
    $scope.loadEnrollments = function() {
        $scope.loading = true;
        
        let promise;
        var user = $scope.getCurrentUser();
        var role = getUserRole(user);
        var isStudent = role === 'Student' || role === 'ROLE_STUDENT' || role === 'Sinh viên';
        
        // ✅ Student luôn phải dùng getByStudent, không được gọi getAll
        if (isStudent) {
            // Try to get studentId from various sources
            var studentId = user.relatedId || user.studentId || user.userId;
            if (studentId) {
                promise = EnrollmentService.getByStudent(studentId);
            } else {
                console.error('[ENROLLMENT DEBUG] ❌ Student but no studentId found!');
                ToastService.error('Không tìm thấy mã sinh viên');
                $scope.loading = false;
                return;
            }
        } else if ($scope.filters.studentId) {
            promise = EnrollmentService.getByStudent($scope.filters.studentId);
        } else if ($scope.filters.classId) {
            promise = EnrollmentService.getByClass($scope.filters.classId);
        } else {
            promise = EnrollmentService.getAll();
        }
        
        promise.then(function(response) {
            if (response.data.success) {
                $scope.enrollments = response.data.data;
            }
            $scope.loading = false;
        }).catch(function(error) {
            console.error('[ENROLLMENT DEBUG] ❌ Error loading enrollments:', error);
            ToastService.error('Không thể tải danh sách đăng ký');
            $scope.loading = false;
        });
    };
    
    $scope.loadMyEnrollments = function() {
        const user = $scope.getCurrentUser();
        if (user && user.relatedId) {
            $scope.filters.studentId = user.relatedId;
            $scope.loadEnrollments();
            
            // Tự động lấy học kỳ hiện tại và load summary + available classes
            CurrentSemesterHelper.getCurrentSemesterInfo()
                .then(function(currentSemesterInfo) {
                    var semester = currentSemesterInfo.semester;
                    var academicYearId = currentSemesterInfo.schoolYear && currentSemesterInfo.schoolYear.academicYearId;
                    
                    $scope.loadSummary(user.relatedId, semester, academicYearId);
                    $scope.loadAvailableClasses(user.relatedId, semester, academicYearId);
                })
                .catch(function(error) {
                    // Nếu không lấy được học kỳ hiện tại, load không filter
                    $scope.loadSummary(user.relatedId);
                    $scope.loadAvailableClasses(user.relatedId);
                });
        }
    };
    
    $scope.loadAvailableClasses = function(studentId, semester, academicYearId) {
        // Nếu không có semester, tự động lấy học kỳ hiện tại
        if (!semester) {
            CurrentSemesterHelper.getCurrentSemesterInfo()
                .then(function(currentSemesterInfo) {
                    semester = currentSemesterInfo.semester;
                    if (!academicYearId && currentSemesterInfo.schoolYear) {
                        academicYearId = currentSemesterInfo.schoolYear.academicYearId;
                    }
                    return EnrollmentService.getAvailableClasses(studentId, semester, academicYearId);
                })
                .then(function(response) {
                    if (response.data.success) {
                        $scope.availableClasses = response.data.data;
                    }
                });
        } else {
            EnrollmentService.getAvailableClasses(studentId, semester, academicYearId)
                .then(function(response) {
                    if (response.data.success) {
                        $scope.availableClasses = response.data.data;
                    }
                });
        }
    };
    
    $scope.loadSummary = function(studentId, semester, academicYearId) {
        // Nếu không có semester, tự động lấy học kỳ hiện tại
        if (!semester) {
            CurrentSemesterHelper.getCurrentSemesterInfo()
                .then(function(currentSemesterInfo) {
                    semester = currentSemesterInfo.semester;
                    if (!academicYearId && currentSemesterInfo.schoolYear) {
                        academicYearId = currentSemesterInfo.schoolYear.academicYearId;
                    }
                    return EnrollmentService.getSummary(studentId, semester, academicYearId);
                })
                .then(function(response) {
                    if (response.data.success) {
                        $scope.summary = response.data.data;
                    }
                });
        } else {
            EnrollmentService.getSummary(studentId, semester, academicYearId)
                .then(function(response) {
                    if (response.data.success) {
                        $scope.summary = response.data.data;
                    }
                });
        }
    };
    
    $scope.loadActivePeriod = function() {
        // ✅ Tự động chọn endpoint dựa trên role
        var user = $scope.getCurrentUser();
        if (!user) {
            $scope.activePeriod = null;
            return;
        }
        
        var role = getUserRole(user);
        var isStudent = role === 'Student' || role === 'ROLE_STUDENT' || role === 'Sinh viên';
        
        var promise = isStudent 
            ? RegistrationPeriodService.getActiveForStudent()
            : RegistrationPeriodService.getActive();
        
        promise.then(function(response) {
            if (response.data && response.data.success) {
                $scope.activePeriod = response.data.data;
            } else {
                $scope.activePeriod = null;
            }
        }).catch(function(error) {
            // Silently fail - không có đợt đăng ký đang mở là bình thường
            $scope.activePeriod = null;
        });
    };
    
    // ============================================================
    // REGISTER
    // ============================================================
    $scope.showRegisterModal = function() {
        const user = $scope.getCurrentUser();
        $scope.currentEnrollment = {
            studentId: user.relatedId,
            classId: '',
            notes: ''
        };
        $('#registerModal').modal('show');
    };
    
    $scope.register = function() {
        if (!$scope.currentEnrollment) return;
        
        if (!$scope.activePeriod) {
            ToastService.error('Không có đợt đăng ký nào đang mở');
            return;
        }
        
        EnrollmentService.register(
            $scope.currentEnrollment.studentId,
            $scope.currentEnrollment.classId,
            $scope.currentEnrollment.notes
        ).then(function(response) {
            if (response.data.success) {
                ToastService.success('Đăng ký học phần thành công');
                $('#registerModal').modal('hide');
                $scope.loadMyEnrollments();
            }
        }).catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể đăng ký học phần');
        });
    };
    
    // ============================================================
    // APPROVE (Admin)
    // ============================================================
    $scope.approve = function(enrollmentId) {
        if (!confirm('Bạn có chắc chắn muốn phê duyệt đăng ký này?')) return;
        
        EnrollmentService.approve(enrollmentId).then(function(response) {
            if (response.data.success) {
                ToastService.success('Phê duyệt đăng ký thành công');
                $scope.loadEnrollments();
            }
        }).catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể phê duyệt');
        });
    };
    
    // ============================================================
    // DROP (Student)
    // ============================================================
    $scope.showDropModal = function(enrollment) {
        $scope.currentEnrollment = enrollment;
        $scope.dropReason = '';
        $('#dropModal').modal('show');
    };
    
    $scope.drop = function() {
        if (!$scope.dropReason) {
            ToastService.error('Vui lòng nhập lý do hủy đăng ký');
            return;
        }
        
        EnrollmentService.drop($scope.currentEnrollment.enrollmentId, $scope.dropReason)
            .then(function(response) {
                if (response.data.success) {
                    ToastService.success('Hủy đăng ký học phần thành công');
                    $('#dropModal').modal('hide');
                    $scope.loadMyEnrollments();
                }
            }).catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể hủy đăng ký');
            });
    };
    
    // ============================================================
    // WITHDRAW (Admin)
    // ============================================================
    $scope.showWithdrawModal = function(enrollment) {
        $scope.currentEnrollment = enrollment;
        $scope.withdrawReason = '';
        $('#withdrawModal').modal('show');
    };
    
    $scope.withdraw = function() {
        if (!$scope.withdrawReason) {
            ToastService.error('Vui lòng nhập lý do rút học phần');
            return;
        }
        
        EnrollmentService.withdraw($scope.currentEnrollment.enrollmentId, $scope.withdrawReason)
            .then(function(response) {
                if (response.data.success) {
                    ToastService.success('Rút học phần thành công');
                    $('#withdrawModal').modal('hide');
                    $scope.loadEnrollments();
                }
            }).catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể rút học phần');
            });
    };
    
    // ============================================================
    // UI HELPERS
    // ============================================================
    $scope.getStatusBadge = function(status) {
        switch(status) {
            case 'APPROVED': return 'badge-success';
            case 'PENDING': return 'badge-warning';
            case 'DROPPED': return 'badge-danger';
            case 'WITHDRAWN': return 'badge-secondary';
            default: return 'badge-info';
        }
    };
    
    $scope.canDrop = function(enrollment) {
        if (enrollment.enrollmentStatus !== 'APPROVED') return false;
        if (!enrollment.dropDeadline) return false;
        return new Date() <= new Date(enrollment.dropDeadline);
    };
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    $scope.init = function() {
        $scope.loadActivePeriod();
        
        if ($scope.isStudent()) {
            $scope.loadMyEnrollments();
        } else {
            $scope.loadEnrollments();
        }
    };
    
    $scope.init();
}]);

