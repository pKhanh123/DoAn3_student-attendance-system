app.controller('StudentTimetableController', ['$scope', '$rootScope', '$location', 'TimetableApi', 'AuthService', 'StudentService', 'LoggerService', 'ExamScheduleService', function($scope, $rootScope, $location, TimetableApi, AuthService, StudentService, LoggerService, ExamScheduleService) {
  function getIsoWeek(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    var weekNo = Math.ceil((((date - yearStart) / 86400000) + 1)/7);
    return { year: date.getUTCFullYear(), week: weekNo };
  }

  $scope.today = new Date();
  var iso = getIsoWeek($scope.today);
  $scope.year = iso.year;
  $scope.week = iso.week;
  $scope.days = [1,2,3,4,5,6,7];
  $scope.slots = [];
  $scope.loading = false;
  $scope.error = null;
  $scope.currentUser = AuthService.getCurrentUser() || {};
  $scope.studentId = null;
  
  // Load student ID from user
  function loadStudentId() {
    if (!$scope.currentUser || !$scope.currentUser.userId) {
      $scope.error = 'Không tìm thấy thông tin người dùng';
      $scope.loading = false;
      return;
    }
    
    StudentService.getByUserId($scope.currentUser.userId)
      .then(function(response) {
        if (response.data && response.data.data) {
          $scope.studentId = response.data.data.studentId;
          // Get params from query string
          var qs = $location.search() || {};
          var qWeek = parseInt(qs.week);
          var qYear = parseInt(qs.year);
          if (!isNaN(qWeek) && qWeek >= 1 && qWeek <= 53) { $scope.week = qWeek; }
          if (!isNaN(qYear) && qYear > 2000 && qYear < 3000) { $scope.year = qYear; }
          $scope.load();
        } else {
          $scope.error = 'Không tìm thấy thông tin sinh viên';
          $scope.loading = false;
        }
      })
      .catch(function(error) {
        $scope.error = 'Không thể tải thông tin sinh viên';
        $scope.loading = false;
      });
  }

  $scope.load = function() {
    if(!$scope.studentId){
      $scope.error = 'Vui lòng nhập Student ID để xem thời khóa biểu';
      return;
    }
    $scope.error = null;
    $scope.loading = true;
    
    // ✅ Load cả sessions và exams
    var promises = [];
    
    // 1. Load sessions (existing)
    promises.push(TimetableApi.getStudentWeek($scope.studentId, $scope.year, $scope.week));
    
    // 2. Load exams của student trong tuần (để tích hợp vào timetable)
    if (ExamScheduleService) {
      promises.push(ExamScheduleService.getByStudent($scope.studentId, null, null).catch(function(err) {
        LoggerService.error('Load exams error', err);
        return {data: {data: []}}; // Return empty array on error
      }));
    } else {
      promises.push(Promise.resolve({data: {data: []}}));
    }
    
    Promise.all(promises).then(function(results) {
      var sessions = (results[0].data && results[0].data.data) || [];
      var allExams = (results[1].data && results[1].data.data) || [];
      
      // 3. Filter exams theo tuần hiện tại
      var exams = allExams.filter(function(exam) {
        if (!exam.examDate) return false;
        var examDate = new Date(exam.examDate);
        var isoWeek = getIsoWeek(examDate);
        return isoWeek.year === $scope.year && isoWeek.week === $scope.week;
      });
      
      // 4. Mark type cho sessions
      sessions = sessions.map(function(s) {
        s.type = 'session';
        s.sessionId = s.sessionId || s.session_id;
        s.classCode = s.classCode || s.class_code;
        s.subjectName = s.subjectName || s.subject_name;
        s.lecturerName = s.lecturerName || s.lecturer_name;
        s.roomCode = s.roomCode || s.room_code;
        s.startTime = s.startTime || s.start_time;
        s.endTime = s.endTime || s.end_time;
        return s;
      });
      
      // 5. Process exams: Convert format và mark type
      exams = exams.map(function(exam) {
        var examDate = new Date(exam.examDate);
        var weekday = examDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        weekday = weekday === 0 ? 7 : weekday; // Convert Sunday to 7
        
        var item = {
          type: 'exam',
          sessionId: exam.examId,  // Dùng examId làm sessionId để tương thích
          examId: exam.examId,
          weekday: weekday,
          startTime: $scope.formatTime(exam.examTime || exam.startTime),
          endTime: $scope.formatTime(exam.endTime),
          classCode: exam.classCode || '',
          className: exam.className || '',
          subjectName: exam.subjectName || '',
          subjectCode: exam.subjectCode || '',
          lecturerName: exam.proctorName || exam.lecturerName || '—',
          roomCode: exam.roomCode || '—',
          roomId: exam.roomId,
          building: exam.building,
          status: exam.status,
          examType: exam.examType,
          sessionNo: exam.sessionNo,
          examDate: exam.examDate,
          duration: exam.duration,
          maxStudents: exam.maxStudents,
          assignedStudents: exam.assignedStudents,
          notes: exam.notes
        };
        return item;
      });
      
      // 6. Merge sessions và exams
      var allItems = sessions.concat(exams);
      
      // 7. Filter out sessions trùng ngày với exams (business rule: không có lịch học vào ngày thi)
      if (exams.length > 0) {
        var examDates = exams.map(function(exam) {
          return exam.examDate ? exam.examDate.substring(0, 10) : null; // Extract YYYY-MM-DD
        }).filter(function(date) { return date != null; });
        
        // Sessions không có examDate, nên cần tính từ weekday và week
        // Tạm thời giữ lại tất cả, có thể filter sau nếu cần
      }
      
      // 8. Sort theo weekday + startTime
      allItems.sort(function(a, b) {
        if (a.weekday !== b.weekday) {
          return (a.weekday || 0) - (b.weekday || 0);
        }
        var timeA = (a.startTime || '').toString();
        var timeB = (b.startTime || '').toString();
        return timeA.localeCompare(timeB);
      });
      
      $scope.raw = allItems;
      $scope.debug = { studentId: $scope.studentId, year: $scope.year, week: $scope.week, sessions: sessions.length, exams: exams.length, total: allItems.length };
      
      // 9. Map theo weekday để hiển thị grid
      // ✅ Convert weekday từ backend format (1=Sunday, 2=Monday, ..., 7=Saturday) 
      // sang frontend format (1=Monday, 2=Tuesday, ..., 7=Sunday)
      function convertWeekdayBackendToFrontend(backendWeekday) {
        if (!backendWeekday || backendWeekday < 1 || backendWeekday > 7) return null;
        // Backend: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
        // Frontend: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
        if (backendWeekday === 1) return 7; // Sunday: Backend 1 → Frontend 7
        return backendWeekday - 1; // Monday-Saturday: Backend 2-7 → Frontend 1-6
      }
      
      var map = {};
      $scope.days.forEach(function(d){ map[d] = []; });
      allItems.forEach(function(s){
        if(s.weekday >= 1 && s.weekday <= 7){
          var frontendWeekday = convertWeekdayBackendToFrontend(s.weekday);
          if (frontendWeekday && frontendWeekday >= 1 && frontendWeekday <= 7) {
            map[frontendWeekday].push(s);
          }
        }
      });
      $scope.grid = map;
      
      if(allItems.length === 0){
        $scope.error = 'Không có dữ liệu thời khóa biểu cho tuần này';
      }
    }).catch(function(err){
      var message = (err && err.data && err.data.message) || err.statusText || 'Không thể tải thời khóa biểu';
      $scope.error = 'Lỗi: ' + message;
      LoggerService.error('Student timetable load error', err);
    }).finally(function(){ $scope.loading = false; });
  };

  // ============================================================
  // 🔹 HELPER: Format time (HH:mm:ss → HH:mm)
  // ============================================================
  $scope.formatTime = function(timeStr) {
    if (!timeStr) return '—';
    var str = String(timeStr);
    if (str.length >= 5) {
      return str.substring(0, 5); // "HH:mm"
    }
    return str;
  };

  // ============================================================
  // 🔹 HELPER: Tính ngày cho mỗi thứ trong tuần (ISO week)
  // ============================================================
  function getDateForWeekday(year, week, weekday) {
    // weekday: 1=Monday, 2=Tuesday, ..., 7=Sunday
    // ISO week: Thứ 2 (1) là ngày đầu tuần
    // Get January 4th of the year (always in week 1 of ISO week)
    var jan4 = new Date(year, 0, 4);
    var jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
    
    // Calculate the Monday of week 1
    // jan4Day: 1=Monday, 2=Tuesday, ..., 7=Sunday
    // Nếu jan4Day = 1 (Monday), thì mondayOfWeek1 = jan4
    // Nếu jan4Day = 2 (Tuesday), thì mondayOfWeek1 = jan4 - 1
    // Nếu jan4Day = 7 (Sunday), thì mondayOfWeek1 = jan4 - 6
    var mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (jan4Day - 1));
    
    // Calculate the date for the given week and weekday
    // weekday: 1=Monday, 2=Tuesday, ..., 7=Sunday
    var targetDate = new Date(mondayOfWeek1);
    targetDate.setDate(mondayOfWeek1.getDate() + (week - 1) * 7 + (weekday - 1));
    
    return targetDate;
  }

  // Format ngày (dd/MM)
  $scope.formatDate = function(date) {
    if (!date) return '';
    var day = ('0' + date.getDate()).slice(-2);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    return day + '/' + month;
  };

  // Lấy ngày cho thứ cụ thể
  $scope.getDateForDay = function(dayOfWeek) {
    // dayOfWeek: 1=Monday, 2=Tuesday, ..., 7=Sunday
    try {
      var date = getDateForWeekday($scope.year, $scope.week, dayOfWeek);
      return $scope.formatDate(date);
    } catch (e) {
      LoggerService.error('Error calculating date for day ' + dayOfWeek, e);
      return '';
    }
  };

  // Lấy khoảng ngày của tuần (từ thứ 2 đến chủ nhật)
  $scope.getWeekDateRange = function() {
    try {
      var monday = getDateForWeekday($scope.year, $scope.week, 1);
      var sunday = getDateForWeekday($scope.year, $scope.week, 7);
      return $scope.formatDate(monday) + ' - ' + $scope.formatDate(sunday);
    } catch (e) {
      LoggerService.error('Error calculating week date range', e);
      return '';
    }
  };
  
  // ✅ Helper: Lấy tên thứ từ weekday (ISO format: 1=Monday, 2=Tuesday, ..., 7=Sunday)
  $scope.getDayName = function(dayOfWeek) {
    var names = {
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
      7: 'Chủ nhật'
    };
    return names[dayOfWeek] || 'Thứ ' + dayOfWeek;
  };

  $scope.prevWeek = function(){
    var d = new Date($scope.today);
    d.setDate(d.getDate() - 7);
    $scope.today = d;
    var i = getIsoWeek(d);
    $scope.year = i.year; $scope.week = i.week; $scope.load();
  };
  $scope.nextWeek = function(){
    var d = new Date($scope.today);
    d.setDate(d.getDate() + 7);
    $scope.today = d;
    var i = getIsoWeek(d);
    $scope.year = i.year; $scope.week = i.week; $scope.load();
  };
  
  $scope.goToToday = function(){
    $scope.today = new Date();
    var i = getIsoWeek($scope.today);
    $scope.year = i.year;
    $scope.week = i.week;
    $scope.load();
  };

  // Initialize
  loadStudentId();
}]);


