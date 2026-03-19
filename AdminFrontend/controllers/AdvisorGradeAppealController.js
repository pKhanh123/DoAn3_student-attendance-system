// @ts-check
/* global angular */
'use strict';

// Advisor Grade Appeal Controller
app.controller('AdvisorGradeAppealController', [
    '$scope',
    'AuthService',
    'GradeAppealService',
    'ClassService',
    'StudentService',
    'ToastService',
    'LoggerService',
    function($scope, AuthService, GradeAppealService, ClassService, StudentService, ToastService, LoggerService) {
        $scope.currentUser = AuthService.getCurrentUser();
        $scope.advisorId = $scope.currentUser?.lecturerId || null; // Advisor is a lecturer
        
        // Appeals list
        $scope.appeals = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.filters = {
            status: null,
            studentId: null,
            classId: null,
            priority: null
        };
        
        // Pagination
        $scope.pagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0
        };
        
        // Decision modal
        $scope.showDecisionModal = false;
        $scope.selectedAppeal = null;
        $scope.decisionData = {
            advisorResponse: '',
            advisorDecision: 'APPROVE', // APPROVE, REJECT
            finalScore: null,
            resolutionNotes: ''
        };
        $scope.saving = false;
        
        // Detail modal
        $scope.showDetailModal = false;
        
        // Filter options
        $scope.classes = [];
        $scope.students = [];
        $scope.loadingFilters = false;
        
        // Load appeals
        function loadAppeals() {
            $scope.loading = true;
            $scope.error = null;
            
            var filters = {};
            if ($scope.filters.status) filters.status = $scope.filters.status;
            if ($scope.filters.studentId) filters.studentId = $scope.filters.studentId;
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
        
        // Load filter options
        function loadFilterOptions() {
            $scope.loadingFilters = true;
            
            Promise.all([
                ClassService.getAll().catch(function() { return []; }),
                StudentService.getAll(1, 1000).then(function(result) { return result.students || []; }).catch(function() { return []; })
            ]).then(function(results) {
                $scope.classes = results[0] || [];
                $scope.students = results[1] || [];
                $scope.loadingFilters = false;
            }).catch(function(error) {
                LoggerService.error('Error loading filter options', error);
                $scope.loadingFilters = false;
            });
        }
        
        // Open decision modal
        $scope.openDecisionModal = function(appeal) {
            $scope.selectedAppeal = appeal;
            $scope.decisionData = {
                advisorResponse: '',
                advisorDecision: 'APPROVE',
                finalScore: appeal.expectedScore || appeal.currentScore,
                resolutionNotes: ''
            };
            $scope.showDecisionModal = true;
        };
        
        // Close decision modal
        $scope.closeDecisionModal = function() {
            $scope.showDecisionModal = false;
            $scope.selectedAppeal = null;
        };
        
        // Submit decision (Advisor quyết định cuối cùng)
        $scope.submitDecision = function() {
            if (!$scope.selectedAppeal) {
                ToastService.error('Không tìm thấy yêu cầu phúc khảo');
                return;
            }
            
            // ✅ VALIDATION: Chỉ cho phép advisor quyết định khi status = REVIEWING hoặc PENDING
            if ($scope.selectedAppeal.status !== 'REVIEWING' && $scope.selectedAppeal.status !== 'PENDING') {
                ToastService.error('Chỉ có thể quyết định phúc khảo khi trạng thái là "Đang xem xét" (REVIEWING) hoặc "Chờ xử lý" (PENDING). Trạng thái hiện tại: ' + $scope.selectedAppeal.status);
                return;
            }
            
            if (!$scope.decisionData.advisorDecision) {
                ToastService.error('Vui lòng chọn quyết định cuối cùng');
                return;
            }
            
            if ($scope.decisionData.advisorDecision === 'APPROVE' && !$scope.decisionData.finalScore) {
                ToastService.error('Vui lòng nhập điểm sau phúc khảo khi duyệt');
                return;
            }
            
            if ($scope.decisionData.finalScore && ($scope.decisionData.finalScore < 0 || $scope.decisionData.finalScore > 10)) {
                ToastService.error('Điểm phải nằm trong khoảng 0 đến 10');
                return;
            }
            
            $scope.saving = true;
            
            var decisionData = {
                advisorId: $scope.advisorId,
                advisorResponse: $scope.decisionData.advisorResponse || null,
                advisorDecision: $scope.decisionData.advisorDecision,
                finalScore: $scope.decisionData.advisorDecision === 'APPROVE' ? $scope.decisionData.finalScore : null,
                resolutionNotes: $scope.decisionData.resolutionNotes || null,
                updatedBy: $scope.currentUser.userId || $scope.advisorId
            };
            
            GradeAppealService.updateAdvisorDecision($scope.selectedAppeal.appealId, decisionData)
                .then(function() {
                    ToastService.success('Quyết định phúc khảo cuối cùng thành công!');
                    $scope.closeDecisionModal();
                    loadAppeals();
                })
                .catch(function(error) {
                    var errorMessage = error.data?.message || error.message || 'Không thể quyết định phúc khảo';
                    ToastService.error('Lỗi: ' + errorMessage);
                    LoggerService.error('Error updating advisor decision', error);
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
                status: null,
                studentId: null,
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
        loadFilterOptions();
    }
]);

