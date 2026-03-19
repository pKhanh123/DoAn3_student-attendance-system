// Administrative Class Controller
app.controller('AdministrativeClassController', [
    '$scope', '$location', '$routeParams', '$timeout', 'AdministrativeClassService', 'MajorService', 
    'LecturerService', 'AcademicYearService', 'ToastService', 'AuthService',
    function($scope, $location, $routeParams, $timeout, AdministrativeClassService, MajorService, 
             LecturerService, AcademicYearService, ToastService, AuthService) {
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    $scope.classes = [];
    $scope.currentClass = null;
    $scope.majors = [];
    $scope.lecturers = [];
    $scope.academicYears = [];
    $scope.students = [];
    $scope.loading = false;
    
    $scope.filters = {
        search: '',
        majorId: '',
        cohortYear: null,
        advisorId: ''
    };
    
    $scope.pagination = {
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0
    };
    
    // Check authorization
    $scope.isAdmin = function() {
        const user = AuthService.getCurrentUser();
        return user && (user.roleName === 'Admin' || user.roleName === 'SuperAdmin');
    };
    
    // ============================================================
    // LOAD DATA
    // ============================================================
    $scope.loadClasses = function() {
        $scope.loading = true;
        
        AdministrativeClassService.getAll(
            $scope.pagination.page,
            $scope.pagination.pageSize,
            $scope.filters.search,
            $scope.filters.majorId,
            $scope.filters.cohortYear,
            $scope.filters.advisorId
        ).then(function(response) {
            if (response.data && response.data.success) {
                var classesData = response.data.data || [];
                
                // Đảm bảo data là array
                if (!Array.isArray(classesData)) {
                    classesData = [];
                }
                
                $scope.classes = classesData;
                $scope.pagination.totalCount = response.data.totalCount || 0;
                $scope.pagination.totalPages = response.data.totalPages || 0;
            }
            $scope.loading = false;
        }).catch(function(error) {
            ToastService.error('Không thể tải danh sách lớp hành chính');
            $scope.loading = false;
        });
    };
    
    $scope.loadMajors = function() {
        MajorService.getAll().then(function(response) {
            $scope.majors = response.data.data || response.data;
        });
    };
    
    $scope.loadLecturers = function() {
        LecturerService.getAll().then(function(response) {
            $scope.lecturers = response.data.data || response.data;
        });
    };
    
    $scope.loadAcademicYears = function() {
        AcademicYearService.getAll().then(function(response) {
            $scope.academicYears = response.data.data || response.data;
        });
    };
    
    // ============================================================
    // VIEW DETAIL
    // ============================================================
    $scope.viewDetail = function(classId) {
        $scope.loading = true;
        AdministrativeClassService.getById(classId).then(function(response) {
            if (response.data.success) {
                $scope.currentClass = response.data.data;
                $scope.loadStudents(classId).then(function() {
                    $scope.loading = false;
                    // Use ModalUtils to open modal
                    $timeout(function() {
                        if (window.ModalUtils && typeof window.ModalUtils.open === 'function') {
                            window.ModalUtils.open('detailModal');
                        } else {
                            // Fallback: use class-based approach
                            $('#detailModal').addClass('active');
                            $('#modal-overlay').addClass('active');
                            $('body').css('overflow', 'hidden');
                        }
                    }, 100);
                });
            } else {
                $scope.loading = false;
                ToastService.error('Không thể tải thông tin lớp hành chính');
            }
        }).catch(function(error) {
            $scope.loading = false;
            ToastService.error('Không thể tải thông tin lớp hành chính');
        });
    };
    
    $scope.loadStudents = function(classId) {
        return AdministrativeClassService.getStudents(classId).then(function(response) {
            if (response.data.success) {
                $scope.students = response.data.data || [];
            } else {
                $scope.students = [];
            }
        }).catch(function(error) {
            $scope.students = [];
        });
    };
    
    $scope.closeDetailModal = function() {
        if (window.ModalUtils && typeof window.ModalUtils.close === 'function') {
            window.ModalUtils.close('detailModal');
        } else if (window.ModalUtils && typeof window.ModalUtils.closeAll === 'function') {
            window.ModalUtils.closeAll();
        } else {
            // Fallback: use class-based approach
            $('#detailModal').removeClass('active');
            $('#modal-overlay').removeClass('active');
            $('body').css('overflow', '');
        }
    };
    
    $scope.closeAllModals = function() {
        $scope.closeDetailModal();
        $scope.closeTransferModal();
    };
    
    // ============================================================
    // CREATE / UPDATE
    // ============================================================
    $scope.showCreateModal = function() {
        $scope.currentClass = {
            classCode: '',
            className: '',
            majorId: '',
            advisorId: '',
            academicYearId: '',
            cohortYear: new Date().getFullYear(),
            maxStudents: 50,
            description: ''
        };
        $('#classModal').modal('show');
    };
    
    $scope.showEditModal = function(adminClass) {
        $scope.currentClass = angular.copy(adminClass);
        $('#classModal').modal('show');
    };
    
    $scope.saveClass = function() {
        if (!$scope.currentClass) return;
        
        const isNew = !$scope.currentClass.adminClassId;
        const promise = isNew ? 
            AdministrativeClassService.create($scope.currentClass) :
            AdministrativeClassService.update($scope.currentClass.adminClassId, $scope.currentClass);
        
        promise.then(function(response) {
            if (response.data.success) {
                ToastService.success(isNew ? 'Tạo lớp hành chính thành công' : 'Cập nhật lớp hành chính thành công');
                $('#classModal').modal('hide');
                $scope.loadClasses();
            }
        }).catch(function(error) {
            ToastService.error(error.data?.message || 'Có lỗi xảy ra');
        });
    };
    
    // ============================================================
    // DELETE
    // ============================================================
    $scope.deleteClass = function(classId) {
        if (!confirm('Bạn có chắc chắn muốn xóa lớp hành chính này?')) return;
        
        AdministrativeClassService.delete(classId).then(function(response) {
            if (response.data.success) {
                ToastService.success('Xóa lớp hành chính thành công');
                $scope.loadClasses();
            }
        }).catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể xóa lớp hành chính');
        });
    };
    
    // ============================================================
    // ASSIGN STUDENTS
    // ============================================================
    $scope.showAssignModal = function(adminClass) {
        $scope.currentClass = adminClass;
        // TODO: Load available students
        $('#assignModal').modal('show');
    };
    
    $scope.assignStudents = function(studentIds) {
        AdministrativeClassService.assignStudents($scope.currentClass.adminClassId, studentIds)
            .then(function(response) {
                if (response.data.success) {
                    ToastService.success('Phân bổ sinh viên thành công');
                    $('#assignModal').modal('hide');
                    $scope.loadStudents($scope.currentClass.adminClassId);
                }
            }).catch(function(error) {
                ToastService.error(error.data?.message || 'Có lỗi xảy ra');
            });
    };
    
    // ============================================================
    // REMOVE STUDENT
    // ============================================================
    $scope.removeStudent = function(studentId) {
        if (!confirm('Bạn có chắc chắn muốn xóa sinh viên khỏi lớp?')) return;
        
        AdministrativeClassService.removeStudent($scope.currentClass.adminClassId, studentId)
            .then(function(response) {
                if (response.data.success) {
                    ToastService.success('Xóa sinh viên khỏi lớp thành công');
                    $scope.loadStudents($scope.currentClass.adminClassId);
                    $scope.loadClasses(); // Reload to update student count
                }
            }).catch(function(error) {
                ToastService.error(error.data?.message || 'Có lỗi xảy ra');
            });
    };
    
    // ============================================================
    // TRANSFER STUDENT
    // ============================================================
    $scope.transferData = {
        student: null,
        toClassId: '',
        transferReason: ''
    };
    $scope.transferring = false;
    
    $scope.showTransferModal = function(student) {
        $scope.transferData = {
            student: student,
            toClassId: '',
            transferReason: ''
        };
        
        // Use ModalUtils or class-based approach
        if (window.ModalUtils && typeof window.ModalUtils.open === 'function') {
            window.ModalUtils.open('transferModal');
        } else {
            // Fallback: use class-based approach
            $('#transferModal').addClass('active');
            $('#modal-overlay').addClass('active');
            $('body').css('overflow', 'hidden');
        }
    };
    
    $scope.closeTransferModal = function() {
        if (window.ModalUtils && typeof window.ModalUtils.close === 'function') {
            window.ModalUtils.close('transferModal');
        } else if (window.ModalUtils && typeof window.ModalUtils.closeAll === 'function') {
            window.ModalUtils.closeAll();
        } else {
            // Fallback: use class-based approach
            $('#transferModal').removeClass('active');
            $('#modal-overlay').removeClass('active');
            $('body').css('overflow', '');
        }
    };
    
    $scope.transferStudent = function() {
        if (!$scope.transferData.student || !$scope.transferData.toClassId || !$scope.transferData.transferReason) {
            ToastService.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        if (!confirm('Bạn có chắc chắn muốn chuyển sinh viên sang lớp mới?')) return;
        
        $scope.transferring = true;
        AdministrativeClassService.transferStudent(
            $scope.transferData.toClassId,
            $scope.transferData.student.studentId,
            $scope.transferData.transferReason
        ).then(function(response) {
            if (response.data.success) {
                ToastService.success('Chuyển lớp thành công');
                $scope.closeTransferModal();
                
                // ✅ Reload danh sách sinh viên trong modal
                $scope.loadStudents($scope.currentClass.adminClassId).then(function() {
                    // ✅ Reload thông tin lớp để cập nhật số lượng sinh viên
                    return AdministrativeClassService.getById($scope.currentClass.adminClassId);
                }).then(function(response) {
                    if (response.data.success) {
                        $scope.currentClass = response.data.data;
                    }
                });
                
                // ✅ Reload danh sách lớp ở trang chính để cập nhật số lượng
                $scope.loadClasses();
            }
            $scope.transferring = false;
        }).catch(function(error) {
            ToastService.error(error.data?.message || 'Có lỗi xảy ra khi chuyển lớp');
            $scope.transferring = false;
        });
    };
    
    // ============================================================
    // PAGINATION
    // ============================================================
    $scope.changePage = function(page) {
        $scope.pagination.page = page;
        $scope.loadClasses();
    };
    
    $scope.applyFilters = function() {
        $scope.pagination.page = 1;
        $scope.loadClasses();
    };
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    $scope.init = function() {
        $scope.loadClasses();
        $scope.loadMajors();
        $scope.loadLecturers();
        $scope.loadAcademicYears();
    };
    
    $scope.init();
}]);

