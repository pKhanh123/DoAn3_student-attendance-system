// @ts-check
/* global angular */
'use strict';

// School Year Service
app.service('SchoolYearService', ['ApiService', function(ApiService) {
    var CACHE_KEY_ALL = 'school-years:all';
    var DEFAULT_CACHE_TTL = 5 * 60 * 1000;
    
    // Get all school years
    this.getAll = function(options) {
        var cacheOptions = {
            cache: !(options && options.forceRefresh),
            cacheKey: CACHE_KEY_ALL,
            cacheTTL: (options && options.cacheTTL) || DEFAULT_CACHE_TTL
        };
        
        if (options && options.forceRefresh) {
            ApiService.clearCache(CACHE_KEY_ALL);
        }
        
        return ApiService.get('/school-years', {}, cacheOptions).then(function(response) {
            if (response.data && response.data.data) {
                response.data = response.data.data;
            }
            return response;
        });
    };
    
    this.invalidateCache = function() {
        ApiService.clearCache(CACHE_KEY_ALL);
    };
    
    // Get current school year (based on current date)
    this.getCurrent = function() {
        return ApiService.get('/school-years/current');
    };
    
    // Get active school year (is_active = 1)
    this.getActive = function() {
        return ApiService.get('/school-years/active');
    };
    
    // Get current semester info
    this.getCurrentSemesterInfo = function() {
        return ApiService.get('/school-years/current-semester-info');
    };
    
    // Get school year by ID
    this.getById = function(id) {
        return ApiService.get('/school-years/' + id);
    };
    
    // Get school years by academic year (cohort)
    this.getByAcademicYear = function(academicYearId) {
        return ApiService.get('/school-years/by-academic-year/' + academicYearId);
    };
    
    // Create school year
    this.create = function(schoolYear) {
        return ApiService.post('/school-years', schoolYear);
    };
    
    // Auto-create school years for a cohort (4 years)
    this.autoCreateForCohort = function(startYear) {
        return ApiService.post('/school-years/auto-create?startYear=' + startYear);
    };
    
    // Activate school year
    this.activate = function(id, semester) {
        var semesterParam = semester || 1;
        return ApiService.post('/school-years/' + id + '/activate?initialSemester=' + semesterParam);
    };
    
    // Deactivate school year
    this.deactivate = function(id) {
        return ApiService.post('/school-years/' + id + '/deactivate');
    };
    
    // Update school year
    this.update = function(id, schoolYear) {
        return ApiService.put('/school-years/' + id, schoolYear);
    };
    
    // Transition to next semester (auto)
    this.transitionToNextSemester = function() {
        return ApiService.post('/school-years/auto-transition-semester');
    };
    
    // Force transition to specific semester (FOR TEST ONLY)
    this.forceTransitionSemester = function(targetSemester) {
        // Use route parameter instead of query parameter for POST
        return ApiService.post('/school-years/force-transition-semester/' + targetSemester, {});
    };
    
    // Delete school year
    this.delete = function(id) {
        return ApiService.delete('/school-years/' + id);
    };
}]);

