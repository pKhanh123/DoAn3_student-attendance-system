// Subject Prerequisite Controller
app.controller('SubjectPrerequisiteController', [
    '$scope', 'SubjectPrerequisiteService', 'SubjectService', 'ToastService', 'AuthService',
    function($scope, SubjectPrerequisiteService, SubjectService, ToastService, AuthService) {
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    $scope.prerequisites = [];
    $scope.subjects = [];
    $scope.currentPrerequisite = null;
    $scope.selectedSubject = null;
    $scope.loading = false;
    
    $scope.checkResult = null;
    
    // Check authorization
    $scope.isAdmin = function() {
        const user = AuthService.getCurrentUser();
        return user && (user.roleName === 'Admin' || user.roleName === 'SuperAdmin');
    };
    
    // ============================================================
    // LOAD DATA
    // ============================================================
    $scope.loadSubjects = function() {
        SubjectService.getAll().then(function(response) {
            $scope.subjects = response.data.data || response.data;
        });
    };
    
    $scope.loadPrerequisites = function(subjectId) {
        if (!subjectId) {
            $scope.prerequisites = [];
            return;
        }
        
        $scope.loading = true;
        SubjectPrerequisiteService.getBySubject(subjectId).then(function(response) {
            if (response.data.success) {
                $scope.prerequisites = response.data.data;
            }
            $scope.loading = false;
        }).catch(function(error) {
            ToastService.error('Không thể tải danh sách điều kiện tiên quyết');
            $scope.loading = false;
        });
    };
    
    // ============================================================
    // CHECK PREREQUISITES
    // ============================================================
    $scope.showCheckModal = function() {
        $scope.checkData = {
            studentId: '',
            subjectId: ''
        };
        $scope.checkResult = null;
        $('#checkModal').modal('show');
    };
    
    $scope.checkPrerequisites = function() {
        if (!$scope.checkData.studentId || !$scope.checkData.subjectId) {
            ToastService.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        
        SubjectPrerequisiteService.check($scope.checkData.studentId, $scope.checkData.subjectId)
            .then(function(response) {
                if (response.data.success) {
                    $scope.checkResult = response.data;
                    if (response.data.eligible) {
                        ToastService.success('Sinh viên đủ điều kiện đăng ký môn học');
                    } else {
                        ToastService.warning('Sinh viên chưa đủ điều kiện đăng ký môn học');
                    }
                }
            }).catch(function(error) {
                ToastService.error(error.data?.message || 'Có lỗi xảy ra khi kiểm tra');
            });
    };
    
    // ============================================================
    // ADD PREREQUISITE
    // ============================================================
    $scope.showAddModal = function() {
        $scope.currentPrerequisite = {
            subjectId: $scope.selectedSubject || '',
            prerequisiteSubjectId: '',
            minimumGrade: 4.0,
            isRequired: true,
            description: ''
        };
        $('#prerequisiteModal').modal('show');
    };
    
    $scope.addPrerequisite = function() {
        if (!$scope.currentPrerequisite) return;
        
        // Validation
        if ($scope.currentPrerequisite.subjectId === $scope.currentPrerequisite.prerequisiteSubjectId) {
            ToastService.error('Môn học không thể là điều kiện tiên quyết của chính nó');
            return;
        }
        
        SubjectPrerequisiteService.add($scope.currentPrerequisite).then(function(response) {
            if (response.data.success) {
                ToastService.success('Thêm điều kiện tiên quyết thành công');
                $('#prerequisiteModal').modal('hide');
                $scope.loadPrerequisites($scope.currentPrerequisite.subjectId);
            }
        }).catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể thêm điều kiện tiên quyết');
        });
    };
    
    // ============================================================
    // DELETE PREREQUISITE
    // ============================================================
    $scope.deletePrerequisite = function(prerequisiteId) {
        if (!confirm('Bạn có chắc chắn muốn xóa điều kiện tiên quyết này?')) return;
        
        SubjectPrerequisiteService.delete(prerequisiteId).then(function(response) {
            if (response.data.success) {
                ToastService.success('Xóa điều kiện tiên quyết thành công');
                $scope.loadPrerequisites($scope.selectedSubject);
            }
        }).catch(function(error) {
            ToastService.error(error.data?.message || 'Không thể xóa điều kiện tiên quyết');
        });
    };
    
    // ============================================================
    // UI HELPERS
    // ============================================================
    $scope.getSubjectName = function(subjectId) {
        const subject = $scope.subjects.find(function(s) { return s.subjectId === subjectId; });
        return subject ? subject.subjectName : subjectId;
    };
    
    $scope.onSubjectChange = function() {
        $scope.loadPrerequisites($scope.selectedSubject);
    };
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    $scope.init = function() {
        $scope.loadSubjects();
    };
    
    $scope.init();
}]);

