// Student Schedule Controller
app.controller('StudentScheduleController', ['$scope', 'AuthService', 'TimetableApi', 'StudentService', function($scope, AuthService, TimetableApi, StudentService) {
    $scope.currentUser = AuthService.getCurrentUser();
    $scope.loading = false;
    $scope.studentId = null;
    $scope.currentWeekRange = '';
    
    // Period definitions
    $scope.periods = [
        { name: 'Tiết 1-2', value: '1-2', time: '07:00 - 08:50' },
        { name: 'Tiết 3-4', value: '3-4', time: '09:00 - 10:50' },
        { name: 'Tiết 5-6', value: '5-6', time: '11:00 - 12:50' },
        { name: 'Tiết 6-7', value: '6-7', time: '13:00 - 14:50' },
        { name: 'Tiết 8-9', value: '8-9', time: '15:00 - 16:50' },
        { name: 'Tiết 10-11', value: '10-11', time: '17:00 - 18:50' }
    ];
    
    $scope.weeklySchedule = [];
    $scope.scheduleList = [];
    
    // Load student ID
    function loadStudentId() {
        if (!$scope.currentUser || !$scope.currentUser.userId) {
            $scope.loading = false;
            return;
        }
        
        StudentService.getByUserId($scope.currentUser.userId)
            .then(function(response) {
                if (response.data && response.data.data) {
                    $scope.studentId = response.data.data.studentId;
                    loadSchedule();
                } else {
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                $scope.loading = false;
            });
    }
    
    var currentWeekDate = new Date();
    
    // Load schedule
    function loadSchedule() {
        if (!$scope.studentId) {
            $scope.loading = false;
            return;
        }
        
        var today = new Date();
        var iso = getIsoWeek(today);
        currentWeekDate = today;
        loadScheduleForWeek(iso.year, iso.week);
    }
    
    function getIsoWeek(d) {
        var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
        var weekNo = Math.ceil((((date - yearStart) / 86400000) + 1)/7);
        return { year: date.getUTCFullYear(), week: weekNo };
    }
    
    function getDateForWeekday(year, week, weekday) {
        // ISO week calculation: Monday (1) is first day of week
        // Get January 4th of the year (always in week 1 of ISO week)
        var jan4 = new Date(year, 0, 4);
        var jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
        
        // Calculate the Monday of week 1
        var mondayOfWeek1 = new Date(jan4);
        mondayOfWeek1.setDate(jan4.getDate() - (jan4Day - 1));
        
        // Calculate the date for the given week and weekday
        var targetDate = new Date(mondayOfWeek1);
        targetDate.setDate(mondayOfWeek1.getDate() + (week - 1) * 7 + (weekday - 1));
        
        return targetDate;
    }
    
    function formatDate(date) {
        if (!date) return '';
        var day = ('0' + date.getDate()).slice(-2);
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        var year = date.getFullYear();
        return day + '/' + month + '/' + year;
    }
    
    $scope.getSchedule = function(day, period) {
        return $scope.weeklySchedule.find(function(item) {
            return item.weekday === day && item.period === period;
        });
    };
    
    $scope.getDayName = function(dayOfWeek) {
        var days = ['', 'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        return days[dayOfWeek] || '';
    };
    
    $scope.previousWeek = function() {
        currentWeekDate.setDate(currentWeekDate.getDate() - 7);
        var iso = getIsoWeek(currentWeekDate);
        loadScheduleForWeek(iso.year, iso.week);
    };
    
    $scope.nextWeek = function() {
        currentWeekDate.setDate(currentWeekDate.getDate() + 7);
        var iso = getIsoWeek(currentWeekDate);
        loadScheduleForWeek(iso.year, iso.week);
    };
    
    $scope.loadSchedule = function() {
        currentWeekDate = new Date();
        var iso = getIsoWeek(currentWeekDate);
        loadScheduleForWeek(iso.year, iso.week);
    };
    
    function loadScheduleForWeek(year, week) {
        if (!$scope.studentId) {
            return;
        }
        
        $scope.loading = true;
        TimetableApi.getStudentWeek($scope.studentId, year, week)
            .then(function(res) {
                var data = (res.data && res.data.data) || [];
                
                // Build weekly schedule
                $scope.weeklySchedule = data;
                
                // Build schedule list with dates
                $scope.scheduleList = data.map(function(s) {
                    var date = getDateForWeekday(year, week, s.weekday);
                    return {
                        dayOfWeek: s.weekday,
                        date: formatDate(date),
                        period: s.period || 'N/A',
                        startTime: s.startTime || 'N/A',
                        endTime: s.endTime || 'N/A',
                        subjectName: s.subjectName || 'N/A',
                        lecturerName: s.lecturerName || 'N/A',
                        room: s.roomCode || 'N/A'
                    };
                });
                
                // Set week range
                var weekStart = getDateForWeekday(year, week, 1);
                var weekEnd = getDateForWeekday(year, week, 7);
                $scope.currentWeekRange = formatDate(weekStart) + ' - ' + formatDate(weekEnd);
                
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.loading = false;
            });
    }
    
    // Initialize
    loadStudentId();
}]);

