/**
 * Sidebar Toggle và Responsive Handler
 */
(function() {
    'use strict';
    
    // Global variables for retry logic
    let initRetryCount = 0;
    const MAX_RETRIES = 20; // Max 4 seconds (20 * 200ms)
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initSidebar, 100);
    });
    
    // Also initialize when route changes (for AngularJS)
    if (window.angular) {
        angular.element(document).ready(function() {
            setTimeout(initSidebar, 300); // Longer delay for AngularJS compilation
        });
        
        // Also try to initialize after AngularJS app is fully loaded
        if (angular.module && angular.module('adminApp')) {
            angular.module('adminApp').run(['$rootScope', '$timeout', function($rootScope, $timeout) {
                $timeout(function() {
                    initSidebar();
                }, 500);
            }]);
        }
    }
    
    // Fallback: Try to initialize after a longer delay
    setTimeout(function() {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (menuToggle && sidebar) {
            initSidebar();
        }
    }, 2000);
    
    function initSidebar() {
        initRetryCount++;
        
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (!menuToggle || !sidebar || !mainContent) {
            if (initRetryCount >= MAX_RETRIES) {
                return;
            }
            // Retry after a short delay
            setTimeout(initSidebar, 200);
            return;
        }
        
        // Reset retry count on success
        initRetryCount = 0;
        
        // Create overlay for mobile
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        
        // Toggle sidebar function
        function toggleSidebar() {
            const isCollapsed = sidebar.classList.contains('collapsed');
            const isMobile = window.innerWidth < 1024;
            
            if (isCollapsed) {
                // Open sidebar
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
                // Only show overlay on mobile
                if (isMobile) {
                    overlay.classList.add('active');
                }
            } else {
                // Close sidebar
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
                overlay.classList.remove('active');
            }
        }
        
        // Remove any existing event listeners by cloning the element
        const newMenuToggle = menuToggle.cloneNode(true);
        menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
        const actualMenuToggle = newMenuToggle;
        
        // Menu toggle button click
        actualMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            toggleSidebar();
        });
        
        // Overlay click - close sidebar on mobile
        overlay.addEventListener('click', function() {
            if (window.innerWidth < 1024) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
                overlay.classList.remove('active');
            }
        });
        
        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                handleResize();
            }, 250);
        });
        
        function handleResize() {
            const width = window.innerWidth;
            
            if (width >= 1024) {
                // Desktop - show sidebar by default
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
                overlay.classList.remove('active');
            } else {
                // Mobile - hide sidebar by default
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
                overlay.classList.remove('active');
            }
        }
        
        // Initialize based on screen size
        handleResize();
    }
    
    // Re-initialize on route change for AngularJS
    if (window.angular && angular.module && angular.module('adminApp')) {
        angular.module('adminApp').run(['$rootScope', '$timeout', function($rootScope, $timeout) {
            $rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
                // Reset retry count on route change
                initRetryCount = 0;
                // Longer delay to ensure AngularJS has compiled the new view
                $timeout(function() {
                    initSidebar();
                }, 300);
            });
            
            // Also listen for view content loaded
            $rootScope.$on('$viewContentLoaded', function() {
                initRetryCount = 0;
                $timeout(function() {
                    initSidebar();
                }, 200);
            });
        }]);
    }
})();
