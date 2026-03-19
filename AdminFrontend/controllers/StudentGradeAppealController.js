// @ts-check
/* global angular */
'use strict';

// Student Grade Appeal Controller
app.controller('StudentGradeAppealController', [
    '$scope',
    '$routeParams',
    'AuthService',
    'StudentService',
    'GradeAppealService',
    'GradeService',
    'ClassService',
    'ToastService',
    'LoggerService',
    function($scope, $routeParams, AuthService, StudentService, GradeAppealService, GradeService, ClassService, ToastService, LoggerService) {
        $scope.currentUser = AuthService.getCurrentUser();
        $scope.studentId = null;
        
        // Appeals list
        $scope.appeals = [];
        $scope.loading = false;
        $scope.error = null;
        $scope.filters = {
            status: null
        };
        
        // Pagination
        $scope.pagination = {
            page: 1,
            pageSize: 10,
            totalCount: 0
        };
        
        // Create appeal modal
        $scope.showCreateModal = false;
        $scope.newAppeal = {
            gradeId: null,
            enrollmentId: null,
            classId: null,
            componentType: null, // MIDTERM, FINAL, ATTENDANCE, ASSIGNMENT
            appealReason: '',
            currentScore: null,
            expectedScore: null
        };
        $scope.availableGrades = [];
        $scope.loadingGrades = false;
        $scope.saving = false;
        
        // Component type options
        $scope.componentTypes = [
            { value: 'MIDTERM', label: 'Điểm giữa kỳ', field: 'midtermScore' },
            { value: 'FINAL', label: 'Điểm cuối kỳ', field: 'finalScore' },
            { value: 'ATTENDANCE', label: 'Điểm chuyên cần', field: 'attendanceScore' },
            { value: 'ASSIGNMENT', label: 'Điểm bài tập', field: 'assignmentScore' }
        ];
        
        // Appeal detail
        $scope.selectedAppeal = null;
        $scope.showDetailModal = false;
        
        // Load student ID
        function loadStudentId() {
            console.log('[StudentGradeAppeal] 🔍 loadStudentId() - Bắt đầu tải thông tin sinh viên');
            LoggerService.debug('[StudentGradeAppeal] loadStudentId() - Bắt đầu tải thông tin sinh viên');
            
            // Step 1: Kiểm tra currentUser
            if (!$scope.currentUser) {
                var error1 = { currentUser: $scope.currentUser };
                console.error('[StudentGradeAppeal] ❌ Lỗi: currentUser is null/undefined', error1);
                LoggerService.error('[StudentGradeAppeal] loadStudentId() - Lỗi: currentUser is null/undefined', error1);
                $scope.error = 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.';
                return;
            }
            
            var currentUserInfo = {
                userId: $scope.currentUser.userId,
                username: $scope.currentUser.username,
                role: $scope.currentUser.role,
                hasStudentId: !!$scope.currentUser.studentId,
                studentIdFromUser: $scope.currentUser.studentId
            };
            console.log('[StudentGradeAppeal] ✅ currentUser tồn tại:', currentUserInfo);
            LoggerService.debug('[StudentGradeAppeal] loadStudentId() - currentUser tồn tại', currentUserInfo);
            
            // Step 2: Kiểm tra userId
            if (!$scope.currentUser.userId) {
                var error2 = { currentUser: $scope.currentUser };
                console.error('[StudentGradeAppeal] ❌ Lỗi: currentUser.userId is null/undefined', error2);
                LoggerService.error('[StudentGradeAppeal] loadStudentId() - Lỗi: currentUser.userId is null/undefined', error2);
                $scope.error = 'Không tìm thấy mã người dùng. Vui lòng đăng nhập lại.';
                return;
            }
            
            var userId = $scope.currentUser.userId;
            console.log('[StudentGradeAppeal] 📞 Đang gọi StudentService.getByUserId() với userId:', userId);
            LoggerService.debug('[StudentGradeAppeal] loadStudentId() - Đang gọi StudentService.getByUserId()', {
                userId: userId
            });
            
            // Step 3: Gọi API để lấy thông tin sinh viên từ userId
            StudentService.getByUserId(userId)
                .then(function(response) {
                    var responseInfo = {
                        response: response,
                        hasData: !!response.data,
                        hasDataData: !!(response.data && response.data.data),
                        responseData: response.data
                    };
                    console.log('[StudentGradeAppeal] 📥 API response nhận được:', responseInfo);
                    LoggerService.debug('[StudentGradeAppeal] loadStudentId() - API response nhận được', responseInfo);
                    
                    // Xử lý response (có thể là response.data.data hoặc response.data)
                    var studentData = null;
                    if (response.data && response.data.data) {
                        studentData = response.data.data;
                    } else if (response.data) {
                        studentData = response.data;
                    }
                    
                    var studentDataInfo = {
                        studentData: studentData,
                        hasStudentId: !!(studentData && studentData.studentId),
                        studentId: studentData ? studentData.studentId : null
                    };
                    console.log('[StudentGradeAppeal] 🔄 studentData sau khi xử lý:', studentDataInfo);
                    LoggerService.debug('[StudentGradeAppeal] loadStudentId() - studentData sau khi xử lý', studentDataInfo);
                    
                    // Step 4: Kiểm tra studentData
                    if (!studentData) {
                        var error3 = { response: response, userId: userId };
                        console.error('[StudentGradeAppeal] ❌ Lỗi: studentData is null sau khi xử lý response', error3);
                        LoggerService.error('[StudentGradeAppeal] loadStudentId() - Lỗi: studentData is null sau khi xử lý response', error3);
                        $scope.error = 'Không tìm thấy thông tin sinh viên trong response. UserId: ' + userId;
                        return;
                    }
                    
                    // Step 5: Kiểm tra studentId
                    if (!studentData.studentId) {
                        var error4 = { studentData: studentData, userId: userId };
                        console.error('[StudentGradeAppeal] ❌ Lỗi: studentData.studentId is null/undefined', error4);
                        LoggerService.error('[StudentGradeAppeal] loadStudentId() - Lỗi: studentData.studentId is null/undefined', error4);
                        $scope.error = 'Không tìm thấy mã sinh viên trong thông tin tài khoản. Vui lòng liên hệ quản trị viên.';
                        return;
                    }
                    
                    // Step 6: Lưu studentId và tiếp tục
                    $scope.studentId = studentData.studentId;
                    var successInfo = {
                        studentId: $scope.studentId,
                        studentCode: studentData.studentCode,
                        fullName: studentData.fullName,
                        userId: userId
                    };
                    LoggerService.log('[StudentGradeAppeal] loadStudentId() - Thành công! Đã lấy được studentId', successInfo);
                    // Luôn log ra console để debug
                    console.log('[StudentGradeAppeal] ✅ Thành công! Đã lấy được studentId:', successInfo);
                    
                    // Load dữ liệu
                    loadAppeals();
                    loadAvailableGrades();
                    
                    // Force Angular to apply changes
                    $scope.$applyAsync();
                })
                .catch(function(error) {
                    var errorInfo = {
                        error: error,
                        errorStatus: error.status,
                        errorData: error.data,
                        errorMessage: error.message,
                        userId: userId,
                        currentUser: $scope.currentUser
                    };
                    console.error('[StudentGradeAppeal] ❌ Lỗi khi gọi API StudentService.getByUserId():', errorInfo);
                    LoggerService.error('[StudentGradeAppeal] loadStudentId() - Lỗi khi gọi API StudentService.getByUserId()', errorInfo);
                    
                    var errorMessage = 'Không thể tải thông tin sinh viên';
                    if (error.status === 404) {
                        errorMessage = 'Không tìm thấy thông tin sinh viên cho tài khoản này. UserId: ' + userId;
                    } else if (error.status === 403) {
                        errorMessage = 'Bạn không có quyền truy cập thông tin sinh viên.';
                    } else if (error.data && error.data.message) {
                        errorMessage = error.data.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    console.error('[StudentGradeAppeal] ❌ Error message hiển thị cho user:', errorMessage);
                    $scope.error = errorMessage;
                });
        }
        
        // Load appeals
        function loadAppeals() {
            $scope.loading = true;
            $scope.error = null;
            
            var filters = {
                studentId: $scope.studentId
            };
            if ($scope.filters.status) filters.status = $scope.filters.status;
            
            GradeAppealService.getAll(filters, $scope.pagination.page, $scope.pagination.pageSize)
                .then(function(result) {
                    $scope.appeals = result.appeals || [];
                    $scope.pagination.totalCount = result.totalCount || 0;
                    $scope.loading = false;
                })
                .catch(function(error) {
                    $scope.error = 'Không thể tải danh sách phúc khảo: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                    $scope.loading = false;
                    LoggerService.error('Error loading appeals', error);
                });
        }
        
        // Load available grades for creating appeal
        function loadAvailableGrades() {
            if (!$scope.studentId) {
                console.warn('[StudentGradeAppeal] ⚠️ Không có studentId, không thể tải grades');
                return;
            }
            
            $scope.loadingGrades = true;
            console.log('[StudentGradeAppeal] 📚 Đang tải danh sách điểm cho studentId:', $scope.studentId);
            
            // Try to get all grades for student - use getByStudent if available, otherwise try with empty schoolYearId
            var gradePromise;
            if (GradeService.getByStudent) {
                console.log('[StudentGradeAppeal] 📚 Sử dụng GradeService.getByStudent()');
                gradePromise = GradeService.getByStudent($scope.studentId, { forceRefresh: false });
            } else {
                console.log('[StudentGradeAppeal] 📚 Sử dụng GradeService.getByStudentSchoolYear() với schoolYearId = null');
                // Try with null - API might handle this
                gradePromise = GradeService.getByStudentSchoolYear($scope.studentId, null, null, { forceRefresh: false })
                    .catch(function(error) {
                        console.warn('[StudentGradeAppeal] ⚠️ Lỗi với null schoolYearId, thử với empty string');
                        // Try with empty string
                        return GradeService.getByStudentSchoolYear($scope.studentId, '', null, { forceRefresh: false });
                    });
            }
            
            gradePromise
                .then(function(response) {
                    console.log('[StudentGradeAppeal] 📚 API response:', response);
                    var grades = response;
                    
                    // Handle different response formats
                    if (response && response.data) {
                        if (response.data.data) {
                            grades = response.data.data;
                        } else if (Array.isArray(response.data)) {
                            grades = response.data;
                        } else {
                            grades = [];
                        }
                    } else if (!Array.isArray(response)) {
                        grades = [];
                    }
                    
                    console.log('[StudentGradeAppeal] 📚 Danh sách điểm sau khi xử lý response:', grades.length, 'môn');
                    console.log('[StudentGradeAppeal] 📚 Chi tiết grades:', grades);
                    
                    // Filter grades that have at least one component score (not total_score)
                    $scope.availableGrades = (grades || []).filter(function(g) {
                        var hasComponent = (g.midtermScore !== null && g.midtermScore !== undefined) ||
                                          (g.finalScore !== null && g.finalScore !== undefined) ||
                                          (g.attendanceScore !== null && g.attendanceScore !== undefined) ||
                                          (g.assignmentScore !== null && g.assignmentScore !== undefined);
                        if (hasComponent) {
                            console.log('[StudentGradeAppeal] ✅ Môn có điểm thành phần:', {
                                subject: g.subjectName || g.subjectCode,
                                midterm: g.midtermScore,
                                final: g.finalScore,
                                attendance: g.attendanceScore,
                                assignment: g.assignmentScore
                            });
                        }
                        return hasComponent;
                    });
                    
                    console.log('[StudentGradeAppeal] ✅ Danh sách điểm sau khi lọc:', $scope.availableGrades.length, 'môn');
                    if ($scope.availableGrades.length === 0) {
                        console.warn('[StudentGradeAppeal] ⚠️ Không có môn nào có điểm thành phần để phúc khảo');
                    }
                    $scope.loadingGrades = false;
                })
                .catch(function(error) {
                    console.error('[StudentGradeAppeal] ❌ Lỗi khi tải danh sách điểm:', error);
                    console.error('[StudentGradeAppeal] ❌ Error details:', {
                        status: error.status,
                        statusText: error.statusText,
                        data: error.data,
                        message: error.message,
                        url: error.config && error.config.url
                    });
                    LoggerService.error('Error loading grades', error);
                    $scope.loadingGrades = false;
                    $scope.availableGrades = [];
                    ToastService.warning('Không thể tải danh sách điểm. Vui lòng thử lại sau.');
                });
        }
        
        // Open create modal
        $scope.openCreateModal = function() {
            console.log('[StudentGradeAppeal] 🔘 openCreateModal() - Bắt đầu mở modal');
            console.log('[StudentGradeAppeal] 📊 Trạng thái hiện tại:', {
                showCreateModal: $scope.showCreateModal,
                availableGrades: $scope.availableGrades ? $scope.availableGrades.length : 0,
                loadingGrades: $scope.loadingGrades,
                studentId: $scope.studentId
            });
            
            try {
            $scope.newAppeal = {
                gradeId: null,
                enrollmentId: null,
                classId: null,
                componentType: null,
                appealReason: '',
                currentScore: null,
                expectedScore: null
            };
                $scope.selectedGrade = null;
                $scope.showCreateModal = true;
                
                console.log('[StudentGradeAppeal] ✅ Modal đã được mở:', {
                    showCreateModal: $scope.showCreateModal,
                    newAppeal: $scope.newAppeal
                });
                
                // Force Angular to apply changes and check DOM
                $scope.$applyAsync(function() {
                    setTimeout(function() {
                        var modalOverlay = document.querySelector('.modal-overlay');
                        var modal = document.querySelector('.modal');
                        console.log('[StudentGradeAppeal] 🔍 Kiểm tra DOM sau khi mở modal:', {
                            modalOverlayExists: !!modalOverlay,
                            modalExists: !!modal,
                            modalOverlayClasses: modalOverlay ? modalOverlay.className : null,
                            modalClasses: modal ? modal.className : null,
                            modalOverlayDisplay: modalOverlay ? window.getComputedStyle(modalOverlay).display : null,
                            modalDisplay: modal ? window.getComputedStyle(modal).display : null
                        });
                    }, 100);
                });
                
                // Nếu chưa có grades, load lại
                if (!$scope.availableGrades || $scope.availableGrades.length === 0) {
                    console.log('[StudentGradeAppeal] ⚠️ Chưa có grades, đang tải lại...');
                    loadAvailableGrades();
                }
            } catch (error) {
                console.error('[StudentGradeAppeal] ❌ Lỗi khi mở modal:', error);
                LoggerService.error('Error opening create modal', error);
                ToastService.error('Không thể mở form tạo yêu cầu: ' + (error.message || 'Lỗi không xác định'));
            }
        };
        
        // Close create modal
        $scope.closeCreateModal = function() {
            console.log('[StudentGradeAppeal] 🔘 closeCreateModal() - Đóng modal');
            $scope.showCreateModal = false;
        };
        
        // Select grade for appeal
        $scope.onGradeSelect = function() {
            if (!$scope.newAppeal.gradeId) {
                $scope.selectedGrade = null;
                $scope.newAppeal.componentType = null;
                $scope.newAppeal.currentScore = null;
                return;
            }
            
            var grade = $scope.availableGrades.find(function(g) { return g.gradeId === $scope.newAppeal.gradeId; });
            if (grade) {
                $scope.selectedGrade = grade;
                $scope.newAppeal.enrollmentId = grade.enrollmentId;
                $scope.newAppeal.classId = grade.classId;
                // Reset component type when grade changes
                $scope.newAppeal.componentType = null;
                $scope.newAppeal.currentScore = null;
                console.log('[StudentGradeAppeal] ✅ Đã chọn môn học:', grade.subjectName || grade.subjectCode);
            }
        };
        
        // Select component type
        $scope.onComponentTypeSelect = function() {
            if (!$scope.newAppeal.componentType || !$scope.selectedGrade) {
                $scope.newAppeal.currentScore = null;
                return;
            }
            
            var component = $scope.componentTypes.find(function(c) { return c.value === $scope.newAppeal.componentType; });
            if (component && $scope.selectedGrade) {
                $scope.newAppeal.currentScore = $scope.selectedGrade[component.field] || null;
                console.log('[StudentGradeAppeal] ✅ Đã chọn điểm thành phần:', component.label, '- Điểm hiện tại:', $scope.newAppeal.currentScore);
            }
        };
        
        // Get component label
        $scope.getComponentLabel = function(type) {
            var component = $scope.componentTypes.find(function(c) { return c.value === type; });
            return component ? component.label : type;
        };
        
        // Get available components for selected grade
        $scope.getAvailableComponents = function() {
            if (!$scope.selectedGrade) return [];
            
            return $scope.componentTypes.filter(function(component) {
                var score = $scope.selectedGrade[component.field];
                return score !== null && score !== undefined;
            });
        };
        
        // Create appeal
        $scope.createAppeal = function() {
            if (!$scope.newAppeal.gradeId) {
                ToastService.error('Vui lòng chọn môn học cần phúc khảo');
                return;
            }
            
            if (!$scope.newAppeal.componentType) {
                ToastService.error('Vui lòng chọn điểm thành phần cần phúc khảo');
                return;
            }
            
            if ($scope.newAppeal.currentScore === null || $scope.newAppeal.currentScore === undefined) {
                ToastService.error('Không tìm thấy điểm hiện tại cho thành phần này');
                return;
            }
            
            if (!$scope.newAppeal.expectedScore || $scope.newAppeal.expectedScore < 0 || $scope.newAppeal.expectedScore > 10) {
                ToastService.error('Vui lòng nhập điểm mong muốn hợp lệ (0-10)');
                return;
            }
            
            if (!$scope.newAppeal.appealReason || $scope.newAppeal.appealReason.trim().length < 10) {
                ToastService.error('Vui lòng nhập lý do phúc khảo (ít nhất 10 ký tự)');
                return;
            }
            
            // Validate all required fields
            if (!$scope.newAppeal.enrollmentId) {
                ToastService.error('Không tìm thấy thông tin đăng ký môn học. Vui lòng thử lại.');
                console.error('[StudentGradeAppeal] ❌ enrollmentId is missing');
                return;
            }
            
            if (!$scope.newAppeal.classId) {
                ToastService.error('Không tìm thấy thông tin lớp học. Vui lòng thử lại.');
                console.error('[StudentGradeAppeal] ❌ classId is missing');
                return;
            }
            
            if (!$scope.studentId) {
                ToastService.error('Không tìm thấy mã sinh viên. Vui lòng đăng nhập lại.');
                console.error('[StudentGradeAppeal] ❌ studentId is missing');
                return;
            }
            
            $scope.saving = true;
            
            var appealData = {
                gradeId: $scope.newAppeal.gradeId,
                enrollmentId: $scope.newAppeal.enrollmentId,
                studentId: $scope.studentId,
                classId: $scope.newAppeal.classId,
                componentType: $scope.newAppeal.componentType,
                appealReason: $scope.newAppeal.appealReason.trim(),
                currentScore: $scope.newAppeal.currentScore,
                expectedScore: $scope.newAppeal.expectedScore,
                createdBy: $scope.currentUser.userId || $scope.studentId
            };
            
            console.log('[StudentGradeAppeal] 📤 Đang gửi yêu cầu phúc khảo:', appealData);
            console.log('[StudentGradeAppeal] 📊 Validation check:', {
                hasGradeId: !!appealData.gradeId,
                hasEnrollmentId: !!appealData.enrollmentId,
                hasStudentId: !!appealData.studentId,
                hasClassId: !!appealData.classId,
                hasComponentType: !!appealData.componentType,
                hasAppealReason: !!appealData.appealReason && appealData.appealReason.length >= 10,
                hasCurrentScore: appealData.currentScore !== null && appealData.currentScore !== undefined,
                hasExpectedScore: appealData.expectedScore !== null && appealData.expectedScore !== undefined,
                hasCreatedBy: !!appealData.createdBy
            });
            
            GradeAppealService.create(appealData)
                .then(function(response) {
                    console.log('[StudentGradeAppeal] ✅ Tạo yêu cầu phúc khảo thành công:', response);
                    ToastService.success('Tạo yêu cầu phúc khảo thành công!');
                    $scope.closeCreateModal();
                    loadAppeals();
                })
                .catch(function(error) {
                    console.error('[StudentGradeAppeal] ❌ Lỗi khi tạo yêu cầu phúc khảo:', {
                        error: error,
                        status: error.status,
                        statusText: error.statusText,
                        data: error.data,
                        headers: error.headers,
                        config: error.config,
                        appealData: appealData
                    });
                    
                    var errorMessage = 'Không thể tạo yêu cầu phúc khảo';
                    if (error.data) {
                        if (error.data.message) {
                            errorMessage = error.data.message;
                        } else if (error.data.errors) {
                            // ModelState errors
                            var errorMessages = [];
                            for (var key in error.data.errors) {
                                if (error.data.errors.hasOwnProperty(key)) {
                                    error.data.errors[key].forEach(function(msg) {
                                        errorMessages.push(msg);
                                    });
                                }
                            }
                            errorMessage = errorMessages.join(', ');
                        } else if (typeof error.data === 'string') {
                            errorMessage = error.data;
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    console.error('[StudentGradeAppeal] ❌ Error message hiển thị:', errorMessage);
                    ToastService.error('Lỗi: ' + errorMessage);
                    LoggerService.error('Error creating appeal', error);
                })
                .finally(function() {
                    $scope.saving = false;
                });
        };
        
        // View appeal detail
        $scope.viewDetail = function(appealId) {
            $scope.loading = true;
            GradeAppealService.getById(appealId)
                .then(function(appeal) {
                    $scope.selectedAppeal = appeal;
                    $scope.showDetailModal = true;
                    $scope.loading = false;
                })
                .catch(function(error) {
                    ToastService.error('Không thể tải chi tiết phúc khảo');
                    LoggerService.error('Error loading appeal detail', error);
                    $scope.loading = false;
                });
        };
        
        // Close detail modal
        $scope.closeDetailModal = function() {
            $scope.showDetailModal = false;
            $scope.selectedAppeal = null;
        };
        
        // Cancel appeal
        $scope.cancelAppeal = function(appealId) {
            if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu phúc khảo này?')) {
                return;
            }
            
            GradeAppealService.cancel(appealId, $scope.currentUser.userId || $scope.studentId)
                .then(function() {
                    ToastService.success('Hủy yêu cầu phúc khảo thành công');
                    loadAppeals();
                })
                .catch(function(error) {
                    ToastService.error('Lỗi: ' + (error.data?.message || error.message || 'Không thể hủy yêu cầu'));
                    LoggerService.error('Error cancelling appeal', error);
                });
        };
        
        // Get status badge class
        $scope.getStatusBadgeClass = function(status) {
            var classes = {
                'PENDING': 'badge-warning',
                'REVIEWING': 'badge-info',
                'APPROVED': 'badge-success',
                'REJECTED': 'badge-danger',
                'CANCELLED': 'badge-secondary'
            };
            return classes[status] || 'badge-secondary';
        };
        
        // Filter appeals
        $scope.applyFilters = function() {
            $scope.pagination.page = 1;
            loadAppeals();
        };
        
        // Clear filters
        $scope.clearFilters = function() {
            $scope.filters = {
                status: null
            };
            $scope.applyFilters();
        };
        
        // Pagination
        $scope.handlePageChange = function() {
            loadAppeals();
        };
        
        // Initialize
        loadStudentId();
    }
]);

