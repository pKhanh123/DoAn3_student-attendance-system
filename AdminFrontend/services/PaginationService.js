// Pagination Service - Reusable pagination logic
app.service('PaginationService', function() {
    
    /**
     * Initialize pagination object
     */
    this.init = function(pageSize) {
        return {
            currentPage: 1,
            pageSize: pageSize || 10,
            totalItems: 0,
            totalPages: 0,
            pageSizeOptions: [10, 25, 50, 100],
            sortField: '',
            sortDirection: 'asc',
            searchTerm: '',
            filters: {}
        };
    };
    
    /**
     * Calculate pagination metadata
     */
    this.calculate = function(pagination) {
        pagination.totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);
        pagination.startItem = (pagination.currentPage - 1) * pagination.pageSize + 1;
        pagination.endItem = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems);
        return pagination;
    };
    
    /**
     * Get page numbers for display
     */
    this.getPageNumbers = function(pagination) {
        var pages = [];
        var maxPages = 5; // Show max 5 page numbers
        var startPage, endPage;
        
        if (pagination.totalPages <= maxPages) {
            startPage = 1;
            endPage = pagination.totalPages;
        } else {
            if (pagination.currentPage <= 3) {
                startPage = 1;
                endPage = maxPages;
            } else if (pagination.currentPage + 2 >= pagination.totalPages) {
                startPage = pagination.totalPages - maxPages + 1;
                endPage = pagination.totalPages;
            } else {
                startPage = pagination.currentPage - 2;
                endPage = pagination.currentPage + 2;
            }
        }
        
        for (var i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        return pages;
    };
    
    /**
     * Go to specific page
     */
    this.goToPage = function(pagination, page) {
        if (page < 1 || page > pagination.totalPages) return;
        pagination.currentPage = page;
        return pagination;
    };
    
    /**
     * Change page size
     */
    this.changePageSize = function(pagination, newSize) {
        pagination.pageSize = parseInt(newSize);
        pagination.currentPage = 1; // Reset to first page
        return pagination;
    };
    
    /**
     * Toggle sort direction
     */
    this.toggleSort = function(pagination, field) {
        if (pagination.sortField === field) {
            pagination.sortDirection = pagination.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            pagination.sortField = field;
            pagination.sortDirection = 'asc';
        }
        return pagination;
    };
    
    /**
     * Build query parameters for API call
     */
    this.buildQueryParams = function(pagination) {
        var params = {
            page: pagination.currentPage,
            pageSize: pagination.pageSize
        };
        
        if (pagination.sortField) {
            params.sortBy = pagination.sortField;
            params.sortDirection = pagination.sortDirection;
        }
        
        if (pagination.searchTerm) {
            params.search = pagination.searchTerm;
        }
        
        // Add custom filters
        if (pagination.filters) {
            angular.forEach(pagination.filters, function(value, key) {
                if (value !== null && value !== undefined && value !== '') {
                    params[key] = value;
                }
            });
        }
        
        return params;
    };
});

