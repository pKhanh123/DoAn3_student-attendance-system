// Student Exam Schedule Controller - Sinh viên xem lịch thi của mình
app.controller('StudentExamScheduleController', ['$scope', '$location', '$routeParams', 'ExamScheduleService', 'StudentService', 'AuthService', 'SchoolYearService', 'ToastService', 'LoggerService',
    function($scope, $location, $routeParams, ExamScheduleService, StudentService, AuthService, SchoolYearService, ToastService, LoggerService) {
    
    $scope.exams = [];
    $scope.filteredExams = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.currentUser = AuthService.getCurrentUser() || {};
    $scope.studentId = null;
    $scope.studentInfo = null;
    
    // Filters
    $scope.filters = {
        schoolYearId: '',
        semester: '',
        examType: '',
        status: '' // PLANNED, CONFIRMED, COMPLETED
    };
    
    // School years and semesters
    $scope.schoolYears = [];
    $scope.currentSchoolYear = null;
    $scope.currentSemester = null;
    
    // Exam type options
    $scope.examTypes = [
        { value: '', label: 'Tất cả' },
        { value: 'GIỮA_HỌC_PHẦN', label: 'Thi giữa học phần' },
        { value: 'KẾT_THÚC_HỌC_PHẦN', label: 'Thi kết thúc học phần' }
    ];
    
    // Status options
    $scope.statusOptions = [
        { value: '', label: 'Tất cả' },
        { value: 'PLANNED', label: 'Đã lên kế hoạch' },
        { value: 'CONFIRMED', label: 'Đã xác nhận' },
        { value: 'COMPLETED', label: 'Đã hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' }
    ];
    
    // ============================================================
    // 🔹 INITIALIZE PAGE
    // ============================================================
    $scope.initPage = function() {
        $scope.loadStudentInfo();
        $scope.loadSchoolYears();
    };
    
    // ============================================================
    // 🔹 LOAD STUDENT INFO
    // ============================================================
    $scope.loadStudentInfo = function() {
        if (!$scope.currentUser || !$scope.currentUser.userId) {
            $scope.error = 'Không tìm thấy thông tin người dùng';
            return;
        }
        
        StudentService.getByUserId($scope.currentUser.userId)
            .then(function(response) {
                var studentData = response.data && response.data.data ? response.data.data : response.data;
                if (studentData) {
                    $scope.studentId = studentData.studentId;
                    $scope.studentInfo = studentData;
                    $scope.loadExamSchedules();
                } else {
                    $scope.error = 'Không tìm thấy thông tin sinh viên';
                }
            })
            .catch(function(error) {
                LoggerService.error('Error loading student info', error);
                $scope.error = 'Không thể tải thông tin sinh viên';
            });
    };
    
    // ============================================================
    // 🔹 LOAD SCHOOL YEARS
    // ============================================================
    $scope.loadSchoolYears = function() {
        SchoolYearService.getAll()
            .then(function(response) {
                $scope.schoolYears = (response.data && response.data.data) || [];
                
                // Set current school year and semester
                if ($scope.schoolYears.length > 0) {
                    $scope.currentSchoolYear = $scope.schoolYears.find(function(sy) {
                        return sy.isCurrent === true || sy.status === 'ACTIVE';
                    }) || $scope.schoolYears[0];
                    
                    if ($scope.currentSchoolYear) {
                        $scope.filters.schoolYearId = $scope.currentSchoolYear.schoolYearId;
                        $scope.currentSemester = $scope.currentSchoolYear.currentSemester || 1;
                        $scope.filters.semester = $scope.currentSemester.toString();
                    }
                }
            })
            .catch(function(error) {
                LoggerService.error('Error loading school years', error);
            });
    };
    
    // ============================================================
    // 🔹 LOAD EXAM SCHEDULES
    // ============================================================
    $scope.loadExamSchedules = function() {
        if (!$scope.studentId) {
            return;
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        var schoolYearId = $scope.filters.schoolYearId || null;
        var semester = $scope.filters.semester ? parseInt($scope.filters.semester) : null;
        
        ExamScheduleService.getByStudent($scope.studentId, schoolYearId, semester)
            .then(function(response) {
                var result = response.data;
                var examsData = (result && result.data) || [];
                
                // Process exams data
                $scope.exams = examsData.map(function(exam) {
                    return {
                        examId: exam.examId || exam.exam_id,
                        classId: exam.classId || exam.class_id,
                        className: exam.className || exam.class_name || '—',
                        classCode: exam.classCode || exam.class_code || '—',
                        subjectId: exam.subjectId || exam.subject_id,
                        subjectName: exam.subjectName || exam.subject_name || '—',
                        subjectCode: exam.subjectCode || exam.subject_code || '—',
                        examDate: exam.examDate || exam.exam_date,
                        examTime: exam.examTime || exam.exam_time,
                        endTime: exam.endTime || exam.end_time,
                        roomCode: exam.roomCode || exam.room_code || '—',
                        examType: exam.examType || exam.exam_type,
                        examTypeLabel: (exam.examType || exam.exam_type) === 'GIỮA_HỌC_PHẦN' ? 'Thi giữa' : 'Thi cuối',
                        sessionNo: exam.sessionNo || exam.session_no,
                        proctorName: exam.proctorName || exam.proctor_name || '—',
                        duration: exam.duration || 90,
                        status: exam.status || 'PLANNED',
                        statusLabel: $scope.getStatusLabel(exam.status || 'PLANNED'),
                        seatNumber: exam.seatNumber || exam.seat_number || null,
                        assignmentStatus: exam.assignmentStatus || exam.assignment_status || 'ASSIGNED',
                        notes: exam.notes || null
                    };
                });
                
                // Apply filters
                $scope.applyFilters();
                
                LoggerService.debug('Exam schedules loaded', { total: $scope.exams.length });
            })
            .catch(function(error) {
                LoggerService.error('Error loading exam schedules', error);
                var errorStatus = error.status || 0;
                var errorMessage = error.data && error.data.message || error.message || 'Lỗi không xác định';
                
                // Handle 403 (Forbidden) gracefully - user doesn't have permission
                if (errorStatus === 403) {
                    $scope.error = 'Bạn không có quyền truy cập lịch thi này. Vui lòng liên hệ quản trị viên.';
                    $scope.exams = [];
                    $scope.filteredExams = [];
                } else {
                    $scope.error = 'Không thể tải lịch thi: ' + errorMessage;
                    $scope.exams = [];
                    $scope.filteredExams = [];
                }
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 APPLY FILTERS
    // ============================================================
    $scope.applyFilters = function() {
        $scope.filteredExams = $scope.exams.filter(function(exam) {
            // Filter by exam type
            if ($scope.filters.examType && exam.examType !== $scope.filters.examType) {
                return false;
            }
            
            // Filter by status
            if ($scope.filters.status && exam.status !== $scope.filters.status) {
                return false;
            }
            
            return true;
        });
        
        // Sort by exam date (upcoming first)
        $scope.filteredExams.sort(function(a, b) {
            var dateA = new Date(a.examDate);
            var dateB = new Date(b.examDate);
            return dateA - dateB;
        });
    };
    
    // ============================================================
    // 🔹 CLEAR FILTERS
    // ============================================================
    $scope.clearFilters = function() {
        $scope.filters = {
            schoolYearId: $scope.filters.schoolYearId, // Keep school year
            semester: $scope.filters.semester, // Keep semester
            examType: '',
            status: ''
        };
        $scope.applyFilters();
    };
    
    // ============================================================
    // 🔹 HELPER FUNCTIONS
    // ============================================================
    $scope.formatDate = function(dateStr) {
        if (!dateStr) return '—';
        try {
            var date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };
    
    $scope.formatShortDate = function(dateStr) {
        if (!dateStr) return '—';
        try {
            var date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return dateStr;
        }
    };
    
    $scope.formatTime = function(timeStr) {
        if (!timeStr) return '—';
        var str = String(timeStr);
        if (str.length >= 5) {
            return str.substring(0, 5); // "HH:mm"
        }
        return str;
    };
    
    $scope.getStatusLabel = function(status) {
        var statusMap = {
            'PLANNED': 'Đã lên kế hoạch',
            'CONFIRMED': 'Đã xác nhận',
            'COMPLETED': 'Đã hoàn thành',
            'CANCELLED': 'Đã hủy'
        };
        return statusMap[status] || status;
    };
    
    $scope.getStatusClass = function(status) {
        var classMap = {
            'PLANNED': 'badge-info',
            'CONFIRMED': 'badge-success',
            'COMPLETED': 'badge-secondary',
            'CANCELLED': 'badge-danger'
        };
        return classMap[status] || 'badge-secondary';
    };
    
    $scope.getAssignmentStatusLabel = function(status) {
        var statusMap = {
            'ASSIGNED': 'Đã phân ca',
            'NOT_QUALIFIED': 'Không đủ điều kiện',
            'ATTENDED': 'Đã dự thi',
            'ABSENT': 'Vắng thi',
            'EXCUSED': 'Vắng có lý do'
        };
        return statusMap[status] || status;
    };
    
    $scope.getAssignmentStatusClass = function(status) {
        var classMap = {
            'ASSIGNED': 'badge-primary',
            'NOT_QUALIFIED': 'badge-danger',
            'ATTENDED': 'badge-success',
            'ABSENT': 'badge-warning',
            'EXCUSED': 'badge-info'
        };
        return classMap[status] || 'badge-secondary';
    };
    
    // Check if exam is upcoming (within 7 days)
    $scope.isUpcoming = function(exam) {
        if (!exam.examDate) return false;
        try {
            var examDate = new Date(exam.examDate);
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            examDate.setHours(0, 0, 0, 0);
            var diffTime = examDate - today;
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
        } catch (e) {
            return false;
        }
    };
    
    // Get days until exam
    $scope.getDaysUntilExam = function(exam) {
        if (!exam.examDate) return null;
        try {
            var examDate = new Date(exam.examDate);
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            examDate.setHours(0, 0, 0, 0);
            var diffTime = examDate - today;
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (e) {
            return null;
        }
    };
    
    // ============================================================
    // 🔹 VIEW EXAM DETAILS
    // ============================================================
    $scope.viewExamDetails = function(exam) {
        // Có thể mở modal hoặc navigate đến trang chi tiết
        ToastService.info('Chi tiết lịch thi: ' + exam.subjectName + ' - ' + $scope.formatShortDate(exam.examDate));
    };
    
    // ============================================================
    // 🔹 INITIALIZE
    // ============================================================
    $scope.initPage();
}]);

