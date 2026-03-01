// @ts-check
/* global angular */
'use strict';

// Lecturer Grade Appeal Controller
app.controller('LecturerGradeAppealController', [
    '$scope',
    'AuthService',
    'GradeAppealService',
    'ClassService',
    'CurrentSemesterHelper',
    'ToastService',
    'LoggerService',
    function($scope, AuthService, GradeAppealService, ClassService, CurrentSemesterHelper, ToastService, LoggerService) {
        $scope.currentUser = AuthService.getCurrentUser();
        $scope.lecturerId = $scope.currentUser?.lecturerId || null;
        
        // Appeals list
        $scope.appeals = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.filters = {
            status: 'PENDING', // Default: show pending appeals
            classId: null,
            priority: null
        };
        
        // Pagination
        $scope.pagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0
        };
        
        // Response modal (Giảng viên chỉ ĐỀ XUẤT, không quyết định cuối cùng)
        $scope.showResponseModal = false;
        $scope.selectedAppeal = null;
        $scope.responseData = {
            lecturerResponse: '',
            lecturerDecision: 'NEED_REVIEW' // APPROVE (đề xuất chấp nhận), REJECT (đề xuất từ chối), NEED_REVIEW (cần xem xét thêm)
        };
        $scope.saving = false;
        
        // Detail modal
        $scope.showDetailModal = false;
        
        // Classes for filter
        $scope.classes = [];
        $scope.loadingClasses = false;
        
        // Load appeals
        function loadAppeals() {
            if (!$scope.lecturerId) {
                $scope.error = 'Không tìm thấy mã giảng viên.';
                return;
            }
            
            $scope.loading = true;
            $scope.error = null;
            
            var filters = {
                lecturerId: $scope.lecturerId
            };
            if ($scope.filters.status) filters.status = $scope.filters.status;
            if ($scope.filters.classId) filters.classId = $scope.filters.classId;
            if ($scope.filters.priority) filters.priority = $scope.filters.priority;
            
            GradeAppealService.getAll(filters, $scope.pagination.page, $scope.pagination.pageSize)
                .then(function(result) {
                    $scope.appeals = result.appeals || [];
                    $scope.pagination.totalCount = result.totalCount || 0;
                    $scope.loading = false;
                })
                .catch(function(error) {
                    $scope.error = 'Không thể tải danh sách phúc khảo: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                    $scope.loading = false;
                    LoggerService.error('Error loading appeals', error);
                });
        }
        
        // Load classes (filtered by current semester)
        function loadClasses() {
            $scope.loadingClasses = true;
            
            // Lấy thông tin học kỳ hiện tại và filter classes
            CurrentSemesterHelper.getCurrentSemesterInfo()
                .then(function(currentSemesterInfo) {
                    $scope.currentSemesterInfo = currentSemesterInfo;
                    
                    return ClassService.getAll();
                })
                .then(function(response) {
                    var allClasses = (response.data && response.data.data) || response.data || [];
                    
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
                    
                    $scope.loadingClasses = false;
                })
                .catch(function(error) {
                    LoggerService.error('Error loading classes', error);
                    $scope.loadingClasses = false;
                });
        }
        
        // Open response modal
        $scope.openResponseModal = function(appeal) {
            $scope.selectedAppeal = appeal;
            $scope.responseData = {
                lecturerResponse: '',
                lecturerDecision: 'NEED_REVIEW'
            };
            $scope.showResponseModal = true;
        };
        
        // Close response modal
        $scope.closeResponseModal = function() {
            $scope.showResponseModal = false;
            $scope.selectedAppeal = null;
        };
        
        // Submit response (Giảng viên chỉ ĐỀ XUẤT, advisor mới quyết định cuối cùng)
        $scope.submitResponse = function() {
            if (!$scope.responseData.lecturerDecision) {
                ToastService.error('Vui lòng chọn đề xuất');
                return;
            }
            
            $scope.saving = true;
            
            var responseData = {
                lecturerId: $scope.lecturerId,
                lecturerResponse: $scope.responseData.lecturerResponse || null,
                lecturerDecision: $scope.responseData.lecturerDecision,
                updatedBy: $scope.currentUser.userId || $scope.lecturerId
            };
            
            GradeAppealService.updateLecturerResponse($scope.selectedAppeal.appealId, responseData)
                .then(function() {
                    ToastService.success('Đề xuất phúc khảo đã được gửi! Đang chờ cố vấn học tập quyết định cuối cùng.');
                    $scope.closeResponseModal();
                    loadAppeals();
                })
                .catch(function(error) {
                    ToastService.error('Lỗi: ' + (error.data?.message || error.message || 'Không thể gửi đề xuất'));
                    LoggerService.error('Error updating lecturer response', error);
                })
                .finally(function() {
                    $scope.saving = false;
                });
        };
        
        // View appeal detail
        $scope.viewDetail = function(appealId) {
            $scope.loading = true;
            GradeAppealService.getById(appealId)
                .then(function(appeal) {
                    $scope.selectedAppeal = appeal;
                    $scope.showDetailModal = true;
                    $scope.loading = false;
                })
                .catch(function(error) {
                    ToastService.error('Không thể tải chi tiết phúc khảo');
                    LoggerService.error('Error loading appeal detail', error);
                    $scope.loading = false;
                });
        };
        
        // Close detail modal
        $scope.closeDetailModal = function() {
            $scope.showDetailModal = false;
            $scope.selectedAppeal = null;
        };
        
        // Get status badge class
        $scope.getStatusBadgeClass = function(status) {
            var classes = {
                'PENDING': 'badge-warning',
                'REVIEWING': 'badge-info',
                'APPROVED': 'badge-success',
                'REJECTED': 'badge-danger',
                'CANCELLED': 'badge-secondary'
            };
            return classes[status] || 'badge-secondary';
        };
        
        // Get priority badge class
        $scope.getPriorityBadgeClass = function(priority) {
            var classes = {
                'LOW': 'badge-secondary',
                'NORMAL': 'badge-primary',
                'HIGH': 'badge-warning',
                'URGENT': 'badge-danger'
            };
            return classes[priority] || 'badge-secondary';
        };
        
        // Filter appeals
        $scope.applyFilters = function() {
            $scope.pagination.page = 1;
            loadAppeals();
        };
        
        // Clear filters
        $scope.clearFilters = function() {
            $scope.filters = {
                status: 'PENDING',
                classId: null,
                priority: null
            };
            $scope.applyFilters();
        };
        
        // Pagination
        $scope.handlePageChange = function() {
            loadAppeals();
        };
        
        // Initialize
        loadAppeals();
        loadClasses();
    }
]);

