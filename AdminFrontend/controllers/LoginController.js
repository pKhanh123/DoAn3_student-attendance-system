// Login Controller
app.controller('LoginController', ['$scope', '$location', 'AuthService', 'RoleService', function($scope, $location, AuthService, RoleService) {
    $scope.credentials = {
        username: '',
        password: '',
        rememberMe: false
    };
    
    $scope.error = null;
    $scope.loading = false;
    $scope.showPassword = false; // Toggle password visibility
    
    // Fix: Đảm bảo toggle button luôn nổi bật khi browser autofill
    // Sử dụng CSS animation để phát hiện autofill một cách đáng tin cậy
    $scope.$on('$viewContentLoaded', function() {
        // Đợi DOM render xong
        setTimeout(function() {
            var passwordInput = document.getElementById('login-password');
            if (passwordInput) {
                var wrapper = passwordInput.closest('.login-input-wrapper');
                
                // Kiểm tra autofill bằng cách xem input có value không (có thể là autofill)
                // Và đảm bảo toggle button luôn visible
                function ensureButtonVisible() {
                    if (wrapper && passwordInput.value) {
                        wrapper.classList.add('autofilled');
                    }
                }
                
                // Kiểm tra ngay và sau các khoảng thời gian (autofill có thể delay)
                ensureButtonVisible();
                [100, 300, 500, 1000, 2000].forEach(function(delay) {
                    setTimeout(ensureButtonVisible, delay);
                });
                
                // Kiểm tra khi có sự kiện
                passwordInput.addEventListener('animationstart', function(e) {
                    // Browser autofill thường trigger animation
                    if (e.animationName && e.animationName.indexOf('autofill') !== -1) {
                        wrapper.classList.add('autofilled');
                    }
                });
            }
        }, 100);
    });
    
    $scope.login = function() {
        $scope.error = null;
        $scope.loading = true;
        
        AuthService.login($scope.credentials.username, $scope.credentials.password, $scope.credentials.rememberMe)
            .then(function(response) {
                // ✅ Pre-load menu items and permissions after login
                // This ensures route guard has the correct routes when checking permissions
                var loadMenuPromise = RoleService.loadMenuItems().catch(function(err) {
                    // Continue even if menu loading fails (will use fallback)
                });
                
                var loadPermissionsPromise = RoleService.loadPermissions().catch(function(err) {
                    // Continue even if permissions loading fails (will use fallback)
                });
                
                // Wait for both to complete (or fail), then redirect
                return Promise.all([loadMenuPromise, loadPermissionsPromise]).then(function() {
                    $scope.loading = false;
                    
                    // Redirect based on user role
                    // Backend returns 'Role' (capital R), not 'roleName'
                    var roleName = response.Role || response.roleName || response.role || 'Admin';
                    
                    switch(roleName) {
                        case 'Lecturer':
                            $location.path('/lecturer/dashboard');
                            break;
                        case 'Advisor':
                            $location.path('/advisor/dashboard');
                            break;
                        case 'Student':
                            $location.path('/student/dashboard');
                            break;
                        case 'Admin':
                        default:
                            $location.path('/dashboard');
                            break;
                    }
                });
            })
            .catch(function(error) {
                $scope.loading = false;
                
                // Get error message from response if available
                var errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
                
                if (error && error.data && error.data.message) {
                    // Use message from backend
                    errorMessage = error.data.message;
                } else if (error && error.message) {
                    // Use error message
                    errorMessage = error.message;
                } else if (error && error.status === 401) {
                    // 401 Unauthorized - wrong credentials
                    errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
                } else if (error && error.status === 400) {
                    // 400 Bad Request - missing or invalid input
                    errorMessage = 'Vui lòng nhập đầy đủ tài khoản và mật khẩu';
                } else if (error && error.status === 0) {
                    // Network error
                    errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
                } else if (error && error.status >= 500) {
                    // Server error
                    errorMessage = 'Lỗi hệ thống. Vui lòng thử lại sau.';
                }
                
                $scope.error = errorMessage;
            });
    };
}]);

