// Notification Controller
app.controller('NotificationController', ['$scope', '$location', 'NotificationService', 'PaginationService', 'AuthService', 'AvatarService', 'UserService', 'LecturerService',
    function($scope, $location, NotificationService, PaginationService, AuthService, AvatarService, UserService, LecturerService) {
    
    $scope.notifications = [];
    $scope.displayedNotifications = [];
    $scope.loading = false;
    $scope.error = null;
    $scope.success = null;
    
    // Create notification modal
    $scope.showCreateModal = false;
    $scope.creatingNotification = false;
    $scope.availableUsers = [];
    $scope.filteredUsers = [];
    $scope.userSearchTerm = '';
    $scope.newNotification = {
        recipientId: '',
        title: '',
        content: '',
        type: 'System'
    };
    
    // Check if user can create notifications (only Admin)
    var currentUser = AuthService.getCurrentUser();
    $scope.canCreateNotification = currentUser && (
        currentUser.roleName === 'Admin' || 
        currentUser.roleName === 'Quản trị viên' ||
        currentUser.role === 'Admin'
    );
    
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
    
    // Pagination
    $scope.pagination = PaginationService.init(50);
    $scope.pagination.currentPage = 1;
    $scope.pagination.pageSize = 50;
    $scope.pagination.totalItems = 0;
    
    // Filters
    $scope.filters = {
        isRead: '',
        type: ''
    };
    
    // Load notifications from backend with pagination
    $scope.loadNotifications = function() {
        $scope.loading = true;
        $scope.error = null;
        
        var page = $scope.pagination.currentPage;
        var pageSize = $scope.pagination.pageSize;
        var type = $scope.filters.type || null;
        var isRead = $scope.filters.isRead !== '' ? ($scope.filters.isRead === 'true') : null;
        
        NotificationService.getAll(page, pageSize, type, isRead)
            .then(function(result) {
                $scope.notifications = result.data || [];
                $scope.pagination.totalItems = result.totalCount || result.data.length;
                $scope.pagination.currentPage = result.page || page;
                $scope.pagination.pageSize = result.pageSize || pageSize;
                
                // Apply client-side search if needed
                if ($scope.pagination.searchTerm) {
                    var searchLower = $scope.pagination.searchTerm.toLowerCase();
                    $scope.notifications = $scope.notifications.filter(function(notif) {
                        return (notif.title && notif.title.toLowerCase().includes(searchLower)) ||
                               (notif.content && notif.content.toLowerCase().includes(searchLower));
                    });
                }
                
                // Map field names for compatibility
                $scope.notifications = $scope.notifications.map(function(notif) {
                    return {
                        notificationId: notif.notificationId || notif.id,
                        id: notif.notificationId || notif.id,
                        title: notif.title,
                        content: notif.content || notif.message,
                        message: notif.content || notif.message,
                        type: notif.type || 'System',
                        isRead: notif.isRead || false,
                        createdAt: notif.createdAt || notif.sentDate,
                        sentDate: notif.sentDate || notif.createdAt
                    };
                });
                
                $scope.displayedNotifications = $scope.notifications;
                $scope.pagination = PaginationService.calculate($scope.pagination);
                $scope.loading = false;
            })
            .catch(function(error) {
                $scope.error = 'Không thể tải thông báo: ' + (error.data?.message || error.message || 'Lỗi không xác định');
                $scope.loading = false;
            });
    };
    
    // Event handlers
    $scope.handleSearch = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadNotifications();
    };
    
    $scope.handleSort = function() {
        // Backend handles sorting, just reload
        $scope.loadNotifications();
    };
    
    $scope.handlePageChange = function() {
        $scope.loadNotifications();
    };
    
    $scope.handleFilterChange = function() {
        $scope.pagination.currentPage = 1;
        $scope.loadNotifications();
    };
    
    $scope.resetFilters = function() {
        $scope.pagination.searchTerm = '';
        $scope.filters = {
            isRead: '',
            type: ''
        };
        $scope.pagination.currentPage = 1;
        $scope.loadNotifications();
    };
    
    // Mark as read
    $scope.markAsRead = function(notificationId) {
        // Prevent multiple clicks
        if ($scope.markingNotificationId === notificationId) return;
        $scope.markingNotificationId = notificationId;
        
        NotificationService.markAsRead(notificationId)
            .then(function() {
                // Update local data
                var notif = $scope.notifications.find(function(n) {
                    return (n.notificationId === notificationId) || (n.id === notificationId);
                });
                if (notif) {
                    notif.isRead = true;
                    notif.content = notif.content || notif.message;
                    notif.message = notif.content || notif.message;
                }
                $scope.success = 'Đã đánh dấu đã đọc';
                // Reload to refresh count
                $scope.loadNotifications();
                $scope.markingNotificationId = null;
            })
            .catch(function(error) {
                var errorMsg = error.data?.message || error.message || '';
                // If notification doesn't exist or already read, just update locally
                if (errorMsg.includes('Không tìm thấy') || errorMsg.includes('đã bị xóa') || errorMsg.includes('already')) {
                    var notif = $scope.notifications.find(function(n) {
                        return (n.notificationId === notificationId) || (n.id === notificationId);
                    });
                    if (notif) {
                        notif.isRead = true;
                    }
                    $scope.loadNotifications();
                } else {
                    $scope.error = 'Không thể đánh dấu đã đọc: ' + errorMsg;
                }
                $scope.markingNotificationId = null;
            });
    };
    
    // Mark all as read
    $scope.markAllAsRead = function() {
        if (!confirm('Bạn có chắc chắn muốn đánh dấu tất cả thông báo là đã đọc?')) {
            return;
        }
        
        NotificationService.markAllAsRead()
            .then(function() {
                $scope.notifications.forEach(function(notif) {
                    notif.isRead = true;
                });
                $scope.success = 'Đã đánh dấu tất cả là đã đọc';
                // Reload to refresh
                $scope.loadNotifications();
            })
            .catch(function(error) {
                $scope.error = 'Không thể đánh dấu tất cả: ' + (error.data?.message || error.message || 'Lỗi không xác định');
            });
    };
    
    // Delete notification
    $scope.deleteNotification = function(notificationId) {
        if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
            return;
        }
        
        NotificationService.deleteNotification(notificationId)
            .then(function() {
                $scope.success = 'Xóa thông báo thành công';
                // Reload to refresh list
                $scope.loadNotifications();
            })
            .catch(function(error) {
                $scope.error = 'Không thể xóa thông báo: ' + (error.data?.message || error.message || 'Lỗi không xác định');
            });
    };
    
    // Get notification icon
    $scope.getNotificationIcon = function(type) {
        if (!type) return 'fa-bell';
        
        var typeLower = type.toLowerCase();
        var icons = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-times-circle',
            'grade': 'fa-star',
            'gradeappeal': 'fa-gavel',
            'gradeupdate': 'fa-star',
            'enrollment': 'fa-clipboard-check',
            'attendance': 'fa-clipboard-check',
            'attendancewarning': 'fa-exclamation-triangle',
            'academicwarning': 'fa-exclamation-circle',
            'system': 'fa-cog'
        };
        return icons[typeLower] || 'fa-bell';
    };
    
    // Get notification badge class
    $scope.getNotificationClass = function(type) {
        if (!type) return 'badge-secondary';
        
        var typeLower = type.toLowerCase();
        var classes = {
            'info': 'badge-info',
            'success': 'badge-success',
            'warning': 'badge-warning',
            'error': 'badge-danger',
            'grade': 'badge-primary',
            'gradeappeal': 'badge-warning',
            'gradeupdate': 'badge-primary',
            'enrollment': 'badge-info',
            'attendance': 'badge-info',
            'attendancewarning': 'badge-warning',
            'academicwarning': 'badge-danger',
            'system': 'badge-secondary'
        };
        return classes[typeLower] || 'badge-secondary';
    };
    
    // Get notification type display name
    $scope.getNotificationTypeName = function(type) {
        if (!type) return 'Hệ thống';
        
        var typeLower = type.toLowerCase();
        var names = {
            'info': 'Thông tin',
            'success': 'Thành công',
            'warning': 'Cảnh báo',
            'error': 'Lỗi',
            'grade': 'Điểm',
            'gradeappeal': 'Phúc khảo điểm',
            'gradeupdate': 'Cập nhật điểm',
            'enrollment': 'Đăng ký học phần',
            'attendance': 'Điểm danh',
            'attendancewarning': 'Cảnh báo chuyên cần',
            'academicwarning': 'Cảnh báo học tập',
            'system': 'Hệ thống'
        };
        return names[typeLower] || type;
    };
    
    // Format date
    $scope.formatDate = function(dateString) {
        if (!dateString) return '';
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '';
        }
    };
    
    // Time ago helper
    $scope.timeAgo = function(dateString) {
        if (!dateString) return '';
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            var now = new Date();
            var diff = now - date;
            
            if (diff < 0) return 'Vừa xong';
            
            var seconds = Math.floor(diff / 1000);
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            var weeks = Math.floor(days / 7);
            var months = Math.floor(days / 30);
            
            if (seconds < 60) return 'Vừa xong';
            if (minutes < 60) return minutes + ' phút trước';
            if (hours < 24) return hours + ' giờ trước';
            if (days < 7) return days + ' ngày trước';
            if (weeks < 4) return weeks + ' tuần trước';
            if (months < 12) return months + ' tháng trước';
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return '';
        }
    };
    
    // Navigate to related page based on notification type
    $scope.navigateToRelated = function(notification) {
        // Mark as read first
        if (!notification.isRead) {
            $scope.markAsRead(notification.notificationId || notification.id);
        }
        
        // Get current user role
        var currentUser = AuthService.getCurrentUser();
        var userRole = (currentUser?.role || currentUser?.Role || currentUser?.roleName || 'Admin').trim();
        
        // Normalize role
        var roleMap = {
            'Cố vấn': 'Advisor',
            'Giảng viên': 'Lecturer',
            'Sinh viên': 'Student',
            'Quản trị viên': 'Admin'
        };
        userRole = roleMap[userRole] || userRole;
        
        // Navigate based on type and user role
        var type = (notification.type || '').toLowerCase();
        if (type === 'gradeappeal') {
            // Navigate to grade appeals page based on role
            if (userRole === 'Advisor') {
                $location.path('/advisor/appeals');
            } else if (userRole === 'Lecturer') {
                $location.path('/lecturer/appeals');
            } else if (userRole === 'Student') {
                $location.path('/student/appeals');
            } else {
                $location.path('/notifications'); // Fallback
            }
        } else if (type === 'enrollment') {
            // Navigate to enrollments page based on role
            if (userRole === 'Student') {
                $location.path('/student/enrollments');
            } else if (userRole === 'Advisor' || userRole === 'Admin') {
                $location.path('/enrollments');
            } else {
                $location.path('/notifications'); // Fallback
            }
        } else {
            // Stay on notifications page for other types
            // Already on notifications page, just refresh
        }
    };
    
    // Load available users for creating notifications
    $scope.loadAvailableUsers = function() {
        if (!$scope.canCreateNotification) return;
        
        // Try to load all users first (requires ADMIN_USERS permission)
        UserService.getAll()
            .then(function(response) {
                var users = response.data || [];
                // Filter only active users
                $scope.availableUsers = users.filter(function(u) {
                    return u.isActive !== false;
                });
                $scope.filteredUsers = $scope.availableUsers;
            })
            .catch(function(error) {
                // Silently handle 403 (permission denied) - this is expected for non-admin users
                // Fallback: Try to load lecturers (usually has less strict permission)
                LecturerService.getAll()
                    .then(function(response) {
                        var lecturers = response.data || [];
                        $scope.availableUsers = lecturers.map(function(l) {
                            return {
                                userId: l.userId,
                                username: l.lecturerCode || l.username,
                                fullName: l.fullName,
                                roleName: 'Lecturer'
                            };
                        });
                        $scope.filteredUsers = $scope.availableUsers;
                    })
                    .catch(function(err) {
                        // If both fail, show empty list but don't show error
                        $scope.availableUsers = [];
                        $scope.filteredUsers = [];
                    });
            });
    };
    
    // Filter users by search term
    $scope.filterUsers = function() {
        if (!$scope.userSearchTerm || $scope.userSearchTerm.trim() === '') {
            $scope.filteredUsers = $scope.availableUsers;
            return;
        }
        
        var searchLower = $scope.userSearchTerm.toLowerCase();
        $scope.filteredUsers = $scope.availableUsers.filter(function(user) {
            var fullName = (user.fullName || '').toLowerCase();
            var username = (user.username || '').toLowerCase();
            var email = (user.email || '').toLowerCase();
            var roleName = (user.roleName || '').toLowerCase();
            var userId = (user.userId || '').toLowerCase();
            
            return fullName.includes(searchLower) || 
                   username.includes(searchLower) || 
                   email.includes(searchLower) ||
                   roleName.includes(searchLower) ||
                   userId.includes(searchLower);
        });
    };
    
    // Get users by role for dropdown grouping
    $scope.getUsersByRole = function(role) {
        if (!$scope.filteredUsers || $scope.filteredUsers.length === 0) {
            return [];
        }
        
        return $scope.filteredUsers.filter(function(user) {
            var userRole = (user.roleName || '').toLowerCase();
            var roleLower = role.toLowerCase();
            
            // Map Vietnamese role names
            var roleMap = {
                'giảng viên': 'lecturer',
                'sinh viên': 'student',
                'cố vấn': 'advisor',
                'quản trị viên': 'admin'
            };
            
            return userRole === roleLower || 
                   userRole === roleMap[userRole] ||
                   (roleLower === 'lecturer' && (userRole === 'giảng viên' || userRole.includes('lecturer'))) ||
                   (roleLower === 'student' && (userRole === 'sinh viên' || userRole.includes('student'))) ||
                   (roleLower === 'advisor' && (userRole === 'cố vấn' || userRole.includes('advisor'))) ||
                   (roleLower === 'admin' && (userRole === 'quản trị viên' || userRole.includes('admin')));
        });
    };
    
    // Open create notification modal
    $scope.openCreateModal = function() {
        $scope.showCreateModal = true;
        $scope.newNotification = {
            recipientId: '',
            title: '',
            content: '',
            type: 'System'
        };
        $scope.userSearchTerm = '';
        if ($scope.availableUsers.length === 0) {
            $scope.loadAvailableUsers();
        } else {
            $scope.filteredUsers = $scope.availableUsers;
        }
    };
    
    // Close create notification modal
    $scope.closeCreateModal = function() {
        $scope.showCreateModal = false;
        $scope.newNotification = {
            recipientId: '',
            title: '',
            content: '',
            type: 'System'
        };
        $scope.userSearchTerm = '';
        $scope.filteredUsers = $scope.availableUsers;
    };
    
    // Create notification
    $scope.createNotification = function() {
        if (!$scope.newNotification.recipientId || 
            !$scope.newNotification.title || 
            !$scope.newNotification.content) {
            $scope.error = 'Vui lòng điền đầy đủ thông tin';
            return;
        }
        
        $scope.creatingNotification = true;
        $scope.error = null;
        
        NotificationService.create({
            recipientId: $scope.newNotification.recipientId,
            title: $scope.newNotification.title,
            content: $scope.newNotification.content,
            type: $scope.newNotification.type || 'System'
        })
        .then(function(response) {
            $scope.success = 'Tạo thông báo thành công!';
            $scope.closeCreateModal();
            $scope.loadNotifications();
            
            // Clear success message after 3 seconds
            setTimeout(function() {
                $scope.success = null;
                $scope.$apply();
            }, 3000);
        })
        .catch(function(error) {
            $scope.error = 'Không thể tạo thông báo: ' + (error.data?.message || error.message || 'Lỗi không xác định');
        })
        .finally(function() {
            $scope.creatingNotification = false;
        });
    };
    
    // Initialize
    $scope.loadNotifications();
    // Don't load users on init - only load when opening create modal
    // if ($scope.canCreateNotification) {
    //     $scope.loadAvailableUsers();
    // }
    
    // Auto-refresh every 30 seconds when page is visible
    var refreshInterval = setInterval(function() {
        if (document.visibilityState === 'visible' && !$scope.loading) {
            $scope.loadNotifications();
        }
    }, 30000);
    
    // Cleanup on destroy
    $scope.$on('$destroy', function() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });
}]);

// Notification Bell Controller (for header)
app.controller('NotificationBellController', ['$scope', '$interval', '$location', 'NotificationService', 'AuthService', 'SignalRService', '$rootScope',
    function($scope, $interval, $location, NotificationService, AuthService, SignalRService, $rootScope) {
    
    $scope.unreadNotifications = [];
    $scope.unreadCount = 0;
    $scope.showDropdown = false;
    $scope.loading = false;
    var pollingInterval = null;
    
    // Initialize SignalR connection
    function initializeSignalR() {
        var currentUser = AuthService.getCurrentUser();
        if (!currentUser || !AuthService.getToken()) {
            return;
        }
        
        SignalRService.initialize()
            .then(function() {
                // Listen for new notifications
                SignalRService.onReceiveNotification(function(notification) {
                    
                    // Add to unread notifications list (prepend)
                    var mappedNotif = {
                        notificationId: notification.notificationId || notification.id,
                        id: notification.notificationId || notification.id,
                        title: notification.title,
                        content: notification.content || notification.message,
                        message: notification.content || notification.message,
                        type: notification.type || 'System',
                        isRead: notification.isRead || false,
                        createdAt: notification.createdAt || notification.sentDate,
                        sentDate: notification.sentDate || notification.createdAt
                    };
                    
                    // Add to beginning of list
                    $scope.unreadNotifications.unshift(mappedNotif);
                    
                    // Keep only latest 5
                    if ($scope.unreadNotifications.length > 5) {
                        $scope.unreadNotifications = $scope.unreadNotifications.slice(0, 5);
                    }
                    
                    // Show browser notification if not in focus
                    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification(notification.title, {
                            body: notification.content || notification.message,
                            icon: '/favicon.ico'
                        });
                    }
                });
                
                // Listen for unread count updates
                SignalRService.onUpdateUnreadCount(function(count) {
                    $scope.unreadCount = count || 0;
                });
            })
            .catch(function(error) {
                // Fallback to polling
                startPolling();
            });
    }
    
    // Fallback: Start polling if SignalR fails
    function startPolling() {
        if (pollingInterval) return;
        
        // Poll every 30 seconds
        pollingInterval = $interval(function() {
            if (!AuthService.getToken()) {
                $interval.cancel(pollingInterval);
                pollingInterval = null;
                return;
            }
            $scope.loadUnread();
        }, 30000);
    }
    
    // Load unread notifications
    $scope.loadUnread = function() {
        $scope.loading = true;
        NotificationService.getUnread(10) // Get latest 10 unread notifications
            .then(function(result) {
                var notifications = result.data || [];
                // Map field names for compatibility và loại bỏ trùng lặp
                var seenIds = {};
                $scope.unreadNotifications = notifications.slice(0, 5)
                    .map(function(notif) {
                        var id = notif.notificationId || notif.id;
                        if (seenIds[id]) {
                            return null; // Skip duplicates
                        }
                        seenIds[id] = true;
                        return {
                            notificationId: id,
                            id: id,
                            title: notif.title,
                            content: notif.content || notif.message,
                            message: notif.content || notif.message,
                            type: notif.type || 'System',
                            isRead: notif.isRead || false,
                            createdAt: notif.createdAt || notif.sentDate,
                            sentDate: notif.sentDate || notif.createdAt
                        };
                    })
                    .filter(function(notif) { return notif !== null; }); // Remove nulls
                
                // Update count from service
                NotificationService.fetchUnreadCount().then(function(count) {
                    $scope.unreadCount = count;
                });
            })
            .catch(function(error) {
                // Try to get count anyway
                NotificationService.fetchUnreadCount().then(function(count) {
                    $scope.unreadCount = count;
                });
            })
            .finally(function() {
                $scope.loading = false;
            });
    };
    
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Toggle dropdown
    $scope.toggleDropdown = function() {
        var wasOpen = $scope.showDropdown;
        $scope.showDropdown = !$scope.showDropdown;
        if ($scope.showDropdown && !wasOpen) {
            // Chỉ load khi mở lần đầu, không load lại khi đóng/mở
            $scope.loadUnread();
        }
    };
    
    // Close dropdown
    $scope.closeDropdown = function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        $scope.showDropdown = false;
    };
    
    // Initialize on controller load
    $scope.$on('$destroy', function() {
        if (pollingInterval) {
            $interval.cancel(pollingInterval);
        }
        SignalRService.disconnect();
    });
    
    // Initialize SignalR when user is authenticated
    var initWatcher = $rootScope.$watch(function() {
        return AuthService.getToken();
    }, function(newToken) {
        if (newToken) {
            initializeSignalR();
            $scope.loadUnread(); // Load initial notifications
            initWatcher(); // Unwatch after initialization
        }
    });
    
    // Track notifications being marked to prevent duplicate calls
    $scope.markingNotifications = {};
    
    // Mark as read and navigate
    $scope.markAndView = function(notification) {
        var notificationId = notification.notificationId || notification.id;
        
        // Prevent multiple clicks for the same notification
        if ($scope.markingNotifications[notificationId]) {
            return;
        }
        $scope.markingNotifications[notificationId] = true;
        
        NotificationService.markAsRead(notificationId)
            .then(function() {
                // Remove from unread list
                $scope.unreadNotifications = $scope.unreadNotifications.filter(function(n) {
                    return (n.notificationId || n.id) !== notificationId;
                });
                
                // Refresh unread count
                NotificationService.fetchUnreadCount().then(function(count) {
                    $scope.unreadCount = count;
                });
                
                // Get current user role
                var currentUser = AuthService.getCurrentUser();
                if (!currentUser) {
                    $location.path('/notifications');
                    delete $scope.markingNotifications[notificationId];
                    return;
                }
                
                var userRole = (currentUser.role || currentUser.Role || currentUser.roleName || 'Admin').trim();
                
                // Normalize role
                var roleMap = {
                    'Cố vấn': 'Advisor',
                    'Giảng viên': 'Lecturer',
                    'Sinh viên': 'Student',
                    'Quản trị viên': 'Admin'
                };
                userRole = roleMap[userRole] || userRole;
                
                // Navigate to related page based on type and user role
                var type = (notification.type || '').toLowerCase();
                if (type === 'gradeappeal') {
                    // Navigate to grade appeals page based on role
                    if (userRole === 'Advisor') {
                        $location.path('/advisor/appeals');
                    } else if (userRole === 'Lecturer') {
                        $location.path('/lecturer/appeals');
                    } else if (userRole === 'Student') {
                        $location.path('/student/appeals');
                    } else {
                        $location.path('/notifications');
                    }
                } else if (type === 'enrollment') {
                    // Navigate to enrollments page based on role
                    if (userRole === 'Student') {
                        $location.path('/student/enrollments');
                    } else if (userRole === 'Advisor' || userRole === 'Admin') {
                        $location.path('/enrollments');
                    } else {
                        $location.path('/notifications');
                    }
                } else {
                    // Navigate to notifications page
                    $location.path('/notifications');
                }
                delete $scope.markingNotifications[notificationId];
            })
            .catch(function(error) {
                // Error marking notification as read - don't show error if notification doesn't exist or already read
                var errorMsg = (error.data && error.data.message) || error.message || '';
                var status = error.status || 0;
                
                // For 500 errors or not found errors, silently remove from list
                if (status === 500 || status === 404 || 
                    errorMsg.includes('Không tìm thấy') || 
                    errorMsg.includes('đã bị xóa') || 
                    errorMsg.includes('already') ||
                    errorMsg.includes('not found')) {
                    // Silently remove from list if notification doesn't exist
                    $scope.unreadNotifications = $scope.unreadNotifications.filter(function(n) {
                        return (n.notificationId || n.id) !== notificationId;
                    });
                    NotificationService.fetchUnreadCount().then(function(count) {
                        $scope.unreadCount = count;
                    });
                }
                delete $scope.markingNotifications[notificationId];
            });
    };
    
    // View all notifications
    $scope.viewAll = function() {
        $location.path('/notifications');
    };
    
    // Get notification icon for bell dropdown
    $scope.getNotificationIcon = function(type) {
        if (!type) return 'fa-bell';
        var typeLower = type.toLowerCase();
        var icons = {
            'gradeappeal': 'fa-gavel',
            'enrollment': 'fa-clipboard-check',
            'gradeupdate': 'fa-star',
            'attendancewarning': 'fa-exclamation-triangle',
            'academicwarning': 'fa-exclamation-circle',
            'system': 'fa-cog'
        };
        return icons[typeLower] || 'fa-bell';
    };
    
    // Format time ago for bell dropdown
    $scope.timeAgo = function(dateString) {
        if (!dateString) return '';
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            var now = new Date();
            var diff = now - date;
            if (diff < 0) return 'Vừa xong';
            
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Vừa xong';
            if (minutes < 60) return minutes + ' phút trước';
            if (hours < 24) return hours + ' giờ trước';
            if (days < 7) return days + ' ngày trước';
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return '';
        }
    };
    
    // Listen to count changes
    $scope.$on('notificationCountChanged', function(event, count) {
        $scope.unreadCount = count;
    });
    
    // Initialize
    $scope.loadUnread();
    
    // Refresh every 30 seconds when tab is visible
    var intervalPromise = $interval(function() {
        if (document.visibilityState === 'visible') {
            NotificationService.fetchUnreadCount().then(function(count) {
                if (!$scope.$$phase && !$scope.$root.$$phase) {
                    $scope.$apply(function() {
                        $scope.unreadCount = count;
                    });
                } else {
                    $scope.unreadCount = count;
                }
            });
            // Reload notifications if dropdown is open
            if ($scope.showDropdown) {
                $scope.loadUnread();
            }
        }
    }, 30000);

    // Cleanup interval khi destroy để tránh nhân bản interval khi điều hướng
    $scope.$on('$destroy', function() {
        if (intervalPromise) {
            $interval.cancel(intervalPromise);
            intervalPromise = null;
        }
    });
}]);

