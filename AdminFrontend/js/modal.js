// ============================================================
// MODAL - jQuery version với CSS thuần
// ============================================================

(function($) {
    'use strict';
    
    // Modal utilities
    window.ModalUtils = {
        // Mở modal
        open: function(modalId) {
            $('#' + modalId).addClass('active');
            $('#modal-overlay').addClass('active');
            $('body').css('overflow', 'hidden');
        },
        
        // Đóng modal
        close: function(modalId) {
            $('#' + modalId).removeClass('active');
            $('#modal-overlay').removeClass('active');
            $('body').css('overflow', '');
        },
        
        // Đóng tất cả modal
        closeAll: function() {
            $('.modal').removeClass('active');
            $('#modal-overlay').removeClass('active');
            $('body').css('overflow', '');
        }
    };
    
    // Tab switching utilities
    window.TabUtils = {
        switchTab: function(tabId) {
            // Hide all tab panes
            $('.tab-pane').removeClass('active');
            
            // Remove active from all nav links
            $('.nav-link').removeClass('active');
            
            // Show selected tab
            $('#' + tabId).addClass('active');
            
            // Mark link as active
            $('[data-tab="' + tabId + '"]').addClass('active');
        }
    };
    
    // Initialize modal event listeners when document ready
    $(document).ready(function() {
        // Close modal when clicking overlay
        $('#modal-overlay').on('click', function() {
            ModalUtils.closeAll();
        });
        
        // Close modal when clicking close button
        $(document).on('click', '.modal-close, [data-dismiss="modal"]', function() {
            ModalUtils.closeAll();
        });
        
        // Close modal on ESC key
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                ModalUtils.closeAll();
            }
        });
        
        // Initialize tabs
        $('[data-tab]').on('click', function(e) {
            e.preventDefault();
            var tabId = $(this).attr('data-tab');
            TabUtils.switchTab(tabId);
        });
        
        // 🔧 FIX: Auto cleanup modal overlay when page loads
        // Đóng tất cả modal khi trang load để tránh overlay bị stuck
        // Delay 500ms để đảm bảo AngularJS đã render xong
        setTimeout(function() {
            ModalUtils.closeAll();
        }, 500);
    });
    
})(jQuery);

