// @ts-check
/* global angular */
'use strict';

// Advisor Retake Controller
app.controller('AdvisorRetakeController', [
    '$scope',
    'AuthService',
    'RetakeService',
    'ClassService',
    'ToastService',
    function($scope, AuthService, RetakeService, ClassService, ToastService) {
        $scope.currentUser = AuthService.getCurrentUser();
        
        // Retakes list
        $scope.retakes = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.filters = {
            classId: null,
            status: null,
            reason: null
        };
        
        // Pagination
        $scope.pagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0
        };
        
        // Filter options
        $scope.classes = [];
        $scope.loadingFilters = false;
        
        // Decision modal
        $scope.showDecisionModal = false;
        $scope.selectedRetake = null;
        $scope.decisionData = {
            status: 'APPROVED',
            advisorNotes: ''
        };
        $scope.saving = false;
        
        // Load classes for filter
        function loadClasses() {
            $scope.loadingFilters = true;
            ClassService.getAll()
                .then(function(classes) {
                    $scope.classes = classes || [];
                    $scope.loadingFilters = false;
                })
                .catch(function(error) {
                    $scope.loadingFilters = false;
                });
        }
        
        // Load retakes
        function loadRetakes(page) {
            $scope.loading = true;
            $scope.error = null;
            
            if (page) {
                $scope.pagination.page = page;
            }

            // Determine which endpoint to use
            var promise;
            if ($scope.filters.classId) {
                // Load by class
                promise = RetakeService.getByClass(
                    $scope.filters.classId,
                    $scope.filters.status,
                    $scope.pagination.page,
                    $scope.pagination.pageSize
                );
            } else {
                // Load all (need to implement or use a different approach)
                // For now, show message to select a class
                if (!$scope.filters.classId) {
                    $scope.error = 'Vui lòng chọn lớp để xem danh sách học lại';
                    $scope.loading = false;
                    $scope.retakes = [];
                    return;
                }
            }

            if (promise) {
                promise.then(function(result) {
                    $scope.retakes = result.records || [];
                    $scope.pagination.totalCount = result.totalCount || 0;
                    $scope.pagination.totalPages = result.totalPages || 0;
                    $scope.loading = false;
                }).catch(function(error) {
                    $scope.error = error.message || 'Lỗi khi tải danh sách học lại';
                    $scope.loading = false;
                    ToastService.error('Lỗi: ' + $scope.error);
                });
            }
        }
        
        // Apply filters
        $scope.applyFilters = function() {
            $scope.pagination.page = 1;
            loadRetakes();
        };
        
        // Clear filters
        $scope.clearFilters = function() {
            $scope.filters.classId = null;
            $scope.filters.status = null;
            $scope.filters.reason = null;
            $scope.pagination.page = 1;
            loadRetakes();
        };
        
        // Open decision modal
        $scope.openDecisionModal = function(retake, status) {
            $scope.selectedRetake = retake;
            $scope.decisionData.status = status;
            $scope.decisionData.advisorNotes = '';
            $scope.showDecisionModal = true;
        };
        
        // Close decision modal
        $scope.closeDecisionModal = function(event) {
            if (event && event.target !== event.currentTarget) {
                return; // Don't close if clicking inside modal
            }
            $scope.showDecisionModal = false;
            $scope.selectedRetake = null;
            $scope.decisionData.advisorNotes = '';
        };
        
        // Save decision
        $scope.saveDecision = function() {
            if (!$scope.selectedRetake) return;
            
            $scope.saving = true;
            
            RetakeService.updateStatus($scope.selectedRetake.retakeId, {
                status: $scope.decisionData.status,
                advisorNotes: $scope.decisionData.advisorNotes || null
            }).then(function() {
                ToastService.success('Cập nhật trạng thái học lại thành công');
                $scope.closeDecisionModal();
                loadRetakes(); // Reload list
                $scope.saving = false;
            }).catch(function(error) {
                ToastService.error('Lỗi: ' + (error.message || 'Không thể cập nhật trạng thái'));
                $scope.saving = false;
            });
        };
        
        // Get page numbers for pagination
        $scope.getPageNumbers = function() {
            var pages = [];
            var totalPages = $scope.pagination.totalPages || 0;
            var currentPage = $scope.pagination.page || 1;
            
            var startPage = Math.max(1, currentPage - 2);
            var endPage = Math.min(totalPages, currentPage + 2);
            
            for (var i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            return pages;
        };
        
        // Filter retakes by reason (client-side filter since API doesn't support it yet)
        $scope.filteredRetakes = function() {
            if (!$scope.filters.reason) {
                return $scope.retakes;
            }
            return $scope.retakes.filter(function(r) {
                return r.reason === $scope.filters.reason;
            });
        };
        
        // Initialize
        loadClasses();
        // Note: Will show error to select class first
    }
]);

