// Advisor Exam Score Controller - Nhập điểm cho kỳ thi
app.controller('AdvisorExamScoreController', ['$scope', '$location', '$routeParams', 'ExamScheduleService', 'ExamScoreService', 'AuthService', 'ToastService', 'LoggerService',
    function($scope, $location, $routeParams, ExamScheduleService, ExamScoreService, AuthService, ToastService, LoggerService) {
    
    $scope.examId = $routeParams.examId;
    $scope.exam = null;
    $scope.assignments = [];
    $scope.scores = [];
    $scope.loading = false;
    $scope.saving = false;
    $scope.error = null;
    $scope.currentUser = AuthService.getCurrentUser() || {};
    
    // ============================================================
    // 🔹 ON STATUS CHANGE
    // ============================================================
    $scope.onStatusChange = function(score) {
        // Nếu status không phải ATTENDED, clear score
        if (score.status !== 'ATTENDED') {
            score.score = null;
        }
    };
    
    // ============================================================
    // 🔹 INITIALIZE PAGE
    // ============================================================
    $scope.initPage = function() {
        if (!$scope.examId) {
            $scope.error = 'Không tìm thấy Exam ID';
            return;
        }
        
        $scope.loadExamDetails();
        $scope.loadExamAssignments(); // Load assignments sẽ gọi loadExamScores sau
    };
    
    // ============================================================
    // 🔹 LOAD EXAM DETAILS
    // ============================================================
    $scope.loadExamDetails = function() {
        $scope.loading = true;
        ExamScheduleService.getById($scope.examId)
            .then(function(response) {
                var result = response.data;
                $scope.exam = result && result.data ? result.data : result;
                LoggerService.debug('Exam details loaded', $scope.exam);
            })
            .catch(function(error) {
                LoggerService.error('Error loading exam details', error);
                $scope.error = 'Không thể tải thông tin lịch thi: ' + (error.data && error.data.message || error.message);
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 LOAD EXAM ASSIGNMENTS
    // ============================================================
    $scope.loadExamAssignments = function() {
        // Load assignments để hiển thị danh sách sinh viên
        // Sử dụng endpoint GET /api-edu/exam-schedules/{examId}/assignments
        $scope.loading = true;
        
        if (!ExamScheduleService.getExamAssignments) {
            // Fallback: Thử dùng method có sẵn
            LoggerService.warn('getExamAssignments method not available');
            $scope.error = 'Không thể tải danh sách sinh viên. Vui lòng thử lại sau.';
            $scope.loading = false;
            return;
        }
        
        ExamScheduleService.getExamAssignments($scope.examId)
            .then(function(response) {
                var result = response.data;
                var assignments = (result && result.data) || [];
                
                // Convert assignments sang scores format
                $scope.scores = assignments.map(function(assignment) {
                    return {
                        assignmentId: assignment.assignmentId || assignment.assignment_id || '',
                        studentId: assignment.studentId || assignment.student_id || '',
                        studentCode: assignment.studentCode || assignment.student_code || '—',
                        studentName: assignment.studentName || assignment.student_name || '—',
                        enrollmentId: assignment.enrollmentId || assignment.enrollment_id || '',
                        seatNumber: assignment.seatNumber || assignment.seat_number || null,
                        status: assignment.status || 'ASSIGNED',
                        score: null, // Sẽ load từ scores nếu đã nhập
                        notes: assignment.notes || null
                    };
                });
                
                LoggerService.debug('Exam assignments loaded', { count: $scope.scores.length });
                
                // Sau đó load scores để fill điểm đã nhập (nếu có)
                $scope.loadExamScores();
            })
            .catch(function(error) {
                LoggerService.error('Error loading exam assignments', error);
                $scope.error = 'Không thể tải danh sách sinh viên: ' + (error.data && error.data.message || error.message);
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 LOAD EXAM SCORES
    // ============================================================
    $scope.loadExamScores = function() {
        if (!ExamScoreService) {
            LoggerService.warn('ExamScoreService not available');
            // Nếu chưa có scores từ assignments, khởi tạo từ assignments
            if ($scope.scores && $scope.scores.length > 0) {
                $scope.loading = false;
                return;
            }
        }
        
        // Load scores đã nhập (nếu có)
        ExamScoreService.getScores($scope.examId)
            .then(function(response) {
                var result = response.data;
                var enteredScores = (result && result.data) || [];
                
                // Merge scores đã nhập vào assignments
                if (enteredScores.length > 0 && $scope.scores && $scope.scores.length > 0) {
                    enteredScores.forEach(function(enteredScore) {
                        var assignment = $scope.scores.find(function(s) {
                            return s.assignmentId === enteredScore.assignmentId;
                        });
                        if (assignment) {
                            assignment.score = enteredScore.score;
                            assignment.status = enteredScore.status || assignment.status;
                            assignment.notes = enteredScore.notes || assignment.notes;
                        }
                    });
                }
                
                LoggerService.debug('Exam scores loaded', { count: enteredScores.length });
            })
            .catch(function(error) {
                LoggerService.error('Error loading exam scores', error);
                // Không set error nếu chưa nhập điểm (404 là bình thường)
                if (error.status !== 404 && error.status !== 500) {
                    LoggerService.warn('Could not load entered scores, will use assignments data only');
                }
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // ============================================================
    // 🔹 SAVE SCORES
    // ============================================================
    $scope.saveScores = function() {
        if (!$scope.scores || $scope.scores.length === 0) {
            ToastService.warning('Vui lòng nhập điểm cho ít nhất một sinh viên');
            return;
        }
        
        // Validate scores
        var hasInvalidScore = false;
        for (var i = 0; i < $scope.scores.length; i++) {
            var score = $scope.scores[i];
            if (score.status === 'ATTENDED' && (score.score === null || score.score === undefined || score.score < 0 || score.score > 10)) {
                hasInvalidScore = true;
                ToastService.warning('Điểm phải nằm trong khoảng 0-10 cho sinh viên: ' + (score.studentName || score.studentId));
                return;
            }
        }
        
        if (hasInvalidScore) {
            return;
        }
        
        $scope.saving = true;
        $scope.error = null;
        
        // Format scores for API
        var scoresToSubmit = $scope.scores.map(function(score) {
            return {
                assignmentId: score.assignmentId,
                studentId: score.studentId,
                enrollmentId: score.enrollmentId,
                score: score.status === 'ATTENDED' ? parseFloat(score.score) : 0,
                status: score.status || 'ATTENDED',
                notes: score.notes || null
            };
        });
        
        ExamScoreService.enterScores($scope.examId, scoresToSubmit)
            .then(function(response) {
                ToastService.success('Nhập điểm thành công! Điểm đã được tự động gán vào bảng điểm.');
                $scope.loadExamScores(); // Reload để lấy điểm đã cập nhật
            })
            .catch(function(error) {
                LoggerService.error('Error saving exam scores', error);
                $scope.error = error.data && error.data.message || 'Không thể lưu điểm';
                ToastService.error($scope.error);
            })
            .finally(function() {
                $scope.saving = false;
            });
    };
    
    // ============================================================
    // 🔹 HELPER FUNCTIONS
    // ============================================================
    $scope.formatDate = function(dateStr) {
        if (!dateStr) return '—';
        try {
            var date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return dateStr;
        }
    };
    
    $scope.formatTime = function(timeStr) {
        if (!timeStr) return '—';
        var str = String(timeStr);
        if (str.length >= 5) {
            return str.substring(0, 5); // "HH:mm"
        }
        return str;
    };
    
    $scope.getStatusLabel = function(status) {
        var statusMap = {
            'ASSIGNED': 'Đã phân ca',
            'NOT_QUALIFIED': 'Không đủ điều kiện',
            'ATTENDED': 'Đã dự thi',
            'ABSENT': 'Vắng thi',
            'EXCUSED': 'Vắng có lý do'
        };
        return statusMap[status] || status;
    };
    
    // ============================================================
    // 🔹 INITIALIZE
    // ============================================================
    $scope.initPage();
}]);

