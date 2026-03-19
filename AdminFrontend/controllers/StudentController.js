// Student Controller with Pagination, Search, Sort, Filter, Import/Export
app.controller('StudentController', ['$scope', '$location', '$routeParams', '$timeout', 'StudentService', 'FacultyService', 'MajorService', 'PaginationService', 'ExportService', 'ImportService', 'AuthService', 'AvatarService', 'LoggerService',
    function($scope, $location, $routeParams, $timeout, StudentService, FacultyService, MajorService, PaginationService, ExportService, ImportService, AuthService, AvatarService, LoggerService) {
    
    $scope.students = [];
    $scope.displayedStudents = []; // For display after filtering/sorting
    $scope.faculties = [];
    $scope.majors = [];
    $scope.student = {};
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    $scope.isEditMode = false;
    
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
    
    // Pagination and filters
    $scope.pagination = PaginationService.init(10);
    $scope.filters = {
        facultyId: '',
        majorId: '',
        status: ''
    };
    
    // Import modal
    $scope.showImportModal = false;
    $scope.importData = {
        file: null,
        preview: [],
        errors: [],
        validCount: 0,
        errorCount: 0
    };
    
    // Loading states for individual actions
    $scope.loadingStates = {
        students: false,
        faculties: false,
        majors: false,
        save: false,
        export: false,
        import: false
    };
    
    // Load students with server-side pagination and filtering
    $scope.loadStudents = function() {
        $scope.loadingStates.students = true;
        $scope.error = null;
        
        // Build query parameters
        var params = {
            page: $scope.pagination.currentPage,
            pageSize: $scope.pagination.pageSize,
            search: $scope.pagination.searchTerm || null,
            facultyId: $scope.filters.facultyId || null,
            majorId: $scope.filters.majorId || null
        };
        
        // Remove empty values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '' || params[key] === undefined) {
                delete params[key];
            }
        });
        
        StudentService.getAll(params)
            .then(function(response) {
                // Backend trả về {data: [...], pagination: {...}}
                var result = response.data;
                
                // Update displayed students
                $scope.displayedStudents = result.data || [];
                
                // Update pagination info from server
                if (result.pagination) {
                    $scope.pagination.totalItems = result.pagination.totalCount;
                    $scope.pagination.totalPages = result.pagination.totalPages;
                    $scope.pagination.currentPage = result.pagination.page;
                    $scope.pagination.pageSize = result.pagination.pageSize;
                }
                
                // Recalculate pagination UI
                $scope.pagination = PaginationService.calculate($scope.pagination);
                
                $scope.loadingStates.students = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải danh sách sinh viên';
                $scope.loadingStates.students = false;
                LoggerService.error('Error loading students', error);
            });
    };
    
    // Search handler with debounce - reset to page 1 and reload
    var searchTimeout;
    $scope.handleSearch = function() {
        // Clear previous timeout
        if (searchTimeout) {
            $timeout.cancel(searchTimeout);
        }
        
        // Debounce search - wait 400ms after user stops typing
        searchTimeout = $timeout(function() {
            $scope.pagination.currentPage = 1;
            $scope.loadStudents();
        }, 400);
    };
    
    // Sort handler - reload with current sort
    // Note: Backend có thể không hỗ trợ sorting, nên giữ client-side sorting cho hiện tại
    $scope.handleSort = function() {
        // Client-side sorting cho displayed students
        if ($scope.pagination.sortField && $scope.displayedStudents.length > 0) {
            $scope.displayedStudents.sort(function(a, b) {
                var aVal = getNestedValue(a, $scope.pagination.sortField);
                var bVal = getNestedValue(b, $scope.pagination.sortField);
                
                if (aVal < bVal) return $scope.pagination.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return $scope.pagination.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
    };
    
    // Helper function to get nested object values
    function getNestedValue(obj, path) {
        return path.split('.').reduce(function(current, prop) {
            return current ? current[prop] : '';
        }, obj);
    }
    
    // Page change handler - reload from server
    $scope.handlePageChange = function() {
        $scope.loadStudents();
    };
    
    // Filter change handler - reset to page 1 and reload
    $scope.handleFilterChange = function() {
        // Khi đổi khoa → nạp lại danh sách ngành và reset ngành
        if (!$scope.filters.facultyId) {
            $scope.filters.majorId = '';
        }
        $scope.loadMajors();
        $scope.pagination.currentPage = 1;
        $scope.loadStudents();
    };
    
    // Reset filters - clear all and reload
    $scope.resetFilters = function() {
        $scope.pagination.searchTerm = '';
        $scope.filters = {
            facultyId: '',
            majorId: '',
            status: ''
        };
        $scope.pagination.currentPage = 1;
        $scope.loadStudents();
    };
    
    // Export to Excel - Load all data matching current filters
    $scope.exportToExcel = function() {
        $scope.loadingStates.export = true;
        
        // Load all data with current filters (no pagination for export)
        var params = {
            page: 1,
            pageSize: 10000, // Large number to get all results
            search: $scope.pagination.searchTerm || null,
            facultyId: $scope.filters.facultyId || null,
            majorId: $scope.filters.majorId || null
        };
        
        // Remove empty values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '' || params[key] === undefined) {
                delete params[key];
            }
        });
        
        // Disable cache for export to ensure fresh data
        StudentService.getAll(params, false).then(function(response) {
            var result = response.data;
            var dataToExport = result.data || [];
            
            // Apply status filter if needed (client-side, since backend doesn't support it)
            if ($scope.filters.status !== '') {
                var isActive = $scope.filters.status === 'true';
                dataToExport = dataToExport.filter(function(student) {
                    return student.isActive === isActive;
                });
            }
            
            var columns = [
                { label: 'Mã SV', field: 'studentCode' },
                { label: 'Họ tên', field: 'fullName' },
                { label: 'Email', field: 'email' },
                { label: 'Số điện thoại', field: 'phone' },
                { label: 'Ngày sinh', field: 'dateOfBirth', type: 'date' },
                { label: 'Giới tính', field: 'gender' },
                { label: 'Khoa', field: 'facultyName' },
                { label: 'Ngành', field: 'majorName' },
                { label: 'Trạng thái', field: 'isActive' }
            ];
            
            // Export options with professional styling
            var exportOptions = {
                title: '📚 DANH SÁCH SINH VIÊN',
                info: [
                    ['Đơn vị:', 'Trường Đại học ABC'],
                    ['Thời gian xuất:', new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN')],
                    ['Người xuất:', $scope.getCurrentUser() ? $scope.getCurrentUser().fullName : 'Admin']
                ],
                sheetName: 'Sinh viên',
                showSummary: true
            };
            
            ExportService.exportToExcel(dataToExport, 'DanhSachSinhVien', columns, exportOptions);
            $scope.loadingStates.export = false;
        }).catch(function(error) {
            $scope.error = 'Không thể xuất dữ liệu';
            $scope.loadingStates.export = false;
            LoggerService.error('Error exporting to Excel', error);
        });
    };
    
    // Export to CSV - Load all data matching current filters
    $scope.exportToCSV = function() {
        $scope.loadingStates.export = true;
        
        // Load all data with current filters (no pagination for export)
        var params = {
            page: 1,
            pageSize: 10000, // Large number to get all results
            search: $scope.pagination.searchTerm || null,
            facultyId: $scope.filters.facultyId || null,
            majorId: $scope.filters.majorId || null
        };
        
        // Remove empty values
        Object.keys(params).forEach(function(key) {
            if (params[key] === null || params[key] === '' || params[key] === undefined) {
                delete params[key];
            }
        });
        
        // Disable cache for export to ensure fresh data
        StudentService.getAll(params, false).then(function(response) {
            var result = response.data;
            var dataToExport = result.data || [];
            
            // Apply status filter if needed (client-side, since backend doesn't support it)
            if ($scope.filters.status !== '') {
                var isActive = $scope.filters.status === 'true';
                dataToExport = dataToExport.filter(function(student) {
                    return student.isActive === isActive;
                });
            }
            
            var columns = [
                { label: 'Mã SV', field: 'studentCode' },
                { label: 'Họ tên', field: 'fullName' },
                { label: 'Email', field: 'email' },
                { label: 'Số điện thoại', field: 'phone' },
                { label: 'Khoa', field: 'facultyName' },
                { label: 'Ngành', field: 'majorName' },
                { label: 'Trạng thái', field: 'isActive' }
            ];
            
            ExportService.exportToCSV(dataToExport, 'DanhSachSinhVien_' + new Date().toISOString().split('T')[0], columns);
            $scope.loadingStates.export = false;
        }).catch(function(error) {
            $scope.error = 'Không thể xuất dữ liệu';
            $scope.loadingStates.export = false;
            LoggerService.error('Error exporting to CSV', error);
        });
    };
    
    // Open import modal
    $scope.openImportModal = function() {
        console.log('[StudentController] 🔘 openImportModal() - Mở modal import');
        $scope.showImportModal = true;
        $scope.importData = {
            file: null,
            preview: [],
            errors: [],
            validCount: 0,
            errorCount: 0
        };
        console.log('[StudentController] ✅ showImportModal =', $scope.showImportModal);
    };
    
    // Close import modal
    $scope.closeImportModal = function() {
        console.log('[StudentController] 🔘 closeImportModal() - Đóng modal import');
        $scope.showImportModal = false;
        console.log('[StudentController] ✅ showImportModal =', $scope.showImportModal);
    };
    
    // Download import template
    $scope.downloadTemplate = function() {
        var columns = [
            { 
                label: 'Mã SV', 
                example: 'SV2024003',
                required: true,
                note: 'Mã sinh viên duy nhất, không trùng lặp. Định dạng: SV + năm + số (VD: SV2024003, SV2024004)'
            },
            { 
                label: 'Họ tên', 
                example: 'Nguyễn Văn Cường',
                required: true,
                note: 'Họ và tên đầy đủ của sinh viên'
            },
            { 
                label: 'Email', 
                example: 'nguyenvancuong@student.edu.vn',
                required: true,
                note: 'Email sinh viên, phải đúng định dạng có chứa @. Không trùng lặp'
            },
            { 
                label: 'Số điện thoại', 
                example: '0912345678',
                required: false,
                note: 'Số điện thoại di động, 10-11 chữ số, bắt đầu bằng 0'
            },
            { 
                label: 'Ngày sinh', 
                example: '2003-03-15',
                required: false,
                note: 'Định dạng: YYYY-MM-DD (VD: 2003-03-15, 2003-07-22)'
            },
            { 
                label: 'Giới tính', 
                example: 'Nam',
                required: false,
                note: 'Giá trị: Nam hoặc Nữ (phân biệt chữ hoa/thường)'
            },
            { 
                label: 'Địa chỉ', 
                example: 'Số 10, Đường Lê Lợi, Quận 1, TP.HCM',
                required: false,
                note: 'Địa chỉ thường trú hoặc tạm trú (đầy đủ)'
            },
            { 
                label: 'Mã Ngành', 
                example: 'MAJ001',
                required: true,
                note: 'CHỈ dùng: MAJ001 (Công nghệ Phần mềm) hoặc MAJ002 (Khoa học Dữ liệu). Xem sheet "Mã tham khảo"'
            },
            { 
                label: 'Niên khóa', 
                example: 'AY2024',
                required: false,
                note: 'CHỈ dùng: AY2024 (KHÔNG phải AY2024-2025!). Có thể để trống. Xem sheet "Mã tham khảo"'
            }
        ];
        
        ImportService.downloadTemplate('MauNhapSinhVien', columns);
    };
    
    // Handle file selection
    $scope.onFileSelect = function(files) {
        console.log('[StudentController] 📁 onFileSelect() - File được chọn:', files);
        if (files && files.length > 0) {
            var file = files[0];
            console.log('[StudentController] 📄 File info:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            });
            $scope.importData.file = file;
            $scope.processImportFile();
        } else {
            console.warn('[StudentController] ⚠️ Không có file được chọn');
        }
    };
    
    // Process import file
    $scope.processImportFile = function() {
        console.log('[StudentController] 🔄 processImportFile() - Bắt đầu xử lý file');
        console.log('[StudentController] 📄 File:', $scope.importData.file);
        
        if (!$scope.importData.file) {
            console.error('[StudentController] ❌ Không có file để xử lý');
            $scope.error = 'Vui lòng chọn file để import';
            return;
        }
        
        ImportService.readFile($scope.importData.file)
            .then(function(data) {
                console.log('[StudentController] 📥 Đã đọc file thành công');
                console.log('[StudentController] 📊 Dữ liệu đọc được:', {
                    rowCount: data ? data.length : 0,
                    firstRow: data && data.length > 0 ? data[0] : null,
                    sampleData: data ? data.slice(0, 3) : []
                });
                
                // Validate data
                var schema = [
                    { 
                        name: 'Mã SV (*)', 
                        label: 'Mã SV', 
                        required: true,
                        validate: function(value) {
                            if (!/^SV\d+$/i.test(value)) {
                                return 'Mã SV phải có định dạng SV + số (VD: SV001)';
                            }
                        }
                    },
                    { 
                        name: 'Họ tên (*)', 
                        label: 'Họ tên', 
                        required: true 
                    },
                    { 
                        name: 'Email (*)', 
                        label: 'Email', 
                        required: true, 
                        type: 'email' 
                    },
                    { 
                        name: 'Số điện thoại', 
                        label: 'Số điện thoại', 
                        required: false,
                        validate: function(value) {
                            if (value && !/^\d{10,11}$/.test(value.toString().replace(/\s/g, ''))) {
                                return 'Số điện thoại phải có 10-11 chữ số';
                            }
                        }
                    },
                    { 
                        name: 'Ngày sinh', 
                        label: 'Ngày sinh', 
                        required: false,
                        type: 'date'
                    },
                    { 
                        name: 'Giới tính', 
                        label: 'Giới tính', 
                        required: false,
                        validate: function(value) {
                            if (value && !['Nam', 'Nữ', 'nam', 'nữ'].includes(value)) {
                                return 'Giới tính chỉ được là "Nam" hoặc "Nữ"';
                            }
                        }
                    },
                    { 
                        name: 'Địa chỉ', 
                        label: 'Địa chỉ', 
                        required: false 
                    },
                    { 
                        name: 'Mã Ngành (*)', 
                        label: 'Mã Ngành', 
                        required: true 
                    },
                    { 
                        name: 'Niên khóa', 
                        label: 'Niên khóa', 
                        required: false
                    }
                ];
                
                var result = ImportService.validate(data, schema);
                
                console.log('[StudentController] ✅ Validation hoàn tất:', {
                    validCount: result.valid.length,
                    errorCount: result.invalid.length,
                    validSample: result.valid.slice(0, 2),
                    errorSample: result.invalid.slice(0, 3)
                });
                
                if (result.invalid.length > 0) {
                    console.log('[StudentController] ❌ Chi tiết lỗi validation:', result.invalid);
                }
                
                $scope.importData.preview = result.valid;
                $scope.importData.errors = result.invalid;
                $scope.importData.validCount = result.valid.length;
                $scope.importData.errorCount = result.invalid.length;
            })
            .catch(function(error) {
                console.error('[StudentController] ❌ Lỗi khi đọc/xử lý file:', error);
                console.error('[StudentController] ❌ Error details:', {
                    message: error.message,
                    stack: error.stack,
                    data: error.data
                });
                $scope.error = error.message || error || 'Lỗi khi đọc file Excel';
            });
    };
    
    // Confirm and import data
    $scope.confirmImport = function() {
        console.log('[StudentController] 🔘 confirmImport() - Bắt đầu import');
        console.log('[StudentController] 📊 Trạng thái import:', {
            validCount: $scope.importData.validCount,
            errorCount: $scope.importData.errorCount,
            previewCount: $scope.importData.preview ? $scope.importData.preview.length : 0
        });
        
        if ($scope.importData.validCount === 0) {
            console.error('[StudentController] ❌ Không có dữ liệu hợp lệ để import');
            $scope.error = 'Không có dữ liệu hợp lệ để import';
            return;
        }
        
        $scope.loadingStates.import = true;
        
        // Transform data to match API format
        var studentsToImport = $scope.importData.preview.map(function(row) {
            // Helper function to get value with fallback
            var getValue = function(key1, key2) {
                return row[key1] || row[key2] || '';
            };
            
            // Parse date if exists
            var dob = null;
            var dobValue = row['Ngày sinh'] || row['Ngày sinh (*)'];
            if (dobValue) {
                dob = new Date(dobValue).toISOString();
            }
            
            var studentCode = getValue('Mã SV (*)', 'Mã SV');
            var fullName = getValue('Họ tên (*)', 'Họ tên');
            var email = getValue('Email (*)', 'Email');
            var majorId = getValue('Mã Ngành (*)', 'Mã Ngành');
            
            console.log('[StudentController] 🔄 Transform row:', {
                original: row,
                transformed: {
                    studentCode: studentCode,
                    fullName: fullName,
                    email: email,
                    majorId: majorId
                }
            });
            
            return {
                studentCode: studentCode,
                fullName: fullName,
                email: email,
                phone: row['Số điện thoại'] || null,
                dateOfBirth: dob,
                gender: row['Giới tính'] || null,
                address: row['Địa chỉ'] || null,
                majorId: majorId,
                academicYearId: row['Niên khóa'] || null
            };
        });
        
        console.log('[StudentController] 📤 Gửi request import:', {
            count: studentsToImport.length,
            sample: studentsToImport.slice(0, 2)
        });
        
        // ✅ Use BATCH IMPORT API (1 request instead of N requests)
        StudentService.importBatch(studentsToImport)
            .then(function(response) {
                console.log('[StudentController] 📥 Nhận được response:', response);
                var result = response.data.data;
                
                console.log('[StudentController] 📊 Kết quả import:', {
                    successCount: result.successCount,
                    errorCount: result.errorCount,
                    errors: result.errors
                });
                
                if (result.errorCount > 0) {
                    // Show partial success with errors
                    var errorMessages = result.errors.map(function(err) {
                        return 'Dòng ' + err.rowNumber + ' (' + err.studentCode + '): ' + err.errorMessage;
                    }).join('\n');
                    
                    $scope.error = 'Import thành công ' + result.successCount + '/' + studentsToImport.length + ' sinh viên.\n\n' +
                                   'Có ' + result.errorCount + ' lỗi:\n' + errorMessages;
                } else {
                    // Full success
                    $scope.success = 'Import thành công ' + result.successCount + ' sinh viên! 🎉';
                }
                
                $scope.loadingStates.import = false;
                $scope.closeImportModal();
                // Reload students after import (will use cache)
                $scope.loadStudents();
            })
            .catch(function(error) {
                console.error('[StudentController] ❌ Lỗi khi import:', error);
                console.error('[StudentController] ❌ Error details:', {
                    message: error.message,
                    status: error.status,
                    statusText: error.statusText,
                    data: error.data,
                    stack: error.stack
                });
                $scope.error = 'Lỗi khi import: ' + (error.data?.message || error.message || 'Vui lòng thử lại');
                $scope.loadingStates.import = false;
                LoggerService.error('Error importing students', error);
            });
    };
    
    // Load faculties for dropdown
    $scope.loadFaculties = function() {
        $scope.loadingStates.faculties = true;
        FacultyService.getAll()
            .then(function(response) {
                var list = response.data?.data || response.data || [];
                $scope.faculties = list;
                $scope.loadingStates.faculties = false;
            })
            .catch(function(error) {
                LoggerService.error('Error loading faculties', error);
                $scope.loadingStates.faculties = false;
            });
    };
    
    // Load majors for dropdown
    $scope.loadMajors = function() {
        if ($scope.filters.facultyId) {
            $scope.loadingStates.majors = true;
            MajorService.getByFaculty($scope.filters.facultyId)
                .then(function(response) {
                    var list = response.data?.data || response.data || [];
                    $scope.majors = list;
                    $scope.loadingStates.majors = false;
                })
                .catch(function(error) {
                    LoggerService.error('Error loading majors by faculty', error);
                    $scope.loadingStates.majors = false;
                });
        } else {
            $scope.majors = [];
            $scope.loadingStates.majors = false;
        }
    };
    
    // Load majors for form when faculty changes (used by ng-change)
    $scope.loadMajorsForForm = function() {
        if ($scope.student.facultyId) {
            $scope.loadingStates.majors = true;
            MajorService.getByFaculty($scope.student.facultyId)
                .then(function(res) {
                    $scope.majors = res.data?.data || res.data || [];
                    // Reset major selection when faculty changes
                    $scope.student.majorId = '';
                })
                .catch(function(error) {
                    LoggerService.error('Error loading majors by faculty', error);
                    $scope.majors = [];
                })
                .finally(function() {
                    $scope.loadingStates.majors = false;
                });
        } else {
            $scope.majors = [];
            $scope.student.majorId = '';
        }
    };
    
    // Load student by ID for editing
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
    
    // Format Vietnamese phone number to international format for [Phone] attribute validation
    // Vietnamese format: 0912345678 or 0123456789
    // International format: +84912345678
    function formatPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return null;
        
        // Remove all spaces, dashes, and other non-digit characters except +
        var cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
        
        // If empty after cleaning, return null
        if (cleaned === '') return null;
        
        // If already starts with +, return as is (assume already formatted)
        if (cleaned.startsWith('+')) {
            return cleaned;
        }
        
        // If starts with 0 (Vietnamese format), convert to +84
        if (cleaned.startsWith('0')) {
            return '+84' + cleaned.substring(1);
        }
        
        // If starts with 84 (without +), add +
        if (cleaned.startsWith('84')) {
            return '+' + cleaned;
        }
        
        // If it's just digits (10-11 digits), assume Vietnamese format starting with 0
        if (/^\d{10,11}$/.test(cleaned)) {
            return '+84' + cleaned;
        }
        
        // Otherwise, return as is (might be invalid, but let backend validate)
        return cleaned;
    }
    
    $scope.loadStudent = function(id) {
        $scope.loadingStates.students = true;
        StudentService.getById(id)
            .then(function(response) {
                $scope.student = response.data?.data || response.data;
                
                // Store original dob value for fallback if user doesn't change it
                if ($scope.student.dob) {
                    $scope.student._originalDob = $scope.student.dob; // Store original ISO string
                    $scope.student.dob = formatDateForInput($scope.student.dob);
                }
                
                $scope.isEditMode = true;
                
                // Load danh sách ngành theo khoa
                if ($scope.student.facultyId) {
                    MajorService.getByFaculty($scope.student.facultyId)
                        .then(function(res) {
                            $scope.majors = res.data?.data || res.data || [];
                        })
                        .catch(function(error) {
                            LoggerService.error('Error loading majors by faculty', error);
                            $scope.majors = [];
                        });
                }
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải thông tin sinh viên';
                LoggerService.error('Error loading student by ID', error);
            })
            .finally(function() {
                $scope.loadingStates.students = false;
            });
    };



    
    // Create or update student
$scope.saveStudent = function () {
    $scope.error = null;
    $scope.loadingStates.save = true;

    var savePromise;
    if ($scope.isEditMode) {
        // Map student data to UpdateStudentFullDto format (camelCase for JSON)
        var user = AuthService.getCurrentUser();
        var updateData = {
            studentId: $scope.student.studentId || $scope.student.StudentId,
            fullName: $scope.student.fullName || $scope.student.FullName || '',
            gender: $scope.student.gender || $scope.student.Gender || '',
            email: $scope.student.email || $scope.student.Email || '',
            phone: ($scope.student.phone || $scope.student.Phone) ? (formatPhoneNumber($scope.student.phone || $scope.student.Phone) || '') : '',
            facultyId: $scope.student.facultyId || $scope.student.FacultyId || null,
            majorId: $scope.student.majorId || $scope.student.MajorId || null,
            academicYearId: $scope.student.academicYearId || $scope.student.AcademicYearId || null,
            cohortYear: $scope.student.cohortYear || $scope.student.CohortYear || null,
            updatedBy: user ? (user.userId || user.username || "admin") : "admin"
        };
        
        // Convert dob from date input (YYYY-MM-DD) to DateTime (ISO format)
        // API expects dob in camelCase and DateTime format
        var dobValue = $scope.student.dob;
        if (dobValue) {
            // If dob is in YYYY-MM-DD format from date input, convert to ISO string
            if (typeof dobValue === 'string' && dobValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // YYYY-MM-DD format from date input
                var dobDate = new Date(dobValue + 'T00:00:00');
                if (!isNaN(dobDate.getTime())) {
                    updateData.dob = dobDate.toISOString();
                } else {
                    // Fallback to original dob if conversion fails
                    updateData.dob = $scope.student._originalDob || new Date().toISOString();
                }
            } else if (typeof dobValue === 'string' && dobValue.includes('T')) {
                // Already in ISO format
                updateData.dob = dobValue;
            } else {
                // Try to parse as Date object
                var parsedDate = new Date(dobValue);
                if (!isNaN(parsedDate.getTime())) {
                    updateData.dob = parsedDate.toISOString();
                } else {
                    // Fallback to original dob
                    updateData.dob = $scope.student._originalDob || new Date().toISOString();
                }
            }
        } else if ($scope.student._originalDob) {
            // If user cleared the date, use original value
            updateData.dob = $scope.student._originalDob;
        } else if ($scope.student.Dob) {
            // If Dob (capital) already exists, convert if needed
            var dobValue2 = $scope.student.Dob;
            if (typeof dobValue2 === 'string' && dobValue2.match(/^\d{4}-\d{2}-\d{2}$/)) {
                updateData.dob = new Date(dobValue2 + 'T00:00:00').toISOString();
            } else {
                updateData.dob = dobValue2;
            }
        } else {
            // If no date provided at all, set a default (required field)
            // This shouldn't happen in edit mode, but handle it gracefully
            updateData.dob = new Date().toISOString();
        }
        
        savePromise = StudentService.update($scope.student.studentId, updateData);
    } else {
        // Map student data to StudentCreateDto format (camelCase for JSON)
        var user = AuthService.getCurrentUser();
        var createData = {
            userId: $scope.student.userId || '',
            studentCode: $scope.student.studentCode || '',
            fullName: $scope.student.fullName || '',
            gender: $scope.student.gender || null,
            email: $scope.student.email || null,
            phone: formatPhoneNumber($scope.student.phone),
            facultyId: $scope.student.facultyId && $scope.student.facultyId.trim() !== '' ? $scope.student.facultyId : null,
            majorId: $scope.student.majorId && $scope.student.majorId.trim() !== '' ? $scope.student.majorId : null,
            academicYearId: $scope.student.academicYearId && $scope.student.academicYearId.trim() !== '' ? $scope.student.academicYearId : null,
            cohortYear: $scope.student.cohortYear && $scope.student.cohortYear.trim() !== '' ? $scope.student.cohortYear : null,
            createdBy: user ? (user.userId || user.username || "admin") : "admin"
        };
        
        // Convert dob from date input (YYYY-MM-DD) to DateTime (ISO format) or null
        if ($scope.student.dob && (typeof $scope.student.dob === 'string' ? $scope.student.dob.trim() !== '' : true)) {
            var dobValue = $scope.student.dob;
            if (typeof dobValue === 'string' && dobValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // YYYY-MM-DD format from date input
                var dobDate = new Date(dobValue + 'T00:00:00');
                if (!isNaN(dobDate.getTime())) {
                    createData.dob = dobDate.toISOString();
                } else {
                    createData.dob = null;
                }
            } else if (typeof dobValue === 'string' && dobValue.includes('T')) {
                // Already in ISO format
                createData.dob = dobValue;
            } else {
                // Try to parse as Date object
                var parsedDate = new Date(dobValue);
                if (!isNaN(parsedDate.getTime())) {
                    createData.dob = parsedDate.toISOString();
                } else {
                    createData.dob = null;
                }
            }
        } else {
            // dob is optional, send null if not provided
            createData.dob = null;
        }
        
        savePromise = StudentService.create(createData);
    }

    savePromise
        .then(function (response) {
            $scope.success = "Lưu sinh viên thành công";
            $scope.loadingStates.save = false;

            $timeout(function () {
                $location.path("/students");
            }, 1500);
        })
        .catch(function (error) {
            LoggerService.error('Error saving student', error);

            var msg = "";

            // Nếu backend trả errors theo ModelState
            if (error.data?.errors) {
                msg += "📌 Chi tiết lỗi:\n";
                for (var field in error.data.errors) {
                    if (error.data.errors.hasOwnProperty(field)) {
                        msg += "• " + field + ": " + error.data.errors[field].join(", ") + "\n";
                    }
                }
            }

            // Nếu backend có message
            if (!msg && error.data?.message) {
                msg = error.data.message;
            }

            // Fallback
            if (!msg) {
                msg = "Không xác định";
            }

            $scope.error =
                "❌ Không thể lưu sinh viên\n" +
                "HTTP Status: " +
                (error.status || "N/A") +
                "\n" +
                msg;

            $scope.loadingStates.save = false;
        });

};

    
    // Delete student
    $scope.deleteStudent = function(studentId) {
        if (!confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) {
            return;
        }
        
        StudentService.delete(studentId)
            .then(function(response) {
                $scope.success = 'Xóa sinh viên thành công';
                // Reload students after delete (cache will be invalidated)
                $scope.loadStudents();
            })
            .catch(function(error) {
                $scope.error = 'Không thể xóa sinh viên';
            });
    };
    
    // Navigation
    $scope.goToCreate = function() {
        $location.path('/students/create');
    };
    
    $scope.goToEdit = function(studentId) {
        $location.path('/students/edit/' + studentId);
    };
    
    $scope.cancel = function() {
        $location.path('/students');
    };
    
    // Initialize based on route
    if ($location.path() === '/students') {
        // Load dropdown data first, then students
        $scope.loadFaculties();
        $scope.loadMajors();
        // Load students after a short delay to ensure DOM is ready
        $timeout(function() {
            $scope.loadStudents();
        }, 100);
    } else if ($routeParams.id) {
        $scope.loadStudent($routeParams.id);
        $scope.loadFaculties();
        $scope.loadMajors();
    } else {
        $scope.loadFaculties();
        $scope.loadMajors();
    }
}]);
