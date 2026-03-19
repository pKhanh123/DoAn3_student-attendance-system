// Room Management Controller
app.controller('RoomController', ['$scope', '$timeout', '$window', 'RoomService', 'ToastService', 'LoggerService', 'RoleService',
    function($scope, $timeout, $window, RoomService, ToastService, LoggerService, RoleService) {
    
    $scope.rooms = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    
    // ✅ THÊM: Permission checks
    $scope.canManageRooms = false;
    $scope.canCreateRooms = false;
    $scope.canEditRooms = false;
    $scope.canDeleteRooms = false;
    
    // Pagination
    $scope.pagination = {
        currentPage: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0
    };
    
    // Filters
    $scope.filters = {
        search: '',
        isActive: null, // null = all, true = active, false = inactive
        sortBy: 'roomCode' // roomCode, building, capacity, createdAt
    };
    
    // Statistics
    $scope.statistics = {
        totalRooms: 0,
        activeRooms: 0,
        inactiveRooms: 0,
        totalCapacity: 0
    };
    
    // Form data
    $scope.roomForm = {};
    $scope.formMode = 'create'; // 'create' or 'edit'
    $scope.showModal = false;
    
    // Load rooms with pagination
    $scope.loadRooms = function(forceRefresh) {
        $scope.loading = true;
        $scope.error = null;
        
        RoomService.getAll(
            $scope.pagination.currentPage,
            $scope.pagination.pageSize,
            $scope.filters.search || null,
            $scope.filters.isActive,
            forceRefresh || false // Pass forceRefresh flag
        )
        .then(function(response) {
            var result = response.data;
            
            if (result && result.success) {
                $scope.rooms = result.data || [];
                $scope.pagination.totalCount = result.totalCount || 0;
                $scope.pagination.totalPages = result.totalPages || 0;
                
                // Calculate statistics from all rooms (need to load all for accurate stats)
                $scope.calculateStatistics();
            } else {
                $scope.rooms = result.data || result || [];
                $scope.calculateStatistics();
            }
            $scope.loading = false;
        })
        .catch(function(error) {
            $scope.error = 'Không thể tải danh sách phòng học: ' + (error.data?.message || error.message || 'Lỗi không xác định');
            $scope.loading = false;
            LoggerService.error('Load rooms error', error);
        });
    };
    
    // Calculate statistics from current rooms list
    $scope.calculateStatistics = function() {
        // Load all rooms for accurate statistics
        RoomService.getAll(1, 1000, null, null)
            .then(function(response) {
                var result = response.data;
                var allRooms = [];
                if (result && result.success) {
                    allRooms = result.data || [];
                } else {
                    allRooms = result.data || result || [];
                }
                
                $scope.statistics.totalRooms = allRooms.length;
                $scope.statistics.activeRooms = allRooms.filter(function(r) { return r.isActive; }).length;
                $scope.statistics.inactiveRooms = allRooms.filter(function(r) { return !r.isActive; }).length;
                $scope.statistics.totalCapacity = allRooms.reduce(function(sum, r) {
                    return sum + (r.capacity || 0);
                }, 0);
            })
            .catch(function(error) {
                // Fallback: calculate from current page
                $scope.statistics.totalRooms = $scope.pagination.totalCount || $scope.rooms.length;
                $scope.statistics.activeRooms = $scope.rooms.filter(function(r) { return r.isActive; }).length;
                $scope.statistics.inactiveRooms = $scope.rooms.filter(function(r) { return !r.isActive; }).length;
                $scope.statistics.totalCapacity = $scope.rooms.reduce(function(sum, r) {
                    return sum + (r.capacity || 0);
                }, 0);
            });
    };
    
    // Search rooms
    $scope.searchRooms = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadRooms();
    };
    
    // Open create modal
    $scope.openCreateModal = function() {
        // Check if button should be disabled
        if ($scope.loading) {
            return;
        }
        
        if (!$scope.canCreateRooms) {
            return;
        }
        
        $scope.roomForm = {
            roomCode: '',
            building: '',
            capacity: null,
            isActive: true
        };
        $scope.formMode = 'create';
        $scope.showModal = true;
        $scope.error = null;
    };
    
    // Open edit modal
    $scope.openEditModal = function(room) {
        $scope.roomForm = {
            roomId: room.roomId,
            roomCode: room.roomCode,
            building: room.building || '',
            capacity: room.capacity,
            isActive: room.isActive !== undefined ? room.isActive : true,
            createdAt: room.createdAt || null
        };
        $scope.formMode = 'edit';
        $scope.showModal = true;
        $scope.error = null;
    };
    
    // Close modal
    $scope.closeModal = function() {
        $scope.showModal = false;
        $scope.roomForm = {};
        $scope.error = null;
    };
    
    // Save room (create or update)
    $scope.saveRoom = function() {
        // Validation
        if (!$scope.roomForm.roomCode || $scope.roomForm.roomCode.trim() === '') {
            $scope.error = 'Mã phòng học không được để trống';
            return;
        }
        
        if ($scope.roomForm.capacity !== null && $scope.roomForm.capacity !== undefined) {
            if (isNaN($scope.roomForm.capacity) || $scope.roomForm.capacity <= 0) {
                $scope.error = 'Sức chứa phòng học phải là số lớn hơn 0';
                return;
            }
        }
        
        $scope.loading = true;
        $scope.error = null;
        
        var savePromise;
        if ($scope.formMode === 'create') {
            savePromise = RoomService.create($scope.roomForm);
        } else {
            savePromise = RoomService.update($scope.roomForm.roomId, $scope.roomForm);
        }
        
        savePromise
            .then(function(response) {
                var result = response.data;
                
                if (result && result.success) {
                    ToastService.success(result.message || 'Lưu phòng học thành công');
                    $scope.closeModal();
                    
                    // Reset về trang 1 để hiển thị phòng mới thêm
                    $scope.pagination.currentPage = 1;
                    
                    // Reload dữ liệu ngay lập tức (nhanh hơn refresh trang)
                    // Use $timeout to ensure digest cycle runs after modal closes
                    // Force refresh to bypass cache
                    $timeout(function() {
                        $scope.loadRooms(true); // Pass true to force refresh
                    }, 100);
                } else {
                    $scope.error = result?.message || 'Lưu phòng học thất bại';
                    $scope.loading = false;
                }
            })
            .catch(function(error) {
                // Xử lý error message từ backend
                var errorMsg = 'Không thể lưu phòng học';
                
                if (error.data) {
                    if (typeof error.data === 'string') {
                        errorMsg = error.data;
                    } else if (error.data.message) {
                        errorMsg = error.data.message;
                    } else if (error.data.error) {
                        errorMsg = error.data.error;
                    }
                }
                
                // Fallback message dựa trên status code
                if (errorMsg === 'Không thể lưu phòng học' && error.status === 400) {
                    errorMsg = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
                } else if (errorMsg === 'Không thể lưu phòng học' && error.status === 500) {
                    errorMsg = 'Lỗi hệ thống. Vui lòng thử lại sau.';
                }
                
                $scope.error = errorMsg;
                $scope.loading = false;
                LoggerService.error('Save room error', error);
            });
    };
    
    // Delete room
    $scope.deleteRoom = function(room) {
        if (!confirm('Bạn có chắc chắn muốn xóa phòng học "' + room.roomCode + '"?')) {
            return;
        }
        
        $scope.loading = true;
        RoomService.delete(room.roomId)
            .then(function(response) {
                var result = response.data;
                if (result && result.success) {
                    ToastService.success(result.message || 'Xóa phòng học thành công');
                    $scope.loadRooms(true); // Force refresh
                } else {
                    // Hiển thị message lỗi từ backend
                    var errorMsg = result?.message || 'Xóa phòng học thất bại';
                    ToastService.error(errorMsg);
                }
                $scope.loading = false;
            })
            .catch(function(error) {
                // Xử lý lỗi từ HTTP response (400, 404, 500, etc.)
                var errorMsg = 'Không thể xóa phòng học';
                
                // Backend trả về: {success: false, message: "..."} trong error.data
                if (error.data) {
                    if (typeof error.data === 'string') {
                        errorMsg = error.data;
                    } else if (error.data.message) {
                        // Backend trả về message trong error.data.message
                        errorMsg = error.data.message;
                    } else if (error.data.error) {
                        errorMsg = error.data.error;
                    }
                }
                
                // Fallback message dựa trên status code nếu không có message từ backend
                if (errorMsg === 'Không thể xóa phòng học' && error.status === 400) {
                    errorMsg = 'Không thể xóa phòng học. Phòng học có thể đang được sử dụng trong lịch giảng dạy.';
                } else if (errorMsg === 'Không thể xóa phòng học' && error.status === 404) {
                    errorMsg = 'Không tìm thấy phòng học cần xóa.';
                } else if (errorMsg === 'Không thể xóa phòng học' && error.status === 500) {
                    errorMsg = 'Lỗi hệ thống. Vui lòng thử lại sau.';
                }
                
                ToastService.error(errorMsg);
                $scope.loading = false;
                LoggerService.error('Delete room error', error);
            });
    };
    
    // Toggle active
    $scope.toggleActive = function(room) {
        var updatedRoom = {
            roomId: room.roomId,
            roomCode: room.roomCode,
            building: room.building,
            capacity: room.capacity,
            isActive: !room.isActive
        };
        
        $scope.loading = true;
        RoomService.update(room.roomId, updatedRoom)
            .then(function(response) {
                var result = response.data;
                if (result && result.success) {
                    ToastService.success('Cập nhật trạng thái thành công');
                    $scope.loadRooms();
                } else {
                    ToastService.error('Cập nhật trạng thái thất bại');
                }
                $scope.loading = false;
            })
            .catch(function(error) {
                ToastService.error('Không thể cập nhật trạng thái');
                $scope.loading = false;
                LoggerService.error('Toggle active error', error);
            });
    };
    
    // Pagination helpers
    $scope.goToPage = function(page) {
        if (page >= 1 && page <= $scope.pagination.totalPages) {
            $scope.pagination.currentPage = page;
            $scope.loadRooms();
        }
    };
    
    $scope.prevPage = function() {
        if ($scope.pagination.currentPage > 1) {
            $scope.pagination.currentPage--;
            $scope.loadRooms();
        }
    };
    
    $scope.nextPage = function() {
        if ($scope.pagination.currentPage < $scope.pagination.totalPages) {
            $scope.pagination.currentPage++;
            $scope.loadRooms();
        }
    };
    
    // Change page size
    $scope.changePageSize = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadRooms();
    };
    
    // Reset filters
    $scope.resetFilters = function() {
        $scope.filters = {
            search: '',
            isActive: null,
            sortBy: 'roomCode'
        };
        $scope.pagination.currentPage = 1;
        $scope.loadRooms();
    };
    
    // Get page numbers for pagination
    $scope.getPageNumbers = function() {
        var pages = [];
        var totalPages = $scope.pagination.totalPages;
        var currentPage = $scope.pagination.currentPage;
        
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            for (var i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first page
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            // Show pages around current page
            var start = Math.max(2, currentPage - 1);
            var end = Math.min(totalPages - 1, currentPage + 1);
            
            for (var i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            // Show last page
            pages.push(totalPages);
        }
        
        return pages;
    };
    
    // ============================================================
    // ✅ PERMISSION MANAGEMENT
    // Approach: Section-level permission (ADMIN_ROOMS) = Full access
    // ADMIN_ROOMS → canManageRooms → full access (view, create, edit, delete)
    // ============================================================
    $scope.init = function() {
        RoleService.loadPermissions().then(function(permissions) {
            // ✅ Section-level permission check
            // ADMIN_ROOMS từ database → canManageRooms → full access
            $scope.canManageRooms = RoleService.hasPermission('canManageRooms');
            
            // ✅ All actions inherit from section permission (full access approach)
            $scope.canCreateRooms = $scope.canManageRooms;
            $scope.canEditRooms = $scope.canManageRooms;
            $scope.canDeleteRooms = $scope.canManageRooms;
            
            LoggerService.debug('Room permissions loaded', {
                canManageRooms: $scope.canManageRooms,
                approach: 'Section-level permission = Full access'
            });
            
            // Load data if has permission
            if ($scope.canManageRooms) {
                $scope.loadRooms();
            } else {
                $scope.error = 'Bạn không có quyền truy cập trang này. Vui lòng kiểm tra với quản trị viên.';
            }
        }).catch(function(error) {
            LoggerService.error('Error loading room permissions', error);
            
            // Use fallback permissions
            $scope.canManageRooms = RoleService.hasPermission('canManageRooms');
            $scope.canCreateRooms = $scope.canManageRooms;
            $scope.canEditRooms = $scope.canManageRooms;
            $scope.canDeleteRooms = $scope.canManageRooms;
            
            if ($scope.canManageRooms) {
                $scope.loadRooms();
            } else {
                $scope.error = 'Bạn không có quyền truy cập trang này. Lỗi khi tải quyền từ server.';
            }
        });
    };
    
    // Initialize
    $scope.init();
}]);

