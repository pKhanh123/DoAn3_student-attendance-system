// Audit Log Controller
app.controller('AuditLogController', ['$scope', '$location', 'AuditLogService', 'PaginationService', 'ExportService', 'AuthService', 'AvatarService', 'LoggerService',
    function($scope, $location, AuditLogService, PaginationService, ExportService, AuthService, AvatarService, LoggerService) {
    
    $scope.logs = [];
    $scope.displayedLogs = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Get current user for header
    $scope.getCurrentUser = function() {
        return AuthService.getCurrentUser();
    };
    
    // Logout function
    $scope.logout = function() {
        AuthService.logout(); // Will auto-redirect to login
    };
    
    // Pagination - Khởi tạo với page size 5 cho timeline và các options
    $scope.pagination = PaginationService.init(5);
    $scope.pagination.pageSizeOptions = [5, 10, 25, 50]; // Options cho dropdown
    
    // Filters
    $scope.filters = {
        userId: '',
        action: '',
        entityType: '',
        dateFrom: '',
        dateTo: ''
    };
    
    // Action types
    $scope.actionTypes = [
        { value: 'CREATE', label: 'Thêm mới' },
        { value: 'UPDATE', label: 'Cập nhật' },
        { value: 'DELETE', label: 'Xóa' },
        { value: 'LOGIN', label: 'Đăng nhập' },
        { value: 'LOGOUT', label: 'Đăng xuất' },
        { value: 'EXPORT', label: 'Xuất dữ liệu' },
        { value: 'IMPORT', label: 'Nhập dữ liệu' }
    ];
    
    // Entity types (tiếng Việt)
    $scope.entityTypes = [
        { value: 'User', label: 'Người dùng' },
        { value: 'Student', label: 'Sinh viên' },
        { value: 'Lecturer', label: 'Giảng viên' },
        { value: 'Faculty', label: 'Khoa' },
        { value: 'Department', label: 'Bộ môn' },
        { value: 'Major', label: 'Ngành học' },
        { value: 'Subject', label: 'Môn học' },
        { value: 'Grade', label: 'Điểm' },
        { value: 'Attendance', label: 'Điểm danh' },
        { value: 'Class', label: 'Lớp học phần' },
        { value: 'AcademicYear', label: 'Niên khóa' },
        { value: 'SchoolYear', label: 'Năm học' },
        { value: 'Enrollment', label: 'Đăng ký học phần' },
        { value: 'RegistrationPeriod', label: 'Đợt đăng ký học phần' },
        { value: 'Notification', label: 'Thông báo' },
        { value: 'Auth', label: 'Xác thực' },
        { value: 'Room', label: 'Phòng học' },
        { value: 'ExamSchedule', label: 'Lịch thi' },
        { value: 'ExamAssignment', label: 'Phân công thi' },
        { value: 'ExamScores', label: 'Điểm thi' },
        { value: 'RetakeRecord', label: 'Hồ sơ học lại' },
        { value: 'RetakeRegistration', label: 'Đăng ký học lại' },
        { value: 'GradeAppeal', label: 'Phúc khảo' },
        { value: 'Role', label: 'Vai trò' },
        { value: 'Permission', label: 'Quyền' },
        { value: 'AuditLog', label: 'Nhật ký hệ thống' }
    ];
    
    // Load audit logs
    $scope.loadLogs = function() {
        $scope.loading = true;
        
        var params = {
            page: $scope.pagination.currentPage,
            pageSize: $scope.pagination.pageSize,
            search: $scope.pagination.searchTerm || null,
            action: $scope.filters.action || null,
            entityType: $scope.filters.entityType || null,
            userId: $scope.filters.userId || null,
            fromDate: $scope.filters.dateFrom || null,
            toDate: $scope.filters.dateTo || null
        };
        
        AuditLogService.getAll(params)
            .then(function(response) {
                if (response.data && response.data.data) {
                    $scope.logs = response.data.data.map(function(log) {
                        // ✅ Format hiển thị: Đảm bảo hiển thị đầy đủ thông tin người thực hiện
                        var userName = 'Hệ thống';
                        if (log.userFullName) {
                            userName = log.userFullName;
                            if (log.userName && log.userName !== log.userFullName) {
                                userName += ' (' + log.userName + ')';
                            }
                        } else if (log.userName) {
                            userName = log.userName;
                        }
                        
                        return {
                            logId: log.logId,
                            userId: log.userId,
                            userName: userName,
                            userFullName: log.userFullName || 'Hệ thống',
                            username: log.userName || '',
                            action: log.action,
                            actionLabel: $scope.getActionLabel(log.action), // Tiếng Việt
                            entityType: log.entityType,
                            entityTypeLabel: $scope.getEntityLabel(log.entityType), // Tiếng Việt
                            entityId: log.entityId,
                            entityName: log.entityId, // You can enhance this later
                            details: log.newValues || log.oldValues || '',
                            oldValues: log.oldValues,
                            newValues: log.newValues,
                            ipAddress: log.ipAddress,
                            userAgent: log.userAgent,
                            createdAt: log.createdAt
                        };
                    });
                    
                    // Update pagination from server response
                    if (response.data.pagination) {
                        $scope.pagination.totalItems = response.data.pagination.totalCount;
                        $scope.pagination = PaginationService.calculate($scope.pagination);
                    }
                    
                    LoggerService.debug('Audit logs fetched', {
                        apiReturned: response.data.data.length,
                        mappedLogs: $scope.logs.length,
                        pageSize: $scope.pagination.pageSize,
                        totalItems: $scope.pagination.totalItems
                    });
                    
                    $scope.displayedLogs = $scope.logs;
                } else {
                    $scope.logs = [];
                    $scope.displayedLogs = [];
                }
                $scope.loading = false;
            })
            .catch(function(error) {
                LoggerService.error('Error loading audit logs', error);
                if (error.status === 403) {
                    $scope.error = 'Bạn không có quyền truy cập audit log. Chỉ Admin mới có quyền xem.';
                } else if (error.status === 404) {
                    $scope.error = 'Không tìm thấy dữ liệu audit log.';
                } else {
                    $scope.error = 'Không thể tải audit log: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                }
                $scope.loading = false;
            });
    };
    
    // Apply filters and sorting (now handled server-side)
    $scope.applyFiltersAndSort = function() {
        // Server-side filtering, just reload
        $scope.loadLogs();
    };
    
    // Event handlers
    $scope.handleSearch = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadLogs();
    };
    
    $scope.handleSort = function() {
        $scope.loadLogs();
    };
    
    $scope.handlePageChange = function() {
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
        $scope.loadLogs();
    };
    
    $scope.handleFilterChange = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadLogs();
    };
    
    $scope.resetFilters = function() {
        $scope.pagination.searchTerm = '';
        $scope.pagination.currentPage = 1;
        $scope.filters = {
            userId: '',
            action: '',
            entityType: '',
            dateFrom: '',
            dateTo: ''
        };
        $scope.loadLogs();
    };
    
    // Export to Excel
    $scope.exportToExcel = function() {
        var columns = [
            { label: 'Thời gian', field: 'createdAt', type: 'date' },
            { label: 'Người dùng', field: 'userName' },
            { label: 'Hành động', field: 'action' },
            { label: 'Đối tượng', field: 'entityType' },
            { label: 'Tên đối tượng', field: 'entityName' },
            { label: 'Chi tiết', field: 'details' },
            { label: 'IP Address', field: 'ipAddress' }
        ];
        
        var exportOptions = {
            title: '📋 NHẬT KÝ HỆ THỐNG',
            info: [
                ['Hệ thống:', 'Education Management System'],
                ['Thời gian xuất:', new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN')],
                ['Tổng số bản ghi:', $scope.logs.length]
            ],
            sheetName: 'Audit Log',
            showSummary: true
        };
        
        ExportService.exportToExcel($scope.logs, 'AuditLog', columns, exportOptions);
    };
    
    // Get action badge class
    $scope.getActionClass = function(action) {
        var classes = {
            'CREATE': 'badge-success',
            'UPDATE': 'badge-info',
            'DELETE': 'badge-danger',
            'LOGIN': 'badge-primary',
            'LOGOUT': 'badge-secondary',
            'EXPORT': 'badge-warning',
            'IMPORT': 'badge-warning'
        };
        return classes[action] || 'badge-secondary';
    };
    
    // Format date
    $scope.formatDate = function(dateString) {
        if (!dateString) return '';
        var date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    };
    
    // View mode
    $scope.viewMode = 'timeline'; // 'timeline' or 'table'
    $scope.showFilters = false;
    $scope.showDetailsModal = false;
    $scope.selectedLog = {};
    
    // Toggle view mode
    $scope.toggleViewMode = function() {
        $scope.viewMode = $scope.viewMode === 'timeline' ? 'table' : 'timeline';
    };
    
    // Clear search
    $scope.clearSearch = function() {
        $scope.pagination.searchTerm = '';
        $scope.handleSearch();
    };
    
    // Check if has active filters
    $scope.hasActiveFilters = function() {
        return $scope.filters.action || 
               $scope.filters.entityType || 
               $scope.filters.dateFrom || 
               $scope.filters.dateTo;
    };
    
    // Get active filters count
    $scope.getActiveFiltersCount = function() {
        var count = 0;
        if ($scope.filters.action) count++;
        if ($scope.filters.entityType) count++;
        if ($scope.filters.dateFrom) count++;
        if ($scope.filters.dateTo) count++;
        return count;
    };
    
    // Apply filters
    $scope.applyFilters = function() {
        $scope.showFilters = false;
        $scope.handleFilterChange();
    };
    
    // Get action count for statistics
    $scope.getActionCount = function(action) {
        if (!$scope.logs || $scope.logs.length === 0) return 0;
        return $scope.logs.filter(function(log) {
            return log.action === action;
        }).length;
    };
    
    // Get action icon
    $scope.getActionIcon = function(action) {
        var icons = {
            'CREATE': 'fa-plus-circle',
            'UPDATE': 'fa-edit',
            'DELETE': 'fa-trash-alt',
            'LOGIN': 'fa-sign-in-alt',
            'LOGOUT': 'fa-sign-out-alt',
            'EXPORT': 'fa-file-download',
            'IMPORT': 'fa-file-upload'
        };
        return icons[action] || 'fa-circle';
    };
    
    // Get action label (tiếng Việt)
    $scope.getActionLabel = function(action) {
        var labels = {
            'CREATE': 'Tạo mới',
            'UPDATE': 'Cập nhật',
            'DELETE': 'Xóa',
            'LOGIN': 'Đăng nhập',
            'LOGOUT': 'Đăng xuất',
            'EXPORT': 'Xuất dữ liệu',
            'IMPORT': 'Nhập dữ liệu',
            'APPROVE': 'Phê duyệt',
            'REJECT': 'Từ chối',
            'GRADE_ADJUST': 'Điều chỉnh điểm',
            'ADJUST': 'Điều chỉnh',
            'FORGOT_PASSWORD_REQUEST': 'Yêu cầu quên mật khẩu',
            'OTP_VERIFIED': 'Xác thực OTP',
            'PASSWORD_RESET': 'Đặt lại mật khẩu',
            'REGISTER': 'Đăng ký',
            'ENROLL': 'Ghi danh',
            'DROP': 'Hủy đăng ký',
            'WITHDRAWN': 'Rút khỏi lớp',
            'CANCEL': 'Hủy',
            'ACTIVATE': 'Kích hoạt',
            'DEACTIVATE': 'Vô hiệu hóa',
            'LOCK': 'Khóa',
            'UNLOCK': 'Mở khóa',
            'RESET_PASSWORD': 'Đặt lại mật khẩu',
            'RESPOND': 'Phản hồi',
            'DECIDE': 'Quyết định'
        };
        return labels[action] || action;
    };
    
    // Get entity label (tiếng Việt)
    $scope.getEntityLabel = function(entityType) {
        var labels = {
            'User': 'Người dùng',
            'Student': 'Sinh viên',
            'Lecturer': 'Giảng viên',
            'Faculty': 'Khoa',
            'Department': 'Bộ môn',
            'Major': 'Ngành học',
            'Subject': 'Môn học',
            'Grade': 'Điểm',
            'Attendance': 'Điểm danh',
            'AcademicYear': 'Niên khóa',
            'SchoolYear': 'Năm học',
            'Class': 'Lớp học phần',
            'Enrollment': 'Đăng ký học phần',
            'RegistrationPeriod': 'Đợt đăng ký học phần',
            'Notification': 'Thông báo',
            'Auth': 'Xác thực',
            'Room': 'Phòng học',
            'ExamSchedule': 'Lịch thi',
            'ExamAssignment': 'Phân công thi',
            'ExamScores': 'Điểm thi',
            'RetakeRecord': 'Hồ sơ học lại',
            'RetakeRegistration': 'Đăng ký học lại',
            'GradeAppeal': 'Phúc khảo',
            'Role': 'Vai trò',
            'Permission': 'Quyền',
            'AuditLog': 'Nhật ký hệ thống',
            // Lowercase versions
            'users': 'Người dùng',
            'students': 'Sinh viên',
            'lecturers': 'Giảng viên',
            'faculties': 'Khoa',
            'departments': 'Bộ môn',
            'majors': 'Ngành học',
            'subjects': 'Môn học',
            'grades': 'Điểm',
            'attendances': 'Điểm danh',
            'academic_years': 'Niên khóa',
            'school_years': 'Năm học',
            'classes': 'Lớp học phần',
            'enrollments': 'Đăng ký học phần',
            'registration_periods': 'Đợt đăng ký học phần',
            'notifications': 'Thông báo',
            'rooms': 'Phòng học',
            'exam_schedules': 'Lịch thi',
            'exam_assignments': 'Phân công thi',
            'exam_scores': 'Điểm thi',
            'retake_records': 'Hồ sơ học lại',
            'retake_registrations': 'Đăng ký học lại',
            'grade_appeals': 'Phúc khảo',
            'roles': 'Vai trò',
            'permissions': 'Quyền',
            'audit_logs': 'Nhật ký hệ thống'
        };
        return labels[entityType] || entityType;
    };
    
    // Get user agent info (simplified)
    $scope.getUserAgentInfo = function(userAgent) {
        if (!userAgent) return 'Unknown';
        
        // Detect browser
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'IE';
        
        return 'Browser';
    };
    
    // Parse and format JSON to human-readable format
    $scope.parseJsonToReadable = function(jsonString) {
        if (!jsonString) return [];
        
        try {
            var data = JSON.parse(jsonString);
            
            // If it's an array, get the first item
            if (Array.isArray(data) && data.length > 0) {
                data = data[0];
            }
            
            // Field name mapping to Vietnamese
            var fieldLabels = {
                // Students
                'student_id': 'Mã sinh viên',
                'studentId': 'Mã sinh viên',
                'student_code': 'Mã số sinh viên',
                'studentCode': 'Mã số sinh viên',
                'full_name': 'Họ và tên',
                'fullName': 'Họ và tên',
                // Attendance
                'schedule_id': 'Mã lịch học',
                'scheduleId': 'Mã lịch học',
                'attendance_date': 'Ngày điểm danh',
                'attendanceDate': 'Ngày điểm danh',
                'attendanceDate': 'Ngày điểm danh',
                'marked_by': 'Người điểm danh',
                'markedBy': 'Người điểm danh',
                'status': 'Trạng thái',
                'notes': 'Ghi chú',
                // Grade
                'grade_id': 'Mã điểm',
                'gradeId': 'Mã điểm',
                'grade_type': 'Loại điểm',
                'gradeType': 'Loại điểm',
                'grade_type_text': 'Loại điểm (mô tả)',
                'gradeTypeText': 'Loại điểm (mô tả)',
                'score': 'Điểm số',
                'max_score': 'Điểm tối đa',
                'maxScore': 'Điểm tối đa',
                'total_score': 'Điểm tổng kết',
                'totalScore': 'Điểm tổng kết',
                'weight': 'Trọng số',
                'graded_by': 'Người chấm điểm',
                'gradedBy': 'Người chấm điểm',
                // Grade Appeal
                'appeal_id': 'Mã yêu cầu phúc khảo',
                'appealId': 'Mã yêu cầu phúc khảo',
                'appeal_reason': 'Lý do phúc khảo',
                'appealReason': 'Lý do phúc khảo',
                'current_score': 'Điểm hiện tại',
                'currentScore': 'Điểm hiện tại',
                'expected_score': 'Điểm mong muốn',
                'expectedScore': 'Điểm mong muốn',
                'lecturer_response': 'Phản hồi giảng viên',
                'lecturerResponse': 'Phản hồi giảng viên',
                'lecturer_decision': 'Quyết định giảng viên',
                'lecturerDecision': 'Quyết định giảng viên',
                'advisor_response': 'Phản hồi cố vấn',
                'advisorResponse': 'Phản hồi cố vấn',
                'advisor_decision': 'Quyết định cố vấn',
                'advisorDecision': 'Quyết định cố vấn',
                'final_score': 'Điểm cuối cùng',
                'finalScore': 'Điểm cuối cùng',
                'resolution_notes': 'Ghi chú giải quyết',
                'resolutionNotes': 'Ghi chú giải quyết',
                // Common
                'class_id': 'Mã lớp học',
                'classId': 'Mã lớp học',
                'class_name': 'Tên lớp học',
                'className': 'Tên lớp học',
                'class_code': 'Mã lớp học',
                'classCode': 'Mã lớp học',
                'subject_id': 'Mã môn học',
                'subjectId': 'Mã môn học',
                'subject_name': 'Tên môn học',
                'subjectName': 'Tên môn học',
                'subject_code': 'Mã môn học',
                'subjectCode': 'Mã môn học',
                'created_by': 'Người tạo',
                'createdBy': 'Người tạo',
                'updated_by': 'Người cập nhật',
                'updatedBy': 'Người cập nhật',
                'deleted_by': 'Người xóa',
                'deletedBy': 'Người xóa',
                'action_description': 'Mô tả hành động',
                'actionDescription': 'Mô tả hành động',
                'description': 'Mô tả',
                'priority': 'Độ ưu tiên',
                'timestamp': 'Thời gian',
                'student_code': 'Mã sinh viên',
                'full_name': 'Họ và tên',
                'date_of_birth': 'Ngày sinh',
                'gender': 'Giới tính',
                'email': 'Email',
                'phone': 'Số điện thoại',
                'address': 'Địa chỉ',
                'major_id': 'Mã ngành học',
                'faculty_id': 'Mã khoa',
                'academic_year_id': 'Mã niên khóa',
                'advisor_id': 'Mã cố vấn',
                'user_id': 'Mã tài khoản',
                'cohort_year': 'Năm nhập học',
                'is_active': 'Trạng thái',
                
                // Users
                'username': 'Tên đăng nhập',
                'role_id': 'Mã vai trò',
                'role_name': 'Vai trò',
                
                // Auth/Login (tiếng Việt có dấu)
                'ten_dang_nhap': 'Tên đăng nhập',
                'vai_tro': 'Vai trò',
                'thoi_gian_dang_nhap': 'Thời gian đăng nhập',
                
                // Lecturers
                'lecturer_id': 'Mã ID giảng viên',
                'lecturer_code': 'Mã giảng viên',
                'department_id': 'Mã bộ môn',
                'title': 'Học hàm/học vị',
                'academic_title': 'Học hàm/học vị',
                
                // Departments
                'department_code': 'Mã bộ môn',
                'department_name': 'Tên bộ môn',
                'department_id': 'Mã ID bộ môn',
                'ma_bo_mon': 'Mã bộ môn',
                'ten_bo_mon': 'Tên bộ môn',
                'ma_khoa': 'Mã khoa',
                
                // Faculties
                'faculty_name': 'Tên khoa',
                'faculty_code': 'Mã khoa',
                'faculty_id': 'Mã ID khoa',
                'dean': 'Trưởng khoa',
                
                // Majors
                'major_name': 'Tên ngành',
                'major_code': 'Mã ngành',
                'major_id': 'Mã ID ngành',
                
                // Subjects
                'subject_id': 'Mã môn học',
                'subject_name': 'Tên môn học',
                'subject_code': 'Mã môn học',
                'credits': 'Số tín chỉ',
                
                // Classes
                'class_id': 'Mã lớp học',
                'class_code': 'Mã lớp',
                'class_name': 'Tên lớp',
                
                // Academic Years
                'academic_year_id': 'Mã niên khóa',
                'academic_year_name': 'Tên niên khóa',
                'start_year': 'Năm bắt đầu',
                'end_year': 'Năm kết thúc',
                
                // School Years
                'school_year_id': 'Mã năm học',
                'school_year_name': 'Tên năm học',
                'start_date': 'Ngày bắt đầu',
                'end_date': 'Ngày kết thúc',
                
                // Grades
                'grade_id': 'Mã điểm',
                'gradeType': 'Loại điểm',
                'grade_type': 'Loại điểm',
                'score': 'Điểm số',
                'maxScore': 'Điểm tối đa',
                'max_score': 'Điểm tối đa',
                'weight': 'Trọng số',
                'totalScore': 'Tổng điểm',
                'total_score': 'Tổng điểm',
                'midterm_score': 'Điểm giữa kỳ',
                'midtermScore': 'Điểm giữa kỳ', // camelCase
                'final_score': 'Điểm cuối kỳ',
                'finalScore': 'Điểm cuối kỳ', // camelCase
                'letter_grade': 'Điểm chữ',
                'student_id': 'Mã sinh viên',
                'studentId': 'Mã sinh viên', // camelCase
                'class_id': 'Mã lớp học',
                'classId': 'Mã lớp học', // camelCase
                'subject_id': 'Mã môn học',
                'subjectId': 'Mã môn học', // camelCase
                'school_year_id': 'Mã năm học',
                'schoolYearId': 'Mã năm học', // camelCase
                'semester': 'Học kỳ',
                'note': 'Ghi chú',
                'notes': 'Ghi chú',
                'gradedBy': 'Người chấm điểm',
                'graded_by': 'Người chấm điểm',
                
                // Attendance
                'schedule_id': 'Mã lịch học',
                'scheduleId': 'Mã lịch học',
                'attendance_date': 'Ngày điểm danh',
                'attendanceDate': 'Ngày điểm danh',
                'marked_by': 'Người điểm danh',
                'markedBy': 'Người điểm danh',
                'status': 'Trạng thái',
                
                // Grade Appeal
                'appeal_id': 'Mã yêu cầu phúc khảo',
                'appealId': 'Mã yêu cầu phúc khảo',
                'appeal_reason': 'Lý do phúc khảo',
                'appealReason': 'Lý do phúc khảo',
                'current_score': 'Điểm hiện tại',
                'currentScore': 'Điểm hiện tại',
                'expected_score': 'Điểm mong muốn',
                'expectedScore': 'Điểm mong muốn',
                'lecturer_response': 'Phản hồi giảng viên',
                'lecturerResponse': 'Phản hồi giảng viên',
                'lecturer_decision': 'Quyết định giảng viên',
                'lecturerDecision': 'Quyết định giảng viên',
                'lecturer_id': 'Mã giảng viên',
                'lecturerId': 'Mã giảng viên',
                'advisor_response': 'Phản hồi cố vấn',
                'advisorResponse': 'Phản hồi cố vấn',
                'advisor_decision': 'Quyết định cố vấn',
                'advisorDecision': 'Quyết định cố vấn',
                'advisor_id': 'Mã cố vấn',
                'advisorId': 'Mã cố vấn',
                'final_score': 'Điểm cuối cùng',
                'finalScore': 'Điểm cuối cùng',
                'resolution_notes': 'Ghi chú giải quyết',
                'resolutionNotes': 'Ghi chú giải quyết',
                'priority': 'Độ ưu tiên',
                'cancelled_by': 'Người hủy',
                'cancelledBy': 'Người hủy',
                
                // Common fields
                'created_at': 'Thời gian tạo',
                'created_by': 'Người tạo',
                'updated_at': 'Thời gian cập nhật',
                'updated_by': 'Người cập nhật',
                'deleted_at': 'Thời gian xóa',
                'deleted_by': 'Người xóa',
                'description': 'Mô tả',
                'action_description': 'Mô tả hành động',
                'actionDescription': 'Mô tả hành động',
                'timestamp': 'Thời gian'
            };
            
            var result = [];
            
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    var label = fieldLabels[key] || key;
                    var value = data[key];
                    
                    // Format value based on type
                    var formattedValue = $scope.formatValue(key, value);
                    
                    // Skip null/empty created_by, updated_by, deleted_by if not relevant
                    if ((key === 'updated_at' || key === 'updated_by' || key === 'deleted_at' || key === 'deleted_by') && !value) {
                        continue;
                    }
                    
                    result.push({
                        key: key,
                        label: label,
                        value: formattedValue,
                        rawValue: value
                    });
                }
            }
            
            return result;
        } catch (e) {
            LoggerService.error('Error parsing audit log JSON payload', e);
            return [];
        }
    };
    
    // Format value based on field type
    $scope.formatValue = function(key, value) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            return '(Không có)';
        }
        
        // Handle boolean
        if (typeof value === 'boolean') {
            return value ? 'Có' : 'Không';
        }
        
        // Handle is_active specifically
        if (key === 'is_active') {
            return value == 1 || value === true ? '✅ Đang hoạt động' : '❌ Không hoạt động';
        }
        
        // Handle gradeType
        if (key === 'gradeType' || key === 'grade_type') {
            var gradeTypes = {
                'midterm': 'Điểm giữa kỳ',
                'final': 'Điểm cuối kỳ',
                'quiz': 'Điểm kiểm tra',
                'assignment': 'Điểm bài tập',
                'project': 'Điểm dự án',
                'attendance': 'Điểm chuyên cần',
                'participation': 'Điểm tham gia',
                'other': 'Điểm khác'
            };
            return gradeTypes[value] || value;
        }
        
        // Handle weight (trọng số) - format as percentage
        if (key === 'weight') {
            if (typeof value === 'number') {
                return (value * 100).toFixed(0) + '%';
            }
            return String(value);
        }
        
        // Handle score fields - format with 1 decimal place if number
        if (key === 'score' || key === 'maxScore' || key === 'max_score' || 
            key === 'totalScore' || key === 'total_score' || 
            key === 'midterm_score' || key === 'final_score') {
            if (typeof value === 'number') {
                return value.toFixed(1);
            }
            return String(value);
        }
        
        // Handle date/time fields
        if (key.includes('_at') || key === 'date_of_birth' || key.includes('date') || 
            key === 'thoi_gian_dang_nhap' || key === 'login_time') {
            if (value) {
                var date = new Date(value);
                return date.toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
            return '(Không có)';
        }
        
        // Handle gender
        if (key === 'gender') {
            var genders = { 'Male': 'Nam', 'Female': 'Nữ', 'Other': 'Khác', 'Nam': 'Nam', 'Nữ': 'Nữ', 'Khác': 'Khác' };
            return genders[value] || value;
        }
        
        // Handle empty strings
        if (value === '') {
            return '(Trống)';
        }
        
        // Return as string
        return String(value);
    };
    
    // Check if details should be shown in readable format
    $scope.showReadableFormat = function(log) {
        return log && log.details && log.details.length > 0 && log.details.charAt(0) === '[' || log.details.charAt(0) === '{';
    };
    
    // View details modal
    $scope.viewDetails = function(log) {
        $scope.selectedLog = angular.copy(log);
        
        // Parse JSON to readable format
        if (log.details) {
            $scope.selectedLog.readableData = $scope.parseJsonToReadable(log.details);
        }
        
        $scope.showDetailsModal = true;
    };
    
    // Close details modal
    $scope.closeDetailsModal = function() {
        $scope.showDetailsModal = false;
        $scope.selectedLog = {};
    };
    
    // Refresh logs
    $scope.refreshLogs = function() {
        $scope.loadLogs();
    };
    
    // Initialize
    $scope.loadLogs();
}]);

