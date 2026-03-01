// @ts-check
/* global angular */
'use strict';

// Advisor Grade Formula Config Controller
app.controller('AdvisorGradeFormulaConfigController', [
    '$scope',
    'AuthService',
    'GradeFormulaConfigService',
    'SubjectService',
    'ClassService',
    'SchoolYearService',
    'ToastService',
    'LoggerService',
    function($scope, AuthService, GradeFormulaConfigService, SubjectService, ClassService, SchoolYearService, ToastService, LoggerService) {
        $scope.currentUser = AuthService.getCurrentUser();
        
        // Configs list
        $scope.configs = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.filters = {
            subjectId: null,
            classId: null,
            schoolYearId: null,
            isDefault: null
        };
        
        // Pagination
        $scope.pagination = {
            currentPage: 1,
            pageSize: 20,
            totalItems: 0,
            totalPages: 0,
            startItem: 0,
            endItem: 0,
            pageSizeOptions: [10, 20, 50, 100]
        };
        
        // Helper function to update pagination info
        function updatePaginationInfo() {
            $scope.pagination.totalPages = Math.ceil($scope.pagination.totalItems / $scope.pagination.pageSize) || 1;
            $scope.pagination.startItem = $scope.pagination.totalItems > 0 
                ? (($scope.pagination.currentPage - 1) * $scope.pagination.pageSize) + 1 
                : 0;
            $scope.pagination.endItem = Math.min(
                $scope.pagination.currentPage * $scope.pagination.pageSize,
                $scope.pagination.totalItems
            );
        }
        
        // Create/Edit modal
        $scope.showFormModal = false;
        $scope.editingConfig = null;
        $scope.currentStep = 1; // Wizard step (1-4)
        $scope.formData = {
            subjectId: null,
            classId: null,
            schoolYearId: null,
            midtermWeight: 0.30,
            finalWeight: 0.70,
            assignmentWeight: 0.00,
            quizWeight: 0.00,
            projectWeight: 0.00,
            customFormula: null,
            roundingMethod: 'STANDARD',
            decimalPlaces: 2,
            description: '',
            isDefault: false
        };
        $scope.saving = false;
        $scope.weightError = null;
        
        // Filter options
        $scope.subjects = [];
        $scope.classes = [];
        $scope.schoolYears = [];
        $scope.loadingFilters = false;
        
        // Load configs
        function loadConfigs() {
            $scope.loading = true;
            $scope.error = null;
            
            var filters = {};
            if ($scope.filters.subjectId) filters.subjectId = $scope.filters.subjectId;
            if ($scope.filters.classId) filters.classId = $scope.filters.classId;
            if ($scope.filters.schoolYearId) filters.schoolYearId = $scope.filters.schoolYearId;
            if ($scope.filters.isDefault !== null && $scope.filters.isDefault !== undefined) {
                filters.isDefault = $scope.filters.isDefault;
            }
            
            GradeFormulaConfigService.getAll(filters, $scope.pagination.currentPage, $scope.pagination.pageSize)
                .then(function(result) {
                    $scope.configs = result.configs || [];
                    $scope.pagination.totalItems = result.totalCount || 0;
                    updatePaginationInfo();
                    $scope.loading = false;
                })
                .catch(function(error) {
                    $scope.error = 'Không thể tải danh sách cấu hình: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                    $scope.loading = false;
                    LoggerService.error('Error loading configs', error);
                });
        }
        
        // Load filter options
        function loadFilterOptions() {
            $scope.loadingFilters = true;
            
            Promise.all([
                SubjectService.getAll().catch(function() { return []; }),
                ClassService.getAll().catch(function() { return []; }),
                SchoolYearService.getAll().catch(function() { return []; })
            ]).then(function(results) {
                $scope.subjects = results[0] || [];
                $scope.classes = results[1] || [];
                $scope.schoolYears = results[2] || [];
                $scope.loadingFilters = false;
            }).catch(function(error) {
                LoggerService.error('Error loading filter options', error);
                $scope.loadingFilters = false;
            });
        }
        
        // Open create modal
        $scope.openCreateModal = function() {
            $scope.editingConfig = null;
            $scope.currentStep = 1;
            $scope.formData = {
                subjectId: null,
                classId: null,
                schoolYearId: null,
                midtermWeight: 0.30,
                finalWeight: 0.70,
                assignmentWeight: 0.00,
                quizWeight: 0.00,
                projectWeight: 0.00,
                customFormula: null,
                roundingMethod: 'STANDARD',
                decimalPlaces: 2,
                description: '',
                isDefault: false
            };
            $scope.weightError = null;
            $scope.showFormModal = true;
        };
        
        // Open edit modal
        $scope.openEditModal = function(config) {
            $scope.editingConfig = config;
            $scope.currentStep = 1;
            $scope.formData = {
                subjectId: config.subjectId,
                classId: config.classId,
                schoolYearId: config.schoolYearId,
                midtermWeight: config.midtermWeight,
                finalWeight: config.finalWeight,
                assignmentWeight: config.assignmentWeight || 0.00,
                quizWeight: config.quizWeight || 0.00,
                projectWeight: config.projectWeight || 0.00,
                customFormula: config.customFormula,
                roundingMethod: config.roundingMethod || 'STANDARD',
                decimalPlaces: config.decimalPlaces || 2,
                description: config.description || '',
                isDefault: config.isDefault
            };
            $scope.weightError = null;
            $scope.showFormModal = true;
        };
        
        // Close form modal
        $scope.closeFormModal = function() {
            $scope.showFormModal = false;
            $scope.editingConfig = null;
            $scope.currentStep = 1;
            $scope.weightError = null;
        };

        // Wizard navigation
        $scope.nextStep = function() {
            if ($scope.currentStep < 4 && $scope.canProceedToNextStep()) {
                $scope.currentStep++;
            }
        };

        $scope.previousStep = function() {
            if ($scope.currentStep > 1) {
                $scope.currentStep--;
            }
        };

        // Check if can proceed to next step
        $scope.canProceedToNextStep = function() {
            if ($scope.currentStep === 1) {
                // Step 1: Must have at least one scope
                return $scope.formData.classId || $scope.formData.subjectId || 
                       $scope.formData.schoolYearId || $scope.formData.isDefault;
            }
            if ($scope.currentStep === 2) {
                // Step 2: Total weight must be valid (can be < 1.0, but not > 1.0)
                return !$scope.weightError && $scope.calculateTotalWeight() <= 1.0;
            }
            if ($scope.currentStep === 3) {
                // Step 3: Always can proceed (optional fields)
                return true;
            }
            return false;
        };

        // Check if step 4 is valid
        $scope.isStep4Valid = function() {
            return !$scope.weightError && 
                   ($scope.formData.classId || $scope.formData.subjectId || 
                    $scope.formData.schoolYearId || $scope.formData.isDefault) &&
                   $scope.calculateTotalWeight() <= 1.0;
        };

        // Apply template
        $scope.applyTemplate = function(template) {
            if (template === 'standard') {
                $scope.formData.midtermWeight = 0.30;
                $scope.formData.finalWeight = 0.70;
                $scope.formData.assignmentWeight = 0.00;
                $scope.formData.quizWeight = 0.00;
                $scope.formData.projectWeight = 0.00;
            } else if (template === 'balanced') {
                $scope.formData.midtermWeight = 0.40;
                $scope.formData.finalWeight = 0.60;
                $scope.formData.assignmentWeight = 0.00;
                $scope.formData.quizWeight = 0.00;
                $scope.formData.projectWeight = 0.00;
            } else if (template === 'practice') {
                $scope.formData.midtermWeight = 0.20;
                $scope.formData.finalWeight = 0.30;
                $scope.formData.assignmentWeight = 0.30;
                $scope.formData.quizWeight = 0.00;
                $scope.formData.projectWeight = 0.20;
            }
            $scope.calculateTotalWeight();
        };

        // Reset weights
        $scope.resetWeights = function() {
            $scope.formData.midtermWeight = 0.30;
            $scope.formData.finalWeight = 0.70;
            $scope.formData.assignmentWeight = 0.00;
            $scope.formData.quizWeight = 0.00;
            $scope.formData.projectWeight = 0.00;
            $scope.calculateTotalWeight();
        };

        // Calculate example score
        $scope.calculateExampleScore = function() {
            var example = 0;
            if ($scope.formData.midtermWeight > 0) example += 8.0 * $scope.formData.midtermWeight;
            if ($scope.formData.finalWeight > 0) example += 9.0 * $scope.formData.finalWeight;
            if ($scope.formData.assignmentWeight > 0) example += 7.5 * $scope.formData.assignmentWeight;
            if ($scope.formData.quizWeight > 0) example += 8.5 * $scope.formData.quizWeight;
            if ($scope.formData.projectWeight > 0) example += 9.5 * $scope.formData.projectWeight;
            return example;
        };

        // On scope change
        $scope.onScopeChange = function() {
            // Auto-validate scope
        };
        
        // Calculate total weight
        $scope.calculateTotalWeight = function() {
            var total = ($scope.formData.midtermWeight || 0) +
                       ($scope.formData.finalWeight || 0) +
                       ($scope.formData.assignmentWeight || 0) +
                       ($scope.formData.quizWeight || 0) +
                       ($scope.formData.projectWeight || 0);
            
            if (total > 1.0) {
                $scope.weightError = 'Tổng trọng số không được vượt quá 1.0 (hiện tại: ' + total.toFixed(2) + ')';
            } else {
                $scope.weightError = null;
            }
            
            return total;
        };
        
        // Validate form
        $scope.validateForm = function() {
            // Check scope
            if (!$scope.formData.subjectId && !$scope.formData.classId && 
                !$scope.formData.schoolYearId && !$scope.formData.isDefault) {
                ToastService.error('Phải chọn ít nhất một scope (Môn học, Lớp, Năm học) hoặc đánh dấu là Mặc định');
                return false;
            }
            
            // Check weights
            var total = $scope.calculateTotalWeight();
            if (total > 1.0) {
                ToastService.error('Tổng trọng số không được vượt quá 1.0');
                return false;
            }
            
            return true;
        };
        
        // Save config
        $scope.saveConfig = function() {
            if (!$scope.validateForm()) {
                return;
            }
            
            $scope.saving = true;
            
            var configData = {
                subjectId: $scope.formData.subjectId || null,
                classId: $scope.formData.classId || null,
                schoolYearId: $scope.formData.schoolYearId || null,
                midtermWeight: $scope.formData.midtermWeight,
                finalWeight: $scope.formData.finalWeight,
                assignmentWeight: $scope.formData.assignmentWeight || null,
                quizWeight: $scope.formData.quizWeight || null,
                projectWeight: $scope.formData.projectWeight || null,
                customFormula: $scope.formData.customFormula || null,
                roundingMethod: $scope.formData.roundingMethod,
                decimalPlaces: $scope.formData.decimalPlaces,
                description: $scope.formData.description || null,
                isDefault: $scope.formData.isDefault,
                createdBy: $scope.currentUser.userId || 'system',
                updatedBy: $scope.currentUser.userId || 'system'
            };
            
            var promise;
            if ($scope.editingConfig) {
                // Update
                promise = GradeFormulaConfigService.update($scope.editingConfig.configId, configData);
            } else {
                // Create
                promise = GradeFormulaConfigService.create(configData);
            }
            
            promise
                .then(function() {
                    ToastService.success($scope.editingConfig ? 'Cập nhật cấu hình thành công!' : 'Tạo cấu hình thành công!');
                    $scope.closeFormModal();
                    loadConfigs();
                })
                .catch(function(error) {
                    ToastService.error('Lỗi: ' + (error.data?.message || error.message || 'Không thể lưu cấu hình'));
                    LoggerService.error('Error saving config', error);
                })
                .finally(function() {
                    $scope.saving = false;
                });
        };
        
        // Delete config
        $scope.deleteConfig = function(configId) {
            if (!confirm('Bạn có chắc chắn muốn xóa cấu hình này?')) {
                return;
            }
            
            GradeFormulaConfigService.delete(configId, $scope.currentUser.userId || 'system')
                .then(function() {
                    ToastService.success('Xóa cấu hình thành công');
                    loadConfigs();
                })
                .catch(function(error) {
                    ToastService.error('Lỗi: ' + (error.data?.message || error.message || 'Không thể xóa cấu hình'));
                    LoggerService.error('Error deleting config', error);
                });
        };
        
        // Preview formula
        $scope.previewFormula = function() {
            var weights = {
                midtermWeight: $scope.formData.midtermWeight || 0,
                finalWeight: $scope.formData.finalWeight || 0,
                assignmentWeight: $scope.formData.assignmentWeight || 0,
                quizWeight: $scope.formData.quizWeight || 0,
                projectWeight: $scope.formData.projectWeight || 0
            };
            
            var formula = 'Điểm cuối kỳ = ';
            var parts = [];
            
            if (weights.midtermWeight > 0) {
                parts.push('(Giữa kỳ × ' + (weights.midtermWeight * 100).toFixed(0) + '%)');
            }
            if (weights.finalWeight > 0) {
                parts.push('(Cuối kỳ × ' + (weights.finalWeight * 100).toFixed(0) + '%)');
            }
            if (weights.assignmentWeight > 0) {
                parts.push('(Bài tập × ' + (weights.assignmentWeight * 100).toFixed(0) + '%)');
            }
            if (weights.quizWeight > 0) {
                parts.push('(Kiểm tra × ' + (weights.quizWeight * 100).toFixed(0) + '%)');
            }
            if (weights.projectWeight > 0) {
                parts.push('(Đồ án × ' + (weights.projectWeight * 100).toFixed(0) + '%)');
            }
            
            return formula + parts.join(' + ');
        };
        
        // Get scope description
        $scope.getScopeDescription = function(config) {
            if (config.classId) {
                return 'Lớp: ' + (config.className || config.classCode || config.classId);
            }
            if (config.subjectId) {
                return 'Môn: ' + (config.subjectName || config.subjectCode || config.subjectId);
            }
            if (config.schoolYearId) {
                return 'Năm học: ' + (config.schoolYearName || config.schoolYearCode || config.schoolYearId);
            }
            if (config.isDefault) {
                return 'Mặc định';
            }
            return 'Chưa xác định';
        };
        
        // Filter configs
        $scope.applyFilters = function() {
            $scope.pagination.currentPage = 1;
            loadConfigs();
        };
        
        // Clear filters
        $scope.clearFilters = function() {
            $scope.filters = {
                subjectId: null,
                classId: null,
                schoolYearId: null,
                isDefault: null
            };
            $scope.applyFilters();
        };
        
        // Pagination
        $scope.handlePageChange = function() {
            loadConfigs();
        };
        
        // Initialize
        loadConfigs();
        loadFilterOptions();
    }
]);

