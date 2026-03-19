// @ts-check
/* global angular */
'use strict';

// Student Service
app.service('StudentService', ['ApiService', function(ApiService) {
    
    /**
     * Get all students with server-side pagination and filtering
     * @param {object} params - { page, pageSize, search, facultyId, majorId, academicYearId, status }
     * @param {boolean} useCache - Whether to use cache (default: true)
     */
    this.getAll = function(params, useCache) {
        params = params || {};
        
        // Build query parameters
        var queryParams = {
            page: params.page || 1,
            pageSize: params.pageSize || 10,
            search: params.search || null,
            facultyId: params.facultyId || null,
            majorId: params.majorId || null,
            academicYearId: params.academicYearId || null
        };
        
        // Remove null values
        Object.keys(queryParams).forEach(function(key) {
            if (queryParams[key] === null || queryParams[key] === '') {
                delete queryParams[key];
            }
        });
        
        // Build cache key from params
        var cacheKey = 'students:' + JSON.stringify(queryParams);
        
        var options = {
            cache: useCache !== false, // Default: cache enabled
            cacheKey: cacheKey,
            cacheTTL: 2 * 60 * 1000 // 2 minutes (shorter for filtered results)
        };
        
        return ApiService.get('/students', queryParams, options).then(function(response) {
            // Backend trả về {data: [...], pagination: {...}}
            // Return cả data và pagination info
            return response;
        });
    };
    
    this.getById = function(id) {
        return ApiService.get('/students/' + id);
    };
    
    this.getByUserId = function(userId) {
        return ApiService.get('/students/by-user-id/' + userId);
    };
    
    this.create = function(student) {
        return ApiService.post('/students/addstudent', student, {
            invalidateCache: 'students:*'
        });
    };
    
    this.update = function(id, student) {
        return ApiService.put('/students/update', student, {
            invalidateCache: 'students:*'
        });
    };
    
    this.delete = function(id) {
        return ApiService.delete('/students/delete', {studentId: id}, {
            invalidateCache: 'students:*'
        });
    };
    
    this.importBatch = function(students) {
        console.log('[StudentService] 📤 importBatch() - Gửi request import');
        console.log('[StudentService] 📊 Students to import:', {
            count: students.length,
            sample: students.slice(0, 2)
        });
        return ApiService.post('/students/import/batch', students, {
            invalidateCache: 'students:*'
        });
    };
}]);

