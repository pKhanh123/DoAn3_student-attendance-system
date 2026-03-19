// @ts-check
/* global angular */
'use strict';

// Advisor Enrollment Approval Controller - Tích hợp duyệt đăng ký học phần và học lại
app.controller('AdvisorEnrollmentApprovalController', [
    '$scope',
    '$timeout',
    'AuthService',
    'EnrollmentService',
    'RetakeService',
    'StudentService',
    'ClassService',
    'SubjectService',
    'SchoolYearService',
    'CurrentSemesterHelper',
    'ToastService',
    'PaginationService',
    'AvatarService',
    function($scope, $timeout, AuthService, EnrollmentService, RetakeService, StudentService, ClassService, SubjectService, SchoolYearService, CurrentSemesterHelper, ToastService, PaginationService, AvatarService) {
        
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
        
        $scope.currentUser = AuthService.getCurrentUser();
        
        // ============================================================
        // TABS MANAGEMENT
        // ============================================================
        $scope.activeTab = 'ENROLLMENT'; // 'ENROLLMENT' hoặc 'RETAKE'
        
        // Switch tabs - Sequential: đợi tab cũ ẩn xong rồi mới hiện tab mới
        $scope.switchTab = function(tab) {
            if ($scope.activeTab === tab) {
                return; // Đã ở tab này rồi, không cần switch
            }
            
            var animationStartTime = performance.now();
            var oldTab = $scope.activeTab;
            
            // Bước 1: Ẩn tab cũ trước
            $scope.activeTab = null; // Trigger ng-leave cho tab cũ
            
            // Đợi tab cũ fade out xong (10ms)
            $timeout(function() {
                var hideEndTime = performance.now();
                var hideDuration = hideEndTime - animationStartTime;
                
                // Bước 2: Hiện tab mới NGAY SAU KHI tab cũ đã ẩn xong
                $scope.activeTab = tab; // Trigger ng-enter cho tab mới
                
                // Đợi tab mới fade in xong (10ms)
                $timeout(function() {
                    // Load data for new tab
                    if (tab === 'ENROLLMENT') {
                        $scope.loadEnrollments();
                    } else if (tab === 'RETAKE') {
                        $scope.loadRetakes();
                    }
                }, 10); // Đợi ng-enter animation hoàn tất (10ms)
            }, 10); // Đợi ng-leave animation hoàn tất (10ms)
        };
        
        // ============================================================
        // ENROLLMENT APPROVAL (Tab 1)
        // ============================================================
        $scope.enrollments = [];
        $scope.displayedEnrollments = [];
        $scope.loadingEnrollments = false;
        $scope.errorEnrollments = null;
        $scope.successEnrollments = null;
        
        // Filters for enrollments
        $scope.enrollmentFilters = {
            studentId: null,
            classId: null,
            subjectId: null,
            schoolYearId: null,
            semester: null
        };
        
        // Filter options
        $scope.students = [];
        $scope.classes = [];
        $scope.subjects = [];
        $scope.schoolYears = [];
        $scope.semesters = [1, 2, 3];
        
        // Pagination for enrollments
        $scope.enrollmentPagination = PaginationService.init(50);
        $scope.enrollmentPagination.currentPage = 1;
        $scope.enrollmentPagination.pageSize = 50;
        $scope.enrollmentPagination.totalItems = 0;
        
        // Detail modal for enrollments
        $scope.showEnrollmentDetailModal = false;
        $scope.selectedEnrollment = null;
        
        // Load filter options
        $scope.loadFilterOptions = function() {
            // Load students
            StudentService.getAll()
                .then(function(response) {
                    $scope.students = response.data.data || response.data || [];
                })
                .catch(function(error) {
                    // Error('Error loading students:', error);
                });
            
            // Load classes (filtered by current semester)
            CurrentSemesterHelper.getCurrentSemesterInfo()
                .then(function(currentSemesterInfo) {
                    $scope.currentSemesterInfo = currentSemesterInfo;
                    
                    return ClassService.getAll();
                })
                .then(function(response) {
                    var allClasses = response.data.data || response.data || [];
                    
                    if ($scope.currentSemesterInfo && $scope.currentSemesterInfo.semester) {
                        $scope.classes = CurrentSemesterHelper.filterClassesByCurrentSemester(
                            allClasses,
                            $scope.currentSemesterInfo,
                            { filterOnly: false, sortByCurrent: true }
                        );
                    } else {
                        $scope.classes = allClasses;
                    }
                })
                .catch(function(error) {
                    // Error('Error loading classes:', error);
                });
            
            // Load subjects
            SubjectService.getAll()
                .then(function(response) {
                    $scope.subjects = response.data.data || response.data || [];
                })
                .catch(function(error) {
                    // Error('Error loading subjects:', error);
                });
            
            // Load school years
            SchoolYearService.getAll()
                .then(function(response) {
                    $scope.schoolYears = response.data.data || response.data || [];
                })
                .catch(function(error) {
                    // Error('Error loading school years:', error);
                });
        };
        
        // Load pending enrollments
        $scope.loadEnrollments = function() {
            if ($scope.activeTab !== 'ENROLLMENT') {
                return; // Không load nếu không phải tab ENROLLMENT
            }
            
            $scope.loadingEnrollments = true;
            $scope.errorEnrollments = null;
            
            var page = $scope.enrollmentPagination.currentPage;
            var pageSize = $scope.enrollmentPagination.pageSize;
            
            EnrollmentService.getPendingEnrollments($scope.enrollmentFilters, page, pageSize)
                .then(function(response) {
                    if (response.data && response.data.success) {
                        $scope.enrollments = response.data.data || [];
                        $scope.enrollmentPagination.totalItems = response.data.totalCount || 0;
                        $scope.enrollmentPagination.currentPage = response.data.page || page;
                        $scope.enrollmentPagination.pageSize = response.data.pageSize || pageSize;
                        
                        // Apply client-side search if needed
                        if ($scope.enrollmentPagination.searchTerm) {
                            var searchLower = $scope.enrollmentPagination.searchTerm.toLowerCase();
                            $scope.enrollments = $scope.enrollments.filter(function(enrollment) {
                                return (enrollment.studentCode && enrollment.studentCode.toLowerCase().includes(searchLower)) ||
                                       (enrollment.studentName && enrollment.studentName.toLowerCase().includes(searchLower)) ||
                                       (enrollment.classCode && enrollment.classCode.toLowerCase().includes(searchLower)) ||
                                       (enrollment.className && enrollment.className.toLowerCase().includes(searchLower)) ||
                                       (enrollment.subjectCode && enrollment.subjectCode.toLowerCase().includes(searchLower)) ||
                                       (enrollment.subjectName && enrollment.subjectName.toLowerCase().includes(searchLower));
                            });
                        }
                        
                        $scope.displayedEnrollments = $scope.enrollments;
                        $scope.enrollmentPagination = PaginationService.calculate($scope.enrollmentPagination);
                    } else {
                        $scope.errorEnrollments = 'Không thể tải danh sách đăng ký';
                    }
                    $scope.loadingEnrollments = false;
                })
                .catch(function(error) {
                    $scope.errorEnrollments = 'Không thể tải danh sách đăng ký: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                    $scope.loadingEnrollments = false;
                });
        };
        
        // Approve enrollment
        $scope.approveEnrollment = function(enrollmentId) {
            if (!confirm('Bạn có chắc chắn muốn duyệt đăng ký này?')) {
                return;
            }
            
            EnrollmentService.approve(enrollmentId)
                .then(function(response) {
                    if (response.data && response.data.success) {
                        ToastService.success('Đã duyệt đăng ký thành công');
                        $scope.loadEnrollments();
                    } else {
                        ToastService.error(response.data?.message || 'Không thể duyệt đăng ký');
                    }
                })
                .catch(function(error) {
                    ToastService.error('Không thể duyệt đăng ký: ' + (error.data?.message || error.message || 'Lỗi không xác định'));
                });
        };
        
        // View enrollment detail
        $scope.viewEnrollmentDetail = function(enrollment) {
            $scope.selectedEnrollment = enrollment;
            $scope.showEnrollmentDetailModal = true;
        };
        
        // Close enrollment detail modal
        $scope.closeEnrollmentDetailModal = function() {
            $scope.showEnrollmentDetailModal = false;
            $scope.selectedEnrollment = null;
        };
        
        // Handle enrollment search
        $scope.handleEnrollmentSearch = function() {
            $scope.enrollmentPagination.currentPage = 1;
            $scope.loadEnrollments();
        };
        
        // Handle enrollment page change
        $scope.handleEnrollmentPageChange = function() {
            $scope.loadEnrollments();
        };
        
        // Format date
        $scope.formatDate = function(dateString) {
            if (!dateString) return '-';
            var date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        };
        
        // Time ago
        $scope.timeAgo = function(dateString) {
            if (!dateString) return '';
            var date = new Date(dateString);
            var now = new Date();
            var diffMs = now - date;
            var diffMins = Math.floor(diffMs / 60000);
            var diffHours = Math.floor(diffMins / 60);
            var diffDays = Math.floor(diffHours / 24);
            
            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return diffMins + ' phút trước';
            if (diffHours < 24) return diffHours + ' giờ trước';
            if (diffDays < 7) return diffDays + ' ngày trước';
            return $scope.formatDate(dateString);
        };
        
        // Is new enrollment (within 24 hours)
        $scope.isNewEnrollment = function(dateString) {
            if (!dateString) return false;
            var date = new Date(dateString);
            var now = new Date();
            var diffMs = now - date;
            var diffHours = diffMs / (1000 * 60 * 60);
            return diffHours < 24;
        };
        
        // ============================================================
        // RETAKE APPROVAL (Tab 2)
        // ============================================================
        $scope.retakes = [];
        $scope.loadingRetakes = false;
        $scope.errorRetakes = null;
        
        // Filters for retakes
        $scope.retakeFilters = {
            classId: null,
            status: null,
            reason: null
        };
        
        // Pagination for retakes
        $scope.retakePagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0
        };
        
        // Decision modal for retakes
        $scope.showRetakeDecisionModal = false;
        $scope.selectedRetake = null;
        $scope.retakeDecisionData = {
            status: 'APPROVED',
            advisorNotes: ''
        };
        $scope.savingRetake = false;
        
        // Load classes for retake filter
        $scope.loadRetakeClasses = function() {
            ClassService.getAll()
                .then(function(classes) {
                    $scope.classes = classes.data?.data || classes.data || classes || [];
                })
                .catch(function(error) {
                    // Error handling
                });
        };
        
        // Load retakes
        $scope.loadRetakes = function(page) {
            if ($scope.activeTab !== 'RETAKE') {
                return; // Không load nếu không phải tab RETAKE
            }
            
            $scope.loadingRetakes = true;
            $scope.errorRetakes = null;
            
            if (page) {
                $scope.retakePagination.page = page;
            }
            
            // ✅ Backend đã hỗ trợ load tất cả retakes khi không có filter (cho admin/advisor)
            // Nếu không có filter, gọi API để load tất cả retakes
            
            // Determine which endpoint to use
            var promise;
            if ($scope.retakeFilters.classId) {
                promise = RetakeService.getByClass(
                    $scope.retakeFilters.classId,
                    $scope.retakeFilters.status,
                    $scope.retakePagination.page,
                    $scope.retakePagination.pageSize
                );
            } else if ($scope.retakeFilters.studentId) {
                promise = RetakeService.getByStudent(
                    $scope.retakeFilters.studentId,
                    $scope.retakeFilters.status,
                    $scope.retakePagination.page,
                    $scope.retakePagination.pageSize
                );
            } else {
                // Nếu không có filter, gọi getAll để load tất cả retakes
                promise = RetakeService.getAll(
                    {
                        status: $scope.retakeFilters.status
                        // Không truyền studentId và classId để load tất cả
                    },
                    $scope.retakePagination.page,
                    $scope.retakePagination.pageSize
                );
            }
            
            if (promise) {
                promise.then(function(result) {
                    $scope.retakes = result.records || [];
                    $scope.retakePagination.totalCount = result.totalCount || 0;
                    $scope.retakePagination.totalPages = result.totalPages || 0;
                    $scope.loadingRetakes = false;
                }).catch(function(error) {
                    console.error('[RETAKE ERROR] Failed to load retakes:', error);
                    var errorMessage = error.data?.message || error.message || 'Lỗi khi tải danh sách học lại';
                    $scope.errorRetakes = errorMessage;
                    $scope.loadingRetakes = false;
                    ToastService.error('Lỗi: ' + errorMessage);
                });
            }
        };
        
        // Open retake decision modal
        $scope.openRetakeDecisionModal = function(retake, status) {
            $scope.selectedRetake = retake;
            $scope.retakeDecisionData.status = status;
            $scope.retakeDecisionData.advisorNotes = '';
            $scope.showRetakeDecisionModal = true;
        };
        
        // Close retake decision modal
        $scope.closeRetakeDecisionModal = function(event) {
            if (event && event.target !== event.currentTarget) {
                return;
            }
            $scope.showRetakeDecisionModal = false;
            $scope.selectedRetake = null;
            $scope.retakeDecisionData.advisorNotes = '';
        };
        
        // Save retake decision
        $scope.saveRetakeDecision = function() {
            if (!$scope.selectedRetake) return;
            
            $scope.savingRetake = true;
            
            RetakeService.updateStatus($scope.selectedRetake.retakeId, {
                status: $scope.retakeDecisionData.status,
                advisorNotes: $scope.retakeDecisionData.advisorNotes || null
            }).then(function() {
                ToastService.success('Cập nhật trạng thái học lại thành công');
                $scope.closeRetakeDecisionModal();
                $scope.loadRetakes(); // Reload list
                $scope.savingRetake = false;
            }).catch(function(error) {
                ToastService.error('Lỗi: ' + (error.message || 'Không thể cập nhật trạng thái'));
                $scope.savingRetake = false;
            });
        };
        
        // Get retake page numbers for pagination
        $scope.getRetakePageNumbers = function() {
            var pages = [];
            var totalPages = $scope.retakePagination.totalPages || 0;
            var currentPage = $scope.retakePagination.page || 1;
            
            var startPage = Math.max(1, currentPage - 2);
            var endPage = Math.min(totalPages, currentPage + 2);
            
            for (var i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            return pages;
        };
        
        // Get retake status badge class
        $scope.getRetakeStatusBadgeClass = function(status) {
            switch(status) {
                case 'PENDING': return 'badge-warning';
                case 'APPROVED': return 'badge-success';
                case 'REJECTED': return 'badge-danger';
                case 'COMPLETED': return 'badge-info';
                default: return 'badge-secondary';
            }
        };
        
        // Get retake status text
        $scope.getRetakeStatusText = function(status) {
            switch(status) {
                case 'PENDING': return 'Đang chờ';
                case 'APPROVED': return 'Đã duyệt';
                case 'REJECTED': return 'Đã từ chối';
                case 'COMPLETED': return 'Đã hoàn thành';
                default: return status;
            }
        };
        
        // ============================================================
        // INITIALIZATION
        // ============================================================
        $scope.init = function() {
            // Load filter options (chung cho cả 2 tab)
            $scope.loadFilterOptions();
            $scope.loadRetakeClasses();
            
            // Load data for active tab
            if ($scope.activeTab === 'ENROLLMENT') {
                $scope.loadEnrollments();
            } else if ($scope.activeTab === 'RETAKE') {
                $scope.loadRetakes();
            }
        };
        
        // Initialize on controller load
        $scope.init();
    }
]);
