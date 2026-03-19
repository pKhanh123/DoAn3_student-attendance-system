app.factory('ExamScheduleService', ['ApiService', function(ApiService) {

  return {
    // ============================================================
    // 🔹 GET ALL - Lấy danh sách lịch thi (có filter)
    // ============================================================
    getAll: function(filters) {
      filters = filters || {};
      return ApiService.get('/exam-schedules', {
        schoolYearId: filters.schoolYearId,
        semester: filters.semester,
        examType: filters.examType,
        startDate: filters.startDate,
        endDate: filters.endDate,
        classId: filters.classId,
        subjectId: filters.subjectId
      });
    },

    // ============================================================
    // 🔹 GET BY ID - Lấy chi tiết lịch thi
    // ============================================================
    getById: function(examId) {
      return ApiService.get('/exam-schedules/' + examId);
    },

    // ============================================================
    // 🔹 GET BY STUDENT - Lấy lịch thi của sinh viên
    // ============================================================
    getByStudent: function(studentId, schoolYearId, semester) {
      return ApiService.get('/exam-schedules/student/' + studentId, {
        schoolYearId: schoolYearId,
        semester: semester
      }).catch(function(error) {
        // Xử lý lỗi 403 (Forbidden) - có thể do không có quyền hoặc chưa có lịch thi
        if (error.status === 403) {
          // Trả về mảng rỗng thay vì throw error để app vẫn chạy bình thường
          console.warn('[ExamScheduleService] ⚠️ Không có quyền truy cập lịch thi cho', studentId, '- Có thể chưa có lịch thi được tạo');
          return { data: { data: [] } };
        }
        // Với các lỗi khác, vẫn throw để caller xử lý
        throw error;
      });
    },

    // ============================================================
    // 🔹 GET BY CLASS - Lấy lịch thi của lớp học phần
    // ============================================================
    getByClass: function(classId) {
      return ApiService.get('/exam-schedules/class/' + classId);
    },

    // ============================================================
    // 🔹 GET EXAM ASSIGNMENTS - Lấy danh sách sinh viên trong ca thi (để nhập điểm)
    // ============================================================
    getExamAssignments: function(examId) {
      return ApiService.get('/exam-schedules/' + examId + '/assignments');
    },

    // ============================================================
    // 🔹 GET EXAMS BY CLASS AND WEEK - Lấy exams của lớp trong tuần (để tích hợp timetable)
    // ============================================================
    getExamsByClassAndWeek: function(classId, year, week) {
      return ApiService.get('/exam-schedules/class/' + classId + '/week/' + year + '/' + week);
    },

    // ============================================================
    // 🔹 GET CLASS STUDENTS - Lấy danh sách sinh viên trong lớp học phần
    // ============================================================
    getClassStudents: function(classId) {
      return ApiService.get('/exam-schedules/class/' + classId + '/students');
    },

    // ============================================================
    // 🔹 CREATE - Tạo lịch thi mới
    // ============================================================
    create: function(examSchedule) {
      return ApiService.post('/exam-schedules', examSchedule);
    },

    // ============================================================
    // 🔹 CREATE FOR CLASS - Tạo lịch thi cho lớp học phần (tự động phân sinh viên)
    // ============================================================
    createForClass: function(examScheduleData) {
      return ApiService.post('/exam-schedules/create-for-class', examScheduleData);
    },

    // ============================================================
    // 🔹 UPDATE - Cập nhật lịch thi
    // ============================================================
    update: function(examId, examSchedule) {
      return ApiService.put('/exam-schedules/' + examId, examSchedule);
    },

    // ============================================================
    // 🔹 DELETE - Xóa lịch thi (soft delete)
    // ============================================================
    delete: function(examId) {
      return ApiService.delete('/exam-schedules/' + examId);
    },

    // ============================================================
    // 🔹 CANCEL - Hủy lịch thi
    // ============================================================
    cancel: function(examId) {
      return ApiService.post('/exam-schedules/' + examId + '/cancel');
    },

    // ============================================================
    // 🔹 CHECK ROOM CONFLICT - Kiểm tra xung đột phòng thi
    // ============================================================
    checkRoomConflict: function(roomId, examDate, startTime, endTime, excludeExamId) {
      return ApiService.get('/exam-schedules/check-room', {
        roomId: roomId,
        examDate: examDate,
        startTime: startTime,
        endTime: endTime,
        excludeExamId: excludeExamId
      });
    },

    // ============================================================
    // 🔹 CALCULATE REQUIRED SESSIONS - Tính số ca thi cần thiết
    // ============================================================
    calculateRequiredSessions: function(classId, roomId) {
      return ApiService.get('/exam-schedules/calculate-sessions', {
        classId: classId,
        roomId: roomId
      });
    },

    // ============================================================
    // 🔹 TRANSFER STUDENT - Chuyển sinh viên giữa các ca thi
    // ============================================================
    transferStudent: function(examId, assignmentId, targetExamId) {
      return ApiService.post('/exam-schedules/' + examId + '/transfer-student', {
        assignmentId: assignmentId,
        targetExamId: targetExamId
      });
    }
  };
}]);

