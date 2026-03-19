// Avatar Service - Reusable avatar upload functionality
app.service('AvatarService', ['$timeout', 'ApiService', 'AuthService', 'ToastService', function($timeout, ApiService, AuthService, ToastService) {
    
    // Initialize avatar modal functions for a scope
    this.initAvatarModal = function($scope) {
        // ✅ Avatar Modal State - Ensure it starts as closed
        $scope.avatarModal = {
            show: false,
            selectedFile: null,
            previewUrl: null,
            error: null,
            success: null,
            uploading: false,
            dragOver: false
        };
        
        // Store actual File object outside of scope to avoid digest cycle issues
        var fileStorage = {};
        
        // ✅ Open Avatar Modal - Only called explicitly by user click
        $scope.openAvatarModal = function(event) {
            // Prevent event propagation if event is provided
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // ✅ Force ensure modal is closed first, then open
            $scope.avatarModal.show = false;
            
            // Use $timeout to ensure DOM updates
            $timeout(function() {
                $scope.avatarModal = {
                    show: true,
                    selectedFile: null,
                    previewUrl: $scope.currentUser ? ($scope.currentUser.avatarUrl || null) : null,
                    error: null,
                    success: null,
                    uploading: false,
                    dragOver: false
                };
            }, 10);
        };
        
        // ✅ Close Avatar Modal - Force close with multiple safeguards
        $scope.closeAvatarModal = function(event) {
            // ✅ Prevent event propagation if event is provided
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // ✅ Reset flag when closing modal
            if ($scope._explicitModalOpen !== undefined) {
                $scope._explicitModalOpen = false;
            }
            
            // ✅ Force close modal - Multiple ways to ensure it closes
            $scope.avatarModal.show = false;
            $scope.avatarModal.selectedFile = null;
            $scope.avatarModal.previewUrl = null;
            $scope.avatarModal.error = null;
            $scope.avatarModal.success = null;
            $scope.avatarModal.uploading = false;
            $scope.avatarModal.dragOver = false;
            
            // ✅ Force digest cycle to ensure view updates
            if (!$scope.$$phase && !$scope.$root.$$phase) {
                $scope.$apply();
            } else {
                // If already in digest, use $timeout to ensure update
                $timeout(function() {
                    $scope.avatarModal.show = false;
                }, 0);
            }
            
            // ✅ Additional safeguard: Remove active class from DOM if exists
            $timeout(function() {
                var modalElement = document.querySelector('.avatar-modal.modal-overlay');
                if (modalElement) {
                    modalElement.classList.remove('active');
                }
            }, 0);
        };
        
        // ✅ Ensure modal is closed on scope initialization
        $scope.avatarModal.show = false;
        
        // Trigger File Input
        $scope.triggerFileInput = function() {
            document.getElementById('avatarFileInput').click();
        };
        
        // Handle File Selection
        $scope.handleFileSelect = function(files) {
            if (!files || files.length === 0) return;
            
            // Convert FileList to array if needed
            var fileArray = Array.isArray(files) ? files : Array.prototype.slice.call(files);
            var file = fileArray[0];
            
            // Validate file type
            if (!file.type.match('image.*')) {
                var errorMsg = 'Vui lòng chọn file ảnh (JPG, PNG, GIF)';
                ToastService.warning(errorMsg);
                $scope.$evalAsync(function() {
                    $scope.avatarModal.error = errorMsg;
                });
                return;
            }
            
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                var errorMsg = 'Kích thước file không được vượt quá 5MB';
                ToastService.warning(errorMsg);
                $scope.$evalAsync(function() {
                    $scope.avatarModal.error = errorMsg;
                });
                return;
            }
            
            // Store file object outside of Angular's scope to avoid digest cycle issues
            var fileId = 'file_' + Date.now();
            fileStorage[fileId] = file;
            
            // Create preview
            var reader = new FileReader();
            reader.onload = function(e) {
                // Extract values before entering Angular's digest cycle
                var result = e.target.result;
                var fileName = file.name;
                var fileSize = file.size;
                var fileType = file.type;
                
                // Use $timeout to safely update scope outside of current digest cycle
                $timeout(function() {
                    // Create a simple object representation of the file to avoid File object issues
                    $scope.avatarModal.selectedFile = {
                        name: fileName,
                        size: fileSize,
                        type: fileType,
                        _fileId: fileId // Reference to stored file
                    };
                    $scope.avatarModal.error = null;
                    $scope.avatarModal.previewUrl = result;
                }, 0);
            };
            reader.readAsDataURL(file);
        };
        
        // Clear Selected File
        $scope.clearSelectedFile = function() {
            if ($scope.avatarModal.selectedFile && $scope.avatarModal.selectedFile._fileId) {
                delete fileStorage[$scope.avatarModal.selectedFile._fileId];
            }
            $scope.avatarModal.selectedFile = null;
            $scope.avatarModal.previewUrl = $scope.currentUser ? ($scope.currentUser.avatarUrl || null) : null;
            $scope.avatarModal.error = null;
            var fileInput = document.getElementById('avatarFileInput');
            if (fileInput) fileInput.value = '';
        };
        
        // Format File Size
        $scope.formatFileSize = function(bytes) {
            if (!bytes) return '0 Bytes';
            var k = 1024;
            var sizes = ['Bytes', 'KB', 'MB', 'GB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };
        
        // Handle Drag Over
        $scope.handleDragOver = function(event) {
            event.preventDefault();
            event.stopPropagation();
            $scope.avatarModal.dragOver = true;
        };
        
        // Handle Drag Leave
        $scope.handleDragLeave = function(event) {
            event.preventDefault();
            event.stopPropagation();
            $scope.avatarModal.dragOver = false;
        };
        
        // Handle Drop
        $scope.handleDrop = function(event) {
            event.preventDefault();
            event.stopPropagation();
            $scope.avatarModal.dragOver = false;
            
            var files = event.dataTransfer.files;
            $scope.handleFileSelect(files);
        };
        
        // Upload Avatar
        $scope.uploadAvatar = function(event) {
            // ✅ Prevent event propagation to avoid closing modal
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            if (!$scope.avatarModal.selectedFile) {
                ToastService.warning('Vui lòng chọn ảnh trước khi tải lên');
                return;
            }
            
            // ✅ Kiểm tra currentUser tồn tại
            if (!$scope.currentUser) {
                ToastService.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
                return;
            }
            
            // ✅ Set flag to prevent watch from closing modal during upload
            if ($scope._explicitModalOpen !== undefined) {
                $scope._explicitModalOpen = true;
            }
            
            $scope.avatarModal.uploading = true;
            $scope.avatarModal.error = null;
            $scope.avatarModal.success = null;
            
            var formData = new FormData();
            // Retrieve file from storage using fileId
            var fileId = $scope.avatarModal.selectedFile._fileId;
            var fileToUpload = fileStorage[fileId] || $scope.avatarModal.selectedFile;
            formData.append('avatar', fileToUpload);
            // ✅ Không cần gửi userId vì backend sẽ lấy từ token
            
            // Make API call to upload avatar
            ApiService.uploadFile('/users/avatar', formData)
                .then(function(response) {
                    $scope.avatarModal.uploading = false;
                    
                    // Show success toast
                    ToastService.success('Cập nhật ảnh đại diện thành công!');
                    
                    // Update current user avatar
                    if (response.data) {
                        var newAvatarUrl = response.data.avatarUrl || 
                                          (response.data.data && response.data.data.avatarUrl);
                        if (newAvatarUrl) {
                            $scope.currentUser.avatarUrl = newAvatarUrl;
                            AuthService.updateUser($scope.currentUser);
                            
                            // ✅ Trigger reload để topbar cập nhật avatar
                            $scope.$root.$broadcast('userAvatarUpdated', newAvatarUrl);
                        }
                    }
                    
                    // Close modal after 800ms
                    $timeout(function() {
                        $scope.closeAvatarModal();
                        // Reset flag after closing
                        if ($scope._explicitModalOpen !== undefined) {
                            $scope._explicitModalOpen = false;
                        }
                    }, 800);
                })
                .catch(function(error) {
                    $scope.avatarModal.uploading = false;
                    
                    // Extract error message
                    var errorMessage = 'Có lỗi xảy ra khi tải ảnh lên';
                    if (error.data && error.data.message) {
                        errorMessage = error.data.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    } else if (error.statusText) {
                        errorMessage = 'Lỗi: ' + error.statusText;
                    }
                    
                    // Show error toast
                    ToastService.error(errorMessage, 5000);
                    
                    // Also show in modal
                    $scope.avatarModal.error = errorMessage;
                    
                    // Reset flag on error
                    if ($scope._explicitModalOpen !== undefined) {
                        $scope._explicitModalOpen = false;
                    }
                });
        };
        
        // Format File Size Helper
        $scope.formatFileSize = function(bytes) {
            if (!bytes || bytes === 0) return '0 Bytes';
            var k = 1024;
            var sizes = ['Bytes', 'KB', 'MB', 'GB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };
    };
}]);

