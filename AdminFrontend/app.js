// @ts-check
/* global angular, window */
'use strict';

// AngularJS Application Configuration
// @ts-ignore - angular is loaded from CDN
var app = angular.module('adminApp', ['ngRoute', 'ngAnimate']);

// Academic rules & thresholds (centralised to avoid scattering magic numbers)
app.constant('ACADEMIC_RULES', {
    defaultRequiredCredits: 120,
    passingScore: 5.0,
    excellentThreshold: 9.0,
    goodThreshold: 8.0,
    averageThreshold: 5.5
});

// API Configuration (Microservices Pattern - All via Gateway)
app.constant('API_CONFIG', {
    // ✅ Production: Tất cả requests qua Gateway (Microservices Pattern)
    BASE_URL: 'https://localhost:7033/api-edu',    // API Gateway URL (all requests go through here)
    // BASE_URL: 'http://localhost:5227/api-edu',   // Direct to Admin API (for testing only)
    GATEWAY_URL: 'https://localhost:7033'             // Gateway URL (for avatars and static files)
    // ✅ Avatars load qua Gateway: https://localhost:7033/avatars/...
    // ✅ Gateway sẽ proxy tất cả requests đến Admin API (port 5227)
});

// Route Configuration
app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    // Đảm bảo sử dụng hashbang kiểu #! để điều hướng đúng
    $locationProvider.hashPrefix('!');
    $routeProvider
        // Login
        .when('/login', {
            templateUrl: 'views/login.html',
            controller: 'LoginController',
            publicAccess: true
        })
        .when('/forgot-password', {
            templateUrl: 'views/auth/forgot-password.html',
            controller: 'ForgotPasswordController',
            publicAccess: true
        })
        .when('/verify-otp', {
            templateUrl: 'views/auth/verify-otp.html',
            controller: 'VerifyOTPController',
            publicAccess: true
        })
        .when('/reset-password', {
            templateUrl: 'views/auth/reset-password.html',
            controller: 'ResetPasswordController',
            publicAccess: true
        })
        
        // Dashboard
        .when('/dashboard', {
            templateUrl: 'views/dashboard.html',
            controller: 'DashboardController'
        })
        
        // User Management
        .when('/users', {
            templateUrl: 'views/users/list.html',
            controller: 'UserController'
        })
        .when('/users/create', {
            templateUrl: 'views/users/form.html',
            controller: 'UserController'
        })
        .when('/users/edit/:id', {
            templateUrl: 'views/users/form.html',
            controller: 'UserController'
        })
        
        // Role Management
        .when('/roles', {
            templateUrl: 'views/roles/list.html',
            controller: 'RoleController'
        })
        
        // Organization Management - TÍCH HỢP TOÀN BỘ (Khoa, Bộ môn, Ngành, Môn học)
        .when('/organization', {
            templateUrl: 'views/organization/index.html',
            controller: 'OrganizationController'
        })
        
        // Legacy routes - redirect to organization page
        .when('/faculties', {
            redirectTo: '/organization'
        })
        .when('/departments', {
            redirectTo: '/organization'
        })
        .when('/majors', {
            redirectTo: '/organization'
        })
        .when('/subjects', {
            redirectTo: '/organization'
        })
        
        // Academic Year Management
        .when('/academic-years', {
            templateUrl: 'views/academic-years/list.html',
            controller: 'AcademicYearController'
        })
        .when('/academic-years/create', {
            templateUrl: 'views/academic-years/form.html',
            controller: 'AcademicYearController'
        })
        .when('/academic-years/edit/:id', {
            templateUrl: 'views/academic-years/form.html',
            controller: 'AcademicYearController'
        })
        
        // School Year Management
        .when('/school-years', {
            templateUrl: 'views/school-years/list.html',
            controller: 'SchoolYearController'
        })
        .when('/school-years/create', {
            templateUrl: 'views/school-years/form.html',
            controller: 'SchoolYearController'
        })
        .when('/school-years/edit/:id', {
            templateUrl: 'views/school-years/form.html',
            controller: 'SchoolYearController'
        })
        
        // Student Management
        .when('/students', {
            templateUrl: 'views/students/list.html',
            controller: 'StudentController'
        })
        .when('/students/create', {
            templateUrl: 'views/students/form.html',
            controller: 'StudentController'
        })
        .when('/students/edit/:id', {
            templateUrl: 'views/students/form.html',
            controller: 'StudentController'
        })
        
        // Lecturer Management (Kèm phân môn)
        .when('/lecturers', {
            templateUrl: 'views/lecturers/manage.html',
            controller: 'LecturerManagementController'
        })
        
        // Class Management
        .when('/classes', {
            templateUrl: 'views/classes/list.html',
            controller: 'ClassController'
        })
        
        // Room Management (Quản lý Phòng học)
        .when('/rooms', {
            templateUrl: 'views/admin/rooms/list.html',
            controller: 'RoomController'
        })
        
        // Grade Formula Management (Admin)
        .when('/grade-formula', {
            templateUrl: 'views/advisor/grade-formula.html',
            controller: 'AdvisorGradeFormulaConfigController'
        })
        
        // Lecturer Portal
        .when('/lecturer/dashboard', {
            templateUrl: 'views/lecturer/dashboard.html',
            controller: 'LecturerDashboardController'
        })
        .when('/lecturer/attendance', {
            templateUrl: 'views/lecturer/attendance.html',
            controller: 'LecturerAttendanceController'
        })
        .when('/lecturer/attendance/:sessionId', {
            templateUrl: 'views/lecturer/attendance.html',
            controller: 'LecturerAttendanceController'
        })
        .when('/lecturer/grades', {
            templateUrl: 'views/lecturer/grades.html',
            controller: 'LecturerGradesController'
        })
        .when('/lecturer/appeals', {
            templateUrl: 'views/lecturer/appeals.html',
            controller: 'LecturerGradeAppealController'
        })
        .when('/lecturer/grade-formula', {
            templateUrl: 'views/lecturer/grade-formula.html',
            controller: 'LecturerGradeFormulaController'
        })
        .when('/lecturer/timetable', {
            templateUrl: 'views/lecturer/timetable.html',
            controller: 'LecturerTimetableController'
        })
        .when('/lecturer/classes', {
            templateUrl: 'views/lecturer/classes.html',
            controller: 'LecturerClassController'
        })
        
        // Advisor Portal
        .when('/advisor/dashboard', {
            templateUrl: 'views/advisor/dashboard.html',
            controller: 'AdvisorDashboardController'
        })
        .when('/advisor/students/:studentId', {
            templateUrl: 'views/advisor/student-detail.html',
            controller: 'AdvisorStudentController'
        })
        .when('/advisor/students', {
            templateUrl: 'views/advisor/students.html',
            controller: 'AdvisorStudentListController'
        })
        .when('/advisor/students/:studentId/progress', {
            templateUrl: 'views/advisor/student-progress.html',
            controller: 'AdvisorProgressController'
        })
        .when('/advisor/warnings', {
            templateUrl: 'views/advisor/warnings.html',
            controller: 'AdvisorWarningController'
        })
        .when('/advisor/appeals', {
            templateUrl: 'views/advisor/appeals.html',
            controller: 'AdvisorGradeAppealController'
        })
        .when('/advisor/retakes', {
            templateUrl: 'views/advisor/retakes.html',
            controller: 'AdvisorRetakeController'
        })
        .when('/advisor/grade-formula', {
            templateUrl: 'views/advisor/grade-formula.html',
            controller: 'AdvisorGradeFormulaConfigController'
        })
        // Redirect /advisor/enrollments to /enrollments (đã gộp chung)
        .when('/advisor/enrollments', {
            redirectTo: '/enrollments'
        })
        
        // Student Portal
        .when('/student/dashboard', {
            templateUrl: 'views/student/dashboard.html',
            controller: 'StudentDashboardController'
        })
        .when('/student/timetable', {
            templateUrl: 'views/student/timetable.html',
            controller: 'StudentTimetableController'
        })
        .when('/student/grades', {
            templateUrl: 'views/student/grades.html',
            controller: 'StudentGradesController'
        })
        .when('/student/appeals', {
            templateUrl: 'views/student/appeals.html',
            controller: 'StudentGradeAppealController'
        })
        .when('/student/retakes', {
            templateUrl: 'views/student/retakes.html',
            controller: 'StudentRetakeController'
        })
        .when('/student/retake-register', {
            templateUrl: 'views/student/retake-register.html',
            controller: 'StudentRetakeRegisterController'
        })
        .when('/student/attendance', {
            templateUrl: 'views/student/attendance.html',
            controller: 'StudentAttendanceController'
        })
        .when('/student/exam-schedule', {
            templateUrl: 'views/student/exam-schedule.html',
            controller: 'StudentExamScheduleController'
        })
        .when('/student/profile', {
            templateUrl: 'views/student/profile.html',
            controller: 'StudentProfileController'
        })
        
        // =============================================
        // 🔹 PHASE 2: ENROLLMENT SYSTEM
        // =============================================
        
        // Administrative Classes
        .when('/admin-classes', {
            templateUrl: 'views/admin-classes/list.html',
            controller: 'AdministrativeClassController'
        })
        
        // Registration Periods
        .when('/registration-periods', {
            templateUrl: 'views/registration-periods/manage.html',
            controller: 'RegistrationPeriodController'
        })
        
        // Enrollments - Student
        .when('/student/enrollments', {
            templateUrl: 'views/enrollments/student-register.html',
            controller: 'EnrollmentController'
        })
        
        // Enrollments - Admin
        .when('/enrollments', {
            templateUrl: 'views/advisor/enrollment-approval.html',
            controller: 'AdvisorEnrollmentApprovalController'
        })
        
        // Subject Prerequisites
        .when('/subject-prerequisites', {
            templateUrl: 'views/subject-prerequisites/manage.html',
            controller: 'SubjectPrerequisiteController'
        })
        
        // System Management
        .when('/audit-logs', {
            templateUrl: 'views/audit-logs/list.html',
            controller: 'AuditLogController'
        })
        .when('/notifications', {
            templateUrl: 'views/notifications/list.html',
            controller: 'NotificationController'
        })
        
        // Admin Timetable Management
        .when('/admin/timetable', {
            templateUrl: 'views/admin/timetable.html',
            controller: 'AdminTimetableController'
        })
        
        // Reports & Statistics
        .when('/admin/reports', {
            templateUrl: 'views/admin/reports.html',
            controller: 'AdminReportController'
        })
        .when('/advisor/reports', {
            templateUrl: 'views/advisor/reports.html',
            controller: 'AdvisorReportController'
        })
        .when('/advisor/exam-schedules', {
            templateUrl: 'views/advisor/exam-schedules.html',
            controller: 'AdvisorExamScheduleController'
        })
        .when('/advisor/exam-schedules/:examId/scores', {
            templateUrl: 'views/advisor/exam-schedule-scores.html',
            controller: 'AdvisorExamScoreController'
        })
        .when('/lecturer/reports', {
            templateUrl: 'views/lecturer/reports.html',
            controller: 'LecturerReportController'
        })
        .when('/student/reports', {
            templateUrl: 'views/student/reports.html',
            controller: 'StudentReportController'
        })
        
        // Default route
        .otherwise({
            redirectTo: '/login'
        });
}]);

// Global helper function to format date for date inputs (YYYY-MM-DD format)
// This prevents AngularJS ngModel:datefmt errors
app.run(['$rootScope', '$exceptionHandler', function($rootScope, $exceptionHandler) {
    $rootScope.formatDateForInput = function(dateString) {
        if (!dateString) return null;
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            // Format as YYYY-MM-DD for date input
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        } catch (e) {
            return null;
        }
    };
    
    // CRITICAL: Override exception handler to catch and suppress datefmt errors
    var originalExceptionHandler = $exceptionHandler;
    $exceptionHandler = function(exception, cause) {
        // Suppress ngModel:datefmt errors - we handle date formatting ourselves
        if (exception && exception.message && exception.message.includes('ngModel:datefmt')) {
            return; // Don't log or throw the error
        }
        // For all other errors, use the original handler
        originalExceptionHandler(exception, cause);
    };
}]);

// Run block - Check authentication and add global logout
app.run(['$rootScope', '$location', 'AuthService', 'LoggerService', 'NotificationService', function($rootScope, $location, AuthService, LoggerService, NotificationService) {
    // Global logout function available in all views
    $rootScope.logout = function() {
        LoggerService.log('Logging out...');
        AuthService.logout();
        $location.path('/login');
    };
    
    // Load unread notification count on app start (if user is authenticated)
    // Debounce route change to prevent spam requests
    var routeChangeTimeout = null;
    $rootScope.$on('$routeChangeStart', function(event, next, current) {
        if (AuthService.isAuthenticated() && next && !next.publicAccess) {
            // Clear existing timeout
            if (routeChangeTimeout) {
                clearTimeout(routeChangeTimeout);
            }
            // Debounce: only load after 500ms of no route changes
            routeChangeTimeout = setTimeout(function() {
                NotificationService.loadUnreadCount();
                routeChangeTimeout = null;
            }, 500);
        }
    });
    
    // Initial load if already authenticated
    if (AuthService.isAuthenticated()) {
        NotificationService.loadUnreadCount();
    }
    
    // Get current user for display in header
    $rootScope.getCurrentUser = function() {
        return AuthService.getCurrentUser();
    };
    
    $rootScope.$on('$routeChangeStart', function(event, next) {
        if (!next.publicAccess && !AuthService.isAuthenticated()) {
            $location.path('/login');
        }
        
        // If authenticated and trying to access login, redirect based on role
        if (next.publicAccess && AuthService.isAuthenticated()) {
            var currentUser = AuthService.getCurrentUser();
            // Backend returns 'role' (lowercase) or 'Role' (capital), not 'roleName'
            var userRole = currentUser?.role || currentUser?.Role || currentUser?.roleName || 'Admin';
            
            // Normalize role
            if (userRole) {
                userRole = userRole.trim();
                var roleMap = {
                    'Cố vấn': 'Advisor',
                    'Giảng viên': 'Lecturer',
                    'Sinh viên': 'Student',
                    'Quản trị viên': 'Admin'
                };
                userRole = roleMap[userRole] || userRole;
            }
            
            // Redirect based on user role
            var defaultRoute = '/dashboard';
            if (userRole === 'Student') {
                defaultRoute = '/student/dashboard';
            } else if (userRole === 'Lecturer') {
                defaultRoute = '/lecturer/dashboard';
            } else if (userRole === 'Advisor') {
                defaultRoute = '/advisor/dashboard';
            }
            
            $location.path(defaultRoute);
        }
    });
}]);

// HTTP Interceptor for adding JWT token, auto-refresh, and formatting dates
app.factory('AuthInterceptor', ['$q', '$location', '$window', '$injector', function($q, $location, $window, $injector) {
    // Helper to format date strings to YYYY-MM-DD format
    function formatDateString(dateString) {
        if (!dateString || typeof dateString !== 'string') return dateString;
        // If already in YYYY-MM-DD format, return as is
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        // Try to parse and format
        try {
            var date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                var year = date.getFullYear();
                var month = String(date.getMonth() + 1).padStart(2, '0');
                var day = String(date.getDate()).padStart(2, '0');
                return year + '-' + month + '-' + day;
            }
        } catch (e) {
            // Ignore errors
        }
        return dateString;
    }
    
    // Helper to recursively format dates in response data
    function formatDatesInObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(function(item) {
                return formatDatesInObject(item);
            });
        }
        
        var formatted = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var value = obj[key];
                // Check if key suggests it's a date field
                if (key.toLowerCase().includes('date') && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                    formatted[key] = formatDateString(value);
                } else if (typeof value === 'object') {
                    formatted[key] = formatDatesInObject(value);
                } else {
                    formatted[key] = value;
                }
            }
        }
        return formatted;
    }
    
    return {
        request: function(config) {
            // Skip token check for public endpoints
            var publicEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/refresh'];
            var isPublicEndpoint = publicEndpoints.some(function(endpoint) {
                return config.url.indexOf(endpoint) !== -1;
            });
            
            if (isPublicEndpoint) {
                return config;
            }
            
            // Get AuthService (using $injector to avoid circular dependency)
            var AuthService = $injector.get('AuthService');
            
            // Check and refresh token before sending request
            return AuthService.checkAndRefreshToken().then(function(token) {
                // Token is valid (or was refreshed), add to header
                config.headers.Authorization = 'Bearer ' + token;
                return config;
            }).catch(function(error) {
                // Token check/refresh failed - will be handled by responseError
                // Still try to get token (might be valid but refresh failed)
                var token = AuthService.getToken();
                if (token) {
                    config.headers.Authorization = 'Bearer ' + token;
                }
                return config;
            });
        },
        response: function(response) {
            // DISABLED: Format dates in response data
            // This was causing conflicts with AngularJS date formatting
            // Instead, we rely on:
            // 1. Controller-level formatting when loading data
            // 2. ng-model-options on date inputs
            // 3. dateInput directive for automatic formatting
            // if (response.data && typeof response.data === 'object') {
            //     response.data = formatDatesInObject(response.data);
            // }
            return response;
        },
        responseError: function(rejection) {
            // Xử lý lỗi 403 (Forbidden) - không hiển thị error cho một số endpoint không quan trọng
            if (rejection.status === 403) {
                var url = rejection.config && rejection.config.url || '';
                
                // Suppress 403 errors cho exam-schedules (có thể do chưa có lịch thi hoặc không có quyền)
                if (url.indexOf('/exam-schedules/student/') !== -1) {
                    // Trả về response rỗng thay vì error để app vẫn chạy bình thường
                    return $q.resolve({
                        data: { data: [] },
                        status: 200,
                        config: rejection.config
                    });
                }
                
                // Với các endpoint khác, vẫn reject để caller xử lý
                return $q.reject(rejection);
            }
            
            if (rejection.status === 401) {
                // Unauthorized - Try to refresh token first
                var AuthService = $injector.get('AuthService');
                var $location = $injector.get('$location');
                
                // Check if this is a login endpoint - don't show session expired toast
                var isLoginEndpoint = rejection.config && rejection.config.url && 
                                     (rejection.config.url.indexOf('/auth/login') !== -1 ||
                                      rejection.config.url.indexOf('/login') !== -1);
                
                // Check if this is a refresh endpoint (avoid infinite loop)
                var isRefreshEndpoint = rejection.config && rejection.config.url && 
                                       rejection.config.url.indexOf('/auth/refresh') !== -1;
                
                // Check if user is on login page
                var isOnLoginPage = $location.path() === '/login';
                
                // If it's a login endpoint or user is on login page, don't handle 401 here
                // Let the login controller handle the error message
                if (isLoginEndpoint || isOnLoginPage) {
                    return $q.reject(rejection);
                }
                
                if (!isRefreshEndpoint) {
                    // Try to refresh token
                    return AuthService.refreshToken().then(function(newTokens) {
                        // Retry original request with new token
                        var $http = $injector.get('$http');
                        var originalConfig = rejection.config;
                        originalConfig.headers.Authorization = 'Bearer ' + newTokens.token;
                        
                        return $http(originalConfig);
                    }).catch(function(refreshError) {
                        // Refresh failed - logout
                        AuthService.logout();
                        
                        // Only show toast if not on login page
                        if (!isOnLoginPage) {
                            try {
                                var ToastService = $injector.get('ToastService');
                                ToastService.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                            } catch (e) {
                                // ToastService not available, skip
                            }
                        }
                        
                        return $q.reject(rejection);
                    });
                } else {
                    // Refresh endpoint returned 401 - logout
                    AuthService.logout();
                    
                    // Only show toast if not on login page
                    if (!isOnLoginPage) {
                        try {
                            var ToastService = $injector.get('ToastService');
                            ToastService.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                        } catch (e) {
                            // ToastService not available, skip
                        }
                    }
                }
            } else if (rejection.status === 403) {
                // Forbidden - User doesn't have permission
                // Don't show error toast for 403, let the controller handle it
                // This prevents spam of error messages for admin-only features
                // Silent - no console output
            } else if (rejection.status === 404) {
                // Not Found - Resource doesn't exist
                // Don't show error toast, let the controller handle it
                // Silent - no console output
            }
            return $q.reject(rejection);
        }
    };
}]);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('AuthInterceptor');
}]);

// 🔧 FIX: Close all modals when route changes
app.run(['$rootScope', function($rootScope) {
    $rootScope.$on('$routeChangeStart', function() {
        // Close all modals when navigating to a new page
        // @ts-ignore - ModalUtils is defined in js/modal.js
        if (typeof window !== 'undefined' && window.ModalUtils && typeof window.ModalUtils.closeAll === 'function') {
            // @ts-ignore
            window.ModalUtils.closeAll();
        }
    });
}]);

