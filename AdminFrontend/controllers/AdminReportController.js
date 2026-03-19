// Admin Report Controller
app.controller('AdminReportController', ['$scope', '$timeout', 'ReportService', 'SchoolYearService', 'FacultyService', 'MajorService', 'ToastService', 'LoggerService', 
    function($scope, $timeout, ReportService, SchoolYearService, FacultyService, MajorService, ToastService, LoggerService) {
    
    $scope.loading = false;
    $scope.error = null;
    
    // Chart instances
    var gpaChart = null;
    var creditDebtChart = null;
    var academicWarningsChart = null;
    
    // Filter data
    $scope.filters = {
        schoolYearId: null,
        semester: null,
        facultyId: null,
        majorId: null
    };
    
    // Dropdown data
    $scope.schoolYears = [];
    $scope.faculties = [];
    $scope.majors = [];
    $scope.semesters = [1, 2, 3];
    
    // Report data
    $scope.reports = {
        // 1. Số sinh viên còn nợ tín chỉ
        creditDebtStats: {
            total: 0,
            byRange: [] // [{range: '0-10', count: 50}, {range: '11-20', count: 30}, ...]
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
        $scope.loading = true;
        $scope.error = null;
        $scope.errorDetails = null;
        
        ReportService.getAdminReports($scope.filters).then(function(res) {
            var data = (res.data && res.data.data) || res.data || {};
            
            // Map data to scope
            $scope.reports.creditDebtStats = data.creditDebtStats || { total: 0, byRange: [] };
            $scope.reports.academicWarnings = data.academicWarnings || { total: 0, lowGpa: 0, poorAttendance: 0, both: 0 };
            $scope.reports.gpaDistribution = data.gpaDistribution || { excellent: 0, good: 0, average: 0, weak: 0 };
            $scope.reports.topCreditDebt = data.topCreditDebt || [];
            
            // Update charts after data is loaded
            $timeout(function() {
                $scope.initCharts();
            }, 100);
            
            ToastService.success('Tải thống kê thành công');
            
        }).catch(function(err) {
            // Extract detailed error information
            var errorMessage = 'Lỗi tải thống kê';
            var errorDetails = {
                status: err.status || 'Unknown',
                statusText: err.statusText || 'Unknown Error',
                url: err.config && err.config.url || 'Unknown URL',
                method: err.config && err.config.method || 'Unknown',
                timestamp: new Date().toISOString()
            };
            
            // Try to get error message from response
            if (err.data) {
                if (err.data.message) {
                    errorMessage = err.data.message;
                } else if (err.data.error) {
                    errorMessage = err.data.error;
                } else if (typeof err.data === 'string') {
                    errorMessage = err.data;
                }
                
                errorDetails.serverMessage = err.data.message || err.data.error || JSON.stringify(err.data);
                errorDetails.serverError = err.data.error;
            }
            
            // Build detailed error message
            var fullErrorMessage = errorMessage;
            if (errorDetails.status) {
                fullErrorMessage += ' (HTTP ' + errorDetails.status + ')';
            }
            
            $scope.error = fullErrorMessage;
            $scope.errorDetails = errorDetails;
            
            // Log full error details
            LoggerService.error('Load reports error - Full details:', {
                error: err,
                errorDetails: errorDetails,
                filters: $scope.filters
            });
            
            ToastService.error(fullErrorMessage);
        }).finally(function() {
            $scope.loading = false;
        });
    };
    
    // Export to Excel
    $scope.exportExcel = function() {
        try {
            ReportService.exportReport('admin', $scope.filters);
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
    
    // Initialize Chart.js charts
    $scope.initCharts = function() {
        if (typeof Chart === 'undefined') {
            LoggerService.warn('Chart.js not loaded');
            return;
        }
        
        // 1. GPA Distribution - Pie Chart
        var gpaCtx = document.getElementById('gpaChart');
        if (gpaCtx) {
            if (gpaChart) {
                gpaChart.destroy();
            }
            
            var gpaData = [
                $scope.reports.gpaDistribution.excellent || 0,
                $scope.reports.gpaDistribution.good || 0,
                $scope.reports.gpaDistribution.average || 0,
                $scope.reports.gpaDistribution.weak || 0
            ];
            
            gpaChart = new Chart(gpaCtx, {
                type: 'pie',
                data: {
                    labels: ['Giỏi (>= 3.5)', 'Khá (3.0-3.49)', 'Trung bình (2.0-2.99)', 'Yếu (< 2.0)'],
                    datasets: [{
                        data: gpaData,
                        backgroundColor: [
                            'rgba(40, 167, 69, 0.8)',   // Green - Excellent
                            'rgba(0, 123, 255, 0.8)',   // Blue - Good
                            'rgba(255, 193, 7, 0.8)',   // Yellow - Average
                            'rgba(220, 53, 69, 0.8)'    // Red - Weak
                        ],
                        borderColor: [
                            'rgba(40, 167, 69, 1)',
                            'rgba(0, 123, 255, 1)',
                            'rgba(255, 193, 7, 1)',
                            'rgba(220, 53, 69, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    var label = context.label || '';
                                    var value = context.parsed || 0;
                                    var total = gpaData.reduce(function(a, b) { return a + b; }, 0);
                                    var percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return label + ': ' + value + ' sinh viên (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // 2. Credit Debt by Range - Bar Chart
        var creditDebtCtx = document.getElementById('creditDebtChart');
        if (creditDebtCtx && $scope.reports.creditDebtStats.byRange) {
            if (creditDebtChart) {
                creditDebtChart.destroy();
            }
            
            var ranges = $scope.reports.creditDebtStats.byRange.map(function(item) { return item.range; });
            var counts = $scope.reports.creditDebtStats.byRange.map(function(item) { return item.count; });
            
            creditDebtChart = new Chart(creditDebtCtx, {
                type: 'bar',
                data: {
                    labels: ranges,
                    datasets: [{
                        label: 'Số sinh viên',
                        data: counts,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            },
                            title: {
                                display: true,
                                text: 'Số lượng sinh viên'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Khoảng nợ tín chỉ'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Số sinh viên: ' + context.parsed.y;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // 3. Academic Warnings - Doughnut Chart
        var warningsCtx = document.getElementById('academicWarningsChart');
        if (warningsCtx) {
            if (academicWarningsChart) {
                academicWarningsChart.destroy();
            }
            
            var warningsData = [
                $scope.reports.academicWarnings.lowGpa || 0,
                $scope.reports.academicWarnings.poorAttendance || 0,
                $scope.reports.academicWarnings.both || 0
            ];
            
            academicWarningsChart = new Chart(warningsCtx, {
                type: 'doughnut',
                data: {
                    labels: ['GPA < 2.0', 'Điểm danh < 50%', 'Cả hai'],
                    datasets: [{
                        data: warningsData,
                        backgroundColor: [
                            'rgba(255, 193, 7, 0.8)',   // Yellow - Low GPA
                            'rgba(255, 152, 0, 0.8)',   // Orange - Poor Attendance
                            'rgba(220, 53, 69, 0.8)'    // Red - Both
                        ],
                        borderColor: [
                            'rgba(255, 193, 7, 1)',
                            'rgba(255, 152, 0, 1)',
                            'rgba(220, 53, 69, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    var label = context.label || '';
                                    var value = context.parsed || 0;
                                    var total = warningsData.reduce(function(a, b) { return a + b; }, 0);
                                    var percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return label + ': ' + value + ' sinh viên (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        }
    };
    
    // Cleanup charts on scope destroy
    $scope.$on('$destroy', function() {
        if (gpaChart) gpaChart.destroy();
        if (creditDebtChart) creditDebtChart.destroy();
        if (academicWarningsChart) academicWarningsChart.destroy();
    });
    
    // Initialize
    $scope.loadDropdowns();
    $scope.loadReports();
}]);

