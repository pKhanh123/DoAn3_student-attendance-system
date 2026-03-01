app.controller('AdminTimetableController', ['$scope', '$rootScope', '$location', '$timeout', 'TimetableApi', 'ClassService', 'SubjectService', 'LecturerService', 'AuthService', 'ToastService', 'LoggerService', 'ExamScheduleService', function($scope, $rootScope, $location, $timeout, TimetableApi, ClassService, SubjectService, LecturerService, AuthService, ToastService, LoggerService, ExamScheduleService) {
  function getIsoWeek(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    var weekNo = Math.ceil((((date - yearStart) / 86400000) + 1)/7);
    return { year: date.getUTCFullYear(), week: weekNo };
  }

  // Lấy params từ URL hoặc mặc định tuần 12
  var qs = $location.search() || {};
  var qWeek = parseInt(qs.week);
  var qYear = parseInt(qs.year);
  
  $scope.today = new Date();
  var iso = getIsoWeek($scope.today);
  // Mặc định tuần 12 nếu không có params
  $scope.year = !isNaN(qYear) && qYear > 2000 && qYear < 3000 ? qYear : iso.year;
  $scope.week = !isNaN(qWeek) && qWeek >= 1 && qWeek <= 53 ? qWeek : 12;
  $scope.days = [1,2,3,4,5,6,7];
  $scope.loading = false;
  $scope.error = null;
  $scope.currentUser = AuthService.getCurrentUser() || {};
  
  // Helper: Convert time string "HH:mm:ss" to "HH:mm" for input type="time"
  function timeToInput(timeStr) {
    if (!timeStr) return null; // Return null instead of empty string
    var str = String(timeStr);
    if (str.length >= 5) {
      return str.substring(0, 5); // "07:00:00" -> "07:00"
    }
    return str; // Already "HH:mm" or shorter
  }
  
  // Helper: Convert "HH:mm" to "HH:mm:ss" for API
  function timeToApi(timeStr) {
    if (!timeStr) return null;
    var str = String(timeStr);
    if (str.length === 5) return str + ':00'; // "07:00" -> "07:00:00"
    if (str.length === 8) return str; // Already "HH:mm:ss"
    return null; // Invalid format
  }

  // ✅ THÊM: Helper - Tính thời gian từ period
  $scope.calculateTimeFromPeriod = function(periodFrom, periodTo) {
    if (!periodFrom || !periodTo) return null;
    
    // Mapping thời gian tiết học theo chuẩn đại học Việt Nam
    const periodTimes = {
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

  // ✅ THÊM: Validate period range
  $scope.validatePeriodRange = function() {
    if ($scope.form.periodFrom && $scope.form.periodTo) {
      if ($scope.form.periodFrom < 1 || $scope.form.periodFrom > 12) {
        ToastService.error('Tiết bắt đầu phải từ 1 đến 12');
        return false;
      }
      if ($scope.form.periodTo < $scope.form.periodFrom || $scope.form.periodTo > 12) {
        ToastService.error('Tiết kết thúc phải >= tiết bắt đầu và <= 12');
        return false;
      }
      // Validate consecutive periods
      var numberOfPeriods = $scope.form.periodTo - $scope.form.periodFrom + 1;
      if (numberOfPeriods <= 0 || numberOfPeriods > 12) {
        ToastService.error('Số tiết học không hợp lệ');
        return false;
      }
    }
    return true;
  };

  // ✅ Cache để hiển thị thời gian từ period (tránh gọi function trong template)
  $scope.periodTimeDisplay = '';
  
  // ✅ Helper function để update period time display
  var updatePeriodTimeDisplay = function() {
    if ($scope.form.periodFrom && $scope.form.periodTo) {
      var times = $scope.calculateTimeFromPeriod($scope.form.periodFrom, $scope.form.periodTo);
      if (times && times.startTime && times.endTime) {
        $scope.periodTimeDisplay = times.startTime + ' - ' + times.endTime;
      } else {
        $scope.periodTimeDisplay = '';
      }
    } else {
      $scope.periodTimeDisplay = '';
    }
  };
  
  // ✅ Flag để tránh infinite loop khi update time từ period
  var isUpdatingTimeFromPeriod = false;
  
  // ✅ THÊM: Watch period changes để tự động cập nhật thời gian
  $scope.$watch('form.periodFrom', function(newVal, oldVal) {
    // Skip if value hasn't changed or if we're updating from period
    if (newVal === oldVal || isUpdatingTimeFromPeriod) {
      updatePeriodTimeDisplay();
      return;
    }
    
    if (newVal && $scope.form.periodTo) {
      var times = $scope.calculateTimeFromPeriod(newVal, $scope.form.periodTo);
      if (times && times.startTime && times.endTime) {
        isUpdatingTimeFromPeriod = true;
        $timeout(function() {
        $scope.form.startTime = times.startTime;
        $scope.form.endTime = times.endTime;
          updatePeriodTimeDisplay();
          isUpdatingTimeFromPeriod = false;
        }, 0);
      } else {
        updatePeriodTimeDisplay();
      }
    } else {
      updatePeriodTimeDisplay();
    }
  });

  $scope.$watch('form.periodTo', function(newVal, oldVal) {
    // Skip if value hasn't changed or if we're updating from period
    if (newVal === oldVal || isUpdatingTimeFromPeriod) {
      updatePeriodTimeDisplay();
      return;
    }
    
    if ($scope.form.periodFrom && newVal) {
      var times = $scope.calculateTimeFromPeriod($scope.form.periodFrom, newVal);
      if (times && times.startTime && times.endTime) {
        isUpdatingTimeFromPeriod = true;
        $timeout(function() {
        $scope.form.startTime = times.startTime;
        $scope.form.endTime = times.endTime;
          updatePeriodTimeDisplay();
          isUpdatingTimeFromPeriod = false;
        }, 0);
      } else {
        updatePeriodTimeDisplay();
      }
    } else {
      updatePeriodTimeDisplay();
    }
  });

  // Form data - Initialize with string time values to avoid Angular parsing issues
  $scope.form = {
    sessionId: null,
    classId: '',
    subjectId: '',
    lecturerId: '',
    roomId: '',
    schoolYearId: 'SY2024',
    weekNo: iso.week,
    weekday: 2,
    startTime: '07:00', // ✅ Set as string immediately to avoid datefmt error
    endTime: '09:00',   // ✅ Set as string immediately to avoid datefmt error
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
  
  // Helper to pad number with zero
  function padZero(num) {
    return (num < 10 ? '0' : '') + num;
  }
  
  // ✅ REMOVED: Watch functions for time formatting - causing infinite loops
  // Time formatting is now handled only when loading data from backend
  // Period watch will directly set time values without triggering format watches

  // Dropdown data
  $scope.classes = [];
  $scope.subjects = [];
  $scope.lecturers = [];
  $scope.rooms = [];
  $scope.schoolYears = [{ schoolYearId: 'SY2024', schoolYearCode: '2024-2025' }];

  // Class selection
  $scope.selectedClassId = null;
  $scope.selectedClassInfo = null;
  $scope.classSearchText = '';
  $scope.filteredClasses = [];
  $scope.showOnlyActive = true;

  // Timetable grid
  $scope.grid = {};
  $scope.allSessions = [];

  // Load dropdowns
  $scope.loadDropdowns = function() {
    ClassService.getAll().then(function(res) {
      $scope.classes = (res.data && res.data.data) || res.data || [];
      $scope.filterClasses();
  }).catch(function(err) { LoggerService.error('Load classes error', err); });
    
    SubjectService.getAll().then(function(res) {
      $scope.subjects = (res.data && res.data.data) || res.data || [];
  }).catch(function(err) { LoggerService.error('Load subjects error', err); });
    
    LecturerService.getAll().then(function(res) {
      $scope.lecturers = (res.data && res.data.data) || res.data || [];
  }).catch(function(err) { LoggerService.error('Load lecturers error', err); });
    
    TimetableApi.getRooms(null, true).then(function(res) {
      $scope.rooms = (res.data && res.data.data) || res.data || [];
  }).catch(function(err) { LoggerService.error('Load rooms error', err); });
  };

  // Filter classes
  $scope.filterClasses = function() {
    var classesToFilter = $scope.classes;
    
    // Filter theo active status
    if ($scope.showOnlyActive) {
      classesToFilter = classesToFilter.filter(function(c) {
        return c.isActive === true || c.is_active_computed === 1 || c.isActive === 1;
      });
    }
    
    // Filter theo search text
    if (!$scope.classSearchText || $scope.classSearchText.trim() === '') {
      $scope.filteredClasses = classesToFilter;
      return;
    }
    
    var search = $scope.classSearchText.toLowerCase().trim();
    $scope.filteredClasses = classesToFilter.filter(function(c) {
      var codeMatch = c.classCode && c.classCode.toLowerCase().includes(search);
      var nameMatch = c.className && c.className.toLowerCase().includes(search);
      var subjectMatch = c.subjectName && c.subjectName.toLowerCase().includes(search);
      var lecturerMatch = c.lecturerName && c.lecturerName.toLowerCase().includes(search);
      return codeMatch || nameMatch || subjectMatch || lecturerMatch;
    });
  };

  // Auto filter khi search text thay đổi
  $scope.$watch('classSearchText', function() {
    $scope.filterClasses();
  });

  // Filter khi load classes
  $scope.$watch('classes', function() {
    $scope.filterClasses();
  }, true);

  // Watch showOnlyActive
  $scope.$watch('showOnlyActive', function() {
    $scope.filterClasses();
  });

  // Helper function để format text hiển thị lớp ngắn gọn
  $scope.getClassDisplayText = function(c) {
    if (!c) return '';
    var code = c.classCode || c.class_code || '';
    var name = c.className || c.class_name || '';
    var display = code + ' - ' + name;
    
    // Giới hạn độ dài tối đa 60 ký tự
    if (display.length > 60) {
      display = display.substring(0, 57) + '...';
    }
    
    // Thêm trạng thái nếu không active
    if (!(c.isActive || c.is_active_computed || c.isActive === 1)) {
      display += ' (Đã tắt)';
    }
    
    return display;
  };
  
  // Helper function để tạo title đầy đủ cho tooltip
  $scope.getClassFullTitle = function(c) {
    if (!c) return '';
    var parts = [];
    var code = c.classCode || c.class_code || '';
    var name = c.className || c.class_name || '';
    if (code || name) {
      parts.push(code + ' - ' + name);
    }
    if (c.subjectName || c.subject_name) {
      parts.push(c.subjectName || c.subject_name);
    }
    if (c.lecturerName || c.lecturer_name) {
      parts.push('GV: ' + (c.lecturerName || c.lecturer_name));
    }
    if (c.semester) {
      parts.push('HK' + c.semester);
    }
    return parts.join(' | ');
  };

  // Class selection handler
  $scope.onClassChange = function() {
    if (!$scope.selectedClassId) {
      $scope.selectedClassInfo = null;
      $scope.loadSessions();
      return;
    }
    
    var selectedClass = $scope.classes.find(function(c) {
      return c.classId === $scope.selectedClassId || c.class_id === $scope.selectedClassId;
    });
    
    if (selectedClass) {
      $scope.selectedClassInfo = {
        classId: selectedClass.classId || selectedClass.class_id,
        classCode: selectedClass.classCode || selectedClass.class_code,
        className: selectedClass.className || selectedClass.class_name,
        subjectName: selectedClass.subjectName || selectedClass.subject_name,
        lecturerName: selectedClass.lecturerName || selectedClass.lecturer_name,
        semester: selectedClass.semester,
        isActive: selectedClass.isActive || selectedClass.is_active_computed || selectedClass.isActive === 1
      };
    }
    
    $scope.loadSessions();
  };

  // Load sessions for current week (bao gồm cả exams nếu có selectedClassId)
  $scope.loadSessions = function() {
    $scope.loading = true;
    $scope.error = null;
    
    var promises = [];
    
    // 1. Load sessions (existing)
    if ($scope.selectedClassId) {
      promises.push(TimetableApi.getSessionsByClass($scope.selectedClassId, $scope.week));
    } else {
      promises.push(TimetableApi.getAllSessionsByWeek($scope.year, $scope.week));
    }
    
    // 2. Load exams nếu có selectedClassId (để tích hợp vào timetable)
    if ($scope.selectedClassId && ExamScheduleService) {
      promises.push(ExamScheduleService.getExamsByClassAndWeek($scope.selectedClassId, $scope.year, $scope.week).catch(function(err) {
        LoggerService.error('Load exams error', err);
        return {data: {data: []}}; // Return empty array on error
      }));
    } else {
      promises.push(Promise.resolve({data: {data: []}}));
    }
    
    Promise.all(promises).then(function(results) {
      var sessions = (results[0].data && results[0].data.data) || [];
      var exams = (results[1].data && results[1].data.data) || [];
      
      // 3. Mark type cho sessions
      sessions = sessions.map(function(s) {
        s.type = 'session';
        // Đảm bảo có đầy đủ fields
        s.sessionId = s.sessionId || s.session_id;
        s.classCode = s.classCode || s.class_code;
        s.subjectName = s.subjectName || s.subject_name;
        s.lecturerName = s.lecturerName || s.lecturer_name;
        s.roomCode = s.roomCode || s.room_code;
        s.startTime = s.startTime || s.start_time;
        s.endTime = s.endTime || s.end_time;
        return s;
      });
      
      // 4. Process exams: Convert format và mark type
      exams = exams.map(function(exam) {
        var weekday = $scope.getWeekdayFromDate(exam.examDate);
        var item = {
          type: 'exam',
          sessionId: exam.examId,  // Dùng examId làm sessionId để tương thích
          examId: exam.examId,
          weekday: weekday,
          startTime: $scope.formatTime(exam.examTime || exam.startTime),
          endTime: $scope.formatTime(exam.endTime),
          classCode: exam.classCode || $scope.selectedClassInfo?.classCode || '',
          className: exam.className || $scope.selectedClassInfo?.className || '',
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
      
      // 5. Merge sessions và exams
      var allItems = sessions.concat(exams);
      
      // 6. Filter out sessions trùng ngày với exams (business rule: không có lịch học vào ngày thi)
      if (exams.length > 0 && $scope.selectedClassId) {
        var examDates = exams.map(function(exam) {
          return exam.examDate ? exam.examDate.substring(0, 10) : null; // Extract YYYY-MM-DD
        }).filter(function(date) { return date != null; });
        
        allItems = allItems.filter(function(item) {
          if (item.type === 'session') {
            // Check nếu session có date trong examDates thì filter out
            // Sessions không có examDate, nên cần tính từ weekday và week
            // Tạm thời giữ lại tất cả, có thể filter sau khi tính date của session
            return true; // TODO: Implement filter logic nếu cần
          }
          return true;
        });
      }
      
      // 7. Sort theo weekday + startTime
      allItems.sort(function(a, b) {
        if (a.weekday !== b.weekday) {
          return (a.weekday || 0) - (b.weekday || 0);
        }
        var timeA = (a.startTime || '').toString();
        var timeB = (b.startTime || '').toString();
        return timeA.localeCompare(timeB);
      });
      
      $scope.allSessions = allItems;
      
      // 8. Map theo weekday để hiển thị grid
      var map = {};
      $scope.days.forEach(function(d) { map[d] = []; });
      allItems.forEach(function(item) {
        if (item.weekday >= 1 && item.weekday <= 7) {
          map[item.weekday].push(item);
        }
      });
      $scope.grid = map;
    }).catch(function(err) {
      $scope.error = 'Lỗi tải danh sách phiên: ' + ((err.data && err.data.message) || err.statusText || 'Unknown error');
      LoggerService.error('Load sessions error', err);
    }).finally(function() {
      $scope.loading = false;
    });
  };

  // ============================================================
  // 🔹 HELPER: Tính weekday từ date string
  // ============================================================
  $scope.getWeekdayFromDate = function(dateStr) {
    if (!dateStr) return null;
    try {
      var date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      var day = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      return day === 0 ? 7 : day; // Convert Sunday to 7 (Monday=1, Sunday=7)
    } catch (e) {
      LoggerService.error('Error parsing date: ' + dateStr, e);
      return null;
    }
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
  // 🔹 HELPER: Kiểm tra date có trong tuần không
  // ============================================================
  $scope.isDateInWeek = function(dateStr, year, week) {
    if (!dateStr) return false;
    try {
      var date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      
      // Tính tuần ISO của date
      var isoWeek = getIsoWeek(date);
      return isoWeek.year === year && isoWeek.week === week;
    } catch (e) {
      return false;
    }
  };

  // Check conflicts
  $scope.checkConflicts = function() {
    if (!$scope.form.classId || !$scope.form.subjectId || !$scope.form.weekday || !$scope.form.startTime || !$scope.form.endTime) {
      ToastService.warning('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    // ✅ THÊM: Validate period nếu có
    if ($scope.form.periodFrom && $scope.form.periodTo) {
      if (!$scope.validatePeriodRange()) {
        return;
      }
    }
    
    // Validate time format
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
      lecturerId: $scope.form.lecturerId || null,
      roomId: $scope.form.roomId || null,
      schoolYearId: $scope.form.schoolYearId || null,
      weekNo: parseInt($scope.form.weekNo) || null,
      weekday: parseInt($scope.form.weekday) || 1,
      startTime: startTimeStr, // "HH:mm:ss" format
      endTime: endTimeStr,      // "HH:mm:ss" format
      periodFrom: $scope.form.periodFrom ? parseInt($scope.form.periodFrom) : null,  // ✅ THÊM
      periodTo: $scope.form.periodTo ? parseInt($scope.form.periodTo) : null        // ✅ THÊM
    };
    
    LoggerService.debug('Check conflicts input', input);
    
    TimetableApi.checkConflicts(input).then(function(res) {
      $scope.conflictResult = res.data.data || res.data;
      $scope.checkingConflicts = false;
      
      // ✅ THÊM: Kiểm tra period conflicts
      var hasPeriodConflicts = $scope.conflictResult.periodConflicts && $scope.conflictResult.periodConflicts.length > 0;
      var hasErrors = $scope.conflictResult.errors && $scope.conflictResult.errors.length > 0;
      
      if ($scope.conflictResult.lecturerConflicts.length === 0 && 
          $scope.conflictResult.roomConflicts.length === 0 && 
          $scope.conflictResult.studentConflicts.length === 0 &&
          !$scope.conflictResult.isOverCapacity &&
          !hasPeriodConflicts &&
          !hasErrors) {
        ToastService.success('Không có xung đột, có thể tạo phiên học');
      } else {
        ToastService.warning('Phát hiện xung đột, xem chi tiết bên dưới');
      }
    }).catch(function(err) {
      $scope.checkingConflicts = false;
      var errorMsg = 'Lỗi kiểm tra xung đột';
      if (err.data) {
        if (err.data.message) errorMsg += ': ' + err.data.message;
        if (err.data.errors) {
          var validationErrors = [];
          for (var key in err.data.errors) {
            if (err.data.errors.hasOwnProperty(key)) {
              validationErrors.push(key + ': ' + err.data.errors[key].join(', '));
            }
          }
          if (validationErrors.length > 0) {
            errorMsg += '\n' + validationErrors.join('\n');
          }
        }
      } else if (err.statusText) {
        errorMsg += ': ' + err.statusText;
      }
      ToastService.error(errorMsg);
      LoggerService.error('Check conflicts error', err);
      if (err && err.data) {
        LoggerService.debug('Check conflicts error payload', err.data);
      }
    });
  };

  // Create session
  $scope.createSession = function() {
    // Check class is active
    if ($scope.selectedClassInfo && !$scope.selectedClassInfo.isActive) {
      ToastService.error('Không thể tạo phiên học cho lớp đã bị vô hiệu hóa');
      return;
    }
    
    if ($scope.form.classId) {
      var formClass = $scope.classes.find(function(c) {
        return (c.classId === $scope.form.classId || c.class_id === $scope.form.classId);
      });
      if (formClass && !(formClass.isActive || formClass.is_active_computed || formClass.isActive === 1)) {
        ToastService.error('Không thể tạo phiên học cho lớp đã bị vô hiệu hóa');
        return;
      }
    }
    if (!$scope.conflictResult || $scope.conflictResult.lecturerConflicts.length > 0 || 
        $scope.conflictResult.roomConflicts.length > 0 || $scope.conflictResult.isOverCapacity) {
      ToastService.warning('Vui lòng kiểm tra xung đột trước');
      return;
    }
    
    $scope.loading = true;
    var input = {
      classId: $scope.form.classId,
      subjectId: $scope.form.subjectId,
      lecturerId: $scope.form.lecturerId || null,
      roomId: $scope.form.roomId || null,
      schoolYearId: $scope.form.schoolYearId,
      weekNo: parseInt($scope.form.weekNo),
      weekday: parseInt($scope.form.weekday),
      startTime: timeToApi($scope.form.startTime), // Convert "HH:mm" -> "HH:mm:ss"
      endTime: timeToApi($scope.form.endTime),     // Convert "HH:mm" -> "HH:mm:ss"
      periodFrom: parseInt($scope.form.periodFrom),
      periodTo: parseInt($scope.form.periodTo),
      recurrence: $scope.form.recurrence,
      status: $scope.form.status,
      notes: $scope.form.notes || null,
      actor: $scope.currentUser.username || 'admin'
    };
    
    TimetableApi.createSession(input).then(function(res) {
      ToastService.success('Tạo phiên học thành công');
      $scope.resetForm();
      $scope.loadSessions(); // Reload danh sách
    }).catch(function(err) {
      if (err.status === 409) {
        ToastService.error('Xung đột lịch: ' + (err.data && err.data.message) || 'Conflict');
        $scope.conflictResult = err.data.data || null;
      } else if (err.status === 400) {
        ToastService.error('Lỗi dữ liệu: ' + (err.data && err.data.message) || 'Bad Request');
      } else {
        ToastService.error('Lỗi tạo phiên: ' + (err.data && err.data.message) || err.statusText);
      }
      LoggerService.error('Create session error', err);
    }).finally(function() { $scope.loading = false; });
  };

  // Update session
  $scope.updateSession = function() {
    if (!$scope.form.sessionId) return;
    
    $scope.loading = true;
    var input = {
      classId: $scope.form.classId,
      subjectId: $scope.form.subjectId,
      lecturerId: $scope.form.lecturerId || null,
      roomId: $scope.form.roomId || null,
      schoolYearId: $scope.form.schoolYearId,
      weekNo: parseInt($scope.form.weekNo),
      weekday: parseInt($scope.form.weekday),
      startTime: timeToApi($scope.form.startTime), // Convert "HH:mm" -> "HH:mm:ss"
      endTime: timeToApi($scope.form.endTime),     // Convert "HH:mm" -> "HH:mm:ss"
      periodFrom: parseInt($scope.form.periodFrom),
      periodTo: parseInt($scope.form.periodTo),
      recurrence: $scope.form.recurrence,
      status: $scope.form.status,
      notes: $scope.form.notes || null,
      actor: $scope.currentUser.username || 'admin'
    };
    
    TimetableApi.updateSession($scope.form.sessionId, input).then(function(res) {
      ToastService.success('Cập nhật phiên học thành công');
      $scope.resetForm();
      $scope.loadSessions(); // Reload danh sách
    }).catch(function(err) {
      if (err.status === 409) {
        ToastService.error('Xung đột lịch: ' + (err.data && err.data.message) || 'Conflict');
      } else if (err.status === 400) {
        ToastService.error('Lỗi dữ liệu: ' + (err.data && err.data.message) || 'Bad Request');
      } else {
        ToastService.error('Lỗi cập nhật: ' + (err.data && err.data.message) || err.statusText);
      }
      LoggerService.error('Update session error', err);
    }).finally(function() { $scope.loading = false; });
  };

  // Delete session
  $scope.deleteSession = function(sessionId) {
    if (!confirm('Bạn có chắc muốn xóa phiên học này?')) return;
    
    TimetableApi.deleteSession(sessionId).then(function(res) {
      ToastService.success('Xóa phiên học thành công');
      $scope.loadSessions(); // Reload danh sách
    }).catch(function(err) {
      ToastService.error('Lỗi xóa phiên: ' + (err.data && err.data.message) || err.statusText);
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
    $scope.form.lecturerId = '';
    $scope.form.roomId = '';
    $scope.form.schoolYearId = 'SY2024';
    $scope.form.weekNo = $scope.week;
    $scope.form.weekday = 2;
    $scope.form.periodFrom = 1;
    $scope.form.periodTo = 3;
    $scope.form.recurrence = 'once';
    $scope.form.status = 'active';
    $scope.form.notes = '';
    
    // Set time values after a short delay to avoid Angular parsing issues
    $timeout(function() {
      // ✅ Ensure time values are strings in "HH:mm" format
      $scope.form.startTime = '07:00';
      $scope.form.endTime = '09:00';
    }, 10);
  };

  // Open form to create
  $scope.openCreateForm = function() {
    $scope.resetForm();
    
    // ✅ Nếu đã chọn lớp từ danh sách, tự động set vào form
    if ($scope.selectedClassId) {
      $scope.form.classId = $scope.selectedClassId;
      
      // ✅ Tự động load thông tin lớp nếu có
      var selectedClass = $scope.classes.find(function(c) {
        return c.classId === $scope.selectedClassId || c.class_id === $scope.selectedClassId;
      });
      
      if (selectedClass) {
        // Tự động set subjectId và lecturerId nếu có
        if (selectedClass.subjectId && !$scope.form.subjectId) {
          $scope.form.subjectId = selectedClass.subjectId;
        }
        if (selectedClass.lecturerId && !$scope.form.lecturerId) {
          $scope.form.lecturerId = selectedClass.lecturerId;
        }
      }
    }
    
    $scope.showForm = true;
  };

  // Open form to edit
  $scope.openEditForm = function(session) {
    $scope.editMode = true;
    $scope.showForm = true;
    $scope.conflictResult = null;
    
    // Set form values, using $timeout to avoid Angular datefmt error
    $scope.form.sessionId = session.sessionId;
    $scope.form.classId = session.classId;
    $scope.form.subjectId = session.subjectId;
    $scope.form.lecturerId = session.lecturerId || '';
    $scope.form.roomId = session.roomId || '';
    $scope.form.schoolYearId = session.schoolYearId;
    $scope.form.weekNo = session.weekNo;
    $scope.form.weekday = session.weekday;
    $scope.form.periodFrom = session.periodFrom;
    $scope.form.periodTo = session.periodTo;
    $scope.form.recurrence = session.recurrence || 'once';
    $scope.form.status = session.status;
    $scope.form.notes = session.notes || '';
    
    // ✅ Set time values - ensure they're strings in "HH:mm" format
    // Don't use $timeout to avoid Angular parsing issues
      var start = timeToInput(session.startTime);
      var end = timeToInput(session.endTime);
    if (start && typeof start === 'string' && /^\d{2}:\d{2}$/.test(start)) {
      $scope.form.startTime = start;
    } else {
      $scope.form.startTime = '07:00'; // Default fallback
    }
    if (end && typeof end === 'string' && /^\d{2}:\d{2}$/.test(end)) {
      $scope.form.endTime = end;
    } else {
      $scope.form.endTime = '09:00'; // Default fallback
    }
  };

  // Week navigation
  $scope.prevWeek = function() {
    $scope.week = $scope.week - 1;
    if ($scope.week < 1) {
      $scope.week = 53;
      $scope.year = $scope.year - 1;
    }
    $scope.form.weekNo = $scope.week;
    $scope.loadSessions();
  };
  
  $scope.nextWeek = function() {
    $scope.week = $scope.week + 1;
    if ($scope.week > 53) {
      $scope.week = 1;
      $scope.year = $scope.year + 1;
    }
    $scope.form.weekNo = $scope.week;
    $scope.loadSessions();
  };

  // Initialize
  $scope.loadDropdowns();
  $scope.loadSessions();
}]);

