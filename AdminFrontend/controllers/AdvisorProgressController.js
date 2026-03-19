// Advisor Progress Controller - Theo dõi tiến độ học tập
app.controller('AdvisorProgressController', [
    '$scope',
    '$routeParams',
    '$location',
    '$timeout',
    'AdvisorService',
    'SchoolYearService',
    'ToastService',
    function($scope, $routeParams, $location, $timeout, AdvisorService, SchoolYearService, ToastService) {
    
    // Get student ID from route params
    $scope.studentId = $routeParams.studentId;
    
    if (!$scope.studentId) {
        ToastService.error('Không tìm thấy mã sinh viên');
        $location.path('/advisor/dashboard');
        return;
    }
    
    // Active tab
    $scope.activeTab = 'gpa';
    
    // Loading states
    $scope.loading = {
        gpa: false,
        attendance: false,
        trends: false,
        schoolYears: false
    };
    
    // Error states
    $scope.error = {
        gpa: null,
        attendance: null,
        trends: null
    };
    
    // Data
    $scope.gpaProgress = null;
    $scope.attendanceProgress = null;
    $scope.trends = null;
    
    // Filters
    $scope.schoolYearId = null;
    $scope.schoolYears = [];
    
    // Chart instances
    $scope.gpaChart = null;
    $scope.attendanceChart = null;
    
    // Load school years
    $scope.loadSchoolYears = function() {
        $scope.loading.schoolYears = true;
        SchoolYearService.getAll({ forceRefresh: false }).then(function(response) {
            var data = response.data?.data || response.data || [];
            $scope.schoolYears = Array.isArray(data) ? data : [];
        }).catch(function(error) {
            // Error('Error loading school years:', error);
            $scope.schoolYears = [];
        }).finally(function() {
            $scope.loading.schoolYears = false;
        });
    };
    
    // Load GPA progress
    $scope.loadGpaProgress = function() {
        $scope.loading.gpa = true;
        $scope.error.gpa = null;
        
        AdvisorService.getStudentGpaProgress($scope.studentId, $scope.schoolYearId, false).then(function(data) {
            $scope.gpaProgress = data;
            $scope.loading.gpa = false;
            
            // Render chart after data is loaded
            $timeout(function() {
                $scope.renderGpaChart();
            }, 100);
        }).catch(function(error) {
            // Error('Error loading GPA progress:', error);
            $scope.error.gpa = error.message || error.data?.message || 'Lỗi khi tải tiến độ GPA';
            $scope.loading.gpa = false;
        });
    };
    
    // Load attendance progress
    $scope.loadAttendanceProgress = function() {
        $scope.loading.attendance = true;
        $scope.error.attendance = null;
        
        AdvisorService.getStudentAttendanceProgress($scope.studentId, $scope.schoolYearId, false).then(function(data) {
            $scope.attendanceProgress = data;
            $scope.loading.attendance = false;
            
            // Render chart after data is loaded
            $timeout(function() {
                $scope.renderAttendanceChart();
            }, 100);
        }).catch(function(error) {
            // Error('Error loading attendance progress:', error);
            $scope.error.attendance = error.message || error.data?.message || 'Lỗi khi tải tiến độ chuyên cần';
            $scope.loading.attendance = false;
        });
    };
    
    // Load trends
    $scope.loadTrends = function() {
        $scope.loading.trends = true;
        $scope.error.trends = null;
        
        AdvisorService.getStudentTrends($scope.studentId, false).then(function(data) {
            $scope.trends = data;
            $scope.loading.trends = false;
        }).catch(function(error) {
            // Error('Error loading trends:', error);
            $scope.error.trends = error.message || error.data?.message || 'Lỗi khi tải xu hướng';
            $scope.loading.trends = false;
        });
    };
    
    // Switch tab
    $scope.switchTab = function(tab) {
        $scope.activeTab = tab;
        
        // Load data for the tab if not already loaded
        if (tab === 'gpa' && !$scope.gpaProgress && !$scope.error.gpa) {
            $scope.loadGpaProgress();
        } else if (tab === 'attendance' && !$scope.attendanceProgress && !$scope.error.attendance) {
            $scope.loadAttendanceProgress();
        } else if (tab === 'trends' && !$scope.trends && !$scope.error.trends) {
            $scope.loadTrends();
        } else if (tab === 'gpa') {
            $timeout(function() {
                $scope.renderGpaChart();
            }, 100);
        } else if (tab === 'attendance') {
            $timeout(function() {
                $scope.renderAttendanceChart();
            }, 100);
        }
    };
    
    // Render GPA chart
    $scope.renderGpaChart = function() {
        if (!window.Chart || !$scope.gpaProgress || !$scope.gpaProgress.progressItems || $scope.gpaProgress.progressItems.length === 0) {
            return;
        }
        
        var canvas = document.getElementById('gpaChart');
        if (!canvas) {
            return;
        }
        
        // Destroy existing chart
        if ($scope.gpaChart) {
            $scope.gpaChart.destroy();
        }
        
        var ctx = canvas.getContext('2d');
        var labels = [];
        var gpaData = [];
        var classAverageData = [];
        
        $scope.gpaProgress.progressItems.forEach(function(item) {
            var label = (item.schoolYearCode || 'N/A') + ' - HK' + (item.semester || '0');
            labels.push(label);
            gpaData.push(item.gpa || 0);
            classAverageData.push(item.classAverageGpa || 0);
        });
        
        $scope.gpaChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'GPA Sinh viên',
                        data: gpaData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1,
                        fill: true
                    },
                    {
                        label: 'GPA Trung bình lớp',
                        data: classAverageData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.1,
                        fill: true,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Tiến độ GPA theo học kỳ'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: 'GPA'
                        }
                    }
                }
            }
        });
    };
    
    // Render attendance chart
    $scope.renderAttendanceChart = function() {
        if (!window.Chart || !$scope.attendanceProgress || !$scope.attendanceProgress.progressItems || $scope.attendanceProgress.progressItems.length === 0) {
            return;
        }
        
        var canvas = document.getElementById('attendanceChart');
        if (!canvas) {
            return;
        }
        
        // Destroy existing chart
        if ($scope.attendanceChart) {
            $scope.attendanceChart.destroy();
        }
        
        var ctx = canvas.getContext('2d');
        var labels = [];
        var attendanceData = [];
        var classAverageData = [];
        
        $scope.attendanceProgress.progressItems.forEach(function(item) {
            var label = (item.schoolYearCode || 'N/A') + ' - HK' + (item.semester || '0');
            labels.push(label);
            attendanceData.push(item.attendanceRate || 0);
            classAverageData.push(item.classAverageAttendanceRate || 0);
        });
        
        $scope.attendanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tỷ lệ chuyên cần',
                        data: attendanceData,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.1,
                        fill: true
                    },
                    {
                        label: 'Trung bình lớp',
                        data: classAverageData,
                        borderColor: 'rgb(255, 159, 64)',
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        tension: 0.1,
                        fill: true,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Tiến độ chuyên cần theo học kỳ'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Tỷ lệ (%)'
                        }
                    }
                }
            }
        });
    };
    
    // Filter change
    $scope.onFilterChange = function() {
        if ($scope.activeTab === 'gpa') {
            $scope.loadGpaProgress();
        } else if ($scope.activeTab === 'attendance') {
            $scope.loadAttendanceProgress();
        }
    };
    
    // Get trend badge class
    $scope.getTrendBadgeClass = function(trend) {
        switch(trend) {
            case 'increasing':
                return 'badge-success';
            case 'decreasing':
                return 'badge-danger';
            default:
                return 'badge-secondary';
        }
    };
    
    // Get trend text
    $scope.getTrendText = function(trend) {
        switch(trend) {
            case 'increasing':
                return 'Tăng';
            case 'decreasing':
                return 'Giảm';
            default:
                return 'Ổn định';
        }
    };
    
    // Get alert severity class
    $scope.getAlertSeverityClass = function(severity) {
        switch(severity) {
            case 'success':
                return 'alert-success';
            case 'warning':
                return 'alert-warning';
            case 'danger':
                return 'alert-danger';
            default:
                return 'alert-info';
        }
    };
    
    // Navigate to student detail
    $scope.viewStudentDetail = function() {
        $location.path('/advisor/students/' + $scope.studentId);
    };
    
    // Initialize
    $scope.loadSchoolYears();
    $scope.loadGpaProgress(); // Load default tab
}]);

