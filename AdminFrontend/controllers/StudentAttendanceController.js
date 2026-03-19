// Student Attendance Controller
app.controller('StudentAttendanceController', ['$scope', 'AuthService', 'StudentService', 'ApiService', function($scope, AuthService, StudentService, ApiService) {
    $scope.currentUser = AuthService.getCurrentUser();
    $scope.studentId = null;
    $scope.attendanceRecords = [];
    $scope.loading = false;
    $scope.error = null;
    
    // Load student ID
    function loadStudentId() {
        if (!$scope.currentUser || !$scope.currentUser.userId) {
            $scope.error = 'Không tìm thấy thông tin người dùng.';
            $scope.loading = false;
            return;
        }
        
        $scope.loading = true;
        StudentService.getByUserId($scope.currentUser.userId)
            .then(function(response) {
                if (response.data && response.data.data) {
                    $scope.studentId = response.data.data.studentId;
                    if ($scope.studentId) {
                        loadAttendance();
                    } else {
                        $scope.error = 'Không tìm thấy thông tin sinh viên.';
                        $scope.loading = false;
                    }
                } else {
                    $scope.error = 'Không tìm thấy thông tin sinh viên.';
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                if (error.status === 404) {
                    $scope.error = 'Không tìm thấy thông tin sinh viên cho tài khoản này.';
                } else if (error.status === 403) {
                    $scope.error = 'Bạn không có quyền truy cập thông tin sinh viên.';
                } else {
                    $scope.error = 'Không thể tải thông tin sinh viên: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                }
                $scope.loading = false;
            });
    }
    
    // Load attendance records
    function loadAttendance() {
        if (!$scope.studentId) {
            $scope.loading = false;
            return;
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        // Get attendance records by student ID
        ApiService.get('/attendances/student/' + $scope.studentId)
            .then(function(response) {
                if (response.data && response.data.data) {
                    // Map dữ liệu từ API response sang format mà view cần
                    $scope.attendanceRecords = response.data.data.map(function(record) {
                        // Lấy subject name từ các field có thể có
                        var subjectName = record.subjectName || record.subject_name || 
                                         (record.className ? record.className.split(' - ')[0] : null) ||
                                         (record.class_name ? record.class_name.split(' - ')[0] : null) ||
                                         '-';
                        
                        // Lấy class code từ các field có thể có
                        var classCode = record.classCode || record.class_code || 
                                       record.className || record.class_name || '-';
                        
                        // Lấy lecturer name (ưu tiên marked_by_name, sau đó lecturer_name)
                        var lecturerName = record.markedByName || record.marked_by_name || 
                                          record.lecturerName || record.lecturer_name || '-';
                        
                        return {
                            date: record.attendanceDate || record.attendance_date,
                            subjectName: subjectName,
                            classCode: classCode,
                            lecturerName: lecturerName,
                            status: record.status || 'PRESENT',
                            notes: record.notes || record.note || '-'
                        };
                    });
                } else {
                    $scope.attendanceRecords = [];
                }
                $scope.loading = false;
            })
            .catch(function(error) {
                if (error.status === 403) {
                    $scope.error = 'Bạn không có quyền xem điểm danh.';
                } else if (error.status === 404) {
                    $scope.error = 'Không tìm thấy dữ liệu điểm danh cho sinh viên này.';
                } else {
                    $scope.error = 'Không thể tải dữ liệu điểm danh: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                }
                $scope.attendanceRecords = [];
                $scope.loading = false;
            });
    }
    
    // Get status badge
    $scope.getStatusBadge = function(status) {
        if (!status) return 'badge-secondary';
        
        // Chuyển về chữ hoa để so sánh
        var statusUpper = String(status).toUpperCase();
        
        switch(statusUpper) {
            case 'PRESENT': return 'badge-success';
            case 'ABSENT': return 'badge-danger';
            case 'LATE': return 'badge-warning';
            case 'EXCUSED': return 'badge-info';
            default: return 'badge-secondary';
        }
    };
    
    // Get status text (tiếng Việt)
    $scope.getStatusText = function(status) {
        if (!status) return 'Không xác định';
        
        // Chuyển về chữ hoa để so sánh
        var statusUpper = String(status).toUpperCase();
        
        switch(statusUpper) {
            case 'PRESENT': return 'Có mặt';
            case 'ABSENT': return 'Vắng mặt';
            case 'LATE': return 'Đi muộn';
            case 'EXCUSED': return 'Có phép';
            default: return status;
        }
    };
    
    // Initialize
    loadStudentId();
}]);

