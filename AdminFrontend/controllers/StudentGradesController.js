// @ts-check
/* global angular */
'use strict';

// Student Grades Controller
app.controller('StudentGradesController', [
    '$scope',
    '$rootScope',
    'AuthService',
    'GradeDashboardService',
    'ToastService',
    function(
        $scope,
        $rootScope,
        AuthService,
        GradeDashboardService,
        ToastService
    ) {
        $scope.currentUser = AuthService.getCurrentUser();

        var viewModel = GradeDashboardService.create($scope, {
            allowRecalculate: true,
            currentUserGetter: function() {
                return AuthService.getCurrentUser();
            },
            onError: function(message) {
                ToastService.error(message);
            }
        });

        // Lưu viewModel vào scope để có thể truy cập từ bên ngoài (nếu cần)
        $scope.gradeViewModel = viewModel;

        // Khởi tạo
        viewModel.init();

        // Lắng nghe sự kiện chuyển học kỳ (nếu có)
        var semesterTransitionListener = $rootScope.$on('semester:transitioned', function(event, data) {
            // Tự động refresh khi chuyển học kỳ
            if (data && data.schoolYearId === $scope.selectedSchoolYear) {
                ToastService.info('Học kỳ đã được cập nhật. Đang làm mới dữ liệu...');
                viewModel.refresh();
            }
        });

        // Cleanup listener khi controller bị destroy
        $scope.$on('$destroy', function() {
            if (semesterTransitionListener) {
                semesterTransitionListener();
            }
        });
    }
]);
