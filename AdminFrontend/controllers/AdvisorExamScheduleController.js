// Advisor Exam Schedule Controller - Quản lý lịch thi cho Cố vấn
app.controller('AdvisorExamScheduleController', ['$scope', '$location', '$routeParams', '$timeout', 'ExamScheduleService', 'ClassService', 'SubjectService', 'RoomService', 'LecturerService', 'SchoolYearService', 'AuthService', 'ToastService', 'LoggerService', 'PaginationService',
    function($scope, $location, $routeParams, $timeout, ExamScheduleService, ClassService, SubjectService, RoomService, LecturerService, SchoolYearService, AuthService, ToastService, LoggerService, PaginationService) {
    
    $scope.examSchedules = [];
    $scope.displayedSchedules = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    $scope.currentUser = AuthService.getCurrentUser() || {};
    
    // Pagination
    $scope.pagination = PaginationService.init(10);
    
    // Filters
    $scope.filters = {
        schoolYearId: '',
        semester: '',
        examType: '',
        classId: '',
        subjectId: '',
        startDate: null,
        endDate: null
    };
    
    // Form data
    $scope.form = {
        classId: '',
        examType: 'GIỮA_HỌC_PHẦN',
        examDate: null,
        examTime: null,
        endTime: null,
        roomId: '',
        duration: 90, // 90 phút mặc định
        proctorLecturerId: '',
        notes: ''
    };
    
    $scope.selectedExam = null;
    $scope.selectedClass = null;
    $scope.classStudents = [];
    $scope.rooms = [];
    $scope.lecturers = [];
    $scope.classes = [];
    $scope.schoolYears = [];
    
    // Exam type options
    $scope.examTypes = [
        { value: 'GIỮA_HỌC_PHẦN', label: 'Thi giữa học phần' },
        { value: 'KẾT_THÚC_HỌC_PHẦN', label: 'Thi kết thúc học phần' }
    ];
    
    // Semester options
    $scope.semesters = [
        { value: '1', label: 'Học kỳ 1' },
        { value: '2', label: 'Học kỳ 2' },
        { value: '3', label: 'Học kỳ hè' }
    ];
    
    // Status options
    $scope.statusOptions = [
        { value: 'PLANNED', label: 'Đã lên kế hoạch' },
        { value: 'CONFIRMED', label: 'Đã xác nhận' },
        { value: 'COMPLETED', label: 'Đã hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' }
    ];
    
    // ============================================================
    // 🔹 INITIALIZE PAGE
    // ============================================================
    $scope.initPage = function() {
        $scope.loadSchoolYears();
        $scope.loadRooms();
        $scope.loadLecturers();
        $scope.loadClasses();
        $scope.loadExamSchedules();
    };
    
    // ============================================================
    // 🔹 LOAD DATA
    // ============================================================
    $scope.loadSchoolYears = function() {
        SchoolYearService.getAll()
            .then(function(response) {
                $scope.schoolYears = (response.data && response.data.data) || [];
            })
            .catch(function(error) {
                LoggerService.error('Error loading school years', error);
            });
    };
    
    $scope.loadRooms = function() {
        RoomService.getAll({ isActive: true })
            .then(function(response) {
                $scope.rooms = (response.data && response.data.data) || [];
            })
            .catch(function(error) {
                LoggerService.error('Error loading rooms', error);
            });
    };
    
    $scope.loadLecturers = function() {
        LecturerService.getAll({ isActive: true })
            .then(function(response) {
                $scope.lecturers = (response.data && response.data.data) || [];
            })
            .catch(function(error) {
                LoggerService.error('Error loading lecturers', error);
            });
    };
    
    $scope.loadClasses = function() {
        ClassService.getAll({ pageSize: 1000 })
            .then(function(response) {
                $scope.classes = (response.data && response.data.data) || [];
            })
            .catch(function(error) {
                LoggerService.error('Error loading classes', error);
            });
    };
    
    $scope.loadExamSchedules = function() {
        $scope.loading = true;
        $scope.error = null;
        
        var params = {
            schoolYearId: $scope.filters.schoolYearId || null,
            semester: $scope.filters.semester ? parseInt($scope.filters.semester) : null,
            examType: $scope.filters.examType || null,
            classId: $scope.filters.classId || null,
            subjectId: $scope.filters.subjectId || null,
            startDate: $scope.filters.startDate || null,
            endDate: $scope.filters.endDate || null
        };
        
        // Remove empty values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '' || params[key] === undefined) {
                delete params[key];
            }
        });
        
        ExamScheduleService.getAll(params)
            .then(function(response) {
                var result = response.data;
                
                if (result && result.data) {
                    $scope.examSchedules = result.data.map(function(exam) {
                        return {
                            examId: exam.examId,
                            classId: exam.classId,
                            className: exam.className || exam.classCode || 'N/A',
                            classCode: exam.classCode || 'N/A',
                            subjectId: exam.subjectId,
                            subjectName: exam.subjectName || 'N/A',
                            examDate: exam.examDate,
                            examTime: exam.examTime,
                            endTime: exam.endTime,
                            roomId: exam.roomId,
                            roomCode: exam.roomCode || 'N/A',
                            examType: exam.examType,
                            examTypeLabel: exam.examType === 'GIỮA_HỌC_PHẦN' ? 'Thi giữa' : 'Thi cuối',
                            sessionNo: exam.sessionNo,
                            proctorLecturerId: exam.proctorLecturerId,
                            proctorName: exam.proctorName || '—',
                            duration: exam.duration,
                            maxStudents: exam.maxStudents,
                            assignedStudents: exam.assignedStudents || 0,
                            status: exam.status,
                            statusLabel: $scope.getStatusLabel(exam.status),
                            notes: exam.notes,
                            schoolYearId: exam.schoolYearId,
                            semester: exam.semester
                        };
                    });
                    
                    $scope.displayedSchedules = $scope.examSchedules;
                    LoggerService.debug('Exam schedules loaded', { total: $scope.examSchedules.length });
                } else {
                    $scope.examSchedules = [];
                    $scope.displayedSchedules = [];
                }
                $scope.loading = false;
            })
            .catch(function(error) {
                LoggerService.error('Error loading exam schedules', error);
                $scope.error = 'Không thể tải danh sách lịch thi: ' + (error.data && error.data.message || error.message || 'Lỗi không xác định');
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 HELPER FUNCTIONS
    // ============================================================
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
    
    $scope.formatDate = function(dateStr) {
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
    
    // ============================================================
    // 🔹 FORM OPERATIONS
    // ============================================================
    $scope.openCreateForm = function() {
        $scope.isEditMode = false;
        $scope.selectedExam = null;
        $scope.selectedClass = null;
        $scope.classStudents = [];
        $scope.resetForm();
        $scope.showForm = true;
    };
    
    $scope.openEditForm = function(exam) {
        $scope.isEditMode = true;
        $scope.selectedExam = exam;
        $scope.form = {
            examId: exam.examId,
            classId: exam.classId,
            examType: exam.examType,
            examDate: exam.examDate ? exam.examDate.substring(0, 10) : null, // YYYY-MM-DD
            examTime: $scope.formatTime(exam.examTime),
            endTime: $scope.formatTime(exam.endTime),
            roomId: exam.roomId || '',
            duration: exam.duration || 90,
            proctorLecturerId: exam.proctorLecturerId || '',
            notes: exam.notes || ''
        };
        
        // Load class info
        $scope.loadClassInfo(exam.classId);
        $scope.showForm = true;
    };
    
    $scope.resetForm = function() {
        $scope.form = {
            classId: '',
            examType: 'GIỮA_HỌC_PHẦN',
            examDate: null,
            examTime: null,
            endTime: null,
            roomId: '',
            duration: 90,
            proctorLecturerId: '',
            notes: ''
        };
        $scope.selectedClass = null;
        $scope.classStudents = [];
        $scope.error = null;
        $scope.success = null;
    };
    
    $scope.closeForm = function() {
        $scope.showForm = false;
        $scope.resetForm();
        $scope.isEditMode = false;
        $scope.selectedExam = null;
    };
    
    // ============================================================
    // 🔹 CLASS SELECTION
    // ============================================================
    $scope.onClassSelect = function() {
        if ($scope.form.classId) {
            $scope.loadClassInfo($scope.form.classId);
        } else {
            $scope.selectedClass = null;
            $scope.classStudents = [];
        }
    };
    
    $scope.loadClassInfo = function(classId) {
        if (!classId) return;
        
        // Load class details
        ClassService.getById(classId)
            .then(function(response) {
                var classData = response.data && response.data.data ? response.data.data : response.data;
                $scope.selectedClass = classData;
                
                // Load students in class
                return ExamScheduleService.getClassStudents(classId);
            })
            .then(function(response) {
                $scope.classStudents = (response.data && response.data.data) || [];
                LoggerService.debug('Class students loaded', { count: $scope.classStudents.length });
            })
            .catch(function(error) {
                LoggerService.error('Error loading class info', error);
                ToastService.warning('Không thể tải thông tin lớp học phần');
            });
    };
    
    // ============================================================
    // 🔹 ROOM CAPACITY CHECK
    // ============================================================
    $scope.onRoomSelect = function() {
        if ($scope.form.roomId && $scope.selectedClass) {
            var room = $scope.rooms.find(function(r) { return r.roomId === $scope.form.roomId; });
            if (room && room.capacity && $scope.classStudents.length > 0) {
                var studentCount = $scope.classStudents.length;
                var requiredSessions = Math.ceil(studentCount / room.capacity);
                
                if (requiredSessions > 1) {
                    ToastService.info('Lớp có ' + studentCount + ' sinh viên, phòng có ' + room.capacity + ' chỗ. ' +
                                     'Hệ thống sẽ tự động tạo ' + requiredSessions + ' ca thi.');
                }
            }
        }
    };
    
    // ============================================================
    // 🔹 CHECK ROOM CONFLICT
    // ============================================================
    $scope.checkRoomConflict = function() {
        if (!$scope.form.roomId || !$scope.form.examDate || !$scope.form.examTime || !$scope.form.endTime) {
            ToastService.warning('Vui lòng điền đầy đủ thông tin phòng, ngày và giờ thi');
            return;
        }
        
        ExamScheduleService.checkRoomConflict(
            $scope.form.roomId,
            $scope.form.examDate,
            $scope.form.examTime + ':00',
            $scope.form.endTime + ':00',
            $scope.isEditMode ? $scope.form.examId : null
        )
        .then(function(response) {
            var result = response.data;
            if (result && result.hasConflict) {
                ToastService.warning('Phòng đã được sử dụng trong khoảng thời gian này!');
            } else {
                ToastService.success('Phòng có sẵn, không có xung đột');
            }
        })
        .catch(function(error) {
            LoggerService.error('Error checking room conflict', error);
            ToastService.error('Không thể kiểm tra xung đột phòng');
        });
    };
    
    // ============================================================
    // 🔹 SAVE EXAM SCHEDULE
    // ============================================================
    $scope.saveExamSchedule = function() {
        // Validation
        if (!$scope.form.classId) {
            ToastService.warning('Vui lòng chọn lớp học phần');
            return;
        }
        if (!$scope.form.examDate) {
            ToastService.warning('Vui lòng chọn ngày thi');
            return;
        }
        if (!$scope.form.examTime || !$scope.form.endTime) {
            ToastService.warning('Vui lòng chọn giờ thi');
            return;
        }
        if (!$scope.form.roomId) {
            ToastService.warning('Vui lòng chọn phòng thi');
            return;
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        var examData = {
            classId: $scope.form.classId,
            examType: $scope.form.examType,
            examDate: $scope.form.examDate,
            examTime: $scope.form.examTime + ':00', // Convert to HH:mm:ss
            endTime: $scope.form.endTime + ':00',
            roomId: $scope.form.roomId,
            duration: parseInt($scope.form.duration) || 90,
            proctorLecturerId: $scope.form.proctorLecturerId || null,
            notes: $scope.form.notes || null
        };
        
        var savePromise;
        if ($scope.isEditMode) {
            // Update existing exam
            savePromise = ExamScheduleService.update($scope.form.examId, examData);
        } else {
            // Create exam for class (tự động phân sinh viên)
            savePromise = ExamScheduleService.createForClass(examData);
        }
        
        savePromise
            .then(function(response) {
                ToastService.success($scope.isEditMode ? 'Cập nhật lịch thi thành công' : 'Tạo lịch thi thành công');
                $scope.loading = false;
                $scope.closeForm();
                $scope.loadExamSchedules();
                
                // Show info about auto-assignment
                if (!$scope.isEditMode && response.data && response.data.data) {
                    var exams = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
                    if (exams.length > 1) {
                        ToastService.info('Đã tự động tạo ' + exams.length + ' ca thi và phân sinh viên vào các ca');
                    }
                }
            })
            .catch(function(error) {
                LoggerService.error('Error saving exam schedule', error);
                $scope.error = error.data && error.data.message || 'Không thể lưu lịch thi';
                $scope.loading = false;
                ToastService.error($scope.error);
            });
    };
    
    // ============================================================
    // 🔹 DELETE EXAM SCHEDULE
    // ============================================================
    $scope.deleteExamSchedule = function(exam) {
        if (!confirm('Bạn có chắc chắn muốn xóa lịch thi này?\n\n' +
                    'Lớp: ' + exam.className + '\n' +
                    'Ngày thi: ' + $scope.formatDate(exam.examDate) + '\n' +
                    'Loại thi: ' + exam.examTypeLabel + '\n\n' +
                    'Lưu ý: Chỉ có thể xóa lịch thi chưa nhập điểm.')) {
            return;
        }
        
        $scope.loading = true;
        ExamScheduleService.delete(exam.examId)
            .then(function(response) {
                ToastService.success('Xóa lịch thi thành công');
                $scope.loadExamSchedules();
            })
            .catch(function(error) {
                LoggerService.error('Error deleting exam schedule', error);
                $scope.error = error.data && error.data.message || 'Không thể xóa lịch thi';
                $scope.loading = false;
                ToastService.error($scope.error);
            });
    };
    
    // ============================================================
    // 🔹 CANCEL EXAM SCHEDULE
    // ============================================================
    $scope.cancelExamSchedule = function(exam) {
        if (!confirm('Bạn có chắc chắn muốn hủy lịch thi này?\n\n' +
                    'Lớp: ' + exam.className + '\n' +
                    'Ngày thi: ' + $scope.formatDate(exam.examDate))) {
            return;
        }
        
        $scope.loading = true;
        ExamScheduleService.cancel(exam.examId)
            .then(function(response) {
                ToastService.success('Hủy lịch thi thành công');
                $scope.loadExamSchedules();
            })
            .catch(function(error) {
                LoggerService.error('Error canceling exam schedule', error);
                $scope.error = error.data && error.data.message || 'Không thể hủy lịch thi';
                $scope.loading = false;
                ToastService.error($scope.error);
            });
    };
    
    // ============================================================
    // 🔹 VIEW EXAM DETAILS
    // ============================================================
    $scope.viewExamDetails = function(exam) {
        // Navigate to exam details page (có thể tạo sau)
        $location.path('/advisor/exam-schedules/' + exam.examId);
    };
    
    // ============================================================
    // 🔹 FILTER OPERATIONS
    // ============================================================
    $scope.applyFilters = function() {
        $scope.loadExamSchedules();
    };
    
    $scope.clearFilters = function() {
        $scope.filters = {
            schoolYearId: '',
            semester: '',
            examType: '',
            classId: '',
            subjectId: '',
            startDate: null,
            endDate: null
        };
        $scope.loadExamSchedules();
    };
    
    // ============================================================
    // 🔹 INITIALIZE
    // ============================================================
    $scope.initPage();
}]);

