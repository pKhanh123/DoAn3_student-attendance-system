app.factory('ExamScoreService', ['ApiService', function(ApiService) {
  return {
    // ============================================================
    // 🔹 ENTER EXAM SCORES - Nhập điểm cho kỳ thi
    // ============================================================
    enterScores: function(examId, scores) {
      return ApiService.post('/exam-schedules/' + examId + '/scores', {
        examId: examId,
        scores: scores
      });
    },

    // ============================================================
    // 🔹 GET EXAM SCORES - Lấy danh sách điểm đã nhập cho kỳ thi
    // ============================================================
    getScores: function(examId) {
      return ApiService.get('/exam-schedules/' + examId + '/scores');
    }
  };
}]);

