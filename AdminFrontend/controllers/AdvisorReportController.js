// Advisor Report Controller
app.controller('AdvisorReportController', ['$scope', 'ReportService', 'SchoolYearService', 'FacultyService', 'MajorService', 'AdministrativeClassService', 'ToastService', 'LoggerService',
    function($scope, ReportService, SchoolYearService, FacultyService, MajorService, AdministrativeClassService, ToastService, LoggerService) {
    
    $scope.loading = false;
    $scope.error = null;
    
    // Filter data (ít nhất 1 filter bắt buộc)
    $scope.filters = {
        schoolYearId: null,
        semester: null,
        facultyId: null,
        majorId: null,
        classId: null,
        cohortYear: null
    };
    
    // Dropdown data
    $scope.schoolYears = [];
    $scope.faculties = [];
    $scope.majors = [];
    $scope.classes = [];
    $scope.semesters = [1, 2, 3];
    
    // Report data
    $scope.reports = {
        // 1. Số sinh viên còn nợ tín chỉ
        creditDebtStats: {
            total: 0,
            byRange: [] // [{range: '0-10', count: 50}, ...]
        },
        // 2. Cảnh báo học tập
        academicWarnings: {
            total: 0,
            lowGpa: 0, // GPA < 2.0
            poorAttendance: 0, // Điểm danh < 50%
            both: 0 // Cả GPA và điểm danh đều thấp
        },
        // 3. Phân bố GPA
        gpaDistribution: {
            excellent: 0, // >= 3.5
            good: 0,      // 3.0 - 3.49
            average: 0,   // 2.0 - 2.99
            weak: 0       // < 2.0
        },
        // 4. Top 10 sinh viên nợ tín chỉ nhiều nhất (bảng)
        topCreditDebt: []
    };
    
    // Load dropdowns
    $scope.loadDropdowns = function() {
        SchoolYearService.getAll().then(function(res) {
            $scope.schoolYears = (res.data && res.data.data) || res.data || [];
            if ($scope.schoolYears.length > 0 && !$scope.filters.schoolYearId) {
                $scope.filters.schoolYearId = $scope.schoolYears[0].schoolYearId;
            }
        }).catch(function(err) {
            LoggerService.error('Load school years error', err);
        });
        
        FacultyService.getAll().then(function(res) {
            $scope.faculties = (res.data && res.data.data) || res.data || [];
        }).catch(function(err) {
            LoggerService.error('Load faculties error', err);
        });
        
        // Load administrative classes
        AdministrativeClassService.getAll().then(function(res) {
            $scope.classes = (res.data && res.data.data) || res.data || [];
        }).catch(function(err) {
            LoggerService.error('Load classes error', err);
        });
    };
    
    // Load majors when faculty changes
    $scope.$watch('filters.facultyId', function(newVal) {
        if (newVal) {
            MajorService.getByFaculty(newVal).then(function(res) {
                $scope.majors = (res.data && res.data.data) || res.data || [];
            }).catch(function(err) {
                LoggerService.error('Load majors error', err);
            });
        } else {
            $scope.majors = [];
            $scope.filters.majorId = null;
        }
    });
    
    // Load reports
    $scope.loadReports = function() {
        // Check if at least one filter is set
        var hasFilter = $scope.filters.schoolYearId || $scope.filters.facultyId || 
                       $scope.filters.majorId || $scope.filters.classId || $scope.filters.cohortYear;
        
        if (!hasFilter) {
            ToastService.warning('Vui lòng chọn ít nhất một bộ lọc (Năm học, Khoa, Ngành, Lớp, hoặc Khóa)');
            return;
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        ReportService.getAdvisorReports($scope.filters).then(function(res) {
            var data = (res.data && res.data.data) || res.data || {};
            
            // Map data to scope
            $scope.reports.creditDebtStats = data.creditDebtStats || { total: 0, byRange: [] };
            $scope.reports.academicWarnings = data.academicWarnings || { total: 0, lowGpa: 0, poorAttendance: 0, both: 0 };
            $scope.reports.gpaDistribution = data.gpaDistribution || { excellent: 0, good: 0, average: 0, weak: 0 };
            $scope.reports.topCreditDebt = data.topCreditDebt || [];
            
        }).catch(function(err) {
            $scope.error = 'Lỗi tải thống kê: ' + (err.data && err.data.message) || err.statusText;
            LoggerService.error('Load reports error', err);
        }).finally(function() {
            $scope.loading = false;
        });
    };
    
    // Export to Excel
    $scope.exportExcel = function() {
        try {
            ReportService.exportReport('advisor', $scope.filters);
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
    $scope.loadDropdowns();
}]);

