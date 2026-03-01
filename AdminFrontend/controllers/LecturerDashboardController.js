// Lecturer Dashboard Controller
app.controller('LecturerDashboardController', ['$scope', '$rootScope', 'AuthService', 'AvatarService', 'TimetableApi', 'ClassService', 'EnrollmentService', 'LecturerService', 'ApiService', 'LoggerService', 
    function($scope, $rootScope, AuthService, AvatarService, TimetableApi, ClassService, EnrollmentService, LecturerService, ApiService, LoggerService) {
    $scope.currentUser = AuthService.getCurrentUser();
    $scope.loading = false;
    $scope.loadingStats = false;
    $scope.todaySchedule = [];
    $scope.lecturerId = null;
    $scope.reminderDismissed = false; // ✅ Track trạng thái đóng thông báo
    $scope.stats = {
        totalClasses: 0,
        totalStudents: 0,
        todayClasses: 0,
        warningStudents: 0
    };
    
    // ✅ Load lecturerId từ currentUser
    function loadLecturerId() {
        if (!$scope.currentUser || !$scope.currentUser.userId) {
            $scope.lecturerId = null;
            return;
        }
        
        // Try multiple ways to get lecturerId
        $scope.lecturerId = $scope.currentUser.lecturerId || 
                           $scope.currentUser.lecturer_id ||
                           $scope.currentUser.relatedId;
        
        // If found, use it directly
        if ($scope.lecturerId) {
            loadTodaySchedule();
            loadStats();
            return;
        }
        
        // If not found and we have userId, try to get from API
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
                
                if (lecturer) {
                    $scope.lecturerId = lecturer.lecturerId || lecturer.lecturer_id;
                    if ($scope.lecturerId) {
                        loadTodaySchedule();
                        loadStats();
                    }
                }
            })
            .catch(function(error) {
                LoggerService.error('Error loading lecturer info', error);
            });
    }
    
    // Load lecturer statistics
    function loadStats() {
        if (!$scope.lecturerId) {
            $scope.stats = {
                totalClasses: 0,
                totalStudents: 0,
                todayClasses: 0,
                warningStudents: 0
            };
            return;
        }
        
        $scope.loadingStats = true;
        
        // Load classes for lecturer
        ClassService.getByLecturer($scope.lecturerId)
            .then(function(response) {
                var data = response.data;
                var classes = (data && data.data) ? data.data : (Array.isArray(data) ? data : []);
                
                $scope.stats.totalClasses = classes.length;
                
                // Count total students across all classes
                var studentCountPromises = classes.map(function(cls) {
                    return EnrollmentService.getClassRoster(cls.classId || cls.id)
                        .then(function(rosterResponse) {
                            var rosterData = rosterResponse.data;
                            var roster = (rosterData && rosterData.data) ? rosterData.data : (Array.isArray(rosterData) ? rosterData : []);
                            return roster.length;
                        })
                        .catch(function() {
                            return 0;
                        });
                });
                
                return Promise.all(studentCountPromises);
            })
            .then(function(studentCounts) {
                $scope.stats.totalStudents = studentCounts.reduce(function(sum, count) {
                    return sum + count;
                }, 0);
            })
            .catch(function(error) {
                LoggerService.error('Load stats error', error);
                $scope.stats.totalClasses = 0;
                $scope.stats.totalStudents = 0;
            })
            .finally(function() {
                $scope.loadingStats = false;
            });
    }
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Helper function to get ISO week
    function getIsoWeek(d) {
        var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return { year: date.getUTCFullYear(), week: weekNo };
    }
    
    // ✅ Get current weekday (Database format: 1=Sunday, 2=Monday, ..., 7=Saturday)
    function getCurrentWeekday() {
        var today = new Date();
        var day = today.getDay(); // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
        // Convert to database format: 1=Sunday, 2=Monday, ..., 7=Saturday
        return day === 0 ? 1 : day + 1;
    }
    
    // Format time from HH:mm:ss to HH:mm
    function formatTime(timeString) {
        if (!timeString) return '';
        // Handle string format (HH:mm:ss or HH:mm)
        if (typeof timeString === 'string') {
            // If it's already in HH:mm format, return as is
            if (timeString.length === 5 && timeString.indexOf(':') === 2) {
                return timeString;
            }
            // Otherwise, get HH:mm from HH:mm:ss
            return timeString.substring(0, 5);
        }
        // If it's an object (TimeSpan), try to convert
        if (typeof timeString === 'object' && timeString !== null) {
            // Handle TimeSpan object if it has hours/minutes properties
            if (timeString.hours !== undefined && timeString.minutes !== undefined) {
                var h = ('0' + String(timeString.hours)).slice(-2);
                var m = ('0' + String(timeString.minutes)).slice(-2);
                return h + ':' + m;
            }
        }
        return String(timeString);
    }
    
    // Determine status based on current time and attendance
    function getStatus(startTime, endTime, hasAttendance) {
        var now = new Date();
        var currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
        
        var start = parseInt(startTime.replace(':', ''));
        var end = parseInt(endTime.replace(':', ''));
        
        // Nếu đã điểm danh, trạng thái dựa trên thời gian
        if (hasAttendance) {
            if (currentTime < start) {
                return 'pending';
            } else if (currentTime >= start && currentTime <= end) {
                return 'in_progress';
            } else {
                return 'completed';
            }
        } else {
            // Nếu chưa điểm danh
            if (currentTime < start) {
                return 'pending';
            } else if (currentTime >= start && currentTime <= end) {
                return 'in_progress_not_attended'; // Đang diễn ra nhưng chưa điểm danh
            } else {
                return 'not_completed'; // Đã kết thúc nhưng chưa điểm danh
            }
        }
    }
    
    // ✅ Kiểm tra xem có cần nhắc điểm danh không (gần hết ngày)
    $scope.shouldShowAttendanceReminder = function() {
        var now = new Date();
        var currentHour = now.getHours();
        // Hiển thị nhắc sau 18:00 (6 PM) nếu còn tiết chưa điểm danh
        return currentHour >= 18;
    };
    
    // ✅ Đếm số tiết chưa điểm danh
    $scope.getUnattendedCount = function() {
        if (!$scope.todaySchedule || $scope.todaySchedule.length === 0) {
            return 0;
        }
        var now = new Date();
        var currentTime = now.getHours() * 100 + now.getMinutes();
        
        return $scope.todaySchedule.filter(function(schedule) {
            if (schedule.hasAttendance) return false; // Đã điểm danh
            var end = parseInt(schedule.endTime.replace(':', ''));
            return currentTime > end; // Đã kết thúc nhưng chưa điểm danh
        }).length;
    };
    
    // ✅ Đóng thông báo nhắc điểm danh
    $scope.dismissReminder = function() {
        $scope.reminderDismissed = true;
    };
    
    // Load today's schedule
    function loadTodaySchedule() {
        if (!$scope.lecturerId) {
            $scope.todaySchedule = [];
            $scope.stats.todayClasses = 0;
            $scope.loading = false;
            return;
        }
        
        $scope.loading = true;
        var today = new Date();
        var iso = getIsoWeek(today);
        var currentWeekday = getCurrentWeekday(); // Database format: 1=Sunday, 2=Monday, ..., 7=Saturday
        
        TimetableApi.getLecturerWeek($scope.lecturerId, iso.year, iso.week)
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
                
                // Format data for display (ban đầu chưa có thông tin attendance)
                $scope.todaySchedule = todaySchedules.map(function(schedule) {
                    var startTime = formatTime(schedule.start_time || schedule.startTime || '');
                    var endTime = formatTime(schedule.end_time || schedule.endTime || '');
                    var period = (schedule.period_from && schedule.period_to) 
                        ? schedule.period_from + '-' + schedule.period_to 
                        : (schedule.periodFrom && schedule.periodTo)
                        ? schedule.periodFrom + '-' + schedule.periodTo
                        : '';
                    
                    return {
                        id: schedule.session_id || schedule.sessionId || '',
                        classId: schedule.class_id || schedule.classId || '',
                        period: period,
                        subjectName: schedule.subject_name || schedule.subjectName || 'N/A',
                        className: schedule.class_name || schedule.className || 'N/A',
                        room: schedule.room_code || schedule.roomCode || 'N/A',
                        startTime: startTime,
                        endTime: endTime,
                        hasAttendance: false, // Sẽ được cập nhật sau
                        status: 'pending' // Tạm thời, sẽ cập nhật sau khi kiểm tra attendance
                    };
                });
                
                // ✅ Kiểm tra attendance cho từng session (chỉ cho ngày hôm nay)
                var today = new Date();
                var todayStr = today.getFullYear() + '-' + 
                              String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(today.getDate()).padStart(2, '0');
                
                var attendanceCheckPromises = $scope.todaySchedule.map(function(schedule) {
                    return ApiService.get('/attendances/schedule/' + schedule.id, null, { cache: false })
                        .then(function(response) {
                            var attendances = (response.data && response.data.data) || [];
                            
                            // ✅ Filter attendance records của ngày hôm nay
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
                            
                            // ✅ Logic nhận diện "đã hoàn thành điểm danh":
                            // Nếu có ít nhất 1 attendance record của hôm nay → coi như đã điểm danh
                            schedule.hasAttendance = todayAttendances.length > 0;
                            schedule.status = getStatus(schedule.startTime, schedule.endTime, schedule.hasAttendance);
                            return schedule;
                        })
                        .catch(function(error) {
                            // Nếu lỗi (404 hoặc 403), coi như chưa điểm danh
                            schedule.hasAttendance = false;
                            schedule.status = getStatus(schedule.startTime, schedule.endTime, false);
                            return schedule;
                        });
                });
                
                // Đợi tất cả các promise hoàn thành
                Promise.all(attendanceCheckPromises)
                    .then(function() {
                        // Update stats sau khi đã kiểm tra attendance
                        $scope.stats.todayClasses = $scope.todaySchedule.length;
                        // ✅ Reset trạng thái đóng thông báo mỗi lần load lại (để hiện lại nếu còn tiết chưa điểm danh)
                        $scope.reminderDismissed = false;
                        $scope.$apply(); // Trigger Angular digest cycle
                    })
                    .catch(function(err) {
                        LoggerService.error('Error checking attendance', err);
                        // Vẫn cập nhật stats ngay cả khi có lỗi
                        $scope.stats.todayClasses = $scope.todaySchedule.length;
                        $scope.reminderDismissed = false;
                        $scope.$apply();
                    });
            })
            .catch(function(err) {
                LoggerService.error('Load today schedule error', err);
                $scope.todaySchedule = [];
                $scope.stats.todayClasses = 0;
            })
            .finally(function() {
                $scope.loading = false;
            });
    }
    
    // ✅ Listen for attendance saved event to refresh dashboard
    $rootScope.$on('attendanceSaved', function(event, data) {
        // Reload today's schedule to update attendance status
        if ($scope.lecturerId) {
            loadTodaySchedule();
        }
    });
    
    // Initialize
    loadLecturerId();
}]);

