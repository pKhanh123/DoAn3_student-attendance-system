// Class Management Controller
app.controller('ClassController', ['$scope', '$location', '$routeParams', '$timeout', 'ClassService', 'SubjectService', 'LecturerService', 'AcademicYearService', 'AuthService', 'AvatarService', 'LoggerService', 'PaginationService', 'ApiService',
    function($scope, $location, $routeParams, $timeout, ClassService, SubjectService, LecturerService, AcademicYearService, AuthService, AvatarService, LoggerService, PaginationService, ApiService) {
    
    $scope.classes = [];
    $scope.displayedClasses = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    $scope.currentUser = null;
    
    // Pagination
    $scope.pagination = PaginationService.init(10);
    
    // Initialize page
    $scope.initPage = function() {
        $scope.currentUser = AuthService.getCurrentUser();
        
        // Initialize sidebar toggle
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            // Store handler reference for cleanup
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
    };
    
    // Cleanup event listeners on controller destroy
    $scope.$on('$destroy', function() {
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle && $scope.menuToggleHandler) {
            menuToggle.removeEventListener('click', $scope.menuToggleHandler);
        }
    });
    
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
        AuthService.logout(); // Will auto-redirect to login
    };
    
    // Filters
    $scope.filters = {
        subjectId: '',
        lecturerId: '',
        academicYearId: '',
        semester: ''
    };
    
    // Semester options
    $scope.semesters = [
        { value: '1', label: 'Học kỳ 1' },
        { value: '2', label: 'Học kỳ 2' },
        { value: '3', label: 'Học kỳ hè' }
    ];
    
    // Load classes with server-side pagination
    $scope.loadClasses = function() {
        $scope.loading = true;
        $scope.error = null;
        
        var params = {
            page: $scope.pagination.currentPage,
            pageSize: $scope.pagination.pageSize,
            search: $scope.pagination.searchTerm || null,
            subjectId: $scope.filters.subjectId || null,
            lecturerId: $scope.filters.lecturerId || null,
            academicYearId: $scope.filters.academicYearId || null
        };
        
        // Remove empty values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '' || params[key] === undefined) {
                delete params[key];
            }
        });
        
        ClassService.getAll(params)
            .then(function(response) {
                LoggerService.debug('Classes response received', response);
                LoggerService.debug('Classes response payload', response.data);
                
                var result = response.data;
                
                if (result && result.data) {
                    console.log('Loading classes: received', result.data.length, 'items');
                    $scope.displayedClasses = result.data.map(function(classItem) {
                        // Map currentEnrollment từ backend (camelCase) hoặc currentStudents (nếu có)
                        // Backend trả về currentEnrollment (từ property CurrentEnrollment trong C# model)
                        var currentStudents = classItem.currentEnrollment !== undefined 
                            ? classItem.currentEnrollment 
                            : (classItem.currentStudents !== undefined ? classItem.currentStudents : 0);
                        
                        // Debug log để kiểm tra
                        if (currentStudents === 0 && (classItem.currentEnrollment === undefined && classItem.currentStudents === undefined)) {
                            LoggerService.debug('Class missing enrollment data', {
                                classId: classItem.classId,
                                classCode: classItem.classCode,
                                availableFields: Object.keys(classItem)
                            });
                        }
                        
                        return {
                            classId: classItem.classId,
                            classCode: classItem.classCode,
                            className: classItem.className,
                            subjectId: classItem.subjectId,
                            subjectName: classItem.subjectName || 'N/A',
                            lecturerId: classItem.lecturerId,
                            lecturerName: classItem.lecturerName || 'N/A',
                            semester: classItem.semester,
                            academicYearId: classItem.academicYearId,
                            academicYearName: classItem.academicYearName || 'N/A',
                            maxStudents: classItem.maxStudents,
                            currentStudents: currentStudents,
                            createdAt: classItem.createdAt,
                            updatedAt: classItem.updatedAt
                        };
                    });
                    
                    // Force new array reference to trigger Angular change detection
                    // Create a completely new array to ensure Angular detects the change
                    var newClassesArray = [];
                    for (var i = 0; i < $scope.displayedClasses.length; i++) {
                        newClassesArray.push(angular.copy($scope.displayedClasses[i]));
                    }
                    $scope.classes = newClassesArray;
                    
                    // Update pagination info from server
                    if (result.totalCount !== undefined) {
                        $scope.pagination.totalItems = result.totalCount;
                        $scope.pagination.totalPages = result.totalPages;
                        $scope.pagination.currentPage = result.page;
                        $scope.pagination.pageSize = result.pageSize;
                    }
                    
                    // Recalculate pagination UI
                    $scope.pagination = PaginationService.calculate($scope.pagination);
                    
                    LoggerService.debug('Classes loaded', { total: $scope.classes.length });
                    console.log('Classes loaded successfully:', $scope.classes.length, 'items');
                    console.log('First class sample:', $scope.classes.length > 0 ? {
                        classCode: $scope.classes[0].classCode,
                        className: $scope.classes[0].className,
                        maxStudents: $scope.classes[0].maxStudents
                    } : 'No classes');
                } else {
                    $scope.classes = [];
                    $scope.displayedClasses = [];
                    LoggerService.warn('No classes data found for the current filters.');
                    console.log('No classes data found');
                }
                $scope.loading = false;
            })
            .catch(function(error) {
                LoggerService.error('Error loading classes', error);
                $scope.error = 'Không thể tải danh sách lớp học: ' + (error.data && error.data.message || error.message || 'Lỗi không xác định');
                $scope.loading = false;
            });
    };
    
    // Search handler
    $scope.handleSearch = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadClasses();
    };
    
    // Filter handler
    $scope.handleFilter = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadClasses();
    };
    
    // Page change handler
    $scope.handlePageChange = function(page) {
        $scope.pagination.currentPage = page;
        $scope.loadClasses();
    };
    
    // Page size change handler
    $scope.handlePageSizeChange = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadClasses();
    };
    
    // Load subjects for dropdown
    $scope.subjects = [];
    $scope.loadSubjects = function() {
        return SubjectService.getAll()
            .then(function(response) {
                if (response.data) {
                    // Handle paginated response: {success: true, data: [...], ...}
                    // or direct array response
                    if (response.data.data && Array.isArray(response.data.data)) {
                        $scope.subjects = response.data.data;
                    } else if (Array.isArray(response.data)) {
                        $scope.subjects = response.data;
                    } else {
                        $scope.subjects = [];
                    }
                }
                return response;
            })
            .catch(function(error) {
                LoggerService.error('Error loading subjects', error);
                throw error;
            });
    };
    
    // Load lecturers for dropdown
    $scope.lecturers = [];
    $scope.loadLecturers = function() {
        LecturerService.getAll()
            .then(function(response) {
                if (response.data) {
                    $scope.lecturers = response.data;
                }
            })
            .catch(function(error) {
                LoggerService.error('Error loading lecturers', error);
            });
    };
    
    // Load academic years for dropdown
    $scope.academicYears = [];
    $scope.loadAcademicYears = function() {
        return AcademicYearService.getAll()
            .then(function(response) {
                if (response.data) {
                    $scope.academicYears = response.data;
                }
                return response;
            })
            .catch(function(error) {
                LoggerService.error('Error loading academic years', error);
                throw error;
            });
    };
    
    // View mode
    $scope.showFormModal = false;
    $scope.showDeleteModal = false;
    $scope.selectedClass = {};
    $scope.formMode = 'create'; // 'create' or 'edit'
    
    // Open create form
    $scope.openCreateForm = function() {
        $scope.formMode = 'create';
        $scope.hasRegisteredStudents = false; // Reset flag for create mode
        $scope.selectedClass = {
            classCode: '',
            className: '',
            subjectId: '',
            lecturerId: '',
            semester: '1',
            academicYearId: '',
            maxStudents: 50
        };
        $scope.showFormModal = true;
    };
    
    // Open edit form
    $scope.openEditForm = function(classItem) {
        $scope.formMode = 'edit';
        $scope.loadingClassDetails = true;
        $scope.hasRegisteredStudents = false;
        
        // Tạm thời sử dụng dữ liệu từ danh sách để hiển thị
        $scope.selectedClass = angular.copy(classItem);
        
        // Gọi API để lấy thông tin mới nhất từ backend
        ClassService.getById(classItem.classId)
            .then(function(response) {
                var classData = response.data && response.data.data ? response.data.data : response.data;
                
                if (!classData) {
                    // Nếu không lấy được dữ liệu mới, sử dụng dữ liệu từ danh sách
                    classData = classItem;
                }
                
                // Đảm bảo maxStudents là number
                var maxStudents = classData.maxStudents;
                if (maxStudents === undefined || maxStudents === null || maxStudents === '') {
                    maxStudents = 50; // Default
                }
                maxStudents = parseInt(maxStudents, 10);
                if (isNaN(maxStudents) || maxStudents <= 0) {
                    maxStudents = 50; // Default
                }
                
                // Lấy số sinh viên đăng ký từ backend (có thể khác với danh sách)
                // Kiểm tra nhiều tên field có thể có: currentStudents, currentEnrollment, current_enrollment
                var currentStudents = classData.currentStudents || 
                                     classData.currentEnrollment || 
                                     classData.current_enrollment || 
                                     0;
                $scope.hasRegisteredStudents = currentStudents > 0;
                
                // Cập nhật selectedClass với dữ liệu mới nhất
                $scope.selectedClass = angular.copy(classData);
                
                // Lưu giá trị ban đầu để so sánh sau khi update
                $scope.originalClassData = {
                    classId: classData.classId || classItem.classId,
                    classCode: classData.classCode || classItem.classCode,
                    className: classData.className || classItem.className,
                    subjectId: classData.subjectId || classItem.subjectId,
                    lecturerId: classData.lecturerId || classItem.lecturerId,
                    semester: classData.semester || classItem.semester,
                    academicYearId: classData.academicYearId || classItem.academicYearId,
                    maxStudents: maxStudents,
                    currentStudents: currentStudents
                };
                
                console.log('=== Mở modal chỉnh sửa lớp học phần ===');
                console.log('Class ID:', $scope.originalClassData.classId);
                console.log('Giá trị ban đầu (từ backend):', $scope.originalClassData);
                console.log('Có sinh viên đăng ký:', $scope.hasRegisteredStudents, '(Số lượng:', currentStudents, ')');
                
                // Đảm bảo selectedClass có đúng format (string) để match với ng-options
                $scope.selectedClass.subjectId = String($scope.selectedClass.subjectId || '');
                $scope.selectedClass.academicYearId = String($scope.selectedClass.academicYearId || '');
                $scope.selectedClass.lecturerId = String($scope.selectedClass.lecturerId || '');
                $scope.selectedClass.semester = String($scope.selectedClass.semester || '1');
                $scope.selectedClass.maxStudents = maxStudents;
                
                // Load dropdown data if needed
                var loadPromises = [];
                if ($scope.subjects.length === 0) {
                    loadPromises.push($scope.loadSubjects());
                }
                if ($scope.academicYears.length === 0) {
                    loadPromises.push($scope.loadAcademicYears());
                }
                
                // Wait for data to load if needed, then open modal
                if (loadPromises.length > 0) {
                    return Promise.all(loadPromises);
                }
            })
            .then(function() {
                $scope.loadingClassDetails = false;
                $scope.showFormModal = true;
                // Force Angular to update
                if (!$scope.$$phase && !$scope.$root.$$phase) {
                    $scope.$apply();
                }
                // Small delay to ensure ng-options are rendered
                setTimeout(function() {
                    if (!$scope.$$phase && !$scope.$root.$$phase) {
                        $scope.$apply();
                    }
                    $scope.forceSetSelectValues();
                }, 100);
            })
            .catch(function(error) {
                console.error('Error loading class details:', error);
                // Nếu lỗi, vẫn mở modal với dữ liệu từ danh sách
                var maxStudents = classItem.maxStudents;
                if (maxStudents === undefined || maxStudents === null || maxStudents === '') {
                    maxStudents = 50;
                }
                maxStudents = parseInt(maxStudents, 10);
                if (isNaN(maxStudents) || maxStudents <= 0) {
                    maxStudents = 50;
                }
                
                var currentStudents = classItem.currentStudents || 0;
                $scope.hasRegisteredStudents = currentStudents > 0;
                
                $scope.originalClassData = {
                    classId: classItem.classId,
                    classCode: classItem.classCode,
                    className: classItem.className,
                    subjectId: classItem.subjectId,
                    lecturerId: classItem.lecturerId,
                    semester: classItem.semester,
                    academicYearId: classItem.academicYearId,
                    maxStudents: maxStudents,
                    currentStudents: currentStudents
                };
                
                $scope.loadingClassDetails = false;
                $scope.showFormModal = true;
                if (!$scope.$$phase && !$scope.$root.$$phase) {
                    $scope.$apply();
                }
                setTimeout(function() {
                    $scope.forceSetSelectValues();
                }, 100);
            });
    };
    
    // Force set select values to match ng-options format
    $scope.forceSetSelectValues = function() {
        var modal = document.getElementById('classFormModal');
        if (!modal) return;
        
        var subjectSelect = modal.querySelector('select[ng-model="selectedClass.subjectId"]');
        var academicYearSelect = modal.querySelector('select[ng-model="selectedClass.academicYearId"]');
        var lecturerSelect = modal.querySelector('select[ng-model="selectedClass.lecturerId"]');
        
        // Helper function to normalize value (remove "string:" prefix if present)
        var normalizeValue = function(value) {
            if (!value) return '';
            var str = String(value);
            // Remove "string:" prefix if Angular added it
            if (str.indexOf('string:') === 0) {
                return str.substring(7);
            }
            return str;
        };
        
        // Helper function to find and set matching option
        var setSelectValue = function(select, targetValue) {
            if (!select || !targetValue) return;
            
            var normalizedTarget = normalizeValue(targetValue);
            
            // Try exact match first
            for (var i = 0; i < select.options.length; i++) {
                var optionValue = normalizeValue(select.options[i].value);
                if (optionValue === normalizedTarget) {
                    select.selectedIndex = i;
                    // Trigger change event to update Angular model
                    angular.element(select).triggerHandler('change');
                    return true;
                }
            }
            
            // Try partial match (value contains target)
            for (var i = 0; i < select.options.length; i++) {
                var optionValue = String(select.options[i].value);
                if (optionValue.indexOf(normalizedTarget) !== -1 || normalizedTarget.indexOf(optionValue) !== -1) {
                    select.selectedIndex = i;
                    angular.element(select).triggerHandler('change');
                    return true;
                }
            }
            
            return false;
        };
        
        // Set subject select
        if (subjectSelect && $scope.selectedClass.subjectId) {
            setSelectValue(subjectSelect, $scope.selectedClass.subjectId);
        }
        
        // Set academic year select
        if (academicYearSelect && $scope.selectedClass.academicYearId) {
            setSelectValue(academicYearSelect, $scope.selectedClass.academicYearId);
        }
        
        // Set lecturer select
        if (lecturerSelect && $scope.selectedClass.lecturerId) {
            setSelectValue(lecturerSelect, $scope.selectedClass.lecturerId);
        }
        
        // Force Angular digest cycle
        if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
        }
    };
    
    // Close form modal
    $scope.closeFormModal = function() {
        $scope.showFormModal = false;
        $scope.selectedClass = {};
        $scope.error = null; // Clear error message
        $scope.loadingClassDetails = false;
        document.body.classList.remove('modal-open');
    };
    
    // Save class
    $scope.saveClass = function() {
        if ($scope.formMode === 'create') {
            $scope.createClass();
        } else {
            $scope.updateClass();
        }
    };
    
    // Create class
    $scope.createClass = function() {
        var classData = {
            classCode: $scope.selectedClass.classCode,
            className: $scope.selectedClass.className,
            subjectId: $scope.selectedClass.subjectId,
            lecturerId: $scope.selectedClass.lecturerId,
            semester: $scope.selectedClass.semester,
            academicYearId: $scope.selectedClass.academicYearId,
            maxStudents: $scope.selectedClass.maxStudents,
            createdBy: (AuthService.getCurrentUser() && AuthService.getCurrentUser().userId) || 'system'
        };
        
        ClassService.create(classData)
            .then(function(response) {
                $scope.success = 'Tạo lớp học thành công';
                $scope.error = null; // Clear any previous errors
                
                // Close modal first
                $scope.closeFormModal();
                
                // Reload classes list to show new class
                $timeout(function() {
                    console.log('Reloading classes list after create...');
                    // Clear cache and reload
                    ApiService.clearCache('/classes*');
                    $scope.loadClasses();
                }, 300);
            })
            .catch(function(error) {
                $scope.error = 'Không thể tạo lớp học: ' + (error.data && error.data.message || error.message || 'Lỗi không xác định');
            });
    };
    
    // Update class
    $scope.updateClass = function() {
        // Validation: Kiểm tra các thay đổi không được phép
        if ($scope.originalClassData && $scope.hasRegisteredStudents) {
            var restrictedChanges = [];
            
            if ($scope.originalClassData.subjectId !== $scope.selectedClass.subjectId) {
                restrictedChanges.push({
                    field: 'Môn học',
                    reason: 'Lớp đã có ' + ($scope.originalClassData.currentStudents || 0) + ' sinh viên đăng ký'
                });
            }
            if ($scope.originalClassData.semester !== $scope.selectedClass.semester) {
                restrictedChanges.push({
                    field: 'Học kỳ',
                    reason: 'Lớp đã có ' + ($scope.originalClassData.currentStudents || 0) + ' sinh viên đăng ký'
                });
            }
            if ($scope.originalClassData.academicYearId !== $scope.selectedClass.academicYearId) {
                restrictedChanges.push({
                    field: 'Niên khóa',
                    reason: 'Lớp đã có ' + ($scope.originalClassData.currentStudents || 0) + ' sinh viên đăng ký'
                });
            }
            
            if (restrictedChanges.length > 0) {
                var errorMsg = 'Không thể cập nhật lớp học vì:\n\n';
                restrictedChanges.forEach(function(change) {
                    errorMsg += '• ' + change.field + ': ' + change.reason + '\n';
                });
                errorMsg += '\nVui lòng tạo lớp mới thay vì chỉnh sửa lớp hiện tại.';
                
                $scope.error = errorMsg;
                // Scroll to top to show error
                var modalBody = document.querySelector('#classFormModal .modal-body');
                if (modalBody) {
                    modalBody.scrollTop = 0;
                }
                return;
            }
        }
        
        // Đảm bảo maxStudents là number và có giá trị hợp lệ
        var maxStudents = $scope.selectedClass.maxStudents;
        if (maxStudents === undefined || maxStudents === null || maxStudents === '') {
            maxStudents = $scope.originalClassData ? $scope.originalClassData.maxStudents : 50;
        }
        maxStudents = parseInt(maxStudents, 10);
        if (isNaN(maxStudents) || maxStudents <= 0) {
            maxStudents = 50; // Default value
        }
        
        var classData = {
            classCode: $scope.selectedClass.classCode,
            className: $scope.selectedClass.className,
            subjectId: $scope.selectedClass.subjectId,
            lecturerId: $scope.selectedClass.lecturerId,
            semester: $scope.selectedClass.semester,
            academicYearId: $scope.selectedClass.academicYearId,
            maxStudents: maxStudents,
            updatedBy: (AuthService.getCurrentUser() && AuthService.getCurrentUser().userId) || 'system'
        };
        
        console.log('=== Bắt đầu cập nhật lớp học phần ===');
        console.log('Class ID:', $scope.selectedClass.classId);
        
        // So sánh giá trị cũ và mới
        if ($scope.originalClassData) {
            console.log('--- So sánh giá trị cũ và mới ---');
            var changes = [];
            
            if ($scope.originalClassData.classCode !== classData.classCode) {
                changes.push({
                    field: 'classCode',
                    old: $scope.originalClassData.classCode,
                    new: classData.classCode
                });
            }
            if ($scope.originalClassData.className !== classData.className) {
                changes.push({
                    field: 'className',
                    old: $scope.originalClassData.className,
                    new: classData.className
                });
            }
            if ($scope.originalClassData.subjectId !== classData.subjectId) {
                changes.push({
                    field: 'subjectId',
                    old: $scope.originalClassData.subjectId,
                    new: classData.subjectId
                });
            }
            if ($scope.originalClassData.lecturerId !== classData.lecturerId) {
                changes.push({
                    field: 'lecturerId',
                    old: $scope.originalClassData.lecturerId,
                    new: classData.lecturerId
                });
            }
            if ($scope.originalClassData.semester !== classData.semester) {
                changes.push({
                    field: 'semester',
                    old: $scope.originalClassData.semester,
                    new: classData.semester
                });
            }
            if ($scope.originalClassData.academicYearId !== classData.academicYearId) {
                changes.push({
                    field: 'academicYearId',
                    old: $scope.originalClassData.academicYearId,
                    new: classData.academicYearId
                });
            }
            if ($scope.originalClassData.maxStudents !== classData.maxStudents) {
                changes.push({
                    field: 'maxStudents',
                    old: $scope.originalClassData.maxStudents,
                    new: classData.maxStudents
                });
            }
            
            if (changes.length > 0) {
                console.log('✓ Có ' + changes.length + ' thay đổi:');
                changes.forEach(function(change) {
                    console.log('  - ' + change.field + ': "' + change.old + '" → "' + change.new + '"');
                });
            } else {
                console.log('⚠ Không có thay đổi nào');
            }
        }
        
        console.log('--- Dữ liệu gửi đi ---');
        console.log('classData:', classData);
        console.log('JSON:', JSON.stringify(classData, null, 2));
        
        ClassService.update($scope.selectedClass.classId, classData)
            .then(function(response) {
                console.log('=== Cập nhật thành công ===');
                console.log('Response:', response);
                console.log('Response data:', response.data);
                
                // Kiểm tra dữ liệu trả về
                if (response.data) {
                    console.log('--- Dữ liệu sau khi cập nhật ---');
                    console.log('classCode:', response.data.classCode || classData.classCode);
                    console.log('className:', response.data.className || classData.className);
                    console.log('subjectId:', response.data.subjectId || classData.subjectId);
                    console.log('lecturerId:', response.data.lecturerId || classData.lecturerId);
                    console.log('semester:', response.data.semester || classData.semester);
                    console.log('academicYearId:', response.data.academicYearId || classData.academicYearId);
                    console.log('maxStudents:', response.data.maxStudents || classData.maxStudents);
                }
                
                $scope.success = 'Cập nhật lớp học thành công';
                $scope.error = null; // Clear any previous errors
                
                // Close modal first
                $scope.closeFormModal();
                
                // Reload classes list to reflect changes
                // Use $timeout to ensure Angular digest cycle is triggered
                // Also add a small delay to ensure database transaction is committed
                $timeout(function() {
                    console.log('Reloading classes list after update...');
                    // Clear cache to ensure fresh data
                    ApiService.clearCache('/classes*');
                    $scope.loadClasses();
                }, 300); // Increased delay to ensure DB commit
            })
            .catch(function(error) {
                console.error('=== Cập nhật thất bại ===');
                console.error('Error:', error);
                console.error('Error status:', error.status);
                console.error('Error data:', error.data);
                console.error('Error data (full):', JSON.stringify(error.data, null, 2));
                
                // Extract detailed error message - prioritize 'error' field over 'message' field
                var errorMessage = 'Lỗi không xác định';
                if (error.data) {
                    // Prioritize the 'error' field which contains the detailed business logic error
                    if (error.data.error) {
                        errorMessage = error.data.error;
                    } else if (error.data.message && error.data.message !== 'Lỗi hệ thống') {
                        // Only use message if it's not the generic "Lỗi hệ thống"
                        errorMessage = error.data.message;
                    } else if (typeof error.data === 'string') {
                        errorMessage = error.data;
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                console.error('Error message:', errorMessage);
                
                // Show the error message directly (it already contains full context)
                $scope.error = errorMessage;
            });
    };
    
    // Open delete modal
    $scope.openDeleteModal = function(classItem) {
        $scope.selectedClass = angular.copy(classItem);
        $scope.showDeleteModal = true;
    };
    
    // Close delete modal
    $scope.closeDeleteModal = function() {
        $scope.showDeleteModal = false;
        $scope.selectedClass = {};
        document.body.classList.remove('modal-open');
    };
    
    // Delete class
    $scope.deleteClass = function() {
        ClassService.delete($scope.selectedClass.classId)
            .then(function(response) {
                $scope.success = 'Xóa lớp học thành công';
                $scope.error = null; // Clear any previous errors
                
                // Close modal first
                $scope.closeDeleteModal();
                
                // Reload classes list to reflect deletion
                $timeout(function() {
                    console.log('Reloading classes list after delete...');
                    // Clear cache and reload
                    ApiService.clearCache('/classes*');
                    $scope.loadClasses();
                }, 300);
            })
            .catch(function(error) {
                $scope.error = 'Không thể xóa lớp học: ' + (error.data && error.data.message || error.message || 'Lỗi không xác định');
            });
    };
    
    // Get semester label
    $scope.getSemesterLabel = function(semester) {
        var semesterObj = $scope.semesters.find(function(s) {
            return s.value === semester;
        });
        return semesterObj ? semesterObj.label : semester;
    };
    
    // Format date
    $scope.formatDate = function(dateString) {
        if (!dateString) return '';
        var date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    };
    
    // Initialize
    $scope.loadClasses();
    $scope.loadSubjects();
    $scope.loadLecturers();
    $scope.loadAcademicYears();
}]);