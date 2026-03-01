// Role Controller
app.controller('RoleController', [
    '$scope', 
    '$rootScope',
    'RoleManagementService', 
    'AuthService', 
    'AvatarService', 
    'ToastService',
    'RoleService',
    function($scope, $rootScope, RoleManagementService, AuthService, AvatarService, ToastService, RoleService) {
    
    $scope.roles = [];
    $scope.permissions = [];
    $scope.loading = false;
    $scope.error = null;
    
    // Form data
    $scope.currentRole = null;
    $scope.isEditMode = false;
    $scope.roleForm = {
        roleName: '',
        description: '',
        isActive: true
    };
    
    // Permission management
    $scope.permissionManagement = {
        roleId: null,
        roleName: '',
        permissions: [],
        selectedPermissions: [],
        groupedPermissions: [], // Nhóm quyền theo sections
        expandedSections: {} // Trạng thái mở/đóng của các sections
    };
    
    // Initialize Avatar Modal Functions
    AvatarService.initAvatarModal($scope);
    
    // Get current user for header
    $scope.getCurrentUser = function() {
        return AuthService.getCurrentUser();
    };
    
    // Logout function
    $scope.logout = function() {
        AuthService.logout();
    };
    
    // ============================================================
    // 🔹 LOAD DATA
    // ============================================================
    
    /**
     * Load all roles
     */
    $scope.loadRoles = function() {
        $scope.loading = true;
        $scope.error = null;
        
        RoleManagementService.getAllRoles()
            .then(function(response) {
                $scope.roles = response.data;
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải danh sách vai trò';
                ToastService.error('Không thể tải danh sách vai trò');
                $scope.loading = false;
            });
    };
    
    /**
     * Load all permissions
     */
    $scope.loadPermissions = function() {
        RoleManagementService.getAllPermissions()
            .then(function(response) {
                $scope.permissions = response.data;
            })
            .catch(function(error) {
                ToastService.error('Không thể tải danh sách quyền');
            });
    };
    
    // ============================================================
    // 🔹 ROLE CRUD OPERATIONS
    // ============================================================
    
    /**
     * Open modal to create new role
     */
    $scope.openCreateModal = function() {
        $scope.isEditMode = false;
        $scope.currentRole = null;
        $scope.roleForm = {
            roleName: '',
            description: '',
            isActive: true
        };
        openModal('roleFormModal');
    };
    
    /**
     * Open modal to edit role
     */
    $scope.openEditModal = function(role) {
        $scope.isEditMode = true;
        $scope.currentRole = role;
        $scope.roleForm = {
            roleName: role.roleName,
            description: role.description,
            isActive: role.isActive
        };
        openModal('roleFormModal');
    };
    
    /**
     * Save role (create or update)
     */
    $scope.saveRole = function() {
        if (!$scope.roleForm.roleName) {
            ToastService.warning('Vui lòng nhập tên vai trò');
            return;
        }
        
        var roleData = {
            roleName: $scope.roleForm.roleName,
            description: $scope.roleForm.description,
            isActive: $scope.roleForm.isActive
        };
        
        var promise;
        if ($scope.isEditMode) {
            promise = RoleManagementService.updateRole($scope.currentRole.roleId, roleData);
        } else {
            promise = RoleManagementService.createRole(roleData);
        }
        
        promise
            .then(function(response) {
                ToastService.success(response.data.message || ($scope.isEditMode ? 'Cập nhật vai trò thành công' : 'Tạo vai trò thành công'));
                closeModal('roleFormModal');
                $scope.loadRoles();
            })
            .catch(function(error) {
                var errorMsg = error.data?.message || 'Có lỗi xảy ra';
                ToastService.error(errorMsg);
            });
    };
    
    /**
     * Delete role
     */
    $scope.deleteRole = function(role) {
        if (!confirm('Bạn có chắc chắn muốn xóa vai trò "' + role.roleName + '"?')) {
            return;
        }
        
        RoleManagementService.deleteRole(role.roleId)
            .then(function(response) {
                ToastService.success(response.data.message || 'Xóa vai trò thành công');
                $scope.loadRoles();
            })
            .catch(function(error) {
                var errorMsg = error.data?.message || 'Không thể xóa vai trò';
                ToastService.error(errorMsg);
            });
    };
    
    /**
     * Toggle role status
     */
    $scope.toggleStatus = function(role) {
        RoleManagementService.toggleRoleStatus(role.roleId)
            .then(function(response) {
                role.isActive = response.data.isActive;
                ToastService.success(response.data.message);
            })
            .catch(function(error) {
                ToastService.error('Không thể thay đổi trạng thái');
            });
    };
    
    // ============================================================
    // 🔹 PERMISSION MANAGEMENT
    // ============================================================
    
    /**
     * Group permissions by sections (parent permissions)
     * ✅ CHỈ LẤY EXECUTABLE PERMISSIONS (bỏ qua menu-only permissions)
     */
    $scope.groupPermissionsBySection = function(permissions, allPermissions) {
        var sections = [];
        var sectionsMap = {};
        
        // ✅ LỌC BỎ MENU-ONLY PERMISSIONS
        // Menu-only permissions (is_menu_only = true) chỉ dùng để hiển thị menu,
        // KHÔNG hiển thị trong permission management modal
        var executablePermissions = permissions.filter(function(p) {
            var isMenuOnly = p.isMenuOnly || p.IsMenuOnly || false;
            return !isMenuOnly; // Chỉ lấy executable permissions
        });
        
        // Tạo lookup map từ allPermissions để tìm permission name từ code
        var allPermsMap = {};
        if (allPermissions && allPermissions.length > 0) {
            allPermissions.forEach(function(p) {
                var code = p.permissionCode || p.PermissionCode;
                if (code) {
                    allPermsMap[code] = {
                        permissionName: p.permissionName || p.PermissionName,
                        description: p.description || p.Description,
                        icon: p.icon || p.Icon || 'fas fa-folder',
                        sortOrder: p.sortOrder || p.SortOrder || 999,
                        isMenuOnly: p.isMenuOnly || p.IsMenuOnly || false
                    };
                }
            });
        }
        
        // Normalize permission data (chỉ executable permissions)
        var normalizedPerms = executablePermissions.map(function(p) {
            return {
                permissionId: p.permissionId || p.PermissionId,
                permissionCode: p.permissionCode || p.PermissionCode,
                permissionName: p.permissionName || p.PermissionName,
                description: p.description || p.Description,
                parentCode: p.parentCode || p.ParentCode || null,
                icon: p.icon || p.Icon || 'fas fa-circle',
                sortOrder: p.sortOrder || p.SortOrder || 999,
                isMenuOnly: p.isMenuOnly || p.IsMenuOnly || false
            };
        });
        
        // Tách sections (parent permissions) và children
        normalizedPerms.forEach(function(perm) {
            if (!perm.parentCode || perm.parentCode === '') {
                // Đây là section (parent permission)
                if (!sectionsMap[perm.permissionCode]) {
                    var section = {
                        permissionId: perm.permissionId,
                        permissionCode: perm.permissionCode,
                        permissionName: perm.permissionName,
                        description: perm.description,
                        icon: perm.icon,
                        sortOrder: perm.sortOrder,
                        children: []
                    };
                    sectionsMap[perm.permissionCode] = section;
                    sections.push(section);
                }
            } else {
                // Đây là child permission
                var parent = sectionsMap[perm.parentCode];
                if (parent) {
                    parent.children.push(perm);
                } else {
                    // Nếu parent chưa tồn tại, tạo section ẩn và tìm permission name từ allPermissions
                    if (!sectionsMap[perm.parentCode]) {
                        var parentInfo = allPermsMap[perm.parentCode] || {};
                        var hiddenSection = {
                            permissionId: null,
                            permissionCode: perm.parentCode,
                            permissionName: parentInfo.permissionName || perm.parentCode, // Dùng tên từ allPermissions nếu có
                            description: parentInfo.description || null,
                            icon: parentInfo.icon || 'fas fa-folder',
                            sortOrder: parentInfo.sortOrder || 999,
                            children: []
                        };
                        sectionsMap[perm.parentCode] = hiddenSection;
                        sections.push(hiddenSection);
                    }
                    sectionsMap[perm.parentCode].children.push(perm);
                }
            }
        });
        
        // Sắp xếp sections và children
        sections.forEach(function(section) {
            section.children.sort(function(a, b) {
                return (a.sortOrder || 999) - (b.sortOrder || 999);
            });
        });
        
        sections.sort(function(a, b) {
            return (a.sortOrder || 999) - (b.sortOrder || 999);
        });
        
        return sections;
    };
    
    /**
     * Get section selection state: 'none', 'partial', 'all'
     */
    $scope.getSectionState = function(section) {
        if (!section.children || section.children.length === 0) {
            // Section không có children, kiểm tra chính nó
            return $scope.isPermissionSelected(section.permissionId) ? 'all' : 'none';
        }
        
        var selectedCount = 0;
        var sectionSelected = section.permissionId && $scope.isPermissionSelected(section.permissionId);
        section.children.forEach(function(child) {
            if ($scope.isPermissionSelected(child.permissionId)) {
                selectedCount++;
            }
        });
        
        if (selectedCount === 0 && !sectionSelected) {
            return 'none';
        } else if (selectedCount === section.children.length && (!section.permissionId || sectionSelected)) {
            return 'all';
        } else {
            return 'partial';
        }
    };
    
    /**
     * Set indeterminate state for checkbox (AngularJS doesn't support ng-indeterminate directly)
     */
    $scope.setCheckboxIndeterminate = function(elementId, isIndeterminate) {
        setTimeout(function() {
            var checkbox = document.getElementById(elementId);
            if (checkbox) {
                checkbox.indeterminate = isIndeterminate === true;
            }
        }, 0);
    };
    
    /**
     * Toggle all permissions in a section
     */
    $scope.toggleSection = function(section) {
        var state = $scope.getSectionState(section);
        var shouldSelect = state !== 'all';
        
        // Toggle section permission itself (if exists)
        if (section.permissionId) {
            if (shouldSelect && !$scope.isPermissionSelected(section.permissionId)) {
                $scope.permissionManagement.selectedPermissions.push(section.permissionId);
            } else if (!shouldSelect && $scope.isPermissionSelected(section.permissionId)) {
                var index = $scope.permissionManagement.selectedPermissions.indexOf(section.permissionId);
                if (index > -1) {
                    $scope.permissionManagement.selectedPermissions.splice(index, 1);
                }
            }
        }
        
        // Toggle all children
        if (section.children && section.children.length > 0) {
            section.children.forEach(function(child) {
                var childId = child.permissionId;
                var isSelected = $scope.isPermissionSelected(childId);
                
                if (shouldSelect && !isSelected) {
                    $scope.permissionManagement.selectedPermissions.push(childId);
                } else if (!shouldSelect && isSelected) {
                    var idx = $scope.permissionManagement.selectedPermissions.indexOf(childId);
                    if (idx > -1) {
                        $scope.permissionManagement.selectedPermissions.splice(idx, 1);
                    }
                }
            });
        }
        
        // Update indeterminate state after toggle
        setTimeout(function() {
            var checkboxId = 'section-' + section.permissionCode;
            var newState = $scope.getSectionState(section);
            $scope.setCheckboxIndeterminate(checkboxId, newState === 'partial');
        }, 0);
    };
    
    /**
     * Toggle section expand/collapse - ĐƠN GIẢN HÓA
     */
    $scope.toggleSectionExpandSimple = function(sectionCode) {
        // Đảm bảo expandedSections object tồn tại
        if (!$scope.permissionManagement.expandedSections) {
            $scope.permissionManagement.expandedSections = {};
        }
        
        // Toggle state đơn giản
        var currentState = $scope.permissionManagement.expandedSections[sectionCode] === true;
        $scope.permissionManagement.expandedSections[sectionCode] = !currentState;
    };
    
    /**
     * Toggle section expand/collapse (giữ lại cho tương thích)
     */
    $scope.toggleSectionExpand = function(sectionCode, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        $scope.toggleSectionExpandSimple(sectionCode);
    };
    
    /**
     * Check if section is expanded
     */
    $scope.isSectionExpanded = function(sectionCode) {
        return $scope.permissionManagement.expandedSections[sectionCode] === true;
    };
    
    /**
     * Open permission management modal
     */
    $scope.openPermissionModal = function(role) {
        $scope.permissionManagement.roleId = role.roleId;
        $scope.permissionManagement.roleName = role.roleName;
        $scope.permissionManagement.permissions = [];
        $scope.permissionManagement.selectedPermissions = [];
        $scope.permissionManagement.groupedPermissions = [];
        $scope.permissionManagement.expandedSections = {};
        
        // Load tất cả permissions trước để có thể lookup permission name
        var allPermissionsPromise = RoleManagementService.getAllPermissions()
            .then(function(response) {
                return response.data || [];
            })
            .catch(function(error) {
                return [];
            });
        
        // Load permissions for this role
        var rolePermissionsPromise = RoleManagementService.getPermissionsByRole(role.roleId)
            .then(function(response) {
                return response.data.permissions || response.data.Permissions || [];
            });
        
        // Chờ cả hai promise hoàn thành
        Promise.all([allPermissionsPromise, rolePermissionsPromise])
            .then(function(results) {
                var allPermissions = results[0];
                var rolePermissions = results[1];
                
                $scope.permissionManagement.permissions = rolePermissions;
                
                // Extract selected permission IDs
                $scope.permissionManagement.selectedPermissions = rolePermissions
                    .filter(function(p) { return p.isAssigned || p.IsAssigned; })
                    .map(function(p) { return p.permissionId || p.PermissionId; });
                
                // Group permissions by sections (truyền allPermissions để lookup permission name)
                $scope.permissionManagement.groupedPermissions = $scope.groupPermissionsBySection(rolePermissions, allPermissions);
                
                // Mở tất cả sections mặc định
                $scope.permissionManagement.groupedPermissions.forEach(function(section) {
                    $scope.permissionManagement.expandedSections[section.permissionCode] = true;
                });
                
                // Set indeterminate state cho tất cả checkboxes sau khi DOM render
                setTimeout(function() {
                    $scope.permissionManagement.groupedPermissions.forEach(function(section) {
                        var checkboxId = 'section-' + section.permissionCode;
                        var state = $scope.getSectionState(section);
                        $scope.setCheckboxIndeterminate(checkboxId, state === 'partial');
                    });
                }, 100);
                
                // Apply scope changes
                if (!$scope.$$phase && !$scope.$root.$$phase) {
                    $scope.$apply();
                }
                    
                openModal('permissionModal');
            })
            .catch(function(error) {
                ToastService.error('Không thể tải danh sách quyền');
            });
    };
    
    /**
     * Toggle permission selection
     */
    $scope.togglePermission = function(permissionId) {
        var index = $scope.permissionManagement.selectedPermissions.indexOf(permissionId);
        if (index > -1) {
            $scope.permissionManagement.selectedPermissions.splice(index, 1);
        } else {
            $scope.permissionManagement.selectedPermissions.push(permissionId);
        }
        
        // Update indeterminate states for all sections after permission change
        setTimeout(function() {
            $scope.permissionManagement.groupedPermissions.forEach(function(section) {
                var checkboxId = 'section-' + section.permissionCode;
                var state = $scope.getSectionState(section);
                $scope.setCheckboxIndeterminate(checkboxId, state === 'partial');
            });
        }, 0);
    };
    
    /**
     * Check if permission is selected
     */
    $scope.isPermissionSelected = function(permissionId) {
        return $scope.permissionManagement.selectedPermissions.indexOf(permissionId) > -1;
    };
    
    /**
     * Save permissions for role
     */
    $scope.savePermissions = function() {
        RoleManagementService.assignPermissions(
            $scope.permissionManagement.roleId,
            $scope.permissionManagement.selectedPermissions
        )
            .then(function(response) {
                ToastService.success(response.data.message || 'Cập nhật quyền thành công');
                closeModal('permissionModal');
                $scope.loadRoles();
                
                // Clear menu cache to force reload from API
                // This ensures menu updates immediately after permission changes
                RoleService.clearCache();
                
                // Broadcast event to reload menu
                $rootScope.$broadcast('menu:reload');
            })
            .catch(function(error) {
                var errorMsg = error.data?.message || 'Không thể cập nhật quyền';
                ToastService.error(errorMsg);
            });
    };
    
    // ============================================================
    // 🔹 MODAL HELPERS
    // ============================================================
    
    function openModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            // Use 'show' class for custom-modal, 'active' for other modals
            if (modal.classList.contains('custom-modal')) {
                modal.classList.add('show');
            } else {
                modal.classList.add('active');
            }
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            // Remove class to hide modal
            if (modal.classList.contains('custom-modal')) {
                modal.classList.remove('show');
            } else {
                modal.classList.remove('active');
            }
            // Restore body scroll
            document.body.style.overflow = '';
        }
    }
    
    // Close modal when clicking on X or Cancel
    $scope.closeModal = closeModal;
    
    // ============================================================
    // 🔹 INITIALIZE
    // ============================================================
    
    $scope.loadRoles();
    $scope.loadPermissions();
}]);
