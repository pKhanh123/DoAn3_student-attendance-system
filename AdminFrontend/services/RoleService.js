// Role-based Access Control Service
app.service('RoleService', ['AuthService', '$http', '$rootScope', 'API_CONFIG', 'LoggerService', function(AuthService, $http, $rootScope, API_CONFIG, LoggerService) {
    
    // Cache for permissions loaded from API
    var cachedPermissions = null;
    var permissionCodesCache = [];
    
    // Cache for menu items loaded from API
    var cachedMenuItems = null;
    var menuLoadPromise = null;
    
    // Listen for logout event to clear cache
    var self = this;
    $rootScope.$on('user:logout', function() {
        self.clearCache();
    });
    
    // Permission code mapping to frontend permission names
    // Map backend permission codes to frontend permission flags
    var PERMISSION_MAP = {
        // User Management (Quản lý người dùng)
        'VIEW_USERS': 'canManageUsers',
        'CREATE_USERS': 'canManageUsers',
        'EDIT_USERS': 'canManageUsers',
        'DELETE_USERS': 'canManageUsers',
        'TOGGLE_USER_STATUS': 'canManageUsers',
        'RESET_PASSWORD': 'canManageUsers',
        
        // Role & Permission Management (Quản lý vai trò & phân quyền)
        'VIEW_ROLES': 'canManageRoles',
        'CREATE_ROLES': 'canManageRoles',
        'EDIT_ROLES': 'canManageRoles',
        'DELETE_ROLES': 'canManageRoles',
        'VIEW_PERMISSIONS': 'canManageRoles',
        'MANAGE_PERMISSIONS': 'canManageRoles',
        
        // Student Management (Quản lý sinh viên)
        'VIEW_STUDENTS': 'canManageStudents',
        'VIEW_STUDENT_DETAIL': 'canManageStudents',
        'CREATE_STUDENTS': 'canManageStudents',
        'EDIT_STUDENTS': 'canManageStudents',
        'DELETE_STUDENTS': 'canManageStudents',
        'IMPORT_STUDENTS': 'canManageStudents',
        'EXPORT_STUDENTS': 'canExportStudents',
        
        // Lecturer Management (Quản lý giảng viên)
        'VIEW_LECTURERS': 'canManageLecturers',
        'VIEW_LECTURER_DETAIL': 'canManageLecturers',
        'CREATE_LECTURERS': 'canManageLecturers',
        'EDIT_LECTURERS': 'canManageLecturers',
        'DELETE_LECTURERS': 'canManageLecturers',
        'ASSIGN_LECTURER_SUBJECTS': 'canManageLecturers',
        
        // Organization Management (Quản lý tổ chức)
        'VIEW_ORGANIZATION': 'canManageOrganization',
        'MANAGE_FACULTIES': 'canManageOrganization',
        'MANAGE_DEPARTMENTS': 'canManageOrganization',
        'MANAGE_MAJORS': 'canManageOrganization',
        
        // Subject Management (Quản lý môn học)
        'VIEW_SUBJECTS': 'canManageSubjects',
        'CREATE_SUBJECTS': 'canManageSubjects',
        'EDIT_SUBJECTS': 'canManageSubjects',
        'DELETE_SUBJECTS': 'canManageSubjects',
        
        // Class Management (Quản lý lớp học)
        'VIEW_ALL_CLASSES': 'canManageClasses',
        'VIEW_OWN_CLASSES': 'canViewOwnClasses',
        'CREATE_CLASSES': 'canManageClasses',
        'EDIT_CLASSES': 'canManageClasses',
        'DELETE_CLASSES': 'canManageClasses',
        'MANAGE_CLASS_ENROLLMENT': 'canManageClasses',
        
        // Schedule Management (Quản lý lịch học)
        'VIEW_ALL_SCHEDULES': 'canManageSchedules',
        'VIEW_OWN_SCHEDULE': 'canViewOwnSchedule',
        'MANAGE_SCHEDULES': 'canManageSchedules',
        'EXPORT_SCHEDULES': 'canExportSchedules',
        
        // Room Management (Quản lý phòng học)
        // ✅ APPROACH: Section-level permission = Full access (view, create, edit, delete)
        // ADMIN_ROOMS từ database → canManageRooms → full access to all room operations
        'ADMIN_ROOMS': 'canManageRooms',
        // Support for future action-level permissions (if needed)
        'VIEW_ROOMS': 'canManageRooms',
        'CREATE_ROOMS': 'canManageRooms',
        'EDIT_ROOMS': 'canManageRooms',
        'DELETE_ROOMS': 'canManageRooms',
        
        // ============================================================
        // Section-level Admin Permissions (Quyền quản lý theo section)
        // ✅ APPROACH: Section-level permission = Full access
        // Mỗi ADMIN_* permission code từ database = full access to that section
        // ============================================================
        'ADMIN_DASHBOARD': 'canViewDashboard',
        'ADMIN_USERS': 'canManageUsers',
        'ADMIN_ROLES': 'canManageRoles',
        'ADMIN_STUDENTS': 'canManageStudents',
        'ADMIN_LECTURERS': 'canManageLecturers',
        'ADMIN_ORGANIZATION': 'canManageOrganization',
        'ADMIN_CLASSES': 'canManageClasses',
        'ADMIN_ADMIN_CLASSES': 'canManageClasses',  // Administrative classes
        'ADMIN_SECTION_CLASSES': 'canManageClasses',
        'ADMIN_NOTIFICATIONS': 'canManageNotifications',
        'ADMIN_REPORTS': 'canViewReports',
        'ADMIN_AUDIT_LOGS': 'canViewAuditLogs',
        'ADMIN_SECTION_OVERVIEW': 'canViewDashboard',
        'ADMIN_SECTION_USERS': 'canManageUsers',
        'ADMIN_SECTION_ACADEMIC': 'canManageAcademicYears',
        'ADMIN_ACADEMIC_YEARS': 'canManageAcademicYears',
        'ADMIN_SCHOOL_YEARS': 'canManageAcademicYears',
        'ADMIN_SECTION_ENROLLMENT': 'canManageClasses',
        'ADMIN_ENROLLMENTS': 'canManageClasses',
        'ADMIN_REGISTRATION_PERIODS': 'canManageClasses',
        'ADMIN_GRADE_FORMULA': 'canEnterGrades',
        'ADMIN_SUBJECT_PREREQUISITES': 'canManageSubjects',
        'ADMIN_SECTION_SYSTEM': 'canManageSystem',
        'ADMIN_TIMETABLE': 'canManageSchedules',
        
        // Attendance Management (Điểm danh)
        'TAKE_ATTENDANCE': 'canTakeAttendance',
        'VIEW_ALL_ATTENDANCE': 'canViewAllAttendance',
        'VIEW_OWN_ATTENDANCE': 'canViewOwnAttendance',
        'EDIT_ATTENDANCE': 'canEditAttendance',
        'EXPORT_ATTENDANCE': 'canExportAttendance',
        
        // Grade Management (Quản lý điểm số)
        'ENTER_GRADES': 'canEnterGrades',
        'VIEW_ALL_GRADES': 'canViewAllGrades',
        'VIEW_OWN_GRADES': 'canViewOwnGrades',
        'EDIT_GRADES': 'canEditGrades',
        'APPROVE_GRADES': 'canApproveGrades',
        'EXPORT_GRADES': 'canExportGrades',
        
        // Academic Year Management (Quản lý niên khóa)
        'VIEW_ACADEMIC_YEARS': 'canViewAcademicYears',
        'CREATE_ACADEMIC_YEARS': 'canManageAcademicYears',
        'EDIT_ACADEMIC_YEARS': 'canManageAcademicYears',
        'DELETE_ACADEMIC_YEARS': 'canManageAcademicYears',
        'SET_ACTIVE_ACADEMIC_YEAR': 'canManageAcademicYears',
        
        // Academic Advisor (Cố vấn học tập)
        'VIEW_ADVISEES': 'canViewAdvisees',
        'VIEW_ADVISEE_GRADES': 'canViewAdvisees',
        'VIEW_ADVISEE_ATTENDANCE': 'canViewAdvisees',
        'MANAGE_ADVISEES': 'canManageAdvisees',
        
        // Reports & Statistics (Báo cáo & thống kê)
        'VIEW_REPORTS': 'canViewReports',
        'EXPORT_REPORTS': 'canExportReports',
        'VIEW_DASHBOARD_STATS': 'canViewDashboard',
        
        // Notifications (Thông báo)
        'VIEW_NOTIFICATIONS': 'canViewNotifications',
        'CREATE_NOTIFICATIONS': 'canCreateNotifications',
        'MANAGE_NOTIFICATIONS': 'canManageNotifications',
        
        // System Management (Hệ thống)
        'VIEW_AUDIT_LOGS': 'canViewAuditLogs',
        'EXPORT_AUDIT_LOGS': 'canExportAuditLogs',
        'MANAGE_SYSTEM_SETTINGS': 'canManageSystem',
        'BACKUP_RESTORE': 'canManageSystem',
        'VIEW_SYSTEM_INFO': 'canViewSystemInfo'
    };
    
    // Fallback permissions (used when API fails)
    var FALLBACK_PERMISSIONS = {
        'Admin': {
            // All permissions - Admin có toàn quyền
            canManageUsers: true,
            canManageRoles: true,
            canManageStudents: true,
            canManageLecturers: true,
            canManageOrganization: true,
            canManageSubjects: true,
            canManageClasses: true,
            canManageRooms: true,  // ✅ THÊM: Quản lý phòng học
            canManageSchedules: true,
            canManageAcademicYears: true,
            canTakeAttendance: true,
            canViewAllAttendance: true,
            canEditAttendance: true,
            canEnterGrades: true,
            canViewAllGrades: true,
            canEditGrades: true,
            canApproveGrades: true,
            canViewReports: true,
            canExportReports: true,
            canViewAuditLogs: true,
            canManageSystem: true,
            canViewDashboard: true,
            canManageNotifications: true,
            canViewAllData: true
        },
        'Lecturer': {
            // Giảng viên - quyền giảng dạy
            canManageUsers: false,
            canManageRoles: false,
            canManageStudents: false, // Chỉ xem sinh viên trong lớp mình dạy
            canManageLecturers: false,
            canManageOrganization: false,
            canManageSubjects: false,
            canManageClasses: false, // Chỉ quản lý lớp mình dạy
            canViewOwnClasses: true,
            canManageSchedules: false,
            canViewOwnSchedule: true,
            canManageAcademicYears: false,
            canViewAcademicYears: true,
            canTakeAttendance: true,
            canViewAllAttendance: false, // Chỉ xem điểm danh lớp mình dạy
            canEditAttendance: true,
            canExportAttendance: true,
            canEnterGrades: true,
            canViewAllGrades: false, // Chỉ xem điểm lớp mình dạy
            canEditGrades: true,
            canExportGrades: true,
            canViewReports: true,
            canExportReports: true,
            canViewDashboard: true,
            canCreateNotifications: true,
            canViewNotifications: true
        },
        'Student': {
            // Sinh viên - chỉ xem thông tin của mình
            canManageUsers: false,
            canManageRoles: false,
            canManageStudents: false,
            canManageLecturers: false,
            canManageOrganization: false,
            canManageSubjects: false,
            canManageClasses: false,
            canViewOwnClasses: true,
            canManageSchedules: false,
            canViewOwnSchedule: true,
            canExportSchedules: true,
            canManageAcademicYears: false,
            canViewAcademicYears: true,
            canTakeAttendance: false,
            canViewOwnAttendance: true,
            canEnterGrades: false,
            canViewOwnGrades: true,
            canViewDashboard: true,
            canViewNotifications: true
        },
        'Advisor': {
            // Cố vấn học tập & Nhân viên phòng đào tạo - quản lý sinh viên được phụ trách + quản lý đăng ký
            canManageUsers: false,
            canManageRoles: false,
            canManageStudents: true, // Chỉ sinh viên được phụ trách
            canManageLecturers: false,
            canManageOrganization: false,
            canManageSubjects: false,
            canManageClasses: false,
            canManageSchedules: false,
            canManageAcademicYears: false,
            canViewAcademicYears: true,
            canTakeAttendance: false,
            canEnterGrades: false,
            canViewAdvisees: true,
            canManageAdvisees: true,
            canViewReports: true,
            canExportReports: true,
            canViewDashboard: true,
            canCreateNotifications: true,
            canViewNotifications: true,
            // Quyền Nhân viên phòng đào tạo (gộp vào Advisor)
            canViewAuditLogs: true, // Xem nhật ký hệ thống
            canManageEnrollment: true, // Quản lý đăng ký học phần
            canViewRegistrationPeriods: true, // Xem đợt đăng ký
            canManageRegistrationPeriods: true // Quản lý đợt đăng ký
        }
    };
    
    /**
     * Load permissions from API
     */
    this.loadPermissions = function() {
        var self = this;
        var role = self.getCurrentRole();
        
        if (!role) {
            return Promise.reject('No role found');
        }
        
        // Return cached if available
        if (cachedPermissions) {
            return Promise.resolve(cachedPermissions);
        }
        
        // Load from API
        return $http.get(API_CONFIG.BASE_URL + '/menu/permissions')
            .then(function(response) {
                permissionCodesCache = response.data.permissions || [];
                
                // Build permissions object from permission codes
                // ✅ APPROACH: Section-level permissions (ADMIN_*) = Full access
                var permissions = {};
                permissionCodesCache.forEach(function(code) {
                    var frontendPermission = PERMISSION_MAP[code];
                    if (frontendPermission) {
                        permissions[frontendPermission] = true;
                    }
                });
                
                cachedPermissions = permissions;
                return permissions;
            })
            .catch(function(error) {
                LoggerService.error('Failed to load permissions from API', error);
                // Fallback to hard-coded permissions
                cachedPermissions = FALLBACK_PERMISSIONS[role] || {};
                return cachedPermissions;
            });
    };
    
    /**
     * Get current user role
     */
    this.getCurrentRole = function() {
        var user = AuthService.getCurrentUser();
        return user ? (user.Role || user.role) : null;
    };
    
    /**
     * Check if user has a specific permission
     */
    this.hasPermission = function(permission) {
        // Use cached permissions if available
        if (cachedPermissions) {
            return cachedPermissions[permission] === true;
        }
        
        // Fallback to hard-coded permissions
        var role = this.getCurrentRole();
        if (!role || !FALLBACK_PERMISSIONS[role]) {
            return false;
        }
        return FALLBACK_PERMISSIONS[role][permission] === true;
    };
    
    /**
     * Check if user has specific role
     */
    this.hasRole = function(role) {
        return this.getCurrentRole() === role;
    };
    
    /**
     * Get permission codes from cache (for debugging)
     */
    this.getPermissionCodes = function() {
        return permissionCodesCache || [];
    };
    
    /**
     * Check if user has any of the specified roles
     */
    this.hasAnyRole = function(roles) {
        var currentRole = this.getCurrentRole();
        return roles.indexOf(currentRole) !== -1;
    };
    
    /**
     * Extract all routes from menu items
     */
    function extractRoutesFromMenuItems(menuItems) {
        if (!menuItems || !Array.isArray(menuItems)) {
            return [];
        }
        
        var routes = [];
        menuItems.forEach(function(section) {
            if (section.items && Array.isArray(section.items)) {
                section.items.forEach(function(item) {
                    if (item.path) {
                        routes.push(item.path);
                    }
                });
            }
        });
        
        return routes;
    }
    
    /**
     * Get allowed routes for current user role
     * Prioritizes routes from menu items (API), falls back to hardcoded routes
     */
    this.getAllowedRoutes = function() {
        var role = this.getCurrentRole();
        
        // ✅ First, try to get routes from cached menu items (from API)
        var menuRoutes = [];
        if (cachedMenuItems && Array.isArray(cachedMenuItems)) {
            menuRoutes = extractRoutesFromMenuItems(cachedMenuItems);
        }
        
        // ✅ Fallback to hardcoded routes if menu items not loaded yet
        var routeMap = {
            'Admin': [
                '/dashboard',
                '/users', '/roles',
                '/faculties', '/departments', '/majors', '/subjects',
                '/students', '/lecturers', '/classes', '/admin-classes',
                '/rooms',  // ✅ THÊM: Quản lý phòng học
                '/grade-formula',
                '/academic-years', '/school-years',
                '/subject-prerequisites',
                '/registration-periods',
                '/enrollments',
                '/audit-logs',
                '/notifications',
                '/organization',
                // Cho phép admin truy cập màn timetable để test
                '/student/timetable',
                '/lecturer/timetable',
                '/admin/timetable',
                // Reports
                '/admin/reports'
            ],
            'Lecturer': [
                '/dashboard',
                '/lecturer/attendance',
                '/lecturer/grades',
                '/lecturer/dashboard',
                '/lecturer/timetable',
                '/lecturer/reports',
                '/lecturer/classes', // ✅ Quản lý lớp học phần của giảng viên
                '/notifications'
            ],
            'Student': [
                '/dashboard',
                '/student/grades',
                '/student/dashboard',
                '/student/timetable',
                '/student/attendance',
                '/student/enrollments',
                '/student/profile',
                '/student/reports',
                '/notifications'
            ],
            'Advisor': [
                // Quyền Cố vấn học tập
                '/advisor/dashboard',
                '/advisor/students',
                '/advisor/warnings', // Warnings page (cảnh báo và gửi email)
                '/enrollments', // Duyệt đăng ký học phần/học lại (đã gộp chung với admin)
                '/advisor/reports', // Reports & Statistics
                '/notifications',
                // Quyền Nhân viên phòng đào tạo (gộp vào Advisor)
                '/dashboard', // Dashboard admin (Overview)
                '/registration-periods', // Quản lý đợt đăng ký
                '/audit-logs' // Nhật ký hệ thống
            ]
        };
        
        var fallbackRoutes = routeMap[role] || [];
        
        // ✅ If we have menu routes, use them (they are more accurate from API)
        // Otherwise, use fallback routes
        if (menuRoutes.length > 0) {
            // Merge with fallback to ensure common routes are always allowed
            var allRoutes = menuRoutes.concat(fallbackRoutes);
            // Remove duplicates
            return allRoutes.filter(function(route, index) {
                return allRoutes.indexOf(route) === index;
            });
        }
        
        return fallbackRoutes;
    };
    
    /**
     * Check if route is allowed for current user
     */
    this.isRouteAllowed = function(path) {
        var allowedRoutes = this.getAllowedRoutes();
        
        // Check exact match
        if (allowedRoutes.indexOf(path) !== -1) {
            return true;
        }
        
        // Check if path starts with any allowed route (for sub-routes)
        for (var i = 0; i < allowedRoutes.length; i++) {
            if (path.indexOf(allowedRoutes[i]) === 0) {
                return true;
            }
        }
        
        return false;
    };
    
    /**
     * Clear cached permissions (useful on logout)
     */
    this.clearCache = function() {
        cachedPermissions = null;
        permissionCodesCache = [];
        cachedMenuItems = null;
        menuLoadPromise = null;
    };
    
    /**
     * Map permission code to route path
     */
    var PERMISSION_CODE_TO_PATH = {
        // Student permissions
        'STUDENT_DASHBOARD': '/student/dashboard',
        'STUDENT_TIMETABLE': '/student/timetable',
        'STUDENT_SCHEDULE': '/student/timetable', // ✅ Đã gộp vào STUDENT_TIMETABLE
        'STUDENT_GRADES': '/student/grades',
        'STUDENT_ATTENDANCE': '/student/attendance',
        'STUDENT_PROFILE': '/student/profile',
        'STUDENT_ENROLLMENT': '/student/enrollments',
        'STUDENT_APPEALS': '/student/appeals', // ✅ Phúc khảo
        'STUDENT_REPORTS': '/student/reports',
        'STUDENT_NOTIFICATIONS': '/notifications',
        
        // Lecturer permissions
        'TEACHER_DASHBOARD': '/lecturer/dashboard',
        'TEACHER_ATTENDANCE': '/lecturer/attendance',
        'TEACHER_GRADES': '/lecturer/grades',
        'TEACHER_GRADE_FORMULA': '/lecturer/grade-formula', // ✅ Công thức điểm cho giảng viên
        'TEACHER_TIMETABLE': '/lecturer/timetable',
        'TEACHER_CLASSES': '/lecturer/classes', // ✅ Quản lý lớp học phần (Giảng viên)
        'TEACHER_REPORTS': '/lecturer/reports',
        'TEACHER_APPEALS': '/lecturer/appeals', // ✅ Phúc khảo cho giảng viên
        'TEACHER_NOTIFICATIONS': '/notifications',
        
        // Advisor permissions
        'ADVISOR_DASHBOARD': '/advisor/dashboard',
        'ADVISOR_STUDENTS': '/advisor/students', // Fixed: route is /advisor/students, not /students
        'ADVISOR_WARNINGS': '/advisor/warnings', // Task 1.5: Cảnh báo và gửi email
        'ADVISOR_ENROLLMENTS': '/enrollments', // Task 2: Duyệt đăng ký học phần/học lại (đã gộp chung)
        'ADVISOR_APPEALS': '/advisor/appeals', // ✅ Phúc khảo cho cố vấn
        'ADVISOR_RETAKE': '/advisor/retakes', // ✅ Quản lý học lại
        'ADVISOR_GRADE_FORMULA': '/grade-formula', // ✅ Công thức điểm cho cố vấn
        'ADVISOR_REPORTS': '/advisor/reports',
        'ADVISOR_NOTIFICATIONS': '/notifications',
        // Advisor System permissions (gộp vào menu Hệ thống)
        'ADVISOR_SYSTEM_REPORTS': '/admin/reports', // Thống kê & Báo cáo trong menu Hệ thống
        'ADVISOR_SYSTEM_AUDIT_LOGS': '/audit-logs', // Nhật ký hệ thống trong menu Hệ thống
        
        // Admin permissions
        'ADMIN_DASHBOARD': '/dashboard',
        'ADMIN_USERS': '/users',
        'ADMIN_ROLES': '/roles',
        'ADMIN_ORGANIZATION': '/organization',
        'ADMIN_STUDENTS': '/students',
        'ADMIN_LECTURERS': '/lecturers',
        'ADMIN_ACADEMIC_YEARS': '/academic-years',
        'ADMIN_SCHOOL_YEARS': '/school-years',
        'ADMIN_SUBJECT_PREREQUISITES': '/subject-prerequisites',
        'ADMIN_CLASSES': '/classes',
        'ADMIN_ROOMS': '/rooms',  // ✅ THÊM: Quản lý phòng học
        'ADMIN_ADMIN_CLASSES': '/admin-classes', // Quản lý lớp hành chính
        'ADMIN_SECTION_CLASSES': '/admin-classes', // Section permission cho menu lớp hành chính
        'ADMIN_REGISTRATION_PERIODS': '/registration-periods',
        'ADMIN_ENROLLMENTS': '/enrollments',
        'ADMIN_TIMETABLE': '/admin/timetable',
        'ADMIN_REPORTS': '/admin/reports',
        'ADMIN_AUDIT_LOGS': '/audit-logs',
        'ADMIN_NOTIFICATIONS': '/notifications',
        'ADMIN_GRADE_FORMULA': '/grade-formula',
        
        // Admin Section Permissions (for mapping)
        'ADMIN_SECTION_OVERVIEW': '/dashboard',
        'ADMIN_SECTION_USERS': '/users',
        'ADMIN_SECTION_ACADEMIC': '/organization',
        'ADMIN_SECTION_PROGRAM': '/subject-prerequisites', // Default path for section
        'ADMIN_SECTION_ENROLLMENT': '/registration-periods',
        'ADMIN_SECTION_TIMETABLE': '/admin/timetable',
        'ADMIN_SECTION_SYSTEM': '/audit-logs'
    };
    
    /**
     * Map backend menu format to frontend format
     */
    function mapBackendMenuToFrontend(backendMenus) {
        if (!backendMenus || !Array.isArray(backendMenus)) {
            return [];
        }
        
        var sections = backendMenus.map(function(menu) {
            var section = {
                section: menu.label || '',
                items: []
            };
            
            // Map sub items
            if (menu.sub && Array.isArray(menu.sub) && menu.sub.length > 0) {
                section.items = menu.sub.map(function(subItem) {
                    var path = null;
                    var pathSource = 'none';
                    
                    // ✅ Step 1: Try to reverse-engineer permission code from state
                    // Backend FormatState: "ADMIN_DASHBOARD" -> "main.admin.dashboard"
                    // Backend FormatState: "ADMIN_SECTION_USERS" -> "main.admin.sectionUsers"
                    // Reverse: "main.admin.dashboard" -> "ADMIN_DASHBOARD"
                    if (subItem.state) {
                        // Special handling for SECTION_* states
                        var stateLower = subItem.state.toLowerCase();
                        if (stateLower.includes('section')) {
                            // Map section states directly
                            if (stateLower.includes('sectionusers') || stateLower.includes('section.users')) {
                                path = '/users';
                                pathSource = 'sectionUsers';
                            } else if (stateLower.includes('sectionacademic') || stateLower.includes('section.academic')) {
                                path = '/organization';
                                pathSource = 'sectionAcademic';
                            } else if (stateLower.includes('sectionprogram') || stateLower.includes('section.program')) {
                                path = '/subject-prerequisites';
                                pathSource = 'sectionProgram';
                            } else if (stateLower.includes('sectionenrollment') || stateLower.includes('section.enrollment')) {
                                path = '/registration-periods';
                                pathSource = 'sectionEnrollment';
                            } else if (stateLower.includes('sectiontimetable') || stateLower.includes('section.timetable')) {
                                path = '/admin/timetable';
                                pathSource = 'sectionTimetable';
                            } else if (stateLower.includes('sectionsystem') || stateLower.includes('section.system')) {
                                path = '/audit-logs';
                                pathSource = 'sectionSystem';
                            } else if (stateLower.includes('sectionoverview') || stateLower.includes('section.overview')) {
                                path = '/dashboard';
                                pathSource = 'sectionOverview';
                            }
                        }
                        // If no section path found, try reverse engineering
                        if (!path) {
                            path = reverseEngineerPathFromState(subItem.state);
                            if (path) pathSource = 'reverseEngineer';
                        }
                    }
                    
                    // ✅ Step 2: Check label first for lecturer class management (before extractPath)
                    // This handles cases like "main.admin.tchClasses" with label "Quản lý lớp học phần (Giảng viên)"
                    if (!path || path === '/dashboard') {
                        var labelLower = (subItem.label || '').toLowerCase();
                        var currentUser = AuthService.getCurrentUser();
                        var role = currentUser ? (currentUser.Role || currentUser.role) : null;
                        
                        // If label contains "lớp học phần" and user is Lecturer, map to /lecturer/classes
                        if ((labelLower.includes('lớp') && labelLower.includes('học') && labelLower.includes('phần')) &&
                            (role === 'Lecturer' || role === 'Giảng viên')) {
                            path = '/lecturer/classes';
                            pathSource = 'inferFromLabelAndRole';
                        }
                    }
                    
                    // ✅ Step 3: Extract path from state (e.g., "main.student.dashboard" -> "/student/dashboard")
                    if (!path) {
                        path = extractPathFromState(subItem.state);
                        if (path) pathSource = 'extractPath';
                    }
                    
                    // ✅ Step 4: Infer path from state and label
                    if (!path || path === '/dashboard') {
                        var inferredPath = inferPathFromState(subItem.state, subItem.label);
                        if (inferredPath && inferredPath !== '/dashboard') {
                            path = inferredPath;
                            pathSource = 'inferFromState';
                        }
                    }
                    
                    // ✅ Step 5: Final fallback - use label to infer path
                    if (!path || path === '/dashboard') {
                        var labelPath = inferPathFromLabel(subItem.label);
                        if (labelPath && labelPath !== '/dashboard') {
                            path = labelPath;
                            pathSource = 'inferFromLabel';
                        }
                    }
                    
                    // ✅ Step 5: If still no path and label contains report/thống kê/báo cáo, infer from current role
                    if (!path || path === '/dashboard') {
                        // Get role from AuthService since we can't use 'this' in this context
                        var currentUser = AuthService.getCurrentUser();
                        var role = currentUser ? (currentUser.Role || currentUser.role) : null;
                        var labelLower = (subItem.label || '').toLowerCase();
                        if (labelLower.includes('report') || labelLower.includes('thống kê') || labelLower.includes('báo cáo')) {
                            if (role === 'Admin') {
                                path = '/admin/reports';
                                pathSource = 'inferFromLabelAndRole';
                            } else if (role === 'Advisor') {
                                path = '/advisor/reports';
                                pathSource = 'inferFromLabelAndRole';
                            } else if (role === 'Lecturer') {
                                path = '/lecturer/reports';
                                pathSource = 'inferFromLabelAndRole';
                            } else if (role === 'Student') {
                                path = '/student/reports';
                                pathSource = 'inferFromLabelAndRole';
                            }
                        }
                    }
                    
                    // ✅ Debug logging for menu items in QUẢN LÝ ĐÀO TẠO section or REPORTS
                    if (menu.label && ((menu.label.includes('ĐÀO TẠO') || menu.label.includes('ACADEMIC')) || 
                        (subItem.label && (subItem.label.includes('Thống kê') || subItem.label.includes('Báo cáo') || subItem.label.includes('report'))))) {
                        var currentUser = AuthService.getCurrentUser();
                        var role = currentUser ? (currentUser.Role || currentUser.role) : null;
                        LoggerService.log('Menu Item Mapping:', {
                            label: subItem.label,
                            state: subItem.state,
                            path: path,
                            pathSource: pathSource,
                            section: menu.label,
                            role: role
                        });
                    }
                    
                    // ✅ Clean label: Remove "(giảng viên)" or "(Giảng viên)" from label
                    var originalLabel = subItem.label || '';
                    var cleanLabel = originalLabel.replace(/\s*\([^)]*giảng\s*viên[^)]*\)/gi, '').trim();
                    
                    
                    return {
                        path: path || '/dashboard',
                        icon: normalizeIcon(subItem.icon),
                        label: cleanLabel
                    };
                });
            } else {
                // If no sub items, create single item from parent (still as dropdown)
                var path = extractPathFromState(menu.state);
                
                if (!path || path === '/dashboard') {
                    path = inferPathFromState(menu.state, menu.label);
                }
                
                section.items = [{
                    path: path || '/dashboard',
                    icon: normalizeIcon(menu.icon),
                    label: menu.label || ''
                }];
                // Removed singleLink to make all sections dropdown
            }
            
            return section;
        }).filter(function(section) {
            return section.items.length > 0;
        });
        
        // ✅ Gộp menu items trùng path toàn cục (loại bỏ duplicate giữa các sections)
        // Đây là phần quan trọng để tránh hiển thị 2 menu items trùng nhau
        // Ví dụ: "Duyệt đăng ký học phần/học lại" (trong section "CỐ VẤN HỌC TẬP") 
        // và "Duyệt đăng ký" (trong section "ĐĂNG KÝ HỌC PHẦN") đều trỏ đến /enrollments
        // Ưu tiên giữ menu item trong section "ĐĂNG KÝ HỌC PHẦN" và loại bỏ menu item trong section "CỐ VẤN HỌC TẬP"
        
        // ✅ Loại bỏ menu items enrollment approval trong section "CỐ VẤN HỌC TẬP" nếu đã có trong "ĐĂNG KÝ HỌC PHẦN"
        // Đồng bộ với admin: chỉ cần menu item "Duyệt đăng ký" trong section "ĐĂNG KÝ HỌC PHẦN"
        var currentUser = AuthService.getCurrentUser();
        var role = currentUser ? (currentUser.Role || currentUser.role) : null;
        
        // Filter sections: loại bỏ menu items enrollment trong section "CỐ VẤN HỌC TẬP" nếu đã có trong "ĐĂNG KÝ HỌC PHẦN"
        var sectionsFiltered = sections.map(function(section) {
            // Nếu là section "CỐ VẤN HỌC TẬP" hoặc "ACADEMIC ADVISOR", loại bỏ menu items enrollment
            var sectionLabelLower = (section.section || '').toLowerCase();
            var isAdvisorSection = sectionLabelLower.includes('cố vấn') || sectionLabelLower.includes('advisor') || 
                                   sectionLabelLower.includes('học tập') || sectionLabelLower.includes('academic');
            
            // Kiểm tra xem có section "ĐĂNG KÝ HỌC PHẦN" hay không
            var hasRegistrationSection = sections.some(function(s) {
                var sLabelLower = (s.section || '').toLowerCase();
                return sLabelLower.includes('đăng ký') || sLabelLower.includes('registration');
            });
            
            // Nếu đã có section "ĐĂNG KÝ HỌC PHẦN" và đang ở section "CỐ VẤN HỌC TẬP", loại bỏ enrollment items
            if (isAdvisorSection && hasRegistrationSection) {
                var filteredItems = section.items.filter(function(item) {
                    var itemPath = item.path || '';
                    var itemLabelLower = (item.label || '').toLowerCase();
                    // Loại bỏ menu items có path là /enrollments hoặc label chứa "duyệt đăng ký"
                    var isEnrollmentItem = itemPath === '/enrollments' || 
                                          itemPath === '/advisor/enrollments' ||
                                          itemLabelLower.includes('duyệt đăng ký') ||
                                          itemLabelLower.includes('enrollment approval');
                    return !isEnrollmentItem;
                });
                return {
                    section: section.section,
                    items: filteredItems
                };
            }
            
            return section;
        });
        
        // Sắp xếp sections theo thứ tự ưu tiên (section "ĐĂNG KÝ HỌC PHẦN" có ưu tiên cao hơn)
        var sectionsSorted = sectionsFiltered.slice().sort(function(a, b) {
            // Ưu tiên section "ĐĂNG KÝ HỌC PHẦN" hoặc sections chứa "ĐĂNG KÝ" hoặc "Đợt đăng ký"
            var aPriority = (a.section && (a.section.includes('ĐĂNG KÝ') || a.section.includes('Đợt đăng ký') || a.section.includes('REGISTRATION'))) ? 1 : 0;
            var bPriority = (b.section && (b.section.includes('ĐĂNG KÝ') || b.section.includes('Đợt đăng ký') || b.section.includes('REGISTRATION'))) ? 1 : 0;
            return bPriority - aPriority; // Ưu tiên cao hơn (1) sẽ được xử lý trước
        });
        
        // Loại bỏ duplicate menu items (chỉ giữ menu item đầu tiên cho mỗi path)
        var globalSeenPaths = {};
        var processedSections = sectionsSorted.map(function(section) {
            var filteredItems = [];
            
            section.items.forEach(function(item) {
                // Nếu path chưa được thấy trong toàn bộ menu, thêm vào
                if (!globalSeenPaths[item.path]) {
                    globalSeenPaths[item.path] = {
                        section: section.section,
                        item: item
                    };
                    filteredItems.push(item);
                }
                // Nếu path đã có trong section khác, bỏ qua menu item này (đã có menu item khác trỏ đến path này)
                // Điều này đảm bảo chỉ có 1 menu item cho mỗi path trong toàn bộ sidebar
                // Vì đã sắp xếp sections, menu item trong section có ưu tiên cao hơn sẽ được giữ lại
            });
            
            return {
                section: section.section,
                items: filteredItems
            };
        });
        
        // Filter sections có items sau khi loại bỏ duplicate
        var finalSections = processedSections.filter(function(section) {
            return section.items.length > 0;
        });
        
        return finalSections;
    }
    
    /**
     * Infer route path from state and label
     */
    function inferPathFromState(state, label) {
        if (!state && !label) return null;
        
        // Common patterns
        var stateLower = (state || '').toLowerCase();
        var labelLower = (label || '').toLowerCase();
        
        // Student routes
        if (stateLower.includes('student')) {
            if (labelLower.includes('dashboard')) return '/student/dashboard';
            if (labelLower.includes('timetable') || labelLower.includes('thời khóa biểu') || labelLower.includes('schedule') || labelLower.includes('lịch học')) return '/student/timetable'; // ✅ Gộp cả schedule vào timetable
            if (labelLower.includes('grade') || labelLower.includes('điểm')) return '/student/grades';
            if (labelLower.includes('attendance') || labelLower.includes('điểm danh')) return '/student/attendance';
            if (labelLower.includes('profile') || labelLower.includes('cá nhân')) return '/student/profile';
            if (labelLower.includes('enrollment') || labelLower.includes('đăng ký')) return '/student/enrollments';
            if (labelLower.includes('report') || labelLower.includes('thống kê') || labelLower.includes('báo cáo')) return '/student/reports';
        }
        
        // Lecturer routes
        if (stateLower.includes('teacher') || stateLower.includes('lecturer')) {
            if (labelLower.includes('dashboard')) return '/lecturer/dashboard';
            // ✅ Map "Quản lý lớp học phần" cho giảng viên
            if ((labelLower.includes('lớp') && labelLower.includes('học') && labelLower.includes('phần')) || 
                (labelLower.includes('class') && labelLower.includes('management'))) {
                return '/lecturer/classes';
            }
            if (labelLower.includes('attendance') || labelLower.includes('điểm danh')) return '/lecturer/attendance';
            if ((labelLower.includes('công thức') || labelLower.includes('formula')) && (labelLower.includes('điểm') || labelLower.includes('grade'))) return '/lecturer/grade-formula';
            if (labelLower.includes('grade') || labelLower.includes('điểm')) return '/lecturer/grades';
            if (labelLower.includes('appeal') || labelLower.includes('phúc khảo')) return '/lecturer/appeals';
            if (labelLower.includes('timetable') || labelLower.includes('thời khóa biểu')) return '/lecturer/timetable';
            if (labelLower.includes('report') || labelLower.includes('thống kê') || labelLower.includes('báo cáo')) return '/lecturer/reports';
        }
        
        // Advisor routes
        if (stateLower.includes('advisor')) {
            if (labelLower.includes('dashboard')) return '/advisor/dashboard';
            if (labelLower.includes('student') || labelLower.includes('sinh viên')) return '/advisor/students';
            if (labelLower.includes('warning') || labelLower.includes('cảnh báo')) return '/advisor/warnings';
            if (labelLower.includes('enrollment') || labelLower.includes('đăng ký học phần') || labelLower.includes('duyệt đăng ký') || labelLower.includes('đăng ký học lại')) return '/enrollments';
            if (labelLower.includes('appeal') || labelLower.includes('phúc khảo')) return '/advisor/appeals';
            if (labelLower.includes('retake') || labelLower.includes('học lại')) return '/advisor/retake';
            if (labelLower.includes('report') || labelLower.includes('thống kê') || labelLower.includes('báo cáo')) return '/advisor/reports';
            if (labelLower.includes('notification') || labelLower.includes('thông báo')) return '/notifications';
        }
        
        // Admin routes
        if (stateLower.includes('admin') || (!stateLower.includes('student') && !stateLower.includes('teacher') && !stateLower.includes('advisor'))) {
            if (labelLower.includes('dashboard')) return '/dashboard';
            if (labelLower.includes('user') || labelLower.includes('tài khoản')) return '/users';
            if (labelLower.includes('role') || labelLower.includes('vai trò') || labelLower.includes('quyền')) return '/roles';
            if (labelLower.includes('organization') || labelLower.includes('tổ chức') || labelLower.includes('quản lý đào tạo')) return '/organization';
            if (labelLower.includes('student') || labelLower.includes('sinh viên')) return '/students';
            if (labelLower.includes('lecturer') || labelLower.includes('giảng viên')) return '/lecturers';
            if (labelLower.includes('niên khóa') || labelLower.includes('academic year')) return '/academic-years';
            if (labelLower.includes('năm học') || labelLower.includes('school year')) return '/school-years';
            if (labelLower.includes('tiên quyết') || labelLower.includes('prerequisite')) return '/subject-prerequisites';
            if (labelLower.includes('lớp học phần') || (labelLower.includes('lớp') && labelLower.includes('học phần'))) return '/classes';
            if (labelLower.includes('lớp chính khóa') || (labelLower.includes('lớp') && labelLower.includes('chính khóa'))) return '/admin-classes';
            if (labelLower.includes('công thức điểm') || (labelLower.includes('công thức') && labelLower.includes('điểm')) || labelLower.includes('grade formula')) return '/grade-formula';
            if (labelLower.includes('đợt đăng ký') || labelLower.includes('registration period')) return '/registration-periods';
            if (labelLower.includes('quản lý đăng ký') || (labelLower.includes('đăng ký') && labelLower.includes('quản lý')) || labelLower.includes('duyệt đăng ký') || labelLower.includes('đăng ký học lại')) return '/enrollments';
            if (labelLower.includes('thời khóa biểu') || labelLower.includes('timetable') || labelLower.includes('xếp lịch')) return '/admin/timetable';
            if (labelLower.includes('phòng học') || labelLower.includes('room')) return '/rooms';
            if (labelLower.includes('nhật ký') || labelLower.includes('audit log')) return '/audit-logs';
            if (labelLower.includes('report') || labelLower.includes('thống kê') || labelLower.includes('báo cáo')) return '/admin/reports';
            if (labelLower.includes('chương trình đào tạo') || labelLower.includes('training program')) return '/subject-prerequisites'; // Default for section
        }
        
        // Notifications
        if (labelLower.includes('notification') || labelLower.includes('thông báo')) {
            return '/notifications';
        }
        
        return null;
    }
    
    /**
     * Reverse-engineer permission code from state and map to path
     * Backend FormatState: "ADMIN_DASHBOARD" -> "main.admin.dashboard"
     * Backend FormatState: "ADMIN_ACADEMIC_YEARS" -> "main.admin.academicYears" (camelCase)
     * This function reverses it: "main.admin.academicYears" -> "ADMIN_ACADEMIC_YEARS" -> "/academic-years"
     */
    function reverseEngineerPathFromState(state) {
        if (!state) return null;
        
        // Remove "main." prefix
        var stateWithoutMain = state.replace(/^main\./, '');
        
        // Extract role and remaining parts
        var parts = stateWithoutMain.split('.');
        if (parts.length < 2) return null;
        
        var role = parts[0]; // "admin", "student", "teacher", "advisor"
        var remaining = parts.slice(1).join('.'); // "dashboard", "academicYears", "userAccount", etc.
        
        // Convert role to permission code prefix
        var rolePrefix = '';
        if (role === 'admin') rolePrefix = 'ADMIN_';
        else if (role === 'teacher' || role === 'lecturer') rolePrefix = 'TEACHER_';
        else if (role === 'student') rolePrefix = 'STUDENT_';
        else if (role === 'advisor') rolePrefix = 'ADVISOR_';
        else return null;
        
        // ✅ Step 1: Handle camelCase FIRST (e.g., "academicYears" -> "academic_Years")
        // This must be done before replacing dots, as camelCase might be in the last part
        var remainingParts = remaining.split('.');
        var processedParts = remainingParts.map(function(part) {
            // Convert camelCase to snake_case: "academicYears" -> "academic_Years"
            return part.replace(/([a-z])([A-Z])/g, '$1_$2');
        });
        var processedRemaining = processedParts.join('.');
        
        // ✅ Step 2: Replace dots with underscores and convert to uppercase
        // "academic.years" -> "ACADEMIC_YEARS", "academic_Years" -> "ACADEMIC_YEARS"
        var permissionCode = rolePrefix + processedRemaining.replace(/\./g, '_').toUpperCase();
        
        // ✅ Step 3: Try to find exact match in PERMISSION_CODE_TO_PATH
        if (PERMISSION_CODE_TO_PATH[permissionCode]) {
            return PERMISSION_CODE_TO_PATH[permissionCode];
        }
        
        // ✅ Step 4: Handle SECTION_* patterns FIRST (before other patterns)
        // State: "main.admin.sectionUsers" -> "ADMIN_SECTIONUSERS" -> Need to map to "ADMIN_SECTION_USERS"
        if (permissionCode.includes('SECTION')) {
            // Try to reconstruct SECTION_* pattern
            var sectionMatch = permissionCode.match(/SECTION([A-Z_]+)/);
            if (sectionMatch) {
                var sectionPart = sectionMatch[1];
                // Try different SECTION patterns
                var sectionPatterns = [
                    'ADMIN_SECTION_' + sectionPart,
                    'ADMIN_SECTION' + sectionPart,
                    'ADMIN_SECTION_' + sectionPart.replace(/_/g, '_')
                ];
                for (var i = 0; i < sectionPatterns.length; i++) {
                    if (PERMISSION_CODE_TO_PATH[sectionPatterns[i]]) {
                        return PERMISSION_CODE_TO_PATH[sectionPatterns[i]];
                    }
                }
            }
            // Direct SECTION_* lookup
            if (permissionCode.startsWith('ADMIN_SECTION')) {
                // Try to find matching SECTION permission
                var sectionKeys = Object.keys(PERMISSION_CODE_TO_PATH).filter(function(key) {
                    return key.startsWith('ADMIN_SECTION_');
                });
                // Match by removing "SECTION" and comparing remaining parts
                var remaining = permissionCode.replace('ADMIN_SECTION', '').replace(/_/g, '');
                for (var j = 0; j < sectionKeys.length; j++) {
                    var keyRemaining = sectionKeys[j].replace('ADMIN_SECTION_', '').replace(/_/g, '');
                    if (remaining === keyRemaining || remaining.includes(keyRemaining) || keyRemaining.includes(remaining)) {
                        return PERMISSION_CODE_TO_PATH[sectionKeys[j]];
                    }
                }
            }
        }
        
        // ✅ Step 5: Try common variations and patterns
        // Handle plural/singular variations
        if (permissionCode.includes('ACADEMIC_YEAR') && !permissionCode.endsWith('S')) {
            var pluralCode = permissionCode.replace('ACADEMIC_YEAR', 'ACADEMIC_YEARS');
            if (PERMISSION_CODE_TO_PATH[pluralCode]) return PERMISSION_CODE_TO_PATH[pluralCode];
        }
        if (permissionCode.includes('SCHOOL_YEAR') && !permissionCode.endsWith('S')) {
            var pluralCode = permissionCode.replace('SCHOOL_YEAR', 'SCHOOL_YEARS');
            if (PERMISSION_CODE_TO_PATH[pluralCode]) return PERMISSION_CODE_TO_PATH[pluralCode];
        }
        if (permissionCode.includes('ACADEMIC_YEAR')) {
            if (PERMISSION_CODE_TO_PATH['ADMIN_ACADEMIC_YEARS']) return PERMISSION_CODE_TO_PATH['ADMIN_ACADEMIC_YEARS'];
        }
        if (permissionCode.includes('SCHOOL_YEAR')) {
            if (PERMISSION_CODE_TO_PATH['ADMIN_SCHOOL_YEARS']) return PERMISSION_CODE_TO_PATH['ADMIN_SCHOOL_YEARS'];
        }
        
        // Handle other common patterns
        if (permissionCode.includes('USER') && !permissionCode.includes('USERS') && !permissionCode.includes('SECTION')) {
            if (PERMISSION_CODE_TO_PATH['ADMIN_USERS']) return PERMISSION_CODE_TO_PATH['ADMIN_USERS'];
        }
        if (permissionCode.includes('ROLE')) {
            if (PERMISSION_CODE_TO_PATH['ADMIN_ROLES']) return PERMISSION_CODE_TO_PATH['ADMIN_ROLES'];
        }
        if (permissionCode.includes('SUBJECT_PREREQUISITE')) {
            if (PERMISSION_CODE_TO_PATH['ADMIN_SUBJECT_PREREQUISITES']) return PERMISSION_CODE_TO_PATH['ADMIN_SUBJECT_PREREQUISITES'];
        }
        if (permissionCode.includes('ADMIN_CLASS') || permissionCode.includes('SECTION_CLASSES')) {
            // Ưu tiên ADMIN_SECTION_CLASSES (section permission vừa là menu vừa là quyền quản lý)
            if (PERMISSION_CODE_TO_PATH['ADMIN_SECTION_CLASSES']) return PERMISSION_CODE_TO_PATH['ADMIN_SECTION_CLASSES'];
            // Fallback về ADMIN_ADMIN_CLASSES (deprecated)
            if (PERMISSION_CODE_TO_PATH['ADMIN_ADMIN_CLASSES']) return PERMISSION_CODE_TO_PATH['ADMIN_ADMIN_CLASSES'];
        }
        if (permissionCode.includes('REGISTRATION_PERIOD')) {
            if (PERMISSION_CODE_TO_PATH['ADMIN_REGISTRATION_PERIODS']) return PERMISSION_CODE_TO_PATH['ADMIN_REGISTRATION_PERIODS'];
        }
        // ✅ Map TEACHER_CLASSES hoặc VIEW_OWN_CLASSES cho giảng viên (check before GRADE_FORMULA)
        if (permissionCode === 'TEACHER_CLASSES' || permissionCode === 'VIEW_OWN_CLASSES') {
            if (PERMISSION_CODE_TO_PATH['TEACHER_CLASSES']) return PERMISSION_CODE_TO_PATH['TEACHER_CLASSES'];
        }
        if (permissionCode.includes('GRADE_FORMULA')) {
            // Handle different role prefixes
            if (permissionCode.startsWith('TEACHER_')) {
                if (PERMISSION_CODE_TO_PATH['TEACHER_GRADE_FORMULA']) return PERMISSION_CODE_TO_PATH['TEACHER_GRADE_FORMULA'];
            }
            if (permissionCode.startsWith('ADVISOR_')) {
                if (PERMISSION_CODE_TO_PATH['ADVISOR_GRADE_FORMULA']) return PERMISSION_CODE_TO_PATH['ADVISOR_GRADE_FORMULA'];
            }
            if (permissionCode.startsWith('ADMIN_')) {
                if (PERMISSION_CODE_TO_PATH['ADMIN_GRADE_FORMULA']) return PERMISSION_CODE_TO_PATH['ADMIN_GRADE_FORMULA'];
            }
        }
        
        return null;
    }
    
    /**
     * Extract route path from state string 
     * Examples:
     * - "main.student.dashboard" -> "/student/dashboard" (keep role prefix for student/lecturer/advisor)
     * - "main.admin.academicYears" -> "/academic-years" (remove role prefix for admin)
     * - "main.admin.organization" -> "/organization"
     */
    function extractPathFromState(state) {
        if (!state) return null;
        
        // Remove "main." prefix
        var stateWithoutMain = state.replace(/^main\./, '');
        
        // Split into parts
        var parts = stateWithoutMain.split('.');
        if (parts.length === 0) return null;
        
        var role = parts[0]; // "admin", "student", "teacher", "advisor"
        var routeParts = parts.slice(1); // Remaining parts after role
        
        if (routeParts.length === 0) {
            // If only role part exists, return appropriate dashboard
            if (role === 'admin') return '/dashboard';
            if (role === 'student') return '/student/dashboard';
            if (role === 'teacher' || role === 'lecturer') return '/lecturer/dashboard';
            if (role === 'advisor') return '/advisor/dashboard';
            return '/dashboard';
        }
        
        // ✅ Special handling: Check if routeParts contains "tchClasses" (teacher classes)
        // This handles cases like "main.admin.tchClasses" which should map to /lecturer/classes
        if (routeParts.length > 0) {
            var firstPart = routeParts[0].toLowerCase();
            if (firstPart.includes('tchclass') || firstPart.includes('tch-class')) {
                return '/lecturer/classes';
            }
        }
        
        // ✅ Special handling for lecturer class management
        if ((role === 'teacher' || role === 'lecturer') && routeParts.length > 0) {
            var firstPart = routeParts[0].toLowerCase();
            if (firstPart.includes('class') || firstPart.includes('lớp')) {
                return '/lecturer/classes';
            }
        }
        
        // ✅ Special handling for SECTION_* patterns (before converting to kebab-case)
        // State: "main.admin.sectionUsers" -> Should map to "/users" not "/section-users"
        if (routeParts.length > 0) {
            var firstPart = routeParts[0].toLowerCase();
            if (firstPart.startsWith('section')) {
                // Extract the section name (e.g., "sectionUsers" -> "users")
                var sectionName = firstPart.replace(/^section/, '');
                // Map section names to actual routes
                var sectionRouteMap = {
                    'users': '/users',
                    'academic': '/organization',
                    'program': '/subject-prerequisites',
                    'enrollment': '/registration-periods',
                    'timetable': '/admin/timetable',
                    'system': '/audit-logs',
                    'overview': '/dashboard'
                };
                if (sectionRouteMap[sectionName]) {
                    return sectionRouteMap[sectionName];
                }
                // Try to find in PERMISSION_CODE_TO_PATH
                var sectionPermissionCode = 'ADMIN_SECTION_' + sectionName.toUpperCase();
                if (PERMISSION_CODE_TO_PATH[sectionPermissionCode]) {
                    return PERMISSION_CODE_TO_PATH[sectionPermissionCode];
                }
            }
        }
        
        // Process each part to handle camelCase and convert to kebab-case
        var pathParts = routeParts.map(function(part) {
            // Convert camelCase to kebab-case: "academicYears" -> "academic-years"
            // First, insert hyphen before uppercase letters: "academicYears" -> "academic-Years"
            var withHyphens = part.replace(/([a-z])([A-Z])/g, '$1-$2');
            // Then convert to lowercase
            return withHyphens.toLowerCase();
        });
        
        // ✅ For admin routes, skip role prefix (routes are like "/academic-years" not "/admin/academic-years")
        // ✅ For other roles, include role prefix (routes are like "/student/dashboard")
        var path;
        if (role === 'admin') {
            // Admin routes don't have "/admin/" prefix
            path = '/' + pathParts.join('/');
        } else {
            // Student, Lecturer, Advisor routes include role prefix
            var rolePath = role === 'teacher' ? 'lecturer' : role; // Map "teacher" to "lecturer"
            path = '/' + rolePath + '/' + pathParts.join('/');
        }
        
        return path;
    }
    
    /**
     * Infer path from label (Vietnamese and English)
     */
    function inferPathFromLabel(label) {
        if (!label) return null;
        
        var labelLower = label.toLowerCase();
        
        // Common Vietnamese label mappings
        var labelMappings = {
            'tài khoản': '/users',
            'vai trò': '/roles',
            'quyền': '/roles',
            'tổ chức': '/organization',
            'sinh viên': '/students',
            'giảng viên': '/lecturers',
            'niên khóa': '/academic-years',
            'năm học': '/school-years',
            'tiên quyết': '/subject-prerequisites',
            'lớp học phần': function() {
                // Check role to determine correct route
                var currentUser = AuthService.getCurrentUser();
                var role = currentUser ? (currentUser.Role || currentUser.role) : null;
                if (role === 'Lecturer' || role === 'Giảng viên') {
                    return '/lecturer/classes';
                }
                return '/classes';
            },
            'lớp chính khóa': '/admin-classes',
            'công thức điểm': '/grade-formula',
            'đợt đăng ký': '/registration-periods',
            'quản lý đăng ký': '/enrollments',
            'duyệt đăng ký học phần': '/enrollments',
            'duyệt đăng ký học lại': '/enrollments',
            'duyệt đăng ký học phần/học lại': '/enrollments',
            'duyệt đăng ký': '/enrollments',
            'thời khóa biểu': '/admin/timetable',
            'phòng học': '/rooms',
            'nhật ký': '/audit-logs',
            'thông báo': '/notifications',
            'dashboard': '/dashboard',
            'điểm danh': '/lecturer/attendance',
            'điểm': '/lecturer/grades',
            'kết quả học tập': '/student/grades'
        };
        
        // Check exact matches first
        for (var key in labelMappings) {
            if (labelLower.includes(key)) {
                var mapping = labelMappings[key];
                // If mapping is a function, call it
                if (typeof mapping === 'function') {
                    return mapping();
                }
                return mapping;
            }
        }
        
        return null;
    }
    
    /**
     * Normalize icon class (ensure "fas" or "fa" prefix)
     */
    function normalizeIcon(icon) {
        if (!icon) return 'fas fa-circle';
        
        // If icon doesn't start with "fa" or "fas", add "fas fa-"
        if (!icon.match(/^(fa|fas|far|fal|fad|fab)\s/)) {
            icon = 'fas fa-' + icon.replace(/^fa-?/, '').replace(/^fas\s+/, '');
        }
        
        return icon;
    }
    
    /**
     * Load menu items from API (NO FALLBACK - Menu must come from database)
     */
    this.loadMenuItems = function() {
        var self = this;
        var role = self.getCurrentRole();
        
        if (!role) {
            LoggerService.warn('No role found, returning empty menu');
            return Promise.resolve([]);
        }
        
        // Return cached if available (but allow force reload)
        if (cachedMenuItems && cachedMenuItems.length > 0) {
            return Promise.resolve(cachedMenuItems);
        }
        
        // Return existing promise if loading
        if (menuLoadPromise) {
            return menuLoadPromise;
        }
        
        // Load from API - NO FALLBACK
        var apiUrl = API_CONFIG.BASE_URL + '/menu';
        
        menuLoadPromise = $http.get(apiUrl, {
            cache: false, // Disable cache to get fresh data
            headers: {
                'Cache-Control': 'no-cache'
            }
        })
            .then(function(response) {
                if (response.data && response.data.menus) {
                    var mappedMenus = mapBackendMenuToFrontend(response.data.menus);
                    
                    // Only use API menus if we got valid data
                    if (mappedMenus.length > 0) {
                        cachedMenuItems = mappedMenus;
                        LoggerService.log('Menu loaded: ' + mappedMenus.length + ' sections');
                        return cachedMenuItems;
                    } else {
                        LoggerService.warn('API returned empty menu after mapping');
                        cachedMenuItems = [];
                        return [];
                    }
                } else {
                    LoggerService.warn('Invalid API response, returning empty menu');
                    cachedMenuItems = [];
                    return [];
                }
            })
            .catch(function(error) {
                LoggerService.error('Error loading menu: ' + (error.message || error));
                cachedMenuItems = [];
                return [];
            })
            .finally(function() {
                menuLoadPromise = null;
            });
        
        return menuLoadPromise;
    };
    
    /**
     * Get menu items for current user role
     * Returns empty array if not loaded yet - menu must come from API
     */
    this.getMenuItems = function() {
        // Return cached menu items or empty array if not loaded yet
        return cachedMenuItems || [];
    };
    
    /**
     * Get menu items synchronously (for immediate use)
     * Returns cached menu if available, otherwise empty array
     */
    this.getMenuItemsSync = function() {
        // Return cached menu items or empty array if not loaded yet
        return cachedMenuItems || [];
    };
}]);

