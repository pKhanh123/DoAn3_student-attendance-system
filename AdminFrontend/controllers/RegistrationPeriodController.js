// ============================================================
// REGISTRATION PERIOD CONTROLLER
// Quản lý đợt đăng ký học phần
// ============================================================
app.controller('RegistrationPeriodController', [
    '$scope', '$timeout', 'RegistrationPeriodService', 'AcademicYearService', 'ToastService', 'AuthService',
    function($scope, $timeout, RegistrationPeriodService, AcademicYearService, ToastService, AuthService) {
    
    // ============================================================
    // VARIABLES INITIALIZATION
    // ============================================================
    $scope.periods = [];
    $scope.retakePeriods = [];
    $scope.activePeriod = null;
    $scope.activeRetakePeriod = null;
    $scope.currentPeriod = null;
    $scope.academicYears = [];
    $scope.loading = false;
    
    // Tabs
    $scope.activeTab = 'NORMAL'; // 'NORMAL' hoặc 'RETAKE'
    
    // Period Classes Management
    $scope.periodClasses = [];
    $scope.availableClasses = [];
    $scope.selectedPeriod = null;
    
    // ============================================================
    // AUTHORIZATION
    // ============================================================
    $scope.isAdmin = function() {
        var user = AuthService.getCurrentUser();
        if (!user) return false;
        var role = user.roleName || user.Role || user.role || '';
        return role === 'Admin' || role === 'SuperAdmin' || role === 'Quản trị viên';
    };
    
    // ============================================================
    // MODAL MANAGEMENT
    // ============================================================
    var openModal = function() {
        try {
            if (window.ModalUtils && typeof window.ModalUtils.open === 'function') {
                window.ModalUtils.open('periodModal');
            } else {
                // Fallback: use jQuery
                var $modal = $('#periodModal');
                var $overlay = $('#modal-overlay');
                if ($modal.length && $overlay.length) {
                    $modal.addClass('active');
                    $overlay.addClass('active');
                    $('body').css('overflow', 'hidden');
                }
            }
        } catch (error) {
            console.error('Error opening modal:', error);
        }
    };
    
    var closeModal = function() {
        try {
            if (window.ModalUtils && typeof window.ModalUtils.close === 'function') {
                window.ModalUtils.close('periodModal');
            } else if (window.ModalUtils && typeof window.ModalUtils.closeAll === 'function') {
                window.ModalUtils.closeAll();
            } else {
                // Fallback: use jQuery
                var $modal = $('#periodModal');
                var $overlay = $('#modal-overlay');
                if ($modal.length && $overlay.length) {
                    $modal.removeClass('active');
                    $overlay.removeClass('active');
                    $('body').css('overflow', '');
                }
            }
        } catch (error) {
            console.error('Error closing modal:', error);
        }
    };
    
    $scope.closeModal = closeModal;
    
    // ============================================================
    // LOAD DATA
    // ============================================================
    $scope.loadPeriods = function(showLoading) {
        // ✅ TỐI ƯU: Chỉ show loading nếu đang ở tab NORMAL (user đang xem)
        if (showLoading !== false && $scope.activeTab === 'NORMAL') {
            $scope.loading = true;
        }
        
        RegistrationPeriodService.getAll('NORMAL')
            .then(function(response) {
                if (response.data && response.data.success) {
                    $scope.periods = response.data.data || [];
                } else {
                    $scope.periods = [];
                }
                
                // Chỉ set loading = false nếu đang ở tab NORMAL
                if ($scope.activeTab === 'NORMAL') {
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                console.error('Error loading periods:', error);
                // Chỉ show error nếu đang ở tab NORMAL
                if ($scope.activeTab === 'NORMAL') {
                    ToastService.error('Không thể tải danh sách đợt đăng ký học phần');
                    $scope.loading = false;
                }
                $scope.periods = [];
            });
    };
    
    $scope.loadRetakePeriods = function(showLoading) {
        // ✅ TỐI ƯU: Chỉ show loading nếu đang ở tab RETAKE (user đang xem)
        if (showLoading !== false && $scope.activeTab === 'RETAKE') {
            $scope.loading = true;
        }
        
        RegistrationPeriodService.getRetakePeriods()
            .then(function(response) {
                if (response.data && response.data.success) {
                    $scope.retakePeriods = response.data.data || [];
                } else {
                    $scope.retakePeriods = [];
                }
                
                // Chỉ set loading = false nếu đang ở tab RETAKE
                if ($scope.activeTab === 'RETAKE') {
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                console.error('Error loading retake periods:', error);
                // Chỉ show error nếu đang ở tab RETAKE
                if ($scope.activeTab === 'RETAKE') {
                    ToastService.error('Không thể tải danh sách đợt đăng ký học lại');
                    $scope.loading = false;
                }
                $scope.retakePeriods = [];
            });
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
    
    $scope.loadActivePeriod = function() {
        // ✅ Tự động chọn endpoint dựa trên role
        var user = AuthService.getCurrentUser();
        if (!user) {
            $scope.activePeriod = null;
            $scope.activeRetakePeriod = null;
            return;
        }
        
        var role = getUserRole(user);
        var isStudent = role === 'Student' || role === 'ROLE_STUDENT' || role === 'Sinh viên';
        
        var promise = isStudent 
            ? RegistrationPeriodService.getActiveForStudent()
            : RegistrationPeriodService.getActive();
        
        promise.then(function(response) {
            if (response.data && response.data.success) {
                var period = response.data.data;
                if (period && period.periodType === 'RETAKE') {
                    $scope.activeRetakePeriod = period;
                    $scope.activePeriod = null; // Clear NORMAL period
                } else {
                    $scope.activePeriod = period;
                    $scope.activeRetakePeriod = null; // Clear RETAKE period
                }
            } else {
                $scope.activePeriod = null;
                $scope.activeRetakePeriod = null;
            }
        })
        .catch(function(error) {
            // No active period is not an error - silently fail
            $scope.activePeriod = null;
            $scope.activeRetakePeriod = null;
        });
    };
    
    // Switch tabs - Sequential: đợi tab cũ ẩn xong rồi mới hiện tab mới - TỐI ƯU TỐC ĐỘ
    $scope.switchTab = function(tab) {
        if ($scope.activeTab === tab) {
            return; // Đã ở tab này rồi, không cần switch
        }
        
        // Đo thời gian animation
        var animationStartTime = performance.now();
        var oldTab = $scope.activeTab;
        
        // ✅ SEQUENTIAL: Đợi tab cũ ẩn xong (ng-leave: 10ms) rồi mới hiện tab mới (ng-enter: 10ms)
        // Bước 1: Ẩn tab cũ trước
        $scope.activeTab = null; // Trigger ng-leave cho tab cũ
        
        // Đợi tab cũ fade out xong (10ms - cực nhanh)
        $timeout(function() {
            var hideEndTime = performance.now();
            var hideDuration = hideEndTime - animationStartTime;
            
            // Bước 2: Hiện tab mới NGAY SAU KHI tab cũ đã ẩn xong
            $scope.activeTab = tab; // Trigger ng-enter cho tab mới
            
            // Đợi tab mới fade in xong (10ms - cực nhanh)
            $timeout(function() {
                // Tab switch completed
            }, 10); // Đợi ng-enter animation hoàn tất (10ms)
        }, 10); // Đợi ng-leave animation hoàn tất (10ms)
    };
    
    $scope.loadAcademicYears = function() {
        AcademicYearService.getAll()
            .then(function(response) {
                if (response.data) {
                    $scope.academicYears = response.data.data || response.data || [];
                } else {
                    $scope.academicYears = [];
                }
            })
            .catch(function(error) {
                console.error('Error loading academic years:', error);
                $scope.academicYears = [];
            });
    };
    
    // ============================================================
    // CREATE / UPDATE PERIOD
    // ============================================================
    $scope.showCreateModal = function() {
        try {
            // Format today's date as YYYY-MM-DD for date inputs
            var today = new Date();
            var year = today.getFullYear();
            var month = String(today.getMonth() + 1).padStart(2, '0');
            var day = String(today.getDate()).padStart(2, '0');
            var dateStr = year + '-' + month + '-' + day;
            
            $scope.currentPeriod = {
                periodName: '',
                academicYearId: '',
                semester: 1,
                startDate: dateStr,
                endDate: dateStr,
                periodType: $scope.activeTab, // Set periodType based on active tab
                status: 'UPCOMING',
                description: ''
            };
            
            // Use $timeout to ensure DOM is ready
            $timeout(function() {
                openModal();
            }, 50);
        } catch (error) {
            console.error('Error in showCreateModal:', error);
            ToastService.error('Lỗi khi mở form: ' + error.message);
        }
    };
    
    // Format date for date input (YYYY-MM-DD format)
    function formatDateForInput(dateString) {
        if (!dateString) return null;
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        } catch (e) {
            console.error('Error formatting date:', e);
            return null;
        }
    }
    
    $scope.showEditModal = function(period) {
        if (!period) return;
        
        $scope.currentPeriod = angular.copy(period);
        // Format dates for date inputs
        $scope.currentPeriod.startDate = formatDateForInput($scope.currentPeriod.startDate);
        $scope.currentPeriod.endDate = formatDateForInput($scope.currentPeriod.endDate);
        
        // Convert semester to string để match với option values (value="1", "2", "3")
        if ($scope.currentPeriod.semester !== null && $scope.currentPeriod.semester !== undefined) {
            $scope.currentPeriod.semester = String($scope.currentPeriod.semester);
        }
        
        // Use $timeout to ensure DOM is ready
        $timeout(function() {
            openModal();
        }, 50);
    };
    
    $scope.savePeriod = function() {
        if (!$scope.currentPeriod) {
            ToastService.error('Dữ liệu không hợp lệ');
            return;
        }
        
        // Validate required fields
        if (!$scope.currentPeriod.periodName || !$scope.currentPeriod.periodName.trim()) {
            ToastService.error('Vui lòng nhập tên đợt đăng ký');
            return;
        }
        
        if (!$scope.currentPeriod.academicYearId) {
            ToastService.error('Vui lòng chọn năm học');
            return;
        }
        
        // Validate dates
        if (!$scope.currentPeriod.startDate || !$scope.currentPeriod.endDate) {
            ToastService.error('Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc');
            return;
        }
        
        if ($scope.currentPeriod.startDate >= $scope.currentPeriod.endDate) {
            ToastService.error('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
            return;
        }
        
        // Convert semester từ string về number trước khi gửi lên server
        var periodToSave = angular.copy($scope.currentPeriod);
        if (periodToSave.semester !== null && periodToSave.semester !== undefined) {
            periodToSave.semester = parseInt(periodToSave.semester, 10);
        }
        
        var isNew = !$scope.currentPeriod.periodId;
        var promise = isNew ? 
            RegistrationPeriodService.create(periodToSave) :
            RegistrationPeriodService.update($scope.currentPeriod.periodId, periodToSave);
        
        promise
            .then(function(response) {
                if (response.data && response.data.success) {
                    ToastService.success(isNew ? 'Tạo đợt đăng ký thành công' : 'Cập nhật đợt đăng ký thành công');
                    closeModal();
                    $scope.currentPeriod = null;
                    // Reload data based on active tab
                    if ($scope.activeTab === 'NORMAL') {
                        $scope.loadPeriods();
                    } else {
                        $scope.loadRetakePeriods();
                    }
                    $scope.loadActivePeriod();
                } else {
                    ToastService.error(response.data?.message || 'Có lỗi xảy ra');
                }
            })
            .catch(function(error) {
                console.error('Error saving period:', error);
                var errorMsg = error.data?.message || error.message || 'Có lỗi xảy ra';
                ToastService.error(errorMsg);
            });
    };
    
    // ============================================================
    // DELETE PERIOD
    // ============================================================
    $scope.deletePeriod = function(periodId) {
        if (!periodId) return;
        
        if (!confirm('Bạn có chắc chắn muốn xóa đợt đăng ký này?')) {
            return;
        }
        
        RegistrationPeriodService.delete(periodId)
            .then(function(response) {
                if (response.data && response.data.success) {
                    ToastService.success('Xóa đợt đăng ký thành công');
                    if ($scope.activeTab === 'NORMAL') {
                        $scope.loadPeriods();
                    } else {
                        $scope.loadRetakePeriods();
                    }
                    $scope.loadActivePeriod();
                } else {
                    ToastService.error(response.data?.message || 'Không thể xóa đợt đăng ký');
                }
            })
            .catch(function(error) {
                console.error('Error deleting period:', error);
                var errorMsg = error.data?.message || error.message || 'Không thể xóa đợt đăng ký';
                ToastService.error(errorMsg);
            });
    };
    
    // ============================================================
    // OPEN / CLOSE PERIOD
    // ============================================================
    $scope.openPeriod = function(periodId) {
        if (!periodId) return;
        
        if (!confirm('Mở đợt đăng ký này? Các đợt khác sẽ tự động đóng.')) {
            return;
        }
        
        RegistrationPeriodService.open(periodId)
            .then(function(response) {
                if (response.data && response.data.success) {
                    ToastService.success('Đã mở đợt đăng ký thành công');
                    $scope.loadPeriods();
                    $scope.loadRetakePeriods();
                    $scope.loadActivePeriod();
                } else {
                    ToastService.error(response.data?.message || 'Không thể mở đợt đăng ký');
                }
            })
            .catch(function(error) {
                console.error('Error opening period:', error);
                var errorMsg = error.data?.message || error.message || 'Không thể mở đợt đăng ký';
                ToastService.error(errorMsg);
            });
    };
    
    $scope.closePeriod = function(periodId) {
        if (!periodId) return;
        
        if (!confirm('Bạn có chắc chắn muốn đóng đợt đăng ký này?')) {
            return;
        }
        
        RegistrationPeriodService.close(periodId)
            .then(function(response) {
                if (response.data && response.data.success) {
                    ToastService.success('Đã đóng đợt đăng ký thành công');
                    $scope.loadPeriods();
                    $scope.loadRetakePeriods();
                    $scope.loadActivePeriod();
                } else {
                    ToastService.error(response.data?.message || 'Không thể đóng đợt đăng ký');
                }
            })
            .catch(function(error) {
                console.error('Error closing period:', error);
                var errorMsg = error.data?.message || error.message || 'Không thể đóng đợt đăng ký';
                ToastService.error(errorMsg);
            });
    };
    
    // ============================================================
    // UI HELPERS
    // ============================================================
    // Helper function to check if there's any open period
    $scope.hasOpenPeriod = function(tabType) {
        if (tabType === 'NORMAL') {
            return $scope.periods && $scope.periods.some(function(p) {
                return p.status === 'OPEN';
            });
        } else if (tabType === 'RETAKE') {
            return $scope.retakePeriods && $scope.retakePeriods.some(function(p) {
                return p.status === 'OPEN';
            });
        }
        return false;
    };
    
    $scope.getStatusBadge = function(status) {
        if (!status) return 'bg-secondary';
        switch(status.toUpperCase()) {
            case 'OPEN': return 'bg-success';
            case 'CLOSED': return 'bg-danger';
            case 'UPCOMING': return 'bg-warning text-dark';
            default: return 'bg-secondary';
        }
    };
    
    $scope.getSemesterName = function(semester) {
        if (!semester) return 'Không xác định';
        if (semester === 1) return 'Học kỳ 1';
        if (semester === 2) return 'Học kỳ 2';
        if (semester === 3) return 'Học kỳ 3 (Hè)';
        return 'Học kỳ ' + semester;
    };
    
    // ============================================================
    // PERIOD CLASSES MANAGEMENT
    // ============================================================
    $scope.loadPeriodClasses = function(periodId) {
        if (!periodId) return;
        
        $scope.selectedPeriod = periodId;
        $scope.periodClasses = [];
        $scope.availableClasses = [];
        
        // Load classes in period
        RegistrationPeriodService.getClassesByPeriod(periodId)
            .then(function(response) {
                if (response.data && response.data.success) {
                    $scope.periodClasses = response.data.data || [];
                } else {
                    $scope.periodClasses = [];
                }
            })
            .catch(function(error) {
                console.error('Error loading period classes:', error);
                $scope.periodClasses = [];
            });
        
        // Load available classes
        RegistrationPeriodService.getAvailableClassesForPeriod(periodId)
            .then(function(response) {
                if (response.data && response.data.success) {
                    $scope.availableClasses = response.data.data || [];
                } else {
                    $scope.availableClasses = [];
                }
            })
            .catch(function(error) {
                console.error('Error loading available classes:', error);
                $scope.availableClasses = [];
            });
    };
    
    $scope.addClassToPeriod = function(classId) {
        if (!$scope.selectedPeriod || !classId) return;
        
        RegistrationPeriodService.addClassToPeriod($scope.selectedPeriod, classId)
            .then(function(response) {
                if (response.data && response.data.success) {
                    ToastService.success('Thêm lớp vào đợt đăng ký thành công');
                    $scope.loadPeriodClasses($scope.selectedPeriod);
                } else {
                    ToastService.error(response.data?.message || 'Không thể thêm lớp');
                }
            })
            .catch(function(error) {
                console.error('Error adding class to period:', error);
                var errorMsg = error.data?.message || error.message || 'Không thể thêm lớp';
                ToastService.error(errorMsg);
            });
    };
    
    $scope.removeClassFromPeriod = function(periodClassId) {
        if (!periodClassId) return;
        
        if (!confirm('Bạn có chắc muốn xóa lớp này khỏi đợt đăng ký?')) {
            return;
        }
        
        RegistrationPeriodService.removeClassFromPeriod(periodClassId)
            .then(function(response) {
                if (response.data && response.data.success) {
                    ToastService.success('Xóa lớp khỏi đợt đăng ký thành công');
                    if ($scope.selectedPeriod) {
                        $scope.loadPeriodClasses($scope.selectedPeriod);
                    }
                } else {
                    ToastService.error(response.data?.message || 'Không thể xóa lớp');
                }
            })
            .catch(function(error) {
                console.error('Error removing class from period:', error);
                var errorMsg = error.data?.message || error.message || 'Không thể xóa lớp';
                ToastService.error(errorMsg);
            });
    };
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    $scope.init = function() {
        // Ensure modal is closed on page load
        $timeout(function() {
            closeModal();
        }, 200);
        
        // Load academic years (cần cho cả 2 tab)
        $scope.loadAcademicYears();
        
        // ✅ TỐI ƯU: Preload data cho CẢ 2 tab song song ngay từ đầu
        // Điều này cho phép switch tab instant (không cần load lại)
        
        // Show loading cho tab hiện tại
        $scope.loading = true;
        
        // Preload cả 2 tab song song (background loading)
        // Tab hiện tại sẽ show loading, tab khác load im lặng
        $scope.loadPeriods(true); // Load và show loading nếu đang ở tab NORMAL
        $scope.loadRetakePeriods(true); // Load và show loading nếu đang ở tab RETAKE
        $scope.loadActivePeriod(); // Load active period (chung cho cả 2 tab)
    };
    
    // Initialize when controller loads
    $scope.init();
}]);
