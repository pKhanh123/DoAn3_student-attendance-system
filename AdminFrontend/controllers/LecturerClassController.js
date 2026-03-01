// Lecturer Class Management Controller
// Giảng viên chỉ xem được các lớp mình dạy, không thể tạo/sửa/xóa
app.controller('LecturerClassController', [
    '$scope', '$location', '$routeParams', '$timeout', 'ClassService', 'LecturerService', 
    'SubjectService', 'AcademicYearService', 'AuthService', 'AvatarService', 'LoggerService', 
    'PaginationService', 'ApiService', 'ToastService',
    function($scope, $location, $routeParams, $timeout, ClassService, LecturerService, 
             SubjectService, AcademicYearService, AuthService, AvatarService, LoggerService, 
             PaginationService, ApiService, ToastService) {
    
    $scope.classes = [];
    $scope.displayedClasses = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.currentUser = null;
    $scope.lecturerId = null;
    
    // Pagination
    $scope.pagination = PaginationService.init(10);
    
    // Filters (chỉ cho phép filter theo subject, academicYear, semester - không filter theo lecturer)
    $scope.filters = {
        subjectId: '',
        academicYearId: '',
        semester: ''
    };
    
    // Semester options
    $scope.semesters = [
        { value: '1', label: 'Học kỳ 1' },
        { value: '2', label: 'Học kỳ 2' },
        { value: '3', label: 'Học kỳ hè' }
    ];
    
    // Subjects and Academic Years for filters
    $scope.subjects = [];
    $scope.academicYears = [];
    
    // Initialize page
    $scope.initPage = function() {
        $scope.currentUser = AuthService.getCurrentUser();
        
        // Initialize sidebar toggle
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            $scope.menuToggleHandler = function() {
                var sidebar = document.querySelector('.sidebar');
                var mainContent = document.querySelector('.main-content');
                if (sidebar && mainContent) {
                    sidebar.classList.toggle('collapsed');
                    mainContent.classList.toggle('expanded');
                }
            };
            menuToggle.addEventListener('click', $scope.menuToggleHandler);
        }
        
        // Load lecturerId từ currentUser
        loadLecturerId();
    };
    
    // Cleanup event listeners
    $scope.$on('$destroy', function() {
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle && $scope.menuToggleHandler) {
            menuToggle.removeEventListener('click', $scope.menuToggleHandler);
        }
    });
    
    // Load lecturerId từ currentUser
    function loadLecturerId() {
        if (!$scope.currentUser) {
            $scope.error = 'Không tìm thấy thông tin người dùng.';
            $scope.loading = false;
            return;
        }
        
        // Try multiple ways to get lecturerId (similar to other lecturer controllers)
        $scope.lecturerId = $scope.currentUser.lecturerId || 
                           $scope.currentUser.lecturer_id ||
                           $scope.currentUser.relatedId;
        
        // If found, use it directly
        if ($scope.lecturerId) {
            $scope.loadClasses();
            return;
        }
        
        // If not found and we have userId, try to get from API
        if (!$scope.currentUser.userId) {
            $scope.error = 'Không tìm thấy thông tin người dùng.';
            $scope.loading = false;
            return;
        }
        
        // Call API to get lecturer info
        $scope.loading = true;
        LecturerService.getByUserId($scope.currentUser.userId)
            .then(function(response) {
                // Handle different response structures
                var lecturer = null;
                if (response.data) {
                    // Structure 1: { data: { data: {...} } }
                    if (response.data.data) {
                        lecturer = response.data.data;
                    }
                    // Structure 2: { data: {...} }
                    else if (response.data.lecturerId || response.data.lecturer_id) {
                        lecturer = response.data;
                    }
                }
                
                if (lecturer) {
                    $scope.lecturerId = lecturer.lecturerId || lecturer.lecturer_id;
                    if ($scope.lecturerId) {
                        $scope.loadClasses();
                    } else {
                        $scope.error = 'Không tìm thấy thông tin giảng viên.';
                        $scope.loading = false;
                    }
                } else {
                    LoggerService.error('Lecturer not found in response', response);
                    $scope.error = 'Không tìm thấy thông tin giảng viên.';
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                LoggerService.error('Error loading lecturer info', error);
                // Check if it's a 404 (not found) or other error
                if (error.status === 404) {
                    $scope.error = 'Không tìm thấy thông tin giảng viên cho tài khoản này.';
                } else {
                    $scope.error = 'Không thể tải thông tin giảng viên: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                }
                $scope.loading = false;
            });
    }
    
    // Get initial for avatar
    $scope.getInitial = function(user) {
        if (user && user.fullName) {
            return user.fullName.charAt(0).toUpperCase();
        }
        return 'U';
    };
    
    // Clear messages
    $scope.clearMessage = function() {
        $scope.success = null;
        $scope.error = null;
    };
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Open Avatar Modal
    $scope.openAvatarModal = function() {
        if (AvatarService && AvatarService.openModal) {
            AvatarService.openModal();
        }
    };
    
    // Get current user for header
    $scope.getCurrentUser = function() {
        return $scope.currentUser || AuthService.getCurrentUser();
    };
    
    // Logout function
    $scope.logout = function() {
        AuthService.logout();
    };
    
    // Load classes - chỉ load các lớp của giảng viên này
    $scope.loadClasses = function() {
        if (!$scope.lecturerId) {
            LoggerService.warn('LecturerId not available, skipping loadClasses');
            return;
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        // Gọi API endpoint riêng cho lecturer
        ApiService.get('/classes/lecturer/' + $scope.lecturerId)
            .then(function(response) {
                LoggerService.debug('Lecturer classes response', response);
                
                var result = response.data;
                var classesList = [];
                
                if (result && result.data && Array.isArray(result.data)) {
                    classesList = result.data;
                } else if (result && Array.isArray(result)) {
                    classesList = result;
                }
                
                // Apply filters
                var filtered = classesList;
                if ($scope.filters.subjectId) {
                    filtered = filtered.filter(function(c) {
                        return c.subjectId === $scope.filters.subjectId;
                    });
                }
                if ($scope.filters.academicYearId) {
                    filtered = filtered.filter(function(c) {
                        return c.academicYearId === $scope.filters.academicYearId;
                    });
                }
                if ($scope.filters.semester) {
                    filtered = filtered.filter(function(c) {
                        return String(c.semester) === String($scope.filters.semester);
                    });
                }
                
                // Map data
                $scope.displayedClasses = filtered.map(function(classItem) {
                    var currentStudents = classItem.currentEnrollment !== undefined 
                        ? classItem.currentEnrollment 
                        : (classItem.currentStudents !== undefined ? classItem.currentStudents : 0);
                    
                    return {
                        classId: classItem.classId,
                        classCode: classItem.classCode,
                        className: classItem.className,
                        subjectId: classItem.subjectId,
                        subjectCode: classItem.subjectCode || classItem.subjectId, // Thêm subjectCode để hiển thị
                        subjectName: classItem.subjectName || 'N/A',
                        lecturerId: classItem.lecturerId,
                        lecturerName: classItem.lecturerName || 'N/A',
                        semester: classItem.semester,
                        academicYearId: classItem.academicYearId,
                        academicYearCode: classItem.academicYearCode || classItem.academicYearId, // Thêm academicYearCode để hiển thị
                        academicYearName: classItem.academicYearName || 'N/A',
                        maxStudents: classItem.maxStudents || 50,
                        currentStudents: currentStudents,
                        createdAt: classItem.createdAt
                    };
                });
                
                $scope.classes = $scope.displayedClasses;
                $scope.pagination.totalCount = $scope.displayedClasses.length;
                $scope.pagination.totalPages = Math.ceil($scope.pagination.totalCount / $scope.pagination.pageSize);
                
                // ✅ Extract subjects và academic years từ classes đã load
                extractSubjectsFromClasses();
                extractAcademicYearsFromClasses();
                
                LoggerService.debug('Loaded classes for lecturer', {
                    lecturerId: $scope.lecturerId,
                    totalClasses: $scope.displayedClasses.length,
                    uniqueSubjects: $scope.subjects.length,
                    uniqueAcademicYears: $scope.academicYears.length
                });
            })
            .catch(function(error) {
                LoggerService.error('Error loading lecturer classes', error);
                $scope.error = 'Không thể tải danh sách lớp học: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                ToastService.error('Lỗi tải danh sách lớp học');
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Format date
    $scope.formatDate = function(dateString) {
        if (!dateString) return 'N/A';
        var date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };
    
    // Get semester label
    $scope.getSemesterLabel = function(semester) {
        var sem = $scope.semesters.find(function(s) {
            return String(s.value) === String(semester);
        });
        return sem ? sem.label : 'HK ' + semester;
    };
    
    // View class details (read-only)
    $scope.viewClassDetails = function(classItem) {
        // Có thể mở modal hoặc navigate đến trang chi tiết
        LoggerService.log('View class details', classItem);
        ToastService.info('Xem chi tiết lớp: ' + classItem.className);
    };
    
    // Reset all filters
    $scope.resetFilters = function() {
        $scope.filters = {
            subjectId: '',
            academicYearId: '',
            semester: ''
        };
        // Reload classes với filters đã reset
        $scope.loadClasses();
    };
    
    // Change page - đơn giản hóa, không reload từ API
    $scope.changePage = function(newPage) {
        if (newPage < 1 || newPage > $scope.pagination.totalPages) {
            return;
        }
        
        // Chỉ cập nhật currentPage, không gọi loadClasses() vì data đã có sẵn
        $scope.pagination.currentPage = newPage;
        
        // Scroll to top để dễ nhìn
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Extract unique subjects từ danh sách classes (helper function)
    function extractSubjectsFromClasses() {
        var subjectsMap = {};
        
        // Lấy từ displayedClasses nếu có, nếu không thì từ classes
        var classesList = $scope.displayedClasses && $scope.displayedClasses.length > 0 
            ? $scope.displayedClasses 
            : $scope.classes;
        
        classesList.forEach(function(classItem) {
            if (classItem.subjectId && classItem.subjectName) {
                if (!subjectsMap[classItem.subjectId]) {
                    subjectsMap[classItem.subjectId] = {
                        subjectId: classItem.subjectId,
                        subjectCode: classItem.subjectCode || classItem.subjectId,
                        subjectName: classItem.subjectName
                    };
                }
            }
        });
        
        // Convert map to array và sort by subjectCode
        $scope.subjects = Object.values(subjectsMap).sort(function(a, b) {
            return (a.subjectCode || '').localeCompare(b.subjectCode || '');
        });
        
        LoggerService.debug('Extracted subjects from classes', {
            totalSubjects: $scope.subjects.length,
            subjects: $scope.subjects.map(function(s) { return s.subjectCode + ' - ' + s.subjectName; })
        });
    }
    
    // Extract unique academic years từ danh sách classes (helper function)
    function extractAcademicYearsFromClasses() {
        var academicYearsMap = {};
        
        // Lấy từ displayedClasses nếu có, nếu không thì từ classes
        var classesList = $scope.displayedClasses && $scope.displayedClasses.length > 0 
            ? $scope.displayedClasses 
            : $scope.classes;
        
        classesList.forEach(function(classItem) {
            if (classItem.academicYearId && classItem.academicYearName) {
                if (!academicYearsMap[classItem.academicYearId]) {
                    academicYearsMap[classItem.academicYearId] = {
                        academicYearId: classItem.academicYearId,
                        yearCode: classItem.academicYearCode || classItem.academicYearId,
                        cohortCode: classItem.academicYearCode || classItem.academicYearId,
                        yearName: classItem.academicYearName,
                        description: classItem.academicYearName
                    };
                }
            }
        });
        
        // Convert map to array và sort by yearCode
        $scope.academicYears = Object.values(academicYearsMap).sort(function(a, b) {
            return (a.yearCode || a.cohortCode || '').localeCompare(b.yearCode || b.cohortCode || '');
        });
        
        LoggerService.debug('Extracted academic years from classes', {
            totalAcademicYears: $scope.academicYears.length,
            academicYears: $scope.academicYears.map(function(y) { 
                return (y.yearCode || y.cohortCode) + ' - ' + (y.yearName || y.description); 
            })
        });
    }
    
    // Initialize
    $scope.initPage();
    
    // Subjects và Academic Years sẽ được extract tự động từ classes sau khi loadClasses() hoàn thành
}]);

