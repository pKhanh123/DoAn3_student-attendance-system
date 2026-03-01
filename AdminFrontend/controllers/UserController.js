// User Controller
app.controller('UserController', ['$scope', '$location', '$routeParams', '$timeout', 'UserService', 'AuthService',
    function($scope, $location, $routeParams, $timeout, UserService, AuthService) {
    
    $scope.users = [];
    $scope.filteredUsers = [];
    $scope.roles = [];
    $scope.user = {isActive: true}; // Default active
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    $scope.currentUser = AuthService.getCurrentUser();
    
    // Pagination
    $scope.currentPage = 1;
    $scope.pageSize = 10;
    $scope.totalPages = 0;
    
    // Filters
    $scope.searchText = '';
    $scope.filterRole = '';
    $scope.filterStatus = '';
    
    // Math for template
    $scope.Math = window.Math;
    
    // Load all users (Admin only)
    $scope.loadUsers = function() {
        // Check if user is Admin before loading
        var currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
            $scope.error = 'Bạn không có quyền quản lý người dùng. Chỉ Admin mới có quyền này.';
            $scope.loading = false;
            return;
        }
        
        var userRole = currentUser.roleName || currentUser.Role || currentUser.role || '';
        
        if (userRole !== 'Admin' && userRole !== 'Quản trị viên') {
            $scope.error = 'Bạn không có quyền quản lý người dùng. Chỉ Admin mới có quyền này.';
            $scope.loading = false;
            return;
        }
        
        $scope.loading = true;
        UserService.getAll()
            .then(function(response) {
                $scope.users = response.data;
                $scope.filteredUsers = response.data;
                $scope.calculateTotalPages();
                $scope.loading = false;
            })
            .catch(function(error) {
                if (error.status === 403) {
                    $scope.error = 'Bạn không có quyền quản lý người dùng. Chỉ Admin mới có quyền này.';
                } else if (error.status === 404) {
                    $scope.error = 'Không tìm thấy dữ liệu người dùng.';
                } else {
                    $scope.error = 'Không thể tải danh sách người dùng: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                }
                $scope.loading = false;
            });
    };
    
    // Apply filters
    $scope.applyFilters = function() {
        $scope.filteredUsers = $scope.users.filter(function(user) {
            var matchSearch = true;
            var matchRole = true;
            var matchStatus = true;
            
            // Search filter
            if ($scope.searchText) {
                var searchLower = $scope.searchText.toLowerCase();
                matchSearch = (user.username && user.username.toLowerCase().includes(searchLower)) ||
                              (user.fullName && user.fullName.toLowerCase().includes(searchLower)) ||
                              (user.email && user.email.toLowerCase().includes(searchLower));
            }
            
            // Role filter
            if ($scope.filterRole) {
                matchRole = user.roleId === $scope.filterRole;
            }
            
            // Status filter
            if ($scope.filterStatus !== '') {
                matchStatus = user.isActive.toString() === $scope.filterStatus;
            }
            
            return matchSearch && matchRole && matchStatus;
        });
        
        $scope.currentPage = 1;
        $scope.calculateTotalPages();
    };
    
    // Reset filters
    $scope.resetFilters = function() {
        $scope.searchText = '';
        $scope.filterRole = '';
        $scope.filterStatus = '';
        $scope.filteredUsers = $scope.users;
        $scope.currentPage = 1;
        $scope.calculateTotalPages();
    };
    
    // Pagination functions
    $scope.calculateTotalPages = function() {
        $scope.totalPages = Math.ceil($scope.filteredUsers.length / $scope.pageSize);
    };
    
    $scope.previousPage = function() {
        if ($scope.currentPage > 1) {
            $scope.currentPage--;
        }
    };
    
    $scope.nextPage = function() {
        if ($scope.currentPage < $scope.totalPages) {
            $scope.currentPage++;
        }
    };
    
    $scope.goToPage = function(page) {
        $scope.currentPage = page;
    };
    
    $scope.getPages = function() {
        var pages = [];
        var startPage = Math.max(1, $scope.currentPage - 2);
        var endPage = Math.min($scope.totalPages, $scope.currentPage + 2);
        
        for (var i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };
    
    // Load roles
    $scope.loadRoles = function() {
        UserService.getRoles()
            .then(function(response) {
                $scope.roles = response.data;
            })
            .catch(function(error) {
                // Error handled silently
            });
    };
    
    // Load user by ID for editing
    $scope.loadUser = function(id) {
        $scope.loading = true;
        UserService.getById(id)
            .then(function(response) {
                // Backend returns {data: {...}}
                if (response.data && response.data.data) {
                    $scope.user = response.data.data;
                } else {
                    $scope.user = response.data;
                }
                $scope.isEditMode = true;
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải thông tin người dùng';
                $scope.loading = false;
            });
    };
    
    // Create or update user
    $scope.saveUser = function() {
        // Mark all fields as touched to show validation errors
        if ($scope.userForm && $scope.userForm.$invalid) {
            Object.keys($scope.userForm).forEach(function(key) {
                if (key[0] !== '$' && $scope.userForm[key]) {
                    $scope.userForm[key].$setTouched();
                }
            });
            $scope.error = 'Vui lòng kiểm tra lại các trường đã nhập';
            return;
        }
        
        $scope.error = null;
        $scope.success = null;
        $scope.loading = true;
        
        var savePromise;
        if ($scope.isEditMode) {
            savePromise = UserService.update($scope.user.userId, $scope.user);
        } else {
            savePromise = UserService.create($scope.user);
        }
        
        savePromise
            .then(function(response) {
                $scope.success = ($scope.isEditMode ? 'Cập nhật' : 'Thêm') + ' người dùng thành công!';
                $scope.loading = false;
                
                // Scroll to top to show success message
                window.scrollTo(0, 0);
                
                // Redirect after 1.5 seconds
                $timeout(function() {
                    $location.path('/users');
                }, 1500);
            })
            .catch(function(error) {
                $scope.loading = false;
                window.scrollTo(0, 0);
                
                // Extract error message
                if (error.data && error.data.message) {
                    $scope.error = error.data.message;
                } else if (error.data && error.data.errors) {
                    // Validation errors from backend
                    var errors = [];
                    for (var key in error.data.errors) {
                        errors.push(error.data.errors[key].join(', '));
                    }
                    $scope.error = errors.join('; ');
                } else if (error.status === 400) {
                    $scope.error = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
                } else if (error.status === 409) {
                    $scope.error = 'Tên đăng nhập hoặc email đã tồn tại';
                } else if (error.status === 404) {
                    $scope.error = 'Không tìm thấy người dùng';
                } else {
                    $scope.error = 'Không thể lưu người dùng. Vui lòng thử lại.';
                }
            });
    };
    
    // Delete user
    $scope.deleteUser = function(userId) {
        // Prevent deleting yourself
        if (userId === $scope.currentUser.userId) {
            $scope.error = 'Bạn không thể xóa tài khoản của chính mình!';
            window.scrollTo(0, 0);
            $timeout(function() {
                $scope.error = null;
            }, 3000);
            return;
        }
        
        if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?\n\nHành động này không thể hoàn tác!')) {
            return;
        }
        
        $scope.loading = true;
        $scope.error = null;
        $scope.success = null;
        
        UserService.delete(userId)
            .then(function(response) {
                $scope.success = 'Xóa người dùng thành công!';
                $scope.loading = false;
                window.scrollTo(0, 0);
                
                // Reload users after 1 second
                $timeout(function() {
                    $scope.loadUsers();
                    $scope.success = null;
                }, 1500);
            })
            .catch(function(error) {
                $scope.loading = false;
                window.scrollTo(0, 0);
                
                if (error.status === 403) {
                    $scope.error = 'Bạn không có quyền xóa người dùng này';
                } else if (error.status === 409) {
                    $scope.error = 'Không thể xóa người dùng này vì có dữ liệu liên quan';
                } else {
                    $scope.error = 'Không thể xóa người dùng. Vui lòng thử lại.';
                }
                
                // Auto hide error after 5 seconds
                $timeout(function() {
                    $scope.error = null;
                }, 5000);
            });
    };
    
    // Go to create page
    $scope.goToCreate = function() {
        $location.path('/users/create');
    };
    
    // Go to edit page
    $scope.goToEdit = function(userId) {
        $location.path('/users/edit/' + userId);
    };
    
    // Cancel and go back
    $scope.cancel = function() {
        $location.path('/users');
    };
    
    // Initialize based on route
    // Check if user is Admin before loading
    var currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
        $scope.error = 'Bạn không có quyền quản lý người dùng. Chỉ Admin mới có quyền này.';
        $scope.loading = false;
    } else {
        var userRole = currentUser.roleName || currentUser.Role || currentUser.role || '';
        var isAdmin = (userRole === 'Admin' || userRole === 'Quản trị viên');
        
        if ($location.path() === '/users') {
            if (isAdmin) {
                $scope.loadUsers();
                $scope.loadRoles(); // Load roles for filter
            } else {
                $scope.error = 'Bạn không có quyền quản lý người dùng. Chỉ Admin mới có quyền này.';
                $scope.loading = false;
            }
        } else if ($routeParams.id) {
            if (isAdmin) {
                $scope.loadUser($routeParams.id);
                $scope.loadRoles();
            } else {
                $scope.error = 'Bạn không có quyền quản lý người dùng. Chỉ Admin mới có quyền này.';
                $scope.loading = false;
            }
        } else {
            // Create mode - set default values
            $scope.user = {
                isActive: true,
                username: '',
                fullName: '',
                email: '',
                phone: '',
                roleId: '',
                password: ''
            };
            $scope.loadRoles();
        }
    }
}]);

