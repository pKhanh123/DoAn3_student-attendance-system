// Student Dashboard Controller
app.controller('StudentDashboardController', ['$scope', 'AuthService', 'AvatarService', 'TimetableApi', 'StudentService', 'ReportService', 'LoggerService', 
    function($scope, AuthService, AvatarService, TimetableApi, StudentService, ReportService, LoggerService) {
    $scope.currentUser = AuthService.getCurrentUser();
    $scope.loading = false;
    $scope.todaySchedule = [];
    $scope.upcomingSchedule = []; // Lịch học trong 2 ngày tiếp theo
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Student info
    $scope.studentInfo = {
        fullName: '',
        studentCode: '',
        className: '',
        faculty: '',
        academicYear: '',
        gpa: 0,
        credits: 0,
        attendanceRate: 0
    };
    
    // Helper function to get ISO week
    function getIsoWeek(d) {
        var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return { year: date.getUTCFullYear(), week: weekNo };
    }
    
    // Get current weekday (Backend format: 1 = Sunday, 2 = Monday, ..., 7 = Saturday)
    function getCurrentWeekdayBackend() {
        var today = new Date();
        var day = today.getDay(); // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
        return day === 0 ? 1 : day + 1; // Convert to backend format: 1=Sunday, 2=Monday, ..., 7=Saturday
    }
    
    // Get weekday for next N days (Backend format)
    function getWeekdayForNextDays(daysFromToday) {
        var targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysFromToday);
        var day = targetDate.getDay(); // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
        return day === 0 ? 1 : day + 1; // Convert to backend format: 1=Sunday, 2=Monday, ..., 7=Saturday
    }
    
    // Get day name from weekday (Backend format)
    function getDayNameFromWeekday(weekday) {
        var names = {
            1: 'Chủ nhật',
            2: 'Thứ 2',
            3: 'Thứ 3',
            4: 'Thứ 4',
            5: 'Thứ 5',
            6: 'Thứ 6',
            7: 'Thứ 7'
        };
        return names[weekday] || 'Thứ ' + weekday;
    }
    
    // Format time from HH:mm:ss to HH:mm
    function formatTime(timeString) {
        if (!timeString) return '';
        return timeString.substring(0, 5); // Get HH:mm from HH:mm:ss
    }
    
    // Determine status based on current time
    function getStatus(startTime, endTime) {
        var now = new Date();
        var currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
        
        var start = parseInt(startTime.replace(':', ''));
        var end = parseInt(endTime.replace(':', ''));
        
        if (currentTime < start) {
            return 'pending';
        } else if (currentTime >= start && currentTime <= end) {
            return 'in_progress';
        } else {
            return 'completed';
        }
    }
    
    // Load today's schedule
    function loadTodaySchedule() {
        if (!$scope.studentId) {
            $scope.todaySchedule = [];
            $scope.upcomingSchedule = [];
            return;
        }
        
        $scope.loading = true;
        var today = new Date();
        var iso = getIsoWeek(today);
        var currentWeekday = getCurrentWeekdayBackend(); // Backend format: 1=Sunday, 2=Monday, ..., 7=Saturday
        
        // ✅ Load cả tuần hiện tại và tuần tiếp theo (nếu cần) để lấy đủ 2 ngày tiếp theo
        var promises = [];
        promises.push(TimetableApi.getStudentWeek($scope.studentId, iso.year, iso.week));
        
        // Kiểm tra xem 2 ngày tiếp theo có rơi vào tuần sau không
        var tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        var dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(today.getDate() + 2);
        
        var tomorrowIso = getIsoWeek(tomorrow);
        var dayAfterIso = getIsoWeek(dayAfterTomorrow);
        
        // Nếu tuần sau khác tuần hiện tại, load thêm
        if (tomorrowIso.week !== iso.week || tomorrowIso.year !== iso.year ||
            dayAfterIso.week !== iso.week || dayAfterIso.year !== iso.year) {
            var nextWeekIso = getIsoWeek(dayAfterTomorrow);
            promises.push(TimetableApi.getStudentWeek($scope.studentId, nextWeekIso.year, nextWeekIso.week));
        } else {
            promises.push(Promise.resolve({data: {data: []}}));
        }
        
        Promise.all(promises)
            .then(function(results) {
                var currentWeekData = (results[0].data && results[0].data.data) || [];
                var nextWeekData = (results[1].data && results[1].data.data) || [];
                var allData = currentWeekData.concat(nextWeekData);
                
                // Filter today's schedule (backend weekday format)
                var todaySchedules = allData.filter(function(schedule) {
                    return schedule.weekday === currentWeekday;
                });
                
                // Sort by start time
                todaySchedules.sort(function(a, b) {
                    var timeA = a.start_time || a.startTime || '';
                    var timeB = b.start_time || b.startTime || '';
                    return timeA.localeCompare(timeB);
                });
                
                // Format data for display
                $scope.todaySchedule = todaySchedules.map(function(schedule) {
                    var startTime = formatTime(schedule.start_time || schedule.startTime || '');
                    var endTime = formatTime(schedule.end_time || schedule.endTime || '');
                    var period = (schedule.period_from || schedule.periodFrom) && (schedule.period_to || schedule.periodTo)
                        ? (schedule.period_from || schedule.periodFrom) + '-' + (schedule.period_to || schedule.periodTo)
                        : '';
                    
                    return {
                        period: period,
                        subjectName: schedule.subject_name || schedule.subjectName || 'N/A',
                        lecturerName: schedule.lecturer_name || schedule.lecturerName || 'N/A',
                        room: schedule.room_code || schedule.roomCode || 'N/A',
                        startTime: startTime,
                        endTime: endTime,
                        status: getStatus(startTime, endTime)
                    };
                });
                
                // Load upcoming schedule (2 ngày tiếp theo)
                loadUpcomingSchedule(allData);
            })
            .catch(function(err) {
                LoggerService.error('Load today schedule error', err);
                $scope.todaySchedule = [];
                $scope.upcomingSchedule = [];
            })
            .finally(function() {
                $scope.loading = false;
            });
    }
    
    // ✅ Load lịch học trong 2 ngày tiếp theo
    function loadUpcomingSchedule(allSessions) {
        if (!allSessions || allSessions.length === 0) {
            $scope.upcomingSchedule = [];
            return;
        }
        
        var upcomingDays = [];
        
        // Lấy weekday của 2 ngày tiếp theo (Backend format)
        for (var i = 1; i <= 2; i++) {
            var weekday = getWeekdayForNextDays(i);
            var dayName = getDayNameFromWeekday(weekday);
            
            // Filter sessions cho ngày này
            var daySessions = allSessions.filter(function(schedule) {
                return schedule.weekday === weekday;
            });
            
            if (daySessions.length > 0) {
                // Sort by start time
                daySessions.sort(function(a, b) {
                    var timeA = a.start_time || a.startTime || '';
                    var timeB = b.start_time || b.startTime || '';
                    return timeA.localeCompare(timeB);
                });
                
                // Format data
                var formattedSessions = daySessions.map(function(schedule) {
                    var startTime = formatTime(schedule.start_time || schedule.startTime || '');
                    var endTime = formatTime(schedule.end_time || schedule.endTime || '');
                    var period = (schedule.period_from || schedule.periodFrom) && (schedule.period_to || schedule.periodTo)
                        ? (schedule.period_from || schedule.periodFrom) + '-' + (schedule.period_to || schedule.periodTo)
                        : '';
                    
                    return {
                        period: period,
                        subjectName: schedule.subject_name || schedule.subjectName || 'N/A',
                        lecturerName: schedule.lecturer_name || schedule.lecturerName || 'N/A',
                        room: schedule.room_code || schedule.roomCode || 'N/A',
                        startTime: startTime,
                        endTime: endTime,
                        dayName: dayName,
                        weekday: weekday
                    };
                });
                
                upcomingDays.push({
                    dayName: dayName,
                    weekday: weekday,
                    sessions: formattedSessions
                });
            }
        }
        
        $scope.upcomingSchedule = upcomingDays;
    }
    
    // Load student ID and info
    function loadStudentInfo() {
        if (!$scope.currentUser || !$scope.currentUser.userId) {
            $scope.loading = false;
            return;
        }
        
        // Load basic student info
        StudentService.getByUserId($scope.currentUser.userId)
            .then(function(response) {
                if (response.data && response.data.data) {
                    var student = response.data.data;
                    $scope.studentId = student.studentId;
                    
                    // Update basic student info
                    $scope.studentInfo.fullName = student.fullName || '';
                    $scope.studentInfo.studentCode = student.studentCode || '';
                    $scope.studentInfo.className = student.className || '';
                    $scope.studentInfo.faculty = student.facultyName || '';
                    $scope.studentInfo.academicYear = student.academicYearName || '';
                    
                    // Load actual academic data from reports API (GPA, credits, attendance)
                    loadAcademicStats();
                    
                    // Load today's schedule
                    loadTodaySchedule();
                } else {
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                LoggerService.error('Load student info error', error);
                $scope.loading = false;
            });
    }
    
    // Load academic statistics (GPA, credits, attendance) from reports API
    function loadAcademicStats() {
        // Call reports API without filters to get all-time data
        ReportService.getStudentReports({})
            .then(function(res) {
                var data = (res.data && res.data.data) || res.data || {};
                var overview = data.overview || data.Overview || {};
                
                // Update academic stats with real data
                $scope.studentInfo.gpa = overview.cumulativeGpa || overview.CumulativeGpa || 0;
                $scope.studentInfo.credits = overview.creditsEarned || overview.CreditsEarned || 0;
                $scope.studentInfo.attendanceRate = overview.attendanceRate || overview.AttendanceRate || 0;
            })
            .catch(function(err) {
                LoggerService.error('Load academic stats error', err);
                // Keep default values (0) if error
            });
    }
    
    // Initialize
    loadStudentInfo();
}]);

