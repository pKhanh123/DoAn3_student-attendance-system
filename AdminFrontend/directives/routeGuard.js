// Route Guard - Bảo vệ các route theo role
app.run(['$rootScope', '$location', 'AuthService', 'RoleService', 'ToastService', 
    function($rootScope, $location, AuthService, RoleService, ToastService) {
    
    // ✅ Các route PUBLIC (không cần login)
    var publicRoutes = ['/login', '/register', '/forgot-password', '/verify-otp', '/reset-password'];
    
    // ✅ Lắng nghe sự kiện thay đổi route
    $rootScope.$on('$locationChangeStart', function(event, next, current) {
        var path = $location.path();
        
        // ✅ Cho phép truy cập public routes
        if (publicRoutes.indexOf(path) !== -1) {
            return;
        }
        
        // ✅ Kiểm tra đăng nhập
        if (!AuthService.isLoggedIn()) {
            event.preventDefault();
            $location.path('/login');
            ToastService.warning('Vui lòng đăng nhập để tiếp tục');
            return;
        }
        
        // ✅ Kiểm tra quyền truy cập route
        var role = RoleService.getCurrentRole();
        
        // Normalize role (trim whitespace, handle case sensitivity)
        if (role) {
            role = role.trim();
            // Map Vietnamese role names to English (if needed)
            var roleMap = {
                'Cố vấn': 'Advisor',
                'Giảng viên': 'Lecturer',
                'Sinh viên': 'Student',
                'Quản trị viên': 'Admin'
            };
            role = roleMap[role] || role;
        }
        
        // ✅ If no role found, allow access (role will be set after login)
        if (!role) {
            return; // Allow access, role will be set after login completes
        }
        
        // ✅ Redirect non-Admin users away from admin-only routes
        // Advisor có quyền truy cập một số route admin (do gộp với Support)
        var adminOnlyRoutes = ['/users', '/roles'];
        if (role !== 'Admin' && role !== 'Advisor' && adminOnlyRoutes.some(function(route) { return path === route || path.startsWith(route + '/'); })) {
            event.preventDefault();
            var defaultRoute = getDefaultRouteForRole(role);
            $location.path(defaultRoute);
            ToastService.warning('Bạn không có quyền truy cập trang này');
            return;
        }
        
        // Admin role: Allow all routes that are either in menu items or in fallback list
        // This prevents "no permission" errors when menu items are still loading
        if (role === 'Admin') {
            // For Admin, allow route if:
            // 1. It's in allowed routes (from menu or fallback), OR
            // 2. It's a valid admin route (starts with common admin paths)
            var isAllowed = RoleService.isRouteAllowed(path);
            var isAdminRoute = path.startsWith('/dashboard') || 
                              path.startsWith('/users') || 
                              path.startsWith('/roles') ||
                              path.startsWith('/students') ||
                              path.startsWith('/lecturers') ||
                              path.startsWith('/classes') ||
                              path.startsWith('/rooms') ||  // ✅ THÊM: Quản lý phòng học
                              path.startsWith('/grade-formula') ||
                              path.startsWith('/academic-years') ||
                              path.startsWith('/school-years') ||
                              path.startsWith('/organization') ||
                              path.startsWith('/subject-prerequisites') ||
                              path.startsWith('/admin-classes') ||
                              path.startsWith('/registration-periods') ||
                              path.startsWith('/enrollments') ||
                              path.startsWith('/admin/timetable') ||
                              path.startsWith('/audit-logs') ||
                              path.startsWith('/notifications') ||
                              path === '/login' || 
                              path === '/';
            
            if (!isAllowed && !isAdminRoute) {
                event.preventDefault();
                var defaultRoute = getDefaultRouteForRole(role);
                $location.path(defaultRoute);
                ToastService.error('Bạn không có quyền truy cập trang này');
                return;
            }
        } else if (role === 'Advisor') {
            // For Advisor (gộp với Support), allow route if:
            // 1. It's a valid advisor route (starts with /advisor/ or /notifications) - CHECK THIS FIRST
            // 2. It's a Support route (dashboard, registration-periods, enrollments, audit-logs)
            // 3. It's in allowed routes (from menu or fallback)
            // This prevents "no permission" errors when menu items are still loading
            var isAdvisorRoute = path.startsWith('/advisor/') ||
                                 path.startsWith('/notifications') ||
                                 path === '/login';
            
            // Routes mà Support có quyền (giờ Advisor cũng có)
            var isSupportRoute = path === '/dashboard' ||
                                 path.startsWith('/registration-periods') ||
                                 path.startsWith('/enrollments') ||
                                 path.startsWith('/audit-logs') ||
                                 path.startsWith('/admin/reports');
            
            // ✅ Auto-redirect from root path to advisor dashboard
            if (path === '/') {
                event.preventDefault();
                $location.path('/advisor/dashboard');
                return;
            }
            
            // ✅ Allow advisor routes and support routes immediately (don't wait for menu to load)
            if (isAdvisorRoute || isSupportRoute) {
                return; // Allow access
            }
            
            // If not an advisor/support route, check if it's in allowed routes
            var isAllowed = RoleService.isRouteAllowed(path);
            if (!isAllowed) {
                event.preventDefault();
                var defaultRoute = getDefaultRouteForRole(role);
                $location.path(defaultRoute);
                ToastService.warning('Bạn không có quyền truy cập trang này');
                return;
            }
        } else if (role === 'Lecturer') {
            // For Lecturer, allow lecturer-specific routes immediately
            var isLecturerRoute = path.startsWith('/lecturer/') ||
                                 path.startsWith('/notifications') ||
                                 path === '/login';
            
            // ✅ Auto-redirect from root path to lecturer dashboard
            if (path === '/') {
                event.preventDefault();
                $location.path('/lecturer/dashboard');
                return;
            }
            
            // ✅ Allow lecturer routes immediately (don't wait for menu to load)
            if (isLecturerRoute) {
                return; // Allow access
            }
            
            // If not a lecturer route, check if it's in allowed routes
            var isAllowed = RoleService.isRouteAllowed(path);
            if (!isAllowed) {
                event.preventDefault();
                var defaultRoute = getDefaultRouteForRole(role);
                $location.path(defaultRoute);
                ToastService.warning('Bạn không có quyền truy cập trang này');
                return;
            }
        } else if (role === 'Student') {
            // For Student, allow student-specific routes immediately (don't wait for menu to load)
            var isStudentRoute = path.startsWith('/student/') ||
                               path.startsWith('/notifications') ||
                               path === '/login';
            
            // ✅ Auto-redirect from root path to student dashboard
            if (path === '/') {
                event.preventDefault();
                $location.path('/student/dashboard');
                return;
            }
            
            // ✅ Allow student routes immediately (don't wait for menu to load)
            if (isStudentRoute) {
                return; // Allow access
            }
            
            // If not a student route, check if it's in allowed routes
            var isAllowed = RoleService.isRouteAllowed(path);
            if (!isAllowed) {
                event.preventDefault();
                var defaultRoute = getDefaultRouteForRole(role);
                $location.path(defaultRoute);
                ToastService.warning('Bạn không có quyền truy cập trang này');
                return;
            }
        } else {
            // For other roles, use strict route checking
            if (!RoleService.isRouteAllowed(path)) {
                event.preventDefault();
                var defaultRoute = getDefaultRouteForRole(role);
                $location.path(defaultRoute);
                ToastService.warning('Bạn không có quyền truy cập trang này');
                return;
            }
        }
    });
    
    /**
     * Get default route based on user role
     */
    function getDefaultRouteForRole(role) {
        var defaults = {
            'Admin': '/dashboard',
            'Lecturer': '/lecturer/dashboard',
            'Student': '/student/dashboard',
            'Advisor': '/advisor/dashboard'
        };
        return defaults[role] || '/dashboard';
    }
}]);

// ✅ Directive để kiểm tra permission trong template
app.directive('requirePermission', ['RoleService', function(RoleService) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var permission = attrs.requirePermission;
            
            // Hide element if user doesn't have permission
            if (!RoleService.hasPermission(permission)) {
                element.remove();
            }
        }
    };
}]);

// ✅ Directive để kiểm tra role trong template
app.directive('requireRole', ['RoleService', function(RoleService) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var requiredRoles = attrs.requireRole.split(',');
            
            // Hide element if user doesn't have required role
            if (!RoleService.hasAnyRole(requiredRoles)) {
                element.remove();
            }
        }
    };
}]);

