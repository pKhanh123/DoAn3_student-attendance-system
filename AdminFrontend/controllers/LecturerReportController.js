// Lecturer Report Controller
app.controller('LecturerReportController', ['$scope', 'ReportService', 'SchoolYearService', 'AdministrativeClassService', 'LecturerService', 'CurrentSemesterHelper', 'ToastService', 'LoggerService', 'AuthService', 'ApiService',
    function($scope, ReportService, SchoolYearService, AdministrativeClassService, LecturerService, CurrentSemesterHelper, ToastService, LoggerService, AuthService, ApiService) {
    
    $scope.loading = false;
    $scope.error = null;
    $scope.currentUser = AuthService.getCurrentUser() || {};
    $scope.lecturerId = null;
    
    // Filter data
    $scope.filters = {
        schoolYearId: null,
        semester: null,
        classId: null // Administrative class
    };
    
    // Dropdown data
    $scope.schoolYears = [];
    $scope.classes = []; // Administrative classes mà lecturer là chủ nhiệm
    $scope.semesters = [1, 2, 3];
    
    // Report data
    $scope.reports = {
        // 1. Điểm danh sinh viên lớp chủ nhiệm
        attendanceStats: {
            totalStudents: 0,
            averageAttendanceRate: 0,
            goodAttendance: 0, // >= 80%
            poorAttendance: 0, // < 50%
            byStatus: {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0
            }
        },
        // 2. Phân bố GPA sinh viên trong lớp
        gpaDistribution: {
            excellent: 0, // >= 3.5
            good: 0,      // 3.0 - 3.49
            average: 0,   // 2.0 - 2.99
            weak: 0       // < 2.0
        },
        // 3. Tín chỉ còn nợ của sinh viên trong lớp
        creditDebtStats: {
            total: 0,
            averageDebt: 0,
            byRange: [] // [{range: '0-10', count: 5}, ...]
        },
        // 4. Bảng sinh viên điểm danh thấp
        lowAttendanceStudents: []
    };
    
    // Load lecturerId từ currentUser
    function loadLecturerId() {
        if (!$scope.currentUser || !$scope.currentUser.userId) {
            $scope.error = 'Không tìm thấy thông tin người dùng.';
            $scope.loading = false;
            return;
        }
        
        // Try multiple ways to get lecturerId
        $scope.lecturerId = $scope.currentUser.lecturerId || 
                           $scope.currentUser.lecturer_id ||
                           $scope.currentUser.relatedId;
        
        // If found, use it directly
        if ($scope.lecturerId) {
            $scope.loadDropdowns();
            return;
        }
        
        // If not found and we have userId, try to get from API
        LecturerService.getByUserId($scope.currentUser.userId)
            .then(function(response) {
                var lecturer = null;
                if (response.data) {
                    if (response.data.data) {
                        lecturer = response.data.data;
                    } else if (response.data.lecturerId || response.data.lecturer_id) {
                        lecturer = response.data;
                    }
                }
                
                if (lecturer) {
                    $scope.lecturerId = lecturer.lecturerId || lecturer.lecturer_id;
                    if ($scope.lecturerId) {
                        $scope.loadDropdowns();
                    } else {
                        $scope.error = 'Không tìm thấy thông tin giảng viên.';
                        $scope.loading = false;
                    }
                } else {
                    $scope.error = 'Không tìm thấy thông tin giảng viên.';
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                LoggerService.error('Error loading lecturer info', error);
                $scope.error = 'Không thể tải thông tin giảng viên: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                $scope.loading = false;
            });
    }
    
    // Load dropdowns
    $scope.loadDropdowns = function() {
        if (!$scope.lecturerId) {
            LoggerService.warn('LecturerId not available, skipping loadDropdowns');
            return;
        }
        
        // Load school years và tự động chọn năm học hiện tại
        SchoolYearService.getAll().then(function(res) {
            $scope.schoolYears = (res.data && res.data.data) || res.data || [];
            
            // Tự động chọn năm học hiện tại
            CurrentSemesterHelper.getCurrentSemesterInfo()
                .then(function(currentSemesterInfo) {
                    if (currentSemesterInfo && currentSemesterInfo.schoolYearId) {
                        $scope.filters.schoolYearId = currentSemesterInfo.schoolYearId;
                        $scope.filters.semester = currentSemesterInfo.semester;
                    } else if ($scope.schoolYears.length > 0 && !$scope.filters.schoolYearId) {
                        $scope.filters.schoolYearId = $scope.schoolYears[0].schoolYearId;
                    }
                });
        }).catch(function(err) {
            LoggerService.error('Load school years error', err);
        });
        
        // ✅ Load administrative classes mà lecturer là chủ nhiệm (filter by advisorId)
        AdministrativeClassService.getAll(1, 1000, null, null, null, $scope.lecturerId)
            .then(function(res) {
                var result = res.data;
                if (result && result.data && Array.isArray(result.data)) {
                    $scope.classes = result.data;
                } else if (result && Array.isArray(result)) {
                    $scope.classes = result;
                } else {
                    $scope.classes = [];
                }
                
                LoggerService.debug('Loaded administrative classes for lecturer', {
                    lecturerId: $scope.lecturerId,
                    totalClasses: $scope.classes.length
                });
            })
            .catch(function(err) {
                LoggerService.error('Load administrative classes error', err);
                $scope.classes = [];
            });
    };
    
    // Load reports
    $scope.loadReports = function() {
        if (!$scope.filters.classId) {
            ToastService.warning('Vui lòng chọn lớp chủ nhiệm');
            return;
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        // ✅ Gọi API để lấy thống kê lớp chủ nhiệm
        var semester = $scope.filters.semester || null;
        var academicYearId = $scope.filters.schoolYearId || null;
        
        AdministrativeClassService.getReport($scope.filters.classId, semester, academicYearId)
            .then(function(res) {
                var reportData = (res.data && res.data.data) || res.data || {};
                
                // Map từ AdminClassReportDto sang format hiện tại
                $scope.reports.attendanceStats = {
                    totalStudents: reportData.totalStudents || 0,
                    averageAttendanceRate: Math.round((reportData.attendanceRate || 0) * 100) / 100,
                    goodAttendance: reportData.studentsWithGoodAttendance || 0,
                    poorAttendance: reportData.studentsWithPoorAttendance || 0,
                    byStatus: {
                        present: 0, // Sẽ tính từ attendance data nếu có
                        absent: 0,
                        late: 0,
                        excused: 0
                    }
                };
                
                // Map GPA distribution
                $scope.reports.gpaDistribution = {
                    excellent: reportData.studentsAbove3_5 || 0, // >= 3.5
                    good: reportData.studentsAbove3_0 || 0,      // 3.0 - 3.49
                    average: reportData.studentsAbove2_0 || 0,   // 2.0 - 2.99
                    weak: reportData.studentsBelow2_0 || 0       // < 2.0
                };
                
                // Credit debt stats - cần tính từ enrollment data
                $scope.reports.creditDebtStats = {
                    total: 0,
                    averageDebt: 0,
                    byRange: []
                };
                
                // Low attendance students - cần lấy từ API hoặc tính từ report data
                $scope.reports.lowAttendanceStudents = [];
                
                LoggerService.debug('Loaded class report', reportData);
            })
            .catch(function(err) {
                $scope.error = 'Lỗi tải thống kê: ' + (err.data && err.data.message || err.statusText || 'Lỗi không xác định');
                LoggerService.error('Load reports error', err);
                ToastService.error('Không thể tải thống kê lớp chủ nhiệm');
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Export to Excel
    $scope.exportExcel = function() {
        try {
            ReportService.exportReport('lecturer', $scope.filters);
            ToastService.success('Đang tải file Excel...');
        } catch (err) {
            ToastService.error('Lỗi export: ' + (err.message || err));
            LoggerService.error('Export error', err);
        }
    };
    
    // Calculate GPA distribution percentages
    $scope.getGpaPercentage = function(category) {
        var total = $scope.reports.gpaDistribution.excellent + 
                   $scope.reports.gpaDistribution.good + 
                   $scope.reports.gpaDistribution.average + 
                   $scope.reports.gpaDistribution.weak;
        if (total === 0) return 0;
        return Math.round(($scope.reports.gpaDistribution[category] / total) * 100);
    };
    
    // Initialize
    loadLecturerId();
}]);

