// ============================================================
// ORGANIZATION CONTROLLER - Quản lý Khoa, Bộ môn, Ngành (Gom chung)
// ============================================================
app.controller('OrganizationController', ['$scope', '$http', 'API_CONFIG', 'AuthService', 'AvatarService', 'ToastService', 'FacultyService', 'PaginationService', 'ApiService', function($scope, $http, API_CONFIG, AuthService, AvatarService, ToastService, FacultyService, PaginationService, ApiService) {
    
    // =========================
    // INITIALIZATION
    // =========================
    $scope.activeTab = 'faculties';
    $scope.faculties = [];
    $scope.departments = [];
    $scope.majors = [];
    $scope.subjects = [];
    
    // ✅ Initialize Pagination
    $scope.facultyPagination = PaginationService.init(10);
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Get current user for header
    $scope.getCurrentUser = function() {
        return AuthService.getCurrentUser();
    };
    
    // Logout function
    $scope.logout = function() {
        AuthService.logout(); // Will auto-redirect to login
    };
    
    // Tab switching function
    $scope.switchTab = function(tabName) {
        $scope.activeTab = tabName;
    };
    
    $scope.facultyForm = {};
    $scope.departmentForm = {};
    $scope.majorForm = {};
    $scope.subjectForm = {};
    
    $scope.filterSubjectByDepartment = '';
    
    $scope.filterDepartmentByFaculty = '';
    $scope.filterMajorByFaculty = '';

    // Load all data on init
    $scope.init = function() {
        // 🔧 FIX: Close any stuck modal overlays
        if (typeof ModalUtils !== 'undefined') {
            ModalUtils.closeAll();
        }
        
        $scope.loadFaculties();
        $scope.loadDepartments();
        $scope.loadMajors();
        $scope.loadSubjects();
    };

    // =========================
    // FACULTY FUNCTIONS
    // =========================
    $scope.loadFaculties = function(forceRefresh) {
        var params = PaginationService.buildQueryParams($scope.facultyPagination);
        
        // ✅ Pass forceRefresh option to FacultyService
        FacultyService.getAll(params.page, params.pageSize, params.search, { forceRefresh: forceRefresh })
            .then(function(response) {
                if (response.data.success) {
                    $scope.faculties = response.data.data;
                    $scope.facultyPagination.totalItems = response.data.totalCount;
                    $scope.facultyPagination = PaginationService.calculate($scope.facultyPagination);
                    
                    // ✅ Counts are now included directly from the API response
                    // No need to make separate API calls for stats
                }
            })
            .catch(function(error) {
                ToastService.error('Lỗi khi tải danh sách khoa');
            });
    };

    $scope.openFacultyModal = function() {
        $scope.facultyForm = { isActive: true };
        window.ModalUtils.open('facultyModal');
    };

    $scope.editFaculty = function(faculty) {
        $scope.facultyForm = angular.copy(faculty);
        window.ModalUtils.open('facultyModal');
    };

    // ✅ Format validation helper
    $scope.validateCodeFormat = function(code, fieldName) {
        if (!code || !code.trim()) {
            return fieldName + ' không được để trống';
        }
        // Chỉ cho phép chữ in hoa và số, độ dài 2-20 ký tự
        if (!/^[A-Z0-9]{2,20}$/.test(code.toUpperCase())) {
            return fieldName + ' phải là chữ in hoa và số, từ 2-20 ký tự, không có khoảng trắng hoặc ký tự đặc biệt';
        }
        return null;
    };

    $scope.validateNameFormat = function(name, fieldName) {
        if (!name || !name.trim()) {
            return fieldName + ' không được để trống';
        }
        var trimmed = name.trim();
        if (trimmed.length < 3) {
            return fieldName + ' phải có ít nhất 3 ký tự';
        }
        if (trimmed.length > 200) {
            return fieldName + ' không được vượt quá 200 ký tự';
        }
        return null;
    };

    $scope.saveFaculty = function() {
        if (!$scope.facultyForm.facultyCode || !$scope.facultyForm.facultyName) {
            ToastService.error('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        // ✅ Format validation
        var codeError = $scope.validateCodeFormat($scope.facultyForm.facultyCode, 'Mã khoa');
        if (codeError) {
            ToastService.error(codeError);
            return;
        }
        var nameError = $scope.validateNameFormat($scope.facultyForm.facultyName, 'Tên khoa');
        if (nameError) {
            ToastService.error(nameError);
            return;
        }

        // ✅ Auto uppercase mã code
        $scope.facultyForm.facultyCode = $scope.facultyForm.facultyCode.toUpperCase().trim();
        $scope.facultyForm.facultyName = $scope.facultyForm.facultyName.trim();

        // ✅ Cảnh báo khi deactivate Faculty có Department/Major active
        if ($scope.facultyForm.facultyId && !$scope.facultyForm.isActive) {
            var faculty = $scope.faculties.find(function(f) { return f.facultyId === $scope.facultyForm.facultyId; });
            if (faculty && (faculty.departmentCount > 0 || faculty.majorCount > 0)) {
                var warningMsg = 'Cảnh báo: Khoa này đang có:\n';
                if (faculty.departmentCount > 0) warningMsg += '- ' + faculty.departmentCount + ' bộ môn\n';
                if (faculty.majorCount > 0) warningMsg += '- ' + faculty.majorCount + ' ngành\n';
                warningMsg += '\nBạn có chắc muốn vô hiệu hóa khoa này?';
                if (!confirm(warningMsg)) {
                    $scope.facultyForm.isActive = true; // Revert
                    return;
                }
            }
        }

        var method = $scope.facultyForm.facultyId ? 'PUT' : 'POST';
        var url = API_CONFIG.BASE_URL + '/faculties';
        if (method === 'PUT') {
            url += '/' + $scope.facultyForm.facultyId;
        }

        $http({
            method: method,
            url: url,
            data: $scope.facultyForm
        })
        .then(function(response) {
            ToastService.success(response.data?.message || 'Lưu thông tin Khoa thành công!');
            window.ModalUtils.close('facultyModal');
            $scope.facultyForm = {};
            // Reload faculties with a small delay to ensure DB commit
            setTimeout(function() {
                $scope.loadFaculties();
            }, 200);
        })
        .catch(function(error) {
            var errorMessage = 'Không thể lưu thông tin Khoa';
            
            // Try to extract error message from different response formats
            if (error.data) {
                if (error.data.message) {
                    errorMessage = error.data.message;
                } else if (error.data.errors) {
                    // Handle validation errors
                    var errors = [];
                    for (var key in error.data.errors) {
                        if (error.data.errors.hasOwnProperty(key)) {
                            errors.push(error.data.errors[key].join(', '));
                        }
                    }
                    errorMessage = errors.join('; ');
                } else if (typeof error.data === 'string') {
                    errorMessage = error.data;
                }
            }
            
            ToastService.error(errorMessage);
        });
    };

    $scope.deleteFaculty = function(facultyId) {
        if (!confirm('Bạn có chắc muốn xóa Khoa này?\nLưu ý: Sẽ ảnh hưởng đến Bộ môn và Ngành liên quan!')) {
            return;
        }

        $http.delete(API_CONFIG.BASE_URL + '/faculties/' + facultyId)
        .then(function(response) {
            ToastService.success(response.data?.message || 'Đã xóa Khoa thành công!');
            // Reload faculties with a small delay
            setTimeout(function() {
                $scope.loadFaculties();
            }, 200);
        })
        .catch(function(error) {
            // ✅ Hiển thị thông báo lỗi rõ ràng với số lượng records
            var errorMessage = 'Không thể xóa Khoa';
            if (error.data) {
                if (error.data.errorType === 'CONSTRAINT_VIOLATION' && error.data.message) {
                    // Hiển thị thông báo lỗi chi tiết với số lượng records
                    errorMessage = error.data.message;
                } else if (error.data.message) {
                    errorMessage = error.data.message;
                }
            }
            ToastService.error(errorMessage);
        });
    };

    // =========================
    // DEPARTMENT FUNCTIONS
    // =========================
    $scope.loadDepartments = function() {
        $http.get(API_CONFIG.BASE_URL + '/departments')
            .then(function(response) {
                // Handle different response formats
                var data = response.data;
                if (data && data.data) {
                    $scope.departments = data.data;
                } else if (Array.isArray(data)) {
                    $scope.departments = data;
                } else {
                    $scope.departments = [];
                }
                
                // Load stats
                $scope.departments.forEach(function(dept) {
                    $scope.loadDepartmentStats(dept);
                });
            })
            .catch(function(error) {
                $scope.departments = [];
                ToastService.error('Lỗi khi tải danh sách bộ môn');
            });
    };

    $scope.loadDepartmentsByFaculty = function() {
        if (!$scope.filterDepartmentByFaculty) {
            $scope.loadDepartments();
            return;
        }

        $http.get(API_CONFIG.BASE_URL + '/departments/faculty/' + $scope.filterDepartmentByFaculty)
            .then(function(response) {
                // Handle different response formats
                var data = response.data;
                if (data && data.data) {
                    $scope.departments = data.data;
                } else if (Array.isArray(data)) {
                    $scope.departments = data;
                } else {
                    $scope.departments = [];
                }
                
                $scope.departments.forEach(function(dept) {
                    $scope.loadDepartmentStats(dept);
                });
            })
            .catch(function(error) {
                $scope.departments = [];
            });
    };

    $scope.loadDepartmentStats = function(dept) {
        // Count subjects
        $http.get(API_CONFIG.BASE_URL + '/subjects')
            .then(function(response) {
                // Filter subjects by department
                var subjects = Array.isArray(response.data) ? response.data : 
                              (response.data.data ? response.data.data : []);
                dept.subjectCount = subjects.filter(function(s) {
                    return s.departmentId === dept.departmentId;
                }).length;
            })
            .catch(function() {
                dept.subjectCount = 0;
            });
        
        // Count lecturers
        $http.get(API_CONFIG.BASE_URL + '/lecturers')
            .then(function(response) {
                var lecturers = Array.isArray(response.data) ? response.data : 
                               (response.data.data ? response.data.data : []);
                dept.lecturerCount = lecturers.filter(function(l) {
                    return l.departmentId === dept.departmentId;
                }).length;
            })
            .catch(function() {
                dept.lecturerCount = 0;
            });
    };

    $scope.openDepartmentModal = function() {
        $scope.departmentForm = { isActive: true };
        $scope.originalDepartmentFacultyId = null; // Reset original faculty ID
        window.ModalUtils.open('departmentModal');
    };

    $scope.editDepartment = function(dept) {
        $scope.departmentForm = angular.copy(dept);
        // ✅ Lưu lại facultyId cũ để so sánh khi save
        $scope.originalDepartmentFacultyId = dept.facultyId;
        window.ModalUtils.open('departmentModal');
    };

    $scope.saveDepartment = function() {
        if (!$scope.departmentForm.facultyId || !$scope.departmentForm.departmentName) {
            ToastService.error('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        // ✅ Format validation (mã code có thể để trống vì auto generate)
        if ($scope.departmentForm.departmentCode) {
            var codeError = $scope.validateCodeFormat($scope.departmentForm.departmentCode, 'Mã bộ môn');
            if (codeError) {
                ToastService.error(codeError);
                return;
            }
            $scope.departmentForm.departmentCode = $scope.departmentForm.departmentCode.toUpperCase().trim();
        }
        var nameError = $scope.validateNameFormat($scope.departmentForm.departmentName, 'Tên bộ môn');
        if (nameError) {
            ToastService.error(nameError);
            return;
        }
        $scope.departmentForm.departmentName = $scope.departmentForm.departmentName.trim();

        var method = $scope.departmentForm.departmentId ? 'PUT' : 'POST';
        var url = API_CONFIG.BASE_URL + '/departments';
        if (method === 'PUT') {
            url += '/' + $scope.departmentForm.departmentId;
        }

        $http({
            method: method,
            url: url,
            data: $scope.departmentForm
        })
        .then(function(response) {
            ToastService.success(response.data?.message || 'Lưu thông tin Bộ môn thành công!');
            window.ModalUtils.close('departmentModal');
            
            // ✅ Reset form trước
            $scope.departmentForm = {};
            $scope.originalDepartmentFacultyId = null;
            
            // ✅ Clear cache trước khi reload để đảm bảo lấy dữ liệu mới nhất
            ApiService.clearCache('/faculties*');
            
            // ✅ Reload sau một delay để đảm bảo database commit xong
            $scope.loadDepartments();
            
            // ✅ Reload faculties để cập nhật counts cho cả khoa cũ và khoa mới
            // Sử dụng setTimeout với delay để đảm bảo database transaction commit xong
            setTimeout(function() {
                $scope.loadFaculties(true); // Force refresh with cache-busting
            }, 300);
        })
        .catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể lưu thông tin Bộ môn');
        });
    };

    $scope.deleteDepartment = function(departmentId) {
        if (!confirm('Bạn có chắc muốn xóa Bộ môn này?\nLưu ý: Sẽ ảnh hưởng đến Môn học và Giảng viên!')) {
            return;
        }

        $http.delete(API_CONFIG.BASE_URL + '/departments/' + departmentId)
        .then(function(response) {
            ToastService.success(response.data?.message || 'Đã xóa Bộ môn thành công!');
            
            // ✅ Clear cache trước khi reload để đảm bảo lấy dữ liệu mới nhất
            ApiService.clearCache('/faculties*');
            
            // Reload departments and also reload faculties to update stats
            setTimeout(function() {
                $scope.loadDepartments();
                $scope.loadFaculties(true); // Force refresh with cache-busting
            }, 300);
        })
        .catch(function(error) {
            // ✅ Hiển thị thông báo lỗi rõ ràng với số lượng records
            var errorMessage = 'Không thể xóa Bộ môn';
            if (error.data) {
                if (error.data.errorType === 'CONSTRAINT_VIOLATION' && error.data.message) {
                    // Hiển thị thông báo lỗi chi tiết với số lượng records
                    errorMessage = error.data.message;
                } else if (error.data.message) {
                    errorMessage = error.data.message;
                }
            }
            ToastService.error(errorMessage);
        });
    };

    // =========================
    // MAJOR FUNCTIONS
    // =========================
    $scope.loadMajors = function() {
        $http.get(API_CONFIG.BASE_URL + '/majors')
            .then(function(response) {
                // Handle different response formats
                var data = response.data;
                if (data && data.data) {
                    $scope.majors = data.data;
                } else if (Array.isArray(data)) {
                    $scope.majors = data;
                } else {
                    $scope.majors = [];
                }
            })
            .catch(function(error) {
                $scope.majors = [];
                ToastService.error('Lỗi khi tải danh sách ngành');
            });
    };

    $scope.loadMajorsByFaculty = function() {
        if (!$scope.filterMajorByFaculty) {
            $scope.loadMajors();
            return;
        }

        $http.get(API_CONFIG.BASE_URL + '/majors')
            .then(function(response) {
                // Handle different response formats
                var data = response.data;
                var allMajors = [];
                if (data && data.data) {
                    allMajors = data.data;
                } else if (Array.isArray(data)) {
                    allMajors = data;
                }
                
                // Filter by faculty
                $scope.majors = allMajors.filter(function(m) {
                    return m.facultyId === $scope.filterMajorByFaculty;
                });
            })
            .catch(function(error) {
                $scope.majors = [];
            });
    };

    $scope.openMajorModal = function() {
        $scope.majorForm = { isActive: true };
        $scope.originalFacultyId = null; // Reset original faculty ID
        window.ModalUtils.open('majorModal');
    };

    $scope.editMajor = function(major) {
        $scope.majorForm = angular.copy(major);
        // ✅ Lưu lại facultyId cũ để so sánh khi save
        $scope.originalFacultyId = major.facultyId;
        window.ModalUtils.open('majorModal');
    };

    $scope.saveMajor = function() {
        if (!$scope.majorForm.facultyId || !$scope.majorForm.majorCode || 
            !$scope.majorForm.majorName) {
            ToastService.error('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        // ✅ Format validation
        var codeError = $scope.validateCodeFormat($scope.majorForm.majorCode, 'Mã ngành');
        if (codeError) {
            ToastService.error(codeError);
            return;
        }
        var nameError = $scope.validateNameFormat($scope.majorForm.majorName, 'Tên ngành');
        if (nameError) {
            ToastService.error(nameError);
            return;
        }

        // ✅ Auto uppercase mã code
        $scope.majorForm.majorCode = $scope.majorForm.majorCode.toUpperCase().trim();
        $scope.majorForm.majorName = $scope.majorForm.majorName.trim();

        var method = $scope.majorForm.majorId ? 'PUT' : 'POST';
        var url = API_CONFIG.BASE_URL + '/majors';
        if (method === 'PUT') {
            url += '/' + $scope.majorForm.majorId;
        }

        $http({
            method: method,
            url: url,
            data: $scope.majorForm
        })
        .then(function(response) {
            ToastService.success(response.data?.message || 'Lưu thông tin Ngành thành công!');
            window.ModalUtils.close('majorModal');
            
            // ✅ Reset form trước
            $scope.majorForm = {};
            $scope.originalFacultyId = null;
            
            // ✅ Clear cache trước khi reload để đảm bảo lấy dữ liệu mới nhất
            ApiService.clearCache('/faculties*');
            
            // ✅ Reload sau một delay để đảm bảo database commit xong
            // Reload majors trước
            $scope.loadMajors();
            
            // ✅ Reload faculties để cập nhật counts cho cả khoa cũ và khoa mới
            // Sử dụng setTimeout với delay để đảm bảo database transaction commit xong
            setTimeout(function() {
                $scope.loadFaculties(true); // Force refresh with cache-busting
            }, 300);
        })
        .catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể lưu thông tin Ngành');
        });
    };

    $scope.deleteMajor = function(majorId) {
        if (!confirm('Bạn có chắc muốn xóa Ngành này?')) {
            return;
        }

        $http.delete(API_CONFIG.BASE_URL + '/majors/' + majorId)
        .then(function(response) {
            ToastService.success(response.data?.message || 'Đã xóa Ngành thành công!');
            
            // ✅ Clear cache trước khi reload để đảm bảo lấy dữ liệu mới nhất
            ApiService.clearCache('/faculties*');
            
            // Reload majors and also reload faculties to update stats
            setTimeout(function() {
                $scope.loadMajors();
                $scope.loadFaculties(true); // Force refresh with cache-busting
            }, 300);
        })
        .catch(function(error) {
            // ✅ Hiển thị thông báo lỗi rõ ràng với số lượng records
            var errorMessage = 'Không thể xóa Ngành';
            if (error.data) {
                if (error.data.errorType === 'CONSTRAINT_VIOLATION' && error.data.message) {
                    // Hiển thị thông báo lỗi chi tiết với số lượng records
                    errorMessage = error.data.message;
                } else if (error.data.message) {
                    errorMessage = error.data.message;
                }
            }
            ToastService.error(errorMessage);
        });
    };

    // =========================
    // SUBJECT FUNCTIONS
    // =========================
    $scope.loadSubjects = function() {
        $http.get(API_CONFIG.BASE_URL + '/subjects')
            .then(function(response) {
                var data = response.data;
                if (data && data.data) {
                    $scope.subjects = data.data;
                } else if (Array.isArray(data)) {
                    $scope.subjects = data;
                } else {
                    $scope.subjects = [];
                }
                // Ensure array
                if (!Array.isArray($scope.subjects)) {
                    $scope.subjects = [];
                }
            })
            .catch(function(error) {
                $scope.subjects = [];
                ToastService.error('Lỗi khi tải danh sách môn học');
            });
    };

    $scope.loadSubjectsByDepartment = function() {
        if (!$scope.filterSubjectByDepartment) {
            $scope.loadSubjects();
            return;
        }

        $http.get(API_CONFIG.BASE_URL + '/subjects/by-department/' + $scope.filterSubjectByDepartment)
            .then(function(response) {
                var data = response.data;
                if (data && data.data) {
                    $scope.subjects = data.data;
                } else if (Array.isArray(data)) {
                    $scope.subjects = data;
                } else {
                    $scope.subjects = [];
                }
            })
            .catch(function(error) {
                $scope.subjects = [];
            });
    };

    $scope.openSubjectModal = function() {
        $scope.subjectForm = { credits: 3 };
        window.ModalUtils.open('subjectModal');
    };

    $scope.editSubject = function(subject) {
        $scope.subjectForm = angular.copy(subject);
        window.ModalUtils.open('subjectModal');
    };

    $scope.saveSubject = function() {
        if (!$scope.subjectForm.subjectCode || !$scope.subjectForm.subjectName || 
            !$scope.subjectForm.departmentId) {
            ToastService.error('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        var method = $scope.subjectForm.subjectId ? 'PUT' : 'POST';
        var url = API_CONFIG.BASE_URL + '/subjects';
        if (method === 'PUT') {
            url += '/' + $scope.subjectForm.subjectId;
        }

        $http({
            method: method,
            url: url,
            data: $scope.subjectForm
        })
        .then(function(response) {
            ToastService.success(response.data?.message || 'Lưu thông tin Môn học thành công!');
            window.ModalUtils.close('subjectModal');
            $scope.subjectForm = {};
            // Reload subjects and also reload departments to update stats
            setTimeout(function() {
                $scope.loadSubjects();
                $scope.loadDepartments(); // Reload departments to update subject counts
            }, 200);
        })
        .catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể lưu thông tin Môn học');
        });
    };

    $scope.deleteSubject = function(subjectId) {
        if (!confirm('Bạn có chắc muốn xóa Môn học này?')) {
            return;
        }

        $http.delete(API_CONFIG.BASE_URL + '/subjects/' + subjectId)
        .then(function(response) {
            ToastService.success(response.data?.message || 'Đã xóa Môn học thành công!');
            // Reload subjects and also reload departments to update stats
            setTimeout(function() {
                $scope.loadSubjects();
                $scope.loadDepartments(); // Reload departments to update subject counts
            }, 200);
        })
            .catch(function(error) {
                ToastService.error(error.data?.message || 'Không thể xóa Môn học');
            });
    };

    // =========================
    // INITIALIZE
    // =========================
    // Call init after all functions are defined
    $scope.init();
}]);

