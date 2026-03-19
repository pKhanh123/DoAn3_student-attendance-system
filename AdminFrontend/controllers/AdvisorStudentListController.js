// Advisor Student List Controller - Danh sách sinh viên toàn trường
app.controller('AdvisorStudentListController', [
    '$scope',
    '$location',
    '$timeout',
    'AdvisorService',
    'FacultyService',
    'MajorService',
    'AdministrativeClassService',
    'ToastService',
    function($scope, $location, $timeout, AdvisorService, FacultyService, MajorService, AdministrativeClassService, ToastService) {
    
    // Students list
    $scope.students = [];
    $scope.loadingStudents = false;
    $scope.errorStudents = null;
    
    // Pagination
    $scope.pagination = {
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0
    };
    
    // Show all students toggle
    $scope.showAll = false;
    
    // Filters
    $scope.filters = {
        facultyId: null,
        majorId: null,
        classId: null,
        cohortYear: null,
        search: null,
        warningStatus: null,
        gpaMin: null,
        gpaMax: null,
        attendanceRateMin: null,
        attendanceRateMax: null
    };
    
    // Filter options
    $scope.faculties = [];
    $scope.majors = [];
    $scope.classes = [];
    $scope.loadingFilters = false;
    
    // Warning status options
    $scope.warningStatusOptions = [
        { value: null, label: 'Tất cả' },
        { value: 'none', label: 'Bình thường' },
        { value: 'attendance', label: 'Cảnh báo chuyên cần' },
        { value: 'academic', label: 'Cảnh báo học tập' },
        { value: 'both', label: 'Cảnh báo cả hai' }
    ];
    
    // Cohort years (common years)
    $scope.cohortYears = [];
    
    // Initialize cohort years (last 10 years)
    $scope.initCohortYears = function() {
        var currentYear = new Date().getFullYear();
        $scope.cohortYears = [];
        for (var i = 0; i < 10; i++) {
            $scope.cohortYears.push((currentYear - i).toString());
        }
    };
    
    // Load faculties
    $scope.loadFaculties = function() {
        $scope.loadingFilters = true;
        FacultyService.getAll().then(function(response) {
            var data = response.data?.data || response.data || [];
            $scope.faculties = Array.isArray(data) ? data : [];
        }).catch(function(error) {
            // Suppress 403 errors (permission denied) - Advisor may not have access
            if (error.status !== 403) {
                // Error('Error loading faculties:', error);
            }
            $scope.faculties = [];
        }).finally(function() {
            $scope.loadingFilters = false;
        });
    };
    
    // Load majors by faculty
    $scope.loadMajors = function() {
        if ($scope.filters.facultyId) {
            $scope.loadingFilters = true;
            MajorService.getByFaculty($scope.filters.facultyId).then(function(response) {
                var data = response.data?.data || response.data || [];
                $scope.majors = Array.isArray(data) ? data : [];
            }).catch(function(error) {
                // Suppress 403 errors (permission denied)
                if (error.status !== 403) {
                    // Error('Error loading majors:', error);
                }
                $scope.majors = [];
            }).finally(function() {
                $scope.loadingFilters = false;
            });
        } else {
            $scope.majors = [];
            $scope.filters.majorId = null;
        }
        $scope.loadClasses();
    };
    
    // Load classes by major
    $scope.loadClasses = function() {
        if ($scope.filters.majorId) {
            $scope.loadingFilters = true;
            AdministrativeClassService.getAll(1, 1000, null, $scope.filters.majorId, null, null).then(function(response) {
                var data = response.data?.data || response.data || [];
                $scope.classes = Array.isArray(data) ? data : [];
            }).catch(function(error) {
                // Suppress 403 errors (permission denied)
                if (error.status !== 403) {
                    // Error('Error loading classes:', error);
                }
                $scope.classes = [];
            }).finally(function() {
                $scope.loadingFilters = false;
            });
        } else {
            $scope.classes = [];
            $scope.filters.classId = null;
        }
    };
    
    // Check if at least one filter is provided or showAll is enabled
    $scope.hasFilter = function() {
        return $scope.showAll || 
               $scope.filters.facultyId || 
               $scope.filters.majorId || 
               $scope.filters.classId || 
               $scope.filters.cohortYear || 
               $scope.filters.search || 
               $scope.filters.warningStatus ||
               ($scope.filters.gpaMin !== null && $scope.filters.gpaMin !== undefined) ||
               ($scope.filters.gpaMax !== null && $scope.filters.gpaMax !== undefined) ||
               ($scope.filters.attendanceRateMin !== null && $scope.filters.attendanceRateMin !== undefined) ||
               ($scope.filters.attendanceRateMax !== null && $scope.filters.attendanceRateMax !== undefined);
    };
    
    // Load students
    $scope.loadStudents = function(page) {
        console.log('[AdvisorStudentList] 🔍 loadStudents() - Bắt đầu tải danh sách sinh viên');
        console.log('[AdvisorStudentList] 📊 Trạng thái:', {
            page: page,
            currentPage: $scope.pagination.page,
            showAll: $scope.showAll,
            hasFilter: $scope.hasFilter(),
            filters: $scope.filters
        });
        
        // Validate filters (unless showAll is enabled)
        if (!$scope.hasFilter()) {
            console.log('[AdvisorStudentList] ❌ Không có filter và showAll = false');
            $scope.errorStudents = 'Vui lòng chọn ít nhất một bộ lọc để tìm kiếm sinh viên, hoặc bật "Xem tất cả" để hiển thị toàn bộ sinh viên.';
            $scope.students = [];
            return;
        }
        
        if (page) {
            $scope.pagination.page = page;
            console.log('[AdvisorStudentList] 📄 Chuyển trang:', page);
        }
        
        $scope.loadingStudents = true;
        $scope.errorStudents = null;
        
        var params = {
            page: $scope.pagination.page,
            pageSize: $scope.pagination.pageSize,
            filters: $scope.filters,
            showAll: $scope.showAll
        };
        
        console.log('[AdvisorStudentList] 📤 Gửi request với params:', params);
        
        AdvisorService.getStudents(params, false).then(function(response) {
            console.log('[AdvisorStudentList] 📥 Nhận được response:', response);
            console.log('[AdvisorStudentList] 📊 Dữ liệu:', {
                studentsCount: response.data?.length || 0,
                pagination: response.pagination
            });
            
            $scope.students = response.data || [];
            $scope.pagination = {
                page: response.pagination?.page || 1,
                pageSize: response.pagination?.pageSize || 20,
                totalCount: response.pagination?.totalCount || 0,
                totalPages: response.pagination?.totalPages || 0
            };
            
            console.log('[AdvisorStudentList] ✅ Đã cập nhật:', {
                studentsCount: $scope.students.length,
                pagination: $scope.pagination
            });
            
            $scope.loadingStudents = false;
        }).catch(function(error) {
            console.error('[AdvisorStudentList] ❌ Lỗi khi tải danh sách sinh viên:', error);
            console.error('[AdvisorStudentList] ❌ Error details:', {
                message: error.message,
                data: error.data,
                status: error.status,
                statusText: error.statusText
            });
            
            $scope.errorStudents = error.message || error.data?.message || 'Lỗi khi tải danh sách sinh viên';
            $scope.students = [];
            $scope.loadingStudents = false;
            ToastService.error('Lỗi khi tải danh sách sinh viên');
        });
    };
    
    // Clear filters
    $scope.clearFilters = function() {
        $scope.showAll = false;
        $scope.filters = {
            facultyId: null,
            majorId: null,
            classId: null,
            cohortYear: null,
            search: null,
            warningStatus: null,
            gpaMin: null,
            gpaMax: null,
            attendanceRateMin: null,
            attendanceRateMax: null
        };
        $scope.majors = [];
        $scope.classes = [];
        $scope.students = [];
        $scope.errorStudents = null;
        $scope.pagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0
        };
    };
    
    // Toggle show all (deprecated - logic moved to onShowAllToggle)
    $scope.toggleShowAll = function() {
        // Logic moved to onShowAllToggle for better control
    };
    
    // Handle show all toggle change
    $scope.onShowAllToggle = function() {
        console.log('[AdvisorStudentList] 🔘 onShowAllToggle() - showAll:', $scope.showAll);
        
        // When enabling showAll, clear filters first
        if ($scope.showAll) {
            console.log('[AdvisorStudentList] ✅ Bật showAll, đang xóa filters...');
            $scope.filters = {
                facultyId: null,
                majorId: null,
                classId: null,
                cohortYear: null,
                search: null,
                warningStatus: null,
                gpaMin: null,
                gpaMax: null,
                attendanceRateMin: null,
                attendanceRateMax: null
            };
            $scope.majors = [];
            $scope.classes = [];
            $scope.pagination.page = 1;
            $scope.errorStudents = null;
            console.log('[AdvisorStudentList] ✅ Đã xóa filters, đang load students...');
            // Use $timeout to ensure showAll is updated in the scope
            $timeout(function() {
                $scope.loadStudents();
            }, 0);
        } else {
            console.log('[AdvisorStudentList] ℹ️ Tắt showAll, reset pagination và clear students');
            $scope.pagination.page = 1;
            $scope.students = [];
            $scope.errorStudents = null;
        }
    };
    
    // Search with debounce
    var searchTimeout;
    $scope.onSearchChange = function() {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(function() {
            if ($scope.hasFilter()) {
                $scope.pagination.page = 1;
                $scope.loadStudents();
            }
        }, 500);
    };
    
    // View student detail
    $scope.viewStudentDetail = function(studentId) {
        $location.path('/advisor/students/' + studentId);
    };
    
    // Get warning badge class
    $scope.getWarningBadgeClass = function(warningType) {
        switch(warningType) {
            case 'attendance':
                return 'badge-danger';
            case 'academic':
                return 'badge-warning';
            case 'both':
                return 'badge-danger';
            default:
                return 'badge-success';
        }
    };
    
    // Get warning text
    $scope.getWarningText = function(warningType) {
        switch(warningType) {
            case 'attendance':
                return 'Chuyên cần';
            case 'academic':
                return 'Học tập';
            case 'both':
                return 'Cả hai';
            default:
                return 'Bình thường';
        }
    };
    
    // Get absence rate
    $scope.getAbsenceRate = function(student) {
        if (!student.attendanceRate && student.attendanceRate !== 0) {
            return 0;
        }
        return Math.max(0, 100 - student.attendanceRate);
    };
    
    // Get page numbers for pagination
    $scope.getPageNumbers = function() {
        var pages = [];
        var totalPages = $scope.pagination.totalPages;
        var currentPage = $scope.pagination.page;
        var maxPages = 10;
        
        if (totalPages <= maxPages) {
            for (var i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            // Show pages around current page
            var startPage = Math.max(2, currentPage - 2);
            var endPage = Math.min(totalPages - 1, currentPage + 2);
            
            if (startPage > 2) {
                pages.push('...');
            }
            
            for (var j = startPage; j <= endPage; j++) {
                pages.push(j);
            }
            
            if (endPage < totalPages - 1) {
                pages.push('...');
            }
            
            // Always show last page
            pages.push(totalPages);
        }
        
        return pages;
    };
    
    // Initialize
    console.log('[AdvisorStudentList] 🚀 Khởi tạo controller');
    $scope.initCohortYears();
    $scope.loadFaculties();
    console.log('[AdvisorStudentList] ✅ Controller đã được khởi tạo');
}]);

