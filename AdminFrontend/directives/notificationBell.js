// Notification Bell Directive
app.directive('notificationBell', function() {
    return {
        restrict: 'E',
        scope: {},
        controller: 'NotificationBellController',
        template: 
            '<div class="notification-bell">' +
                '<button class="notification-bell-btn" ng-click="toggleDropdown()" ng-class="{\'active\': showDropdown}">' +
                    '<i class="fas fa-bell" ng-class="{\'fa-shake\': showDropdown}"></i>' +
                    '<span ng-if="unreadCount > 0" class="notification-badge">{{unreadCount > 99 ? \'99+\' : unreadCount}}</span>' +
                '</button>' +
                '<div ng-if="showDropdown" class="notification-dropdown-wrapper">' +
                    '<div class="notification-dropdown" ng-click="$event.stopPropagation()">' +
                        '<div class="notification-dropdown-header">' +
                            '<h4><i class="fas fa-bell"></i> Thông báo</h4>' +
                            '<button ng-click="closeDropdown($event)" class="close-btn">' +
                                '<i class="fas fa-times"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div class="notification-dropdown-body">' +
                            '<div ng-if="unreadNotifications.length === 0" class="empty-notifications">' +
                                '<i class="fas fa-inbox"></i>' +
                                '<p>Không có thông báo mới</p>' +
                            '</div>' +
                            '<div ng-if="loading" class="text-center" style="padding: 20px;">' +
                                '<i class="fas fa-spinner fa-spin"></i> Đang tải...' +
                            '</div>' +
                            '<div ng-repeat="notif in unreadNotifications track by (notif.notificationId || notif.id)" ' +
                                 'class="notification-dropdown-item" ' +
                                 'ng-click="markAndView(notif)">' +
                                '<div class="notif-icon">' +
                                    '<i class="fas" ng-class="getNotificationIcon(notif.type)"></i>' +
                                '</div>' +
                                '<div class="notif-content">' +
                                    '<h5>{{notif.title}}</h5>' +
                                    '<p>{{(notif.content || notif.message) | limitTo:60}}{{(notif.content || notif.message).length > 60 ? \'...\' : \'\'}}</p>' +
                                    '<span class="notif-time">{{timeAgo(notif.createdAt || notif.sentDate)}}</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="notification-dropdown-footer">' +
                            '<button ng-click="viewAll()" class="view-all-btn">' +
                                '<i class="fas fa-arrow-right"></i> Xem tất cả thông báo' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>',
        link: function(scope, element) {
            // Close dropdown when clicking outside
            angular.element(document).on('click', function(e) {
                if (!element[0].contains(e.target)) {
                    // Use $evalAsync to avoid $digest already in progress error
                    scope.$evalAsync(function() {
                        scope.showDropdown = false;
                    });
                }
            });
            
            // Cleanup
            scope.$on('$destroy', function() {
                angular.element(document).off('click');
            });
        }
    };
});

