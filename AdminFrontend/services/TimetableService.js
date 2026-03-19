app.factory('TimetableApi', ['$http', 'API_CONFIG', function($http, API_CONFIG) {
  var base = API_CONFIG.BASE_URL;
  return {
    getStudentWeek: function(studentId, year, week) {
      return $http.get(base + '/timetable/student', { params: { studentId: studentId, year: year, week: week } });
    },
    getLecturerWeek: function(lecturerId, year, week) {
      return $http.get(base + '/timetable/lecturer', { params: { lecturerId: lecturerId, year: year, week: week } });
    },
    getRooms: function(search, isActive) {
      // ✅ Đổi route từ /rooms sang /timetable/rooms để tránh conflict với RoomController
      return $http.get(base + '/timetable/rooms', { params: { search: search, isActive: isActive } });
    },
    getAllSessionsByWeek: function(year, week) {
      return $http.get(base + '/timetable/sessions', { params: { year: year, week: week } });
    },
    getSessionsByClass: function(classId, week) {
      return $http.get(base + '/timetable/sessions/class', { params: { classId: classId, week: week } });
    },
    checkConflicts: function(input) {
      return $http.post(base + '/timetable/conflicts', input);
    },
    createSession: function(input) {
      return $http.post(base + '/timetable/session', input);
    },
    updateSession: function(sessionId, input) {
      return $http.put(base + '/timetable/session/' + sessionId, input);
    },
    deleteSession: function(sessionId) {
      return $http.delete(base + '/timetable/session/' + sessionId);
    }
  };
}]);


