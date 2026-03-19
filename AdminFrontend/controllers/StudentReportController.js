// Student Report Controller
app.controller('StudentReportController', ['$scope', 'ReportService', 'SchoolYearService', 'ToastService', 'LoggerService', 'AuthService',
    function($scope, ReportService, SchoolYearService, ToastService, LoggerService, AuthService) {
    
    $scope.loading = false;
    $scope.error = null;
    $scope.currentUser = AuthService.getCurrentUser() || {};
    
    // Filter data
    $scope.filters = {
        schoolYearId: null,
        semester: null
    };
    
    // Dropdown data
    $scope.schoolYears = [];
    $scope.semesters = [1, 2, 3];
    
    // Report data - Tổng quan học tập
    $scope.reports = {
        // 1. Tổng quan (Cards)
        overview: {
            cumulativeGpa: 0,
            attendanceRate: 0,
            creditsEarned: 0,
            creditsRegistered: 0,
            totalSubjects: 0,
            passedSubjects: 0,
            failedSubjects: 0
        },
        // 2. Xu hướng GPA theo học kỳ (Biểu đồ đường)
        gpaTrend: [], // [{semester: 'HK1 2023-2024', gpa: 3.2}, ...]
        // 3. Phân bố điểm số (Biểu đồ tròn)
        gradeDistribution: {
            A: 0,
            B: 0,
            C: 0,
            D: 0,
            F: 0
        },
        // 4. Tín chỉ còn nợ
        creditDebt: {
            total: 0,
            requiredCredits: 120, // Tổng số tín chỉ cần để tốt nghiệp
            progress: 0 // Phần trăm hoàn thành
        }
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
    };
    
    // Load reports
    $scope.loadReports = function() {
        $scope.loading = true;
        $scope.error = null;
        
        ReportService.getStudentReports($scope.filters).then(function(res) {
            var data = (res.data && res.data.data) || res.data || {};
            
            // Map data to scope - handle case sensitivity
            var cumulativeGpaValue = (data.overview && data.overview.cumulativeGpa !== undefined) ? data.overview.cumulativeGpa : 
                                     (data.Overview && data.Overview.CumulativeGpa !== undefined) ? data.Overview.CumulativeGpa : null;
            
            var attendanceRateValue = (data.overview && data.overview.attendanceRate !== undefined) ? data.overview.attendanceRate : 
                                     (data.Overview && data.Overview.AttendanceRate !== undefined) ? data.Overview.AttendanceRate : 0;
            
            var creditsEarnedValue = (data.overview && data.overview.creditsEarned !== undefined) ? data.overview.creditsEarned : 
                                     (data.Overview && data.Overview.CreditsEarned !== undefined) ? data.Overview.CreditsEarned : 0;
            
            var mappedOverview = {
                cumulativeGpa: cumulativeGpaValue,
                attendanceRate: attendanceRateValue,
                creditsEarned: creditsEarnedValue,
                creditsRegistered: (data.overview && data.overview.creditsRegistered !== undefined) ? data.overview.creditsRegistered : 
                                 (data.Overview && data.Overview.CreditsRegistered !== undefined) ? data.Overview.CreditsRegistered : 0,
                totalSubjects: (data.overview && data.overview.totalSubjects !== undefined) ? data.overview.totalSubjects : 
                              (data.Overview && data.Overview.TotalSubjects !== undefined) ? data.Overview.TotalSubjects : 0,
                passedSubjects: (data.overview && data.overview.passedSubjects !== undefined) ? data.overview.passedSubjects : 
                               (data.Overview && data.Overview.PassedSubjects !== undefined) ? data.Overview.PassedSubjects : 0,
                failedSubjects: (data.overview && data.overview.failedSubjects !== undefined) ? data.overview.failedSubjects : 
                               (data.Overview && data.Overview.FailedSubjects !== undefined) ? data.Overview.FailedSubjects : 0
            };
            $scope.reports.overview = mappedOverview;
            
            var mappedGpaTrend = (data.gpaTrend || data.GpaTrend || []).map(function(item) {
                return {
                    semester: item.semester || item.Semester || '',
                    gpa: item.gpa || item.Gpa || 0
                };
            });
            $scope.reports.gpaTrend = mappedGpaTrend;
            
            var gradeDist = data.gradeDistribution || data.GradeDistribution || {};
            var mappedGradeDist = {
                A: gradeDist.A || gradeDist.a || 0,
                B: gradeDist.B || gradeDist.b || 0,
                C: gradeDist.C || gradeDist.c || 0,
                D: gradeDist.D || gradeDist.d || 0,
                F: gradeDist.F || gradeDist.f || 0
            };
            $scope.reports.gradeDistribution = mappedGradeDist;
            
            var creditDebt = data.creditDebt || data.CreditDebt || {};
            var mappedCreditDebt = {
                total: creditDebt.total || creditDebt.Total || 0,
                requiredCredits: creditDebt.requiredCredits || creditDebt.RequiredCredits || 120,
                progress: creditDebt.progress || creditDebt.Progress || 0
            };
            $scope.reports.creditDebt = mappedCreditDebt;
            
        }).catch(function(err) {
            $scope.error = 'Lỗi tải thống kê: ' + ((err.data && err.data.message) || err.statusText || 'Unknown error');
            LoggerService.error('Load reports error', err);
        }).finally(function() {
            $scope.loading = false;
        });
    };
    
    // Export to Excel
    $scope.exportExcel = function() {
        try {
            ReportService.exportReport('student', $scope.filters);
            ToastService.success('Đang tải file Excel...');
        } catch (err) {
            ToastService.error('Lỗi export: ' + (err.message || err));
            LoggerService.error('Export error', err);
        }
    };
    
    // Calculate grade distribution percentages
    $scope.getGradePercentage = function(grade) {
        var total = $scope.reports.gradeDistribution.A + 
                   $scope.reports.gradeDistribution.B + 
                   $scope.reports.gradeDistribution.C + 
                   $scope.reports.gradeDistribution.D + 
                   $scope.reports.gradeDistribution.F;
        if (total === 0) return 0;
        return Math.round(($scope.reports.gradeDistribution[grade] / total) * 100);
    };
    
    // Calculate credit debt progress percentage
    $scope.getCreditProgress = function() {
        if ($scope.reports.creditDebt.requiredCredits === 0) return 0;
        // Use progress from backend if available, otherwise calculate from creditsEarned
        if ($scope.reports.creditDebt.progress !== undefined && $scope.reports.creditDebt.progress !== null) {
            return Math.round($scope.reports.creditDebt.progress);
        }
        var creditsEarned = $scope.reports.overview.creditsEarned || 0;
        return Math.round((creditsEarned / $scope.reports.creditDebt.requiredCredits) * 100);
    };
    
    // Initialize
    $scope.loadDropdowns();
    
    // Delay loadReports slightly to ensure dropdowns are loaded first
    setTimeout(function() {
        $scope.loadReports();
    }, 100);
}]);
