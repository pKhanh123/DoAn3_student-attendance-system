// @ts-check
/* global angular */
'use strict';

// Student Retake Controller
app.controller('StudentRetakeController', [
    '$scope',
    'AuthService',
    'RetakeService',
    'ToastService',
    function($scope, AuthService, RetakeService, ToastService) {
        $scope.currentUser = AuthService.getCurrentUser();
        $scope.studentId = $scope.currentUser?.studentId || null;
        
        // Retakes list
        $scope.retakes = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.filters = {
            status: null
        };
        
        // Pagination
        $scope.pagination = {
            page: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 0
        };
        
        // Load retakes
        $scope.loadRetakes = function(page) {
            if (!$scope.studentId) {
                $scope.error = 'Không tìm thấy thông tin sinh viên';
                return;
            }

            $scope.loading = true;
            $scope.error = null;
            
            if (page) {
                $scope.pagination.page = page;
            }

            RetakeService.getByStudent(
                $scope.studentId,
                $scope.filters.status,
                $scope.pagination.page,
                $scope.pagination.pageSize
            ).then(function(result) {
                $scope.retakes = result.records || [];
                $scope.pagination.totalCount = result.totalCount || 0;
                $scope.pagination.totalPages = result.totalPages || 0;
                $scope.loading = false;
            }).catch(function(error) {
                $scope.error = error.message || 'Lỗi khi tải danh sách môn cần học lại';
                $scope.loading = false;
                ToastService.error('Lỗi: ' + $scope.error);
            });
        };
        
        // Clear filters
        $scope.clearFilters = function() {
            $scope.filters.status = null;
            $scope.pagination.page = 1;
            $scope.loadRetakes();
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
        
        // Initialize
        $scope.loadRetakes();
    }
]);

