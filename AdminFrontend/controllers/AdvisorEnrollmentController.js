// @ts-check
/* global angular */
'use strict';

// Advisor Enrollment Controller
app.controller('AdvisorEnrollmentController', [
    '$scope',
    'AuthService',
    'EnrollmentService',
    'StudentService',
    'ClassService',
    'SubjectService',
    'SchoolYearService',
    'CurrentSemesterHelper',
    'ToastService',
    'PaginationService',
    'AvatarService',
    function($scope, AuthService, EnrollmentService, StudentService, ClassService, SubjectService, SchoolYearService, CurrentSemesterHelper, ToastService, PaginationService, AvatarService) {
        
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
        
        // Enrollments list
        $scope.enrollments = [];
        $scope.displayedEnrollments = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.success = null;
        
        // Filters
        $scope.filters = {
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
        
        // Pagination
        $scope.pagination = PaginationService.init(50);
        $scope.pagination.currentPage = 1;
        $scope.pagination.pageSize = 50;
        $scope.pagination.totalItems = 0;
        
        // Detail modal
        $scope.showDetailModal = false;
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
            $scope.loading = true;
            $scope.error = null;
            
            var page = $scope.pagination.currentPage;
            var pageSize = $scope.pagination.pageSize;
            
            EnrollmentService.getPendingEnrollments($scope.filters, page, pageSize)
                .then(function(response) {
                    if (response.data && response.data.success) {
                        $scope.enrollments = response.data.data || [];
                        $scope.pagination.totalItems = response.data.totalCount || 0;
                        $scope.pagination.currentPage = response.data.page || page;
                        $scope.pagination.pageSize = response.data.pageSize || pageSize;
                        
                        // Apply client-side search if needed
                        if ($scope.pagination.searchTerm) {
                            var searchLower = $scope.pagination.searchTerm.toLowerCase();
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
                        $scope.pagination = PaginationService.calculate($scope.pagination);
                    } else {
                        $scope.error = 'Không thể tải danh sách đăng ký';
                    }
                    $scope.loading = false;
                })
                .catch(function(error) {
                    $scope.error = 'Không thể tải danh sách đăng ký: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                    $scope.loading = false;
                    // Error('Error loading enrollments:', error);
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
                    // Error('Error approving enrollment:', error);
                });
        };
        
        // View detail
        $scope.viewDetail = function(enrollment) {
            $scope.selectedEnrollment = enrollment;
            $scope.showDetailModal = true;
        };
        
        // Close detail modal
        $scope.closeDetailModal = function() {
            $scope.showDetailModal = false;
            $scope.selectedEnrollment = null;
        };
        
        // Event handlers
        $scope.handleSearch = function() {
            $scope.pagination.currentPage = 1;
            $scope.loadEnrollments();
        };
        
        $scope.handlePageChange = function() {
            $scope.loadEnrollments();
        };
        
        $scope.handleFilterChange = function() {
            $scope.pagination.currentPage = 1;
            $scope.loadEnrollments();
        };
        
        $scope.resetFilters = function() {
            $scope.pagination.searchTerm = '';
            $scope.filters = {
                studentId: null,
                classId: null,
                subjectId: null,
                schoolYearId: null,
                semester: null
            };
            $scope.pagination.currentPage = 1;
            $scope.loadEnrollments();
        };
        
        // Format date
        $scope.formatDate = function(dateString) {
            if (!dateString) return '';
            try {
                var date = new Date(dateString);
                if (isNaN(date.getTime())) return '';
                return date.toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                return '';
            }
        };
        
        // Time ago helper
        $scope.timeAgo = function(dateString) {
            if (!dateString) return '';
            try {
                var date = new Date(dateString);
                if (isNaN(date.getTime())) return '';
                
                var now = new Date();
                var diff = now - date;
                if (diff < 0) return 'Vừa xong';
                
                var minutes = Math.floor(diff / 60000);
                var hours = Math.floor(diff / 3600000);
                var days = Math.floor(diff / 86400000);
                
                if (minutes < 1) return 'Vừa xong';
                if (minutes < 60) return minutes + ' phút trước';
                if (hours < 24) return hours + ' giờ trước';
                if (days < 7) return days + ' ngày trước';
                return date.toLocaleDateString('vi-VN');
            } catch (e) {
                return '';
            }
        };
        
        // Check if enrollment is new (within 24 hours)
        $scope.isNewEnrollment = function(enrollmentDate) {
            if (!enrollmentDate) return false;
            try {
                var date = new Date(enrollmentDate);
                var now = new Date();
                var diff = now - date;
                var hours = diff / 3600000;
                return hours <= 24;
            } catch (e) {
                return false;
            }
        };
        
        // Initialize
        $scope.loadFilterOptions();
        $scope.loadEnrollments();
    }
]);

