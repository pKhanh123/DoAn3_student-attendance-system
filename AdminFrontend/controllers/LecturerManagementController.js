// ============================================================
// LECTURER MANAGEMENT CONTROLLER - Quản lý Giảng viên + Phân môn
// ============================================================
app.controller('LecturerManagementController', ['$scope', '$http', 'API_CONFIG', 'AuthService', 'AvatarService', 'RoleService', 'ToastService', 'LoggerService', 
    function($scope, $http, API_CONFIG, AuthService, AvatarService, RoleService, ToastService, LoggerService) {
    
    // =========================
    // INITIALIZATION
    // =========================
    $scope.activeTab = 'lecturers';
    $scope.lecturers = [];
    $scope.departments = [];
    $scope.allSubjects = [];
    $scope.lecturerForm = {};
    $scope.filterByDepartment = '';
    
    // For subject assignment
    $scope.selectedLecturer = {};
    $scope.lecturerSubjects = [];
    $scope.availableSubjects = [];
    $scope.newSubject = {};
    
    // Pagination for subjects list
    $scope.subjectsCurrentPage = 1;
    $scope.subjectsPageSize = 5; // 5 môn học mỗi trang
    $scope.subjectsTotalPages = 1;
    $scope.paginatedSubjects = [];
    
    // Permission check
    $scope.canViewSubjectAssignment = false;

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

    // Handle tab click
    $scope.onTabClick = function(tabName) {
        LoggerService.debug('Lecturer management tab clicked', tabName);
        $scope.activeTab = tabName;
        LoggerService.debug('Lecturer management active tab', $scope.activeTab);
    };
    
    $scope.init = function() {
        // Prevent multiple simultaneous initializations
        if ($scope.initializing) {
            return;
        }
        $scope.initializing = true;
        
        // Load permissions first, then load data
        RoleService.loadPermissions().then(function() {
            $scope.canViewSubjectAssignment = RoleService.hasPermission('canManageLecturers');
            
            // Now load data
            $scope.loadLecturers();
            $scope.loadDepartments();
            
            // Only load subjects if has permission
            if ($scope.canViewSubjectAssignment) {
                $scope.loadAllSubjects();
            }
            
            $scope.initializing = false;
        }).catch(function(error) {
            LoggerService.error('Error loading lecturer permissions', error);
            
            // Use fallback permissions
            $scope.canViewSubjectAssignment = RoleService.hasPermission('canManageLecturers');
            
            // Still load basic data
            $scope.loadLecturers();
            $scope.loadDepartments();
            
            if ($scope.canViewSubjectAssignment) {
                $scope.loadAllSubjects();
            }
            
            $scope.initializing = false;
        });
    };

    // =========================
    // LECTURER FUNCTIONS
    // =========================
    $scope.loadLecturers = function() {
        $http.get(API_CONFIG.BASE_URL + '/lecturers')
            .then(function(response) {
                $scope.lecturers = response.data;
                
                // Load subject count for each lecturer (only if has permission)
                if ($scope.canViewSubjectAssignment) {
                    $scope.lecturers.forEach(function(lecturer) {
                        $scope.loadLecturerSubjectCount(lecturer);
                    });
                }
            })
            .catch(function(error) {
                ToastService.error('❌ Lỗi tải danh sách giảng viên');
            });
    };

    $scope.loadLecturersByDepartment = function() {
        if (!$scope.filterByDepartment) {
            $scope.loadLecturers();
            return;
        }

        $http.get(API_CONFIG.BASE_URL + '/lecturers')
            .then(function(response) {
                $scope.lecturers = response.data.filter(function(l) {
                    return l.departmentId === $scope.filterByDepartment;
                });

                // Load subject count (only if has permission)
                if ($scope.canViewSubjectAssignment) {
                    $scope.lecturers.forEach(function(lecturer) {
                        $scope.loadLecturerSubjectCount(lecturer);
                    });
                }
            })
            .catch(function(error) {
                ToastService.error('❌ Lỗi tải danh sách giảng viên');
            });
    };

    $scope.loadLecturerSubjectCount = function(lecturer) {
        $http.get(API_CONFIG.BASE_URL + '/lecturer-subjects/lecturer/' + lecturer.lecturerId)
            .then(function(response) {
                lecturer.subjectCount = (response.data.data || []).length;
            })
            .catch(function() {
                lecturer.subjectCount = 0;
            });
    };

    $scope.loadDepartments = function() {
        $http.get(API_CONFIG.BASE_URL + '/departments')
            .then(function(response) {
                $scope.departments = response.data;
            })
            .catch(function(error) {
                ToastService.error('❌ Lỗi tải danh sách bộ môn');
            });
    };

    $scope.openLecturerModal = function() {
        $scope.lecturerForm = { isActive: true };
        ModalUtils.open('lecturerModal');
    };

    // Format date for date input (YYYY-MM-DD format)
    function formatDateForInput(dateString) {
        if (!dateString) return null;
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            // Format as YYYY-MM-DD for date input
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        } catch (e) {
            return null;
        }
    }
    
    $scope.editLecturer = function(lecturer) {
        $scope.lecturerForm = angular.copy(lecturer);
        // Format dates for date inputs to avoid AngularJS datefmt error
        if ($scope.lecturerForm.joinDate) {
            $scope.lecturerForm.joinDate = formatDateForInput($scope.lecturerForm.joinDate);
        }
        ModalUtils.open('lecturerModal');
    };

    $scope.saveLecturer = function() {
        if (!$scope.lecturerForm.fullName || !$scope.lecturerForm.email || 
            !$scope.lecturerForm.departmentId) {
            ToastService.warning('⚠️ Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        var method = $scope.lecturerForm.lecturerId ? 'PUT' : 'POST';
        var url = API_CONFIG.BASE_URL + '/lecturers';
        if (method === 'PUT') {
            url += '/' + $scope.lecturerForm.lecturerId;
        }

        $http({
            method: method,
            url: url,
            data: $scope.lecturerForm
        })
        .then(function(response) {
            ToastService.success('✅ Lưu thông tin Giảng viên thành công!');
            ModalUtils.close('lecturerModal');
            $scope.loadLecturers();
            $scope.lecturerForm = {};
        })
        .catch(function(error) {
            var errorMsg = error.data?.message || 'Không thể lưu thông tin Giảng viên';
            ToastService.error('❌ Lỗi: ' + errorMsg);
        });
    };

    $scope.deleteLecturer = function(lecturerId) {
        if (!confirm('Bạn có chắc muốn xóa Giảng viên này?')) {
            return;
        }

        $http.delete(API_CONFIG.BASE_URL + '/lecturers/' + lecturerId)
            .then(function(response) {
                ToastService.success('🗑 Đã xóa Giảng viên!');
                $scope.loadLecturers();
            })
            .catch(function(error) {
                var errorMsg = error.data?.message || 'Không thể xóa Giảng viên';
                ToastService.error('❌ Lỗi: ' + errorMsg);
            });
    };

    // =========================
    // SUBJECT ASSIGNMENT FUNCTIONS
    // =========================
    $scope.loadAllSubjects = function() {
        var url = API_CONFIG.BASE_URL + '/subjects';
        
        $http.get(url)
            .then(function(response) {
                // Handle different response formats
                var subjects = [];
                if (Array.isArray(response.data)) {
                    subjects = response.data;
                } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                    subjects = response.data.data;
                } else if (response.data && Array.isArray(response.data.items)) {
                    subjects = response.data.items;
                } else {
                    subjects = [];
                }
                
                $scope.allSubjects = subjects;
                
                // Load assigned lecturers for each subject
                if ($scope.allSubjects.length > 0) {
                    $scope.allSubjects.forEach(function(subject) {
                        $scope.loadSubjectLecturers(subject);
                    });
                }
                
                // Update pagination
                $scope.updateSubjectsPagination();
            })
            .catch(function(error) {
                // Try to extract error message
                var errorMsg = '❌ Lỗi tải danh sách môn học';
                if (error.data) {
                    if (typeof error.data === 'string') {
                        errorMsg = error.data;
                    } else if (error.data.message) {
                        errorMsg = error.data.message;
                    } else if (error.data.error) {
                        errorMsg = error.data.error;
                    }
                } else if (error.status === 404) {
                    errorMsg = 'Không tìm thấy endpoint môn học';
                } else if (error.status === 500) {
                    errorMsg = 'Lỗi server khi tải danh sách môn học';
                } else if (error.status === 0) {
                    errorMsg = 'Không thể kết nối đến server';
                }
                
                ToastService.error(errorMsg);
            });
    };
    
    // Pagination functions for subjects list
    $scope.updateSubjectsPagination = function() {
        $scope.subjectsTotalPages = Math.ceil($scope.allSubjects.length / $scope.subjectsPageSize);
        if ($scope.subjectsCurrentPage > $scope.subjectsTotalPages && $scope.subjectsTotalPages > 0) {
            $scope.subjectsCurrentPage = $scope.subjectsTotalPages;
        }
        $scope.updatePaginatedSubjects();
    };
    
    $scope.updatePaginatedSubjects = function() {
        var start = ($scope.subjectsCurrentPage - 1) * $scope.subjectsPageSize;
        var end = start + $scope.subjectsPageSize;
        $scope.paginatedSubjects = $scope.allSubjects.slice(start, end);
    };
    
    $scope.goToSubjectsPage = function(page) {
        if (page >= 1 && page <= $scope.subjectsTotalPages) {
            $scope.subjectsCurrentPage = page;
            $scope.updatePaginatedSubjects();
        }
    };
    
    $scope.previousSubjectsPage = function() {
        if ($scope.subjectsCurrentPage > 1) {
            $scope.subjectsCurrentPage--;
            $scope.updatePaginatedSubjects();
        }
    };
    
    $scope.nextSubjectsPage = function() {
        if ($scope.subjectsCurrentPage < $scope.subjectsTotalPages) {
            $scope.subjectsCurrentPage++;
            $scope.updatePaginatedSubjects();
        }
    };
    
    $scope.getSubjectsPages = function() {
        var pages = [];
        var startPage = Math.max(1, $scope.subjectsCurrentPage - 2);
        var endPage = Math.min($scope.subjectsTotalPages, $scope.subjectsCurrentPage + 2);
        
        for (var i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    $scope.loadSubjectLecturers = function(subject) {
        if (!subject || !subject.subjectId) {
            return;
        }
        
        var url = API_CONFIG.BASE_URL + '/lecturer-subjects/subject/' + subject.subjectId;
        
        $http.get(url)
            .then(function(response) {
                // Handle different response formats
                var lecturers = [];
                if (Array.isArray(response.data)) {
                    lecturers = response.data;
                } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                    lecturers = response.data.data;
                } else if (response.data && Array.isArray(response.data.items)) {
                    lecturers = response.data.items;
                }
                
                subject.assignedLecturers = lecturers;
            })
            .catch(function(error) {
                subject.assignedLecturers = [];
            });
    };

    $scope.assignSubjects = function(lecturer) {
        $scope.selectedLecturer = lecturer;
        $scope.newSubject = { isPrimary: false, experienceYears: 0 };
        
        // Load subjects assigned to this lecturer
        $http.get(API_CONFIG.BASE_URL + '/lecturer-subjects/lecturer/' + lecturer.lecturerId)
            .then(function(response) {
                $scope.lecturerSubjects = response.data.data || [];
                
                // Get available subjects (not yet assigned)
                var assignedSubjectIds = $scope.lecturerSubjects.map(function(ls) {
                    return ls.subjectId;
                });
                
                $scope.availableSubjects = $scope.allSubjects.filter(function(s) {
                    return assignedSubjectIds.indexOf(s.subjectId) === -1;
                });
                
                ModalUtils.open('assignSubjectsModal');
            })
            .catch(function(error) {
                ToastService.error('❌ Lỗi tải môn học của giảng viên');
            });
    };

    $scope.addSubjectToLecturer = function() {
        if (!$scope.newSubject.subjectId) {
            ToastService.warning('⚠️ Vui lòng chọn môn học!');
            return;
        }

        var data = {
            lecturerId: $scope.selectedLecturer.lecturerId,
            subjectId: $scope.newSubject.subjectId,
            isPrimary: $scope.newSubject.isPrimary || false,
            experienceYears: $scope.newSubject.experienceYears || 0,
            notes: $scope.newSubject.notes || '',
            certifiedDate: new Date().toISOString()
        };

        $http.post(API_CONFIG.BASE_URL + '/lecturer-subjects', data)
            .then(function(response) {
                ToastService.success('✅ Đã phân môn cho giảng viên!');
                $scope.assignSubjects($scope.selectedLecturer); // Reload
                $scope.newSubject = { isPrimary: false, experienceYears: 0 };
                $scope.loadLecturers(); // Update count
            })
            .catch(function(error) {
                var errorMsg = error.data?.message || 'Không thể phân môn';
                ToastService.error('❌ Lỗi: ' + errorMsg);
            });
    };

    $scope.removeSubject = function(lecturerSubjectId) {
        if (!confirm('Bạn có chắc muốn bỏ môn này?')) {
            return;
        }

        $http.delete(API_CONFIG.BASE_URL + '/lecturer-subjects/' + lecturerSubjectId)
            .then(function(response) {
                ToastService.success('🗑 Đã bỏ môn học!');
                $scope.assignSubjects($scope.selectedLecturer); // Reload
                $scope.loadLecturers(); // Update count
            })
            .catch(function(error) {
                var errorMsg = error.data?.message || 'Không thể bỏ môn';
                ToastService.error('❌ Lỗi: ' + errorMsg);
            });
    };

    $scope.viewLecturerSubjects = function(lecturer) {
        $scope.assignSubjects(lecturer);
    };

    // Initialize on load
    $scope.init();
}]);

