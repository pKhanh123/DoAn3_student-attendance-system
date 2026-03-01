app.controller('LecturerTimetableController', ['$scope', '$rootScope', '$location', '$timeout', 'TimetableApi', 'AuthService', 'LecturerService', 'ClassService', 'SubjectService', 'ToastService', 'LoggerService', function($scope, $rootScope, $location, $timeout, TimetableApi, AuthService, LecturerService, ClassService, SubjectService, ToastService, LoggerService) {
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
  $scope.days = [2,3,4,5,6,7,8]; // Thứ 2 đến Chủ nhật (2=Monday, 8=Sunday)
  $scope.periods = [1,2,3,4,5,6,7,8,9,10,11,12]; // Tiết 1 đến Tiết 12
  $scope.loading = false;
  $scope.error = null;
  $scope.currentUser = AuthService.getCurrentUser() || {};
  
  // Form data
  $scope.form = {
    sessionId: null,
    classId: '',
    subjectId: '',
    lecturerId: '',
    roomId: '',
    schoolYearId: 'SY2024',
    weekNo: iso.week,
    weekday: 2,
    startTime: '07:00',
    endTime: '09:00',
    periodFrom: 1,
    periodTo: 3,
    recurrence: 'once',
    status: 'active',
    notes: ''
  };
  $scope.editMode = false;
  $scope.showForm = false;
  $scope.checkingConflicts = false;
  $scope.conflictResult = null;
  
  // Dropdown data
  $scope.classes = [];
  $scope.subjects = [];
  $scope.rooms = [];
  
  // Helper: Convert time string "HH:mm:ss" to "HH:mm"
  function timeToInput(timeStr) {
    if (!timeStr) return null;
    var str = String(timeStr);
    if (str.length >= 5) {
      return str.substring(0, 5); // "07:00:00" -> "07:00"
    }
    return str;
  }
  
  // Helper: Convert "HH:mm" to "HH:mm:ss" for API
  function timeToApi(timeStr) {
    if (!timeStr) return null;
    var str = String(timeStr);
    if (str.length === 5) return str + ':00'; // "07:00" -> "07:00:00"
    if (str.length === 8) return str; // Already "HH:mm:ss"
    return null;
  }
  
  // Helper: Calculate time from period
  $scope.calculateTimeFromPeriod = function(periodFrom, periodTo) {
    if (!periodFrom || !periodTo) return null;
    
    var periodTimes = {
      1: { start: '07:00', end: '07:50' },
      2: { start: '07:55', end: '08:45' },
      3: { start: '09:00', end: '09:50' },
      4: { start: '09:55', end: '10:45' },
      5: { start: '10:50', end: '11:40' },
      6: { start: '11:45', end: '12:35' },
      7: { start: '12:40', end: '13:30' },
      8: { start: '13:35', end: '14:25' },
      9: { start: '14:30', end: '15:20' },
      10: { start: '15:25', end: '16:15' },
      11: { start: '16:20', end: '17:10' },
      12: { start: '17:15', end: '18:05' }
    };
    
    if (periodTimes[periodFrom] && periodTimes[periodTo]) {
      return {
        startTime: periodTimes[periodFrom].start,
        endTime: periodTimes[periodTo].end
      };
    }
    return null;
  };
  
  // Watch period changes để tự động cập nhật thời gian
  var isUpdatingTimeFromPeriod = false;
  $scope.$watch('form.periodFrom', function(newVal, oldVal) {
    if (newVal === oldVal || isUpdatingTimeFromPeriod) return;
    
    if (newVal && $scope.form.periodTo) {
      var times = $scope.calculateTimeFromPeriod(newVal, $scope.form.periodTo);
      if (times && times.startTime && times.endTime) {
        isUpdatingTimeFromPeriod = true;
        $timeout(function() {
          $scope.form.startTime = times.startTime;
          $scope.form.endTime = times.endTime;
          isUpdatingTimeFromPeriod = false;
        }, 0);
      }
    }
  });
  
  $scope.$watch('form.periodTo', function(newVal, oldVal) {
    if (newVal === oldVal || isUpdatingTimeFromPeriod) return;
    
    if ($scope.form.periodFrom && newVal) {
      var times = $scope.calculateTimeFromPeriod($scope.form.periodFrom, newVal);
      if (times && times.startTime && times.endTime) {
        isUpdatingTimeFromPeriod = true;
        $timeout(function() {
          $scope.form.startTime = times.startTime;
          $scope.form.endTime = times.endTime;
          isUpdatingTimeFromPeriod = false;
        }, 0);
      }
    }
  });
  
  // Helper để lấy tên thứ
  $scope.getDayName = function(day) {
    var names = {2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN'};
    return names[day] || 'Thứ ' + day;
  };
  
  // ✅ Helper: Tính ngày cho mỗi thứ trong tuần (ISO week)
  function getDateForWeekday(year, week, weekday) {
    // ISO week: Thứ 2 (2) là ngày đầu tuần
    // Get January 4th of the year (always in week 1 of ISO week)
    var jan4 = new Date(year, 0, 4);
    var jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
    
    // Calculate the Monday of week 1
    var mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (jan4Day - 1));
    
    // Calculate the date for the given week and weekday
    // weekday: 2=Monday, 3=Tuesday, ..., 8=Sunday
    var targetDate = new Date(mondayOfWeek1);
    targetDate.setDate(mondayOfWeek1.getDate() + (week - 1) * 7 + (weekday - 2));
    
    return targetDate;
  }
  
  // ✅ Helper: Format ngày (dd/MM)
  $scope.formatDate = function(date) {
    if (!date) return '';
    var day = ('0' + date.getDate()).slice(-2);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    return day + '/' + month;
  };
  
  // ✅ Helper: Lấy ngày cho mỗi thứ
  $scope.getDayDate = function(day) {
    return getDateForWeekday($scope.year, $scope.week, day);
  };
  
  // ✅ Helper: Tính ngày của session từ weekNo và weekday
  function getSessionDate(session) {
    if (!session) return null;
    
    // Lấy weekNo từ session (có thể là weekNo hoặc week_no)
    var weekNo = session.weekNo || session.week_no;
    if (!weekNo) return null; // Nếu không có weekNo, không thể tính ngày
    
    // Lấy weekday từ session (backend format: 1=Sunday, 2=Monday, ..., 7=Saturday)
    var weekday = session.weekday;
    if (!weekday) return null;
    
    // Convert weekday từ backend format (1-7) sang format của getDateForWeekday (2=Monday, 8=Sunday)
    // Backend: 1=Sunday, 2=Monday, ..., 7=Saturday
    // getDateForWeekday: 2=Monday, 3=Tuesday, ..., 8=Sunday
    var dayForCalc;
    if (weekday === 1) dayForCalc = 8; // Sunday: Backend 1 → Frontend 8
    else if (weekday >= 2 && weekday <= 7) dayForCalc = weekday; // Monday-Saturday: giữ nguyên
    
    // Tính năm từ weekNo (cần year của session hoặc year hiện tại)
    var year = session.year || $scope.year;
    
    try {
      return getDateForWeekday(year, weekNo, dayForCalc);
    } catch (e) {
      LoggerService.error('Error calculating session date', e);
      return null;
    }
  }
  
  // ✅ NGHIỆP VỤ: Kiểm tra xem session có được phép sửa/xóa không
  // Quy tắc: Không được sửa lịch của quá khứ, hôm nay, và 2 ngày tiếp theo
  $scope.canEditSession = function(session) {
    if (!session) return false;
    
    var sessionDate = getSessionDate(session);
    if (!sessionDate) return false; // Nếu không tính được ngày, không cho sửa
    
    // Lấy ngày hiện tại (chỉ lấy ngày, bỏ giờ)
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ngày giới hạn = hôm nay + 2 ngày
    var limitDate = new Date(today);
    limitDate.setDate(today.getDate() + 2);
    
    // Chuẩn hóa sessionDate (chỉ lấy ngày, bỏ giờ)
    var sessionDateOnly = new Date(sessionDate);
    sessionDateOnly.setHours(0, 0, 0, 0);
    
    // Chỉ cho phép sửa nếu sessionDate > limitDate (tức là sau 2 ngày nữa)
    return sessionDateOnly > limitDate;
  };
  
  // ✅ Helper: Lấy thời gian cho mỗi tiết (theo PeriodCalculator)
  $scope.getPeriodTime = function(period) {
    var periodTimes = {
      1: '07:00-07:50',
      2: '07:55-08:45',
      3: '09:00-09:50',
      4: '09:55-10:45',
      5: '10:50-11:40',
      6: '11:45-12:35',
      7: '12:40-13:30',
      8: '13:35-14:25',
      9: '14:30-15:20',
      10: '15:25-16:15',
      11: '16:20-17:10',
      12: '17:15-18:05'
    };
    return periodTimes[period] || '';
  };
  
  // Kiểm tra role của user
  var userRole = $scope.currentUser.roleName || $scope.currentUser.Role || $scope.currentUser.role || '';
  $scope.isLecturer = userRole === 'Lecturer' || userRole === 'Giảng viên';
  $scope.isAdmin = userRole === 'Admin' || userRole === 'Quản trị viên';

  // Lấy params từ hashbang: #!/lecturer/timetable?lecturerId=LEC001&week=12&year=2025
  var qs = $location.search() || {};
  var qWeek = parseInt(qs.week);
  var qYear = parseInt(qs.year);
  if (!isNaN(qWeek) && qWeek >= 1 && qWeek <= 53) { $scope.week = qWeek; }
  if (!isNaN(qYear) && qYear > 2000 && qYear < 3000) { $scope.year = qYear; }

  // Khởi tạo lecturerId
  $scope.lecturerId = '';
  $scope.loadingLecturer = false;

  // Hàm lấy lecturerId từ userId
  function loadLecturerId() {
    if ($scope.isLecturer && $scope.currentUser.userId) {
      $scope.loadingLecturer = true;
      LecturerService.getByUserId($scope.currentUser.userId)
        .then(function(response) {
          var lecturer = response.data && response.data.data ? response.data.data : response.data;
          if (lecturer && lecturer.lecturerId) {
            $scope.lecturerId = lecturer.lecturerId;
            $scope.load();
          } else {
            $scope.error = 'Không tìm thấy thông tin giảng viên cho tài khoản này.';
          }
        })
        .catch(function(err) {
          $scope.error = 'Không thể tải thông tin giảng viên: ' + (err.data?.message || err.message || 'Lỗi không xác định');
          LoggerService.error('Get lecturer by userId error', err);
        })
        .finally(function() {
          $scope.loadingLecturer = false;
        });
    } else if ($scope.isAdmin) {
      // Admin có thể nhập lecturerId thủ công hoặc từ query string
      $scope.lecturerId = qs.lecturerId || localStorage.getItem('test_lecturerId') || '';
      if ($scope.lecturerId) {
        $scope.load();
      }
    } else {
      $scope.error = 'Bạn không có quyền xem thời khóa biểu giảng viên.';
    }
  }

  $scope.load = function() {
    if(!$scope.lecturerId){
      if ($scope.isLecturer) {
        $scope.error = 'Đang tải thông tin giảng viên...';
      } else {
        $scope.error = 'Vui lòng nhập Lecturer ID để xem thời khóa biểu';
      }
      return;
    }
    $scope.error = null;
    $scope.loading = true;
    TimetableApi.getLecturerWeek($scope.lecturerId, $scope.year, $scope.week).then(function(res){
      var data = (res.data && res.data.data) || [];
      $scope.debug = { lecturerId: $scope.lecturerId, year: $scope.year, week: $scope.week, count: data.length };
      
      // ✅ Tạo grid 2D: grid[weekday][period] = session
      var grid = {};
      $scope.days.forEach(function(day){
        grid[day] = {};
        $scope.periods.forEach(function(period){
          grid[day][period] = null; // Khởi tạo rỗng
        });
      });
      
      // Map sessions vào grid theo weekday và period
      data.forEach(function(s){
        // ✅ Lưu year và weekNo vào session để dùng cho canEditSession
        s.year = $scope.year;
        
        var weekday = s.weekday;
        // Chuyển đổi weekday: 1=CN -> 8, 2=T2 -> 2, ..., 7=T7 -> 7
        if(weekday === 1) weekday = 8; // Chủ nhật
        else if(weekday >= 2 && weekday <= 7) weekday = weekday; // Thứ 2-7 giữ nguyên
        else return; // Bỏ qua nếu không hợp lệ
        
        if(!grid[weekday]) return;
        
        // Lấy period từ periodFrom và periodTo
        var periodFrom = s.periodFrom || s.period_from;
        var periodTo = s.periodTo || s.period_to;
        
        if(periodFrom && periodTo) {
          // Nếu có period, đặt session vào các tiết tương ứng
          for(var p = periodFrom; p <= periodTo; p++) {
            if(grid[weekday][p] === null) {
              grid[weekday][p] = s; // Chỉ đặt vào tiết đầu, các tiết sau sẽ merge
            } else if(Array.isArray(grid[weekday][p])) {
              grid[weekday][p].push(s);
            } else {
              // Nếu đã có session, chuyển thành array
              grid[weekday][p] = [grid[weekday][p], s];
            }
          }
        } else {
          // Nếu không có period, tính từ startTime
          var startTime = s.startTime || s.start_time;
          if(startTime) {
            var timeStr = startTime.toString();
            var hour = parseInt(timeStr.split(':')[0]);
            var period = Math.floor((hour - 7) / 1.5) + 1; // Ước tính: 7:00 = Tiết 1, 8:30 = Tiết 2, ...
            if(period >= 1 && period <= 12) {
              if(grid[weekday][period] === null) {
                grid[weekday][period] = s;
              } else if(Array.isArray(grid[weekday][period])) {
                grid[weekday][period].push(s);
              } else {
                grid[weekday][period] = [grid[weekday][period], s];
              }
            }
          }
        }
      });
      
      $scope.grid = grid;
      $scope.raw = data;
      if(data.length === 0){ $scope.error = 'Không có dữ liệu thời khóa biểu cho tuần này'; }
    }).catch(function(err){
      $scope.error = 'Lỗi: ' + ((err.data && err.data.message) || err.statusText || 'Không thể tải thời khóa biểu');
      LoggerService.error('Lecturer timetable load error', err);
    }).finally(function(){ $scope.loading = false; });
  };

  $scope.setLecturerId = function(id){
    $scope.lecturerId = id;
    localStorage.setItem('test_lecturerId', id);
    $scope.load();
  };

  $scope.prevWeek = function(){
    var d = new Date($scope.today); d.setDate(d.getDate() - 7);
    $scope.today = d; var i = getIsoWeek(d); $scope.year = i.year; $scope.week = i.week; $scope.load();
  };
  $scope.nextWeek = function(){
    var d = new Date($scope.today); d.setDate(d.getDate() + 7);
    $scope.today = d; var i = getIsoWeek(d); $scope.year = i.year; $scope.week = i.week; $scope.load();
  };

  // Load dropdowns - chỉ load classes của giảng viên
  $scope.loadDropdowns = function() {
    if (!$scope.lecturerId) {
      LoggerService.warn('LecturerId not available, skipping loadDropdowns');
      return;
    }
    
    // Load classes của giảng viên
    ClassService.getByLecturer($scope.lecturerId).then(function(res) {
      $scope.classes = (res.data && res.data.data) || res.data || [];
      LoggerService.debug('Loaded classes for lecturer', { count: $scope.classes.length });
    }).catch(function(err) {
      LoggerService.error('Load classes error', err);
      $scope.classes = [];
    });
    
    // Load subjects
    SubjectService.getAll().then(function(res) {
      $scope.subjects = (res.data && res.data.data) || res.data || [];
    }).catch(function(err) {
      LoggerService.error('Load subjects error', err);
      $scope.subjects = [];
    });
    
    // Load rooms
    TimetableApi.getRooms(null, true).then(function(res) {
      $scope.rooms = (res.data && res.data.data) || res.data || [];
    }).catch(function(err) {
      LoggerService.error('Load rooms error', err);
      $scope.rooms = [];
    });
  };
  
  // ✅ Helper: Convert weekday từ frontend format (2-8) sang backend format (1-7)
  // Frontend: 2=Monday, 3=Tuesday, ..., 7=Saturday, 8=Sunday
  // Backend: 1=Sunday, 2=Monday, ..., 7=Saturday
  function convertWeekdayToBackend(frontendWeekday) {
    if (!frontendWeekday) return 2; // Default Monday
    var wd = parseInt(frontendWeekday);
    if (wd === 8) return 1; // Sunday: Frontend 8 → Backend 1
    if (wd >= 2 && wd <= 7) return wd; // Monday-Saturday: giữ nguyên
    return 2; // Default fallback
  }
  
  // ✅ Helper: Convert weekday từ backend format (1-7) sang frontend format (2-8)
  // Backend: 1=Sunday, 2=Monday, ..., 7=Saturday
  // Frontend: 2=Monday, 3=Tuesday, ..., 7=Saturday, 8=Sunday
  function convertWeekdayToFrontend(backendWeekday) {
    if (!backendWeekday) return 2; // Default Monday
    var wd = parseInt(backendWeekday);
    if (wd === 1) return 8; // Sunday: Backend 1 → Frontend 8
    if (wd >= 2 && wd <= 7) return wd; // Monday-Saturday: giữ nguyên
    return 2; // Default fallback
  }
  
  // Check conflicts
  $scope.checkConflicts = function() {
    if (!$scope.form.classId || !$scope.form.subjectId || !$scope.form.weekday || !$scope.form.startTime || !$scope.form.endTime) {
      ToastService.warning('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    var startTimeStr = timeToApi($scope.form.startTime);
    var endTimeStr = timeToApi($scope.form.endTime);
    if (!startTimeStr || !endTimeStr) {
      ToastService.warning('Định dạng giờ không hợp lệ (cần HH:mm)');
      return;
    }
    
    $scope.checkingConflicts = true;
    $scope.conflictResult = null;
    
    var input = {
      sessionId: $scope.editMode ? $scope.form.sessionId : null,
      classId: $scope.form.classId || '',
      subjectId: $scope.form.subjectId || '',
      lecturerId: $scope.lecturerId, // Tự động set từ lecturerId của giảng viên
      roomId: $scope.form.roomId || null,
      schoolYearId: $scope.form.schoolYearId || null,
      weekNo: parseInt($scope.form.weekNo) || null,
      weekday: convertWeekdayToBackend($scope.form.weekday), // ✅ Convert sang backend format
      startTime: startTimeStr,
      endTime: endTimeStr,
      periodFrom: $scope.form.periodFrom ? parseInt($scope.form.periodFrom) : null,
      periodTo: $scope.form.periodTo ? parseInt($scope.form.periodTo) : null
    };
    
    TimetableApi.checkConflicts(input).then(function(res) {
      $scope.conflictResult = res.data.data || res.data;
      $scope.checkingConflicts = false;
      
      if ($scope.conflictResult.lecturerConflicts.length === 0 && 
          $scope.conflictResult.roomConflicts.length === 0 && 
          !$scope.conflictResult.isOverCapacity) {
        ToastService.success('Không có xung đột, có thể tạo lịch');
      } else {
        ToastService.warning('Phát hiện xung đột, xem chi tiết bên dưới');
      }
    }).catch(function(err) {
      $scope.checkingConflicts = false;
      var errorMsg = 'Lỗi kiểm tra xung đột';
      if (err.data && err.data.message) errorMsg += ': ' + err.data.message;
      ToastService.error(errorMsg);
      LoggerService.error('Check conflicts error', err);
    });
  };
  
  // Create session
  $scope.createSession = function() {
    if (!$scope.conflictResult || $scope.conflictResult.lecturerConflicts.length > 0 || 
        $scope.conflictResult.roomConflicts.length > 0 || $scope.conflictResult.isOverCapacity) {
      ToastService.warning('Vui lòng kiểm tra xung đột trước');
      return;
    }
    
    $scope.loading = true;
    var input = {
      classId: $scope.form.classId,
      subjectId: $scope.form.subjectId,
      lecturerId: $scope.lecturerId, // Tự động set từ lecturerId
      roomId: $scope.form.roomId || null,
      schoolYearId: $scope.form.schoolYearId,
      weekNo: parseInt($scope.form.weekNo),
      weekday: convertWeekdayToBackend($scope.form.weekday), // ✅ Convert sang backend format
      startTime: timeToApi($scope.form.startTime),
      endTime: timeToApi($scope.form.endTime),
      periodFrom: parseInt($scope.form.periodFrom),
      periodTo: parseInt($scope.form.periodTo),
      recurrence: $scope.form.recurrence,
      status: $scope.form.status,
      notes: $scope.form.notes || null,
      actor: $scope.currentUser.username || 'lecturer'
    };
    
    TimetableApi.createSession(input).then(function(res) {
      ToastService.success('Tạo lịch giảng dạy thành công');
      $scope.resetForm();
      $scope.load(); // Reload timetable
    }).catch(function(err) {
      if (err.status === 409) {
        ToastService.error('Xung đột lịch: ' + (err.data && err.data.message || 'Conflict'));
        $scope.conflictResult = err.data.data || null;
      } else if (err.status === 400) {
        ToastService.error('Lỗi dữ liệu: ' + (err.data && err.data.message || 'Bad Request'));
      } else {
        ToastService.error('Lỗi tạo lịch: ' + (err.data && err.data.message || err.statusText));
      }
      LoggerService.error('Create session error', err);
    }).finally(function() {
      $scope.loading = false;
    });
  };
  
  // Update session
  $scope.updateSession = function() {
    if (!$scope.form.sessionId) return;
    
    $scope.loading = true;
    var input = {
      classId: $scope.form.classId,
      subjectId: $scope.form.subjectId,
      lecturerId: $scope.lecturerId, // Tự động set từ lecturerId
      roomId: $scope.form.roomId || null,
      schoolYearId: $scope.form.schoolYearId,
      weekNo: parseInt($scope.form.weekNo),
      weekday: convertWeekdayToBackend($scope.form.weekday), // ✅ Convert sang backend format
      startTime: timeToApi($scope.form.startTime),
      endTime: timeToApi($scope.form.endTime),
      periodFrom: parseInt($scope.form.periodFrom),
      periodTo: parseInt($scope.form.periodTo),
      recurrence: $scope.form.recurrence,
      status: $scope.form.status,
      notes: $scope.form.notes || null,
      actor: $scope.currentUser.username || 'lecturer'
    };
    
    TimetableApi.updateSession($scope.form.sessionId, input).then(function(res) {
      ToastService.success('Cập nhật lịch giảng dạy thành công');
      $scope.resetForm();
      $scope.load(); // Reload timetable
    }).catch(function(err) {
      if (err.status === 409) {
        ToastService.error('Xung đột lịch: ' + (err.data && err.data.message || 'Conflict'));
      } else if (err.status === 400) {
        ToastService.error('Lỗi dữ liệu: ' + (err.data && err.data.message || 'Bad Request'));
      } else {
        ToastService.error('Lỗi cập nhật: ' + (err.data && err.data.message || err.statusText));
      }
      LoggerService.error('Update session error', err);
    }).finally(function() {
      $scope.loading = false;
    });
  };
  
  // Delete session
  $scope.deleteSession = function(sessionId) {
    if (!confirm('Bạn có chắc muốn xóa lịch giảng dạy này?')) return;
    
    TimetableApi.deleteSession(sessionId).then(function(res) {
      ToastService.success('Xóa lịch giảng dạy thành công');
      $scope.load(); // Reload timetable
    }).catch(function(err) {
      ToastService.error('Lỗi xóa lịch: ' + (err.data && err.data.message || err.statusText));
      LoggerService.error('Delete session error', err);
    });
  };
  
  // Reset form
  $scope.resetForm = function() {
    $scope.editMode = false;
    $scope.showForm = false;
    $scope.conflictResult = null;
    
    $scope.form.sessionId = null;
    $scope.form.classId = '';
    $scope.form.subjectId = '';
    $scope.form.roomId = '';
    $scope.form.schoolYearId = 'SY2024';
    $scope.form.weekNo = $scope.week;
    $scope.form.weekday = 2;
    $scope.form.periodFrom = 1;
    $scope.form.periodTo = 3;
    $scope.form.recurrence = 'once';
    $scope.form.status = 'active';
    $scope.form.notes = '';
    
    $timeout(function() {
      $scope.form.startTime = '07:00';
      $scope.form.endTime = '09:00';
    }, 10);
  };
  
  // Open form to create
  $scope.openCreateForm = function() {
    $scope.resetForm();
    $scope.showForm = true;
  };
  
  // Open form to edit (có thể thêm sau nếu cần)
  $scope.openEditForm = function(session) {
    $scope.editMode = true;
    $scope.showForm = true;
    $scope.conflictResult = null;
    
    $scope.form.sessionId = session.sessionId || session.session_id;
    $scope.form.classId = session.classId || session.class_id;
    $scope.form.subjectId = session.subjectId || session.subject_id;
    $scope.form.roomId = session.roomId || session.room_id || '';
    $scope.form.schoolYearId = session.schoolYearId || session.school_year_id || 'SY2024';
    $scope.form.weekNo = session.weekNo || session.week_no || $scope.week;
    $scope.form.weekday = convertWeekdayToFrontend(session.weekday || 2); // ✅ Convert từ backend format sang frontend format
    $scope.form.periodFrom = session.periodFrom || session.period_from || 1;
    $scope.form.periodTo = session.periodTo || session.period_to || 3;
    $scope.form.recurrence = session.recurrence || 'once';
    $scope.form.status = session.status || 'active';
    $scope.form.notes = session.notes || '';
    
    var start = timeToInput(session.startTime || session.start_time);
    var end = timeToInput(session.endTime || session.end_time);
    if (start && typeof start === 'string' && /^\d{2}:\d{2}$/.test(start)) {
      $scope.form.startTime = start;
    } else {
      $scope.form.startTime = '07:00';
    }
    if (end && typeof end === 'string' && /^\d{2}:\d{2}$/.test(end)) {
      $scope.form.endTime = end;
    } else {
      $scope.form.endTime = '09:00';
    }
  };

  // Khởi tạo: tự động lấy lecturerId cho giảng viên
  loadLecturerId();
  
  // Watch class selection để tự động set subjectId
  $scope.$watch('form.classId', function(newVal) {
    if (newVal && $scope.classes.length > 0) {
      var selectedClass = $scope.classes.find(function(c) {
        return (c.classId === newVal || c.class_id === newVal);
      });
      if (selectedClass && selectedClass.subjectId && !$scope.form.subjectId) {
        $scope.form.subjectId = selectedClass.subjectId;
      }
    }
  });
  
  // Load dropdowns sau khi có lecturerId
  $scope.$watch('lecturerId', function(newVal) {
    if (newVal && $scope.isLecturer) {
      $scope.loadDropdowns();
    }
  });
}]);




