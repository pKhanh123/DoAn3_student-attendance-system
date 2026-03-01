// Student Profile Controller
app.controller('StudentProfileController', ['$scope', 'AuthService', 'StudentService', 'AvatarService', 'ToastService', function($scope, AuthService, StudentService, AvatarService, ToastService) {
    $scope.currentUser = AuthService.getCurrentUser();
    $scope.studentInfo = null;
    $scope.loading = false;
    $scope.editing = false;
    $scope.profileForm = {};
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Load student profile
    function loadProfile() {
        if (!$scope.currentUser || !$scope.currentUser.userId) {
            $scope.loading = false;
            return;
        }
        
        $scope.loading = true;
        
        StudentService.getByUserId($scope.currentUser.userId)
            .then(function(response) {
                if (response.data && response.data.data) {
                    $scope.studentInfo = response.data.data;
                    $scope.profileForm = angular.copy($scope.studentInfo);
                }
                $scope.loading = false;
            })
            .catch(function(error) {
                ToastService.error('Không thể tải thông tin cá nhân');
                $scope.loading = false;
            });
    }
    
    // Start editing
    $scope.startEdit = function() {
        $scope.editing = true;
        $scope.profileForm = angular.copy($scope.studentInfo);
    };
    
    // Cancel editing
    $scope.cancelEdit = function() {
        $scope.editing = false;
        $scope.profileForm = angular.copy($scope.studentInfo);
    };
    
    // Save profile
    $scope.saveProfile = function() {
        // TODO: Implement profile update API call
        ToastService.info('Chức năng cập nhật thông tin đang được phát triển');
        $scope.editing = false;
    };
    
    // Initialize
    loadProfile();
}]);

