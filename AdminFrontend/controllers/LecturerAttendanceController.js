// Lecturer Attendance Controller - Simplified Version
app.controller('LecturerAttendanceController', ['$scope', '$timeout', '$http', '$routeParams', '$location', '$rootScope', 'AuthService', 'ClassService', 'EnrollmentService', 'TimetableApi', 'ApiService', 'LoggerService', 'API_CONFIG', 'ToastService', 'LecturerService',
    function($scope, $timeout, $http, $routeParams, $location, $rootScope, AuthService, ClassService, EnrollmentService, TimetableApi, ApiService, LoggerService, API_CONFIG, ToastService, LecturerService) {
    
    $scope.currentUser = AuthService.getCurrentUser();
    $scope.loading = false;
    $scope.loadingStudents = false;
    $scope.saving = false;
    $scope.todaySessions = [];
    $scope.lecturerId = null;
    
    // Helper function to get ISO week
    function getIsoWeek(d) {
        var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return { year: date.getUTCFullYear(), week: weekNo };
    }
    
    // Helper function to get current weekday in backend format (1=Sunday, 2=Monday, ..., 7=Saturday)
    function getCurrentWeekday() {
        var today = new Date();
        var day = today.getDay(); // JS format: 0=Sunday, 1=Monday, ..., 6=Saturday
        // Convert to backend format: 1=Sunday, 2=Monday, ..., 7=Saturday
        return day === 0 ? 1 : day + 1;
    }
    
    // Helper function to format time
    function formatTime(timeStr) {
        if (!timeStr) return '';
        var str = String(timeStr);
        if (str.length >= 5) {
            return str.substring(0, 5); // "07:00:00" -> "07:00"
        }
        return str;
    }
    
    // Helper function to get today's date string (YYYY-MM-DD)
    function getTodayString() {
        var today = new Date();
        var year = today.getFullYear();
        var month = String(today.getMonth() + 1).padStart(2, '0');
        var day = String(today.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }
    
    // Map attendance status from backend to frontend
    function mapAttendanceStatus(backendStatus) {
        if (!backendStatus) return 'present';
        var status = backendStatus.toUpperCase();
        switch(status) {
            case 'PRESENT': return 'present';
            case 'ABSENT': return 'absent';
            case 'LATE': return 'late';
            case 'EXCUSED': return 'excused';
            default: return 'present';
        }
    }
    
    // Map status from frontend to backend
    function mapStatusToBackend(frontendStatus) {
        switch(frontendStatus) {
            case 'present': return 'Present';
            case 'absent': return 'Absent';
            case 'late': return 'Late';
            case 'excused': return 'Excused';
            default: return 'Present';
        }
    }
    
    // Load lecturerId from userId if needed
    function loadLecturerId() {
        return new Promise(function(resolve, reject) {
            // Try to get lecturerId from currentUser first
            $scope.lecturerId = $scope.currentUser && (
                $scope.currentUser.lecturerId || 
                $scope.currentUser.lecturer_id ||
                $scope.currentUser.relatedId
            );
            
            if ($scope.lecturerId) {
                resolve($scope.lecturerId);
                return;
            }
            
            // If not found, try to get from API using userId
            if (!$scope.currentUser || !$scope.currentUser.userId) {
                reject('Không tìm thấy userId');
                return;
            }
            
            LecturerService.getByUserId($scope.currentUser.userId)
                .then(function(response) {
                    var lecturer = null;
                    if (response.data) {
                        if (response.data.data) {
                            lecturer = response.data.data;
                        } else if (response.data.lecturerId || response.data.lecturer_id) {
                            lecturer = response.data;
                        }
                    }
                    
                    if (lecturer && (lecturer.lecturerId || lecturer.lecturer_id)) {
                        $scope.lecturerId = lecturer.lecturerId || lecturer.lecturer_id;
                        resolve($scope.lecturerId);
                    } else {
                        reject('Không tìm thấy thông tin giảng viên');
                    }
                })
                .catch(function(error) {
                    reject(error);
                });
        });
    }
    
    // Load today's sessions from timetable
    $scope.loadTodaySessions = function() {
        // Check if lecturerId is already loaded
        if ($scope.lecturerId) {
            return loadTodaySessionsWithLecturerId($scope.lecturerId);
        }
        
        // First, ensure we have lecturerId
        loadLecturerId()
            .then(function(lecturerId) {
                return loadTodaySessionsWithLecturerId(lecturerId);
            })
            .catch(function(error) {
                $scope.error = 'Không tìm thấy thông tin giảng viên';
                $scope.todaySessions = [];
                $scope.loading = false;
            });
    };
    
    // Load today's sessions with lecturerId
    function loadTodaySessionsWithLecturerId(lecturerId) {
        if (!lecturerId) {
            $scope.error = 'Không tìm thấy thông tin giảng viên';
            $scope.todaySessions = [];
            $scope.loading = false;
            return Promise.resolve();
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        var today = new Date();
        var iso = getIsoWeek(today);
        var currentWeekday = getCurrentWeekday();
        var todayStr = getTodayString();
        
        return TimetableApi.getLecturerWeek(lecturerId, iso.year, iso.week)
            .then(function(res) {
                var data = (res.data && res.data.data) || [];
                
                // Filter today's schedule
                var todaySchedules = data.filter(function(schedule) {
                    return schedule.weekday === currentWeekday;
                });
                
                // Sort by start time
                todaySchedules.sort(function(a, b) {
                    var timeA = a.start_time || a.startTime || '';
                    var timeB = b.start_time || b.startTime || '';
                    return timeA.localeCompare(timeB);
                });
                
                // Format data for display
                $scope.todaySessions = todaySchedules.map(function(schedule) {
                    var startTime = formatTime(schedule.start_time || schedule.startTime || '');
                    var endTime = formatTime(schedule.end_time || schedule.endTime || '');
                    var period = (schedule.period_from && schedule.period_to) 
                        ? schedule.period_from + '-' + schedule.period_to 
                        : (schedule.periodFrom && schedule.periodTo)
                        ? schedule.periodFrom + '-' + schedule.periodTo
                        : '';
                    
                    return {
                        sessionId: schedule.session_id || schedule.sessionId || '',
                        classId: schedule.class_id || schedule.classId || '',
                        subjectName: schedule.subject_name || schedule.subjectName || 'N/A',
                        className: schedule.class_name || schedule.className || 'N/A',
                        room: schedule.room_code || schedule.roomCode || 'N/A',
                        startTime: startTime,
                        endTime: endTime,
                        period: period,
                        attendanceSaved: false, // Sẽ được cập nhật sau
                        showAttendanceForm: false,
                        students: null // Sẽ được load khi click "Điểm danh"
                    };
                });
                
                // Check attendance for each session
                var attendanceCheckPromises = $scope.todaySessions.map(function(session) {
                    if (!session.sessionId) {
                        session.attendanceSaved = false;
                        return Promise.resolve();
                    }
                    
                    return ApiService.get('/attendances/schedule/' + session.sessionId, null, { cache: false })
                        .then(function(response) {
                            var attendances = (response.data && response.data.data) || [];
                            
                            // Filter attendance records of today
                            var todayAttendances = attendances.filter(function(att) {
                                var attDateValue = att.attendanceDate || att.attendance_date || att.date || att.Date || null;
                                
                                if (!attDateValue) {
                                    return false;
                                }
                                
                                var attDate = new Date(attDateValue);
                                if (isNaN(attDate.getTime())) {
                                    return false;
                                }
                                
                                var attDateStr = attDate.getFullYear() + '-' + 
                                               String(attDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                               String(attDate.getDate()).padStart(2, '0');
                                
                                return attDateStr === todayStr;
                            });
                            
                            // If there's at least 1 attendance record for today → already saved
                            session.attendanceSaved = todayAttendances.length > 0;
                            return session;
                        })
                        .catch(function(error) {
                            // If error (404 or 403), consider as not saved
                            session.attendanceSaved = false;
                            return session;
                        });
                });
                
                return Promise.all(attendanceCheckPromises);
            })
            .then(function() {
                // Dùng $timeout để đảm bảo update scope trong digest cycle an toàn
                $timeout(function() {
                    $scope.loading = false;
                }, 0);
            })
            .catch(function(err) {
                LoggerService.error('Load today sessions error', err);
                $scope.error = 'Không thể tải lịch học hôm nay: ' + (err.data?.message || err.message || 'Lỗi không xác định');
                ToastService.error('Không thể tải lịch học hôm nay');
                $scope.todaySessions = [];
                $scope.loading = false;
            });
    };
    
    // Open attendance form for a session
    $scope.openAttendanceForm = function(session) {
        if (!session || !session.classId) {
            ToastService.error('Không tìm thấy thông tin lớp học');
            return;
        }
        
        // If already showing, hide it
        if (session.showAttendanceForm) {
            session.showAttendanceForm = false;
            return;
        }
        
        // If already saved, don't show form
        if (session.attendanceSaved) {
            ToastService.warning('Lớp học này đã được điểm danh');
            return;
        }
        
        // Show form
        session.showAttendanceForm = true;
        session.loadingStudents = true;
        
        // Load students and existing attendance records
        var todayStr = getTodayString();
        
        Promise.all([
            EnrollmentService.getClassRoster(session.classId),
            session.sessionId ? ApiService.get('/attendances/schedule/' + session.sessionId, null, { cache: false })
                .then(function(response) {
                    var attendances = (response.data && response.data.data) || [];
                    // Filter attendance records of today
                    return attendances.filter(function(att) {
                        var attDateValue = att.attendanceDate || att.attendance_date || att.date || att.Date || null;
                        if (!attDateValue) return false;
                        var attDate = new Date(attDateValue);
                        if (isNaN(attDate.getTime())) return false;
                        var attDateStr = attDate.getFullYear() + '-' + 
                                       String(attDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                       String(attDate.getDate()).padStart(2, '0');
                        return attDateStr === todayStr;
                    });
                })
                .catch(function(error) {
                    return [];
                }) : Promise.resolve([])
        ])
            .then(function(results) {
                var rosterResponse = results[0];
                var existingAttendances = results[1];
                
                var data = rosterResponse.data;
                var roster = (data && data.data) ? data.data : (Array.isArray(data) ? data : []);
                
                // Create map from attendance records
                var attendanceMap = {};
                existingAttendances.forEach(function(att) {
                    var studentId = att.student_id || att.studentId;
                    attendanceMap[studentId] = {
                        status: mapAttendanceStatus(att.status),
                        note: att.notes || att.note || ''
                    };
                });
                
                // Map students and fill attendance if exists
                session.students = roster.map(function(enrollment) {
                    var student = enrollment.student || {};
                    var studentId = student.studentId || enrollment.studentId;
                    var existingAtt = attendanceMap[studentId];
                    
                    return {
                        id: studentId,
                        studentId: studentId,
                        studentCode: student.studentCode || enrollment.studentCode || 'N/A',
                        fullName: student.fullName || enrollment.fullName || 'N/A',
                        status: existingAtt ? existingAtt.status : 'present',
                        note: existingAtt ? existingAtt.note : ''
                    };
                });
                
                // Dùng $timeout để đảm bảo UI update trong digest cycle
                $timeout(function() {
                    session.loadingStudents = false;
                }, 0);
            })
            .catch(function(error) {
                LoggerService.error('Error loading students', error);
                ToastService.error('Không thể tải danh sách sinh viên: ' + (error.data?.message || error.message || 'Lỗi không xác định'));
                session.students = [];
                session.loadingStudents = false;
            });
    };
    
    // Mark all students as present
    $scope.markAllPresent = function(session) {
        if (!session || !session.students) return;
        session.students.forEach(function(student) {
            student.status = 'present';
        });
    };
    
    // Get count by status for a session
    $scope.getCountByStatus = function(session, status) {
        if (!session || !session.students) return 0;
        return session.students.filter(function(student) {
            return student.status === status;
        }).length;
    };
    
    // Save attendance for a session
    $scope.saveAttendance = function(session) {
        if (!session || !session.sessionId || !session.classId) {
            ToastService.error('Thông tin lớp học không hợp lệ');
            return;
        }
        
        if (!session.students || session.students.length === 0) {
            ToastService.warning('Không có sinh viên để điểm danh');
            return;
        }
        
        // Confirm before saving
        var confirmMessage = 'Bạn có chắc muốn lưu điểm danh cho ' + session.students.length + ' sinh viên?';
        if (!confirm(confirmMessage)) {
            return;
        }
        
        $scope.saving = true;
        $scope.error = null;
        $scope.success = null;
        
        var todayStr = getTodayString();
        var today = new Date();
        
        // Load existing attendances to check if need to create or update
        ApiService.get('/attendances/schedule/' + session.sessionId, null, { cache: false })
            .then(function(response) {
                var attendances = (response.data && response.data.data) || [];
                
                // Filter attendance records of today
                var todayAttendances = attendances.filter(function(att) {
                    var attDateValue = att.attendanceDate || att.attendance_date || att.date || att.Date || null;
                    if (!attDateValue) return false;
                    var attDate = new Date(attDateValue);
                    if (isNaN(attDate.getTime())) return false;
                    var attDateStr = attDate.getFullYear() + '-' + 
                                   String(attDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                   String(attDate.getDate()).padStart(2, '0');
                    return attDateStr === todayStr;
                });
                
                // Create map from existing attendances
                var attendanceMap = {};
                todayAttendances.forEach(function(att) {
                    var studentId = att.student_id || att.studentId;
                    attendanceMap[studentId] = att;
                });
                
                // Create or update attendance for each student
                var savePromises = session.students.map(function(student) {
                    var existingAtt = attendanceMap[student.studentId];
                    
                    if (existingAtt) {
                        // Update existing attendance
                        var attendanceId = existingAtt.attendanceId || existingAtt.attendance_id;
                        
                        return ApiService.put('/attendances/' + attendanceId, {
                            status: mapStatusToBackend(student.status),
                            notes: student.note || null,
                            updatedBy: $scope.currentUser.username || $scope.currentUser.userId || 'lecturer'
                        });
                    } else {
                        // Create new attendance
                        // ✅ Fix timezone issue: Use today's date with current time
                        // Backend expects date to be today, so we use todayStr + current time
                        var now = new Date();
                        var year = now.getFullYear();
                        var month = String(now.getMonth() + 1).padStart(2, '0');
                        var day = String(now.getDate()).padStart(2, '0');
                        var hours = String(now.getHours()).padStart(2, '0');
                        var minutes = String(now.getMinutes()).padStart(2, '0');
                        var seconds = String(now.getSeconds()).padStart(2, '0');
                        
                        // Create ISO string with timezone offset to ensure correct date parsing
                        // Get timezone offset in minutes and convert to HH:mm format
                        var timezoneOffset = -now.getTimezoneOffset(); // Negative because getTimezoneOffset returns offset from UTC
                        var offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
                        var offsetMinutes = Math.abs(timezoneOffset) % 60;
                        var offsetSign = timezoneOffset >= 0 ? '+' : '-';
                        var offsetStr = offsetSign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');
                        
                        // Create ISO string with timezone offset (YYYY-MM-DDTHH:mm:ss+HH:mm)
                        var attendanceDateStr = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds + offsetStr;
                        
                        var requestData = {
                            studentId: student.studentId,
                            scheduleId: session.sessionId,
                            attendanceDate: attendanceDateStr,
                            status: mapStatusToBackend(student.status),
                            notes: student.note || null,
                            markedBy: $scope.currentUser.username || $scope.currentUser.userId || 'lecturer',
                            createdBy: $scope.currentUser.username || $scope.currentUser.userId || 'lecturer'
                        };
                        
                        return ApiService.post('/attendances', requestData);
                    }
                });
                
                return Promise.all(savePromises);
            })
            .then(function(results) {
                $scope.saving = false;
                $scope.success = 'Lưu điểm danh thành công cho ' + session.students.length + ' sinh viên!';
                ToastService.success('Lưu điểm danh thành công!');
                
                // Mark as saved and hide form
                session.attendanceSaved = true;
                session.showAttendanceForm = false;
                
                // Emit event để dashboard tự động cập nhật
                $rootScope.$broadcast('attendanceSaved', {
                    sessionId: session.sessionId,
                    classId: session.classId,
                    date: todayStr
                });
                
                // Clear success message after 5 seconds
                $timeout(function() {
                    $scope.success = null;
                }, 5000);
            })
            .catch(function(error) {
                $scope.saving = false;
                var errorMessage = 'Lỗi khi lưu điểm danh: ' + (error.data?.message || error.data?.error || error.message || 'Lỗi không xác định');
                $scope.error = errorMessage;
                ToastService.error(errorMessage);
            });
    };
    
    // Initialize: Load lecturerId first, then load sessions
    loadLecturerId()
        .then(function(lecturerId) {
            if (lecturerId) {
                $scope.loadTodaySessions();
            }
        })
        .catch(function(error) {
            $scope.error = 'Không thể tải thông tin giảng viên';
            $scope.loading = false;
        });
}]);
