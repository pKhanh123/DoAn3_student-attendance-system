// @ts-check
/* global angular */
'use strict';

/**
 * Helper service để lấy và filter theo học kỳ hiện tại
 * Best practice: Tự động filter theo học kỳ hiện tại, nhưng vẫn cho phép xem tất cả nếu cần
 */
app.service('CurrentSemesterHelper', ['SchoolYearService', 'LoggerService', function(SchoolYearService, LoggerService) {
    var currentSemesterCache = null;
    var cacheExpiry = null;
    var CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    /**
     * Lấy thông tin học kỳ hiện tại (có cache)
     * @returns {Promise<{schoolYearId: string, semester: number, schoolYear: object}>}
     */
    this.getCurrentSemesterInfo = function(forceRefresh) {
        // Return cached if still valid
        if (!forceRefresh && currentSemesterCache && cacheExpiry && new Date() < cacheExpiry) {
            return Promise.resolve(currentSemesterCache);
        }
        
        return SchoolYearService.getCurrent()
            .then(function(response) {
                var schoolYear = response.data || response;
                var semester = schoolYear.currentSemester || schoolYear.detectedSemester || schoolYear.CurrentSemester || schoolYear.DetectedSemester || null;
                var schoolYearId = schoolYear.schoolYearId || schoolYear.SchoolYearId || null;
                
                var info = {
                    schoolYearId: schoolYearId,
                    semester: semester,
                    schoolYear: schoolYear,
                    yearCode: schoolYear.yearCode || schoolYear.YearCode,
                    yearName: schoolYear.yearName || schoolYear.YearName,
                    isActive: schoolYear.isActive || schoolYear.IsActive
                };
                
                // Cache the result
                currentSemesterCache = info;
                cacheExpiry = new Date(Date.now() + CACHE_TTL);
                
                return info;
            })
            .catch(function(error) {
                LoggerService.warn('Error getting current semester info', error);
                // Return null if error, but don't break the flow
                return {
                    schoolYearId: null,
                    semester: null,
                    schoolYear: null,
                    yearCode: null,
                    yearName: null,
                    isActive: false
                };
            });
    };
    
    /**
     * Helper function để normalize semester value (string hoặc number) thành number
     * @param {string|number} semester - Semester value từ class hoặc currentSemesterInfo
     * @returns {number|null} - Semester number (1, 2, 3) hoặc null nếu không parse được
     */
    function normalizeSemester(semester) {
        var originalValue = semester;
        
        if (semester === null || semester === undefined) {
            return null;
        }
        
        // Nếu đã là number, return luôn
        if (typeof semester === 'number') {
            return semester;
        }
        
        // Nếu là string, parse nó
        if (typeof semester === 'string') {
            // Remove "HK" prefix nếu có (e.g., "HK1" -> "1")
            var cleaned = semester.replace(/^HK/i, '').trim();
            
            // Try to parse as number
            var parsed = parseInt(cleaned, 10);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
        
        return null;
    }
    
    /**
     * Filter classes theo học kỳ hiện tại
     * Best practice: 
     * - Ưu tiên hiển thị lớp học kỳ hiện tại
     * - Nếu không có lớp học kỳ hiện tại, hiển thị tất cả nhưng sort học kỳ hiện tại lên đầu
     * - Đánh dấu lớp học kỳ hiện tại để highlight trong UI
     * 
     * @param {Array} classes - Danh sách lớp cần filter
     * @param {Object} currentSemesterInfo - Thông tin học kỳ hiện tại (từ getCurrentSemesterInfo)
     * @param {Object} options - Options: {filterOnly: boolean, sortByCurrent: boolean}
     * @returns {Array} - Danh sách lớp đã filter và sort
     */
    this.filterClassesByCurrentSemester = function(classes, currentSemesterInfo, options) {
        if (!classes || !Array.isArray(classes) || classes.length === 0) {
            return [];
        }
        
        options = options || {};
        var filterOnly = options.filterOnly !== false; // Default: true - chỉ hiển thị học kỳ hiện tại
        var sortByCurrent = options.sortByCurrent !== false; // Default: true - sort học kỳ hiện tại lên đầu
        
        var currentSemester = normalizeSemester(currentSemesterInfo.semester);
        var currentSchoolYearId = currentSemesterInfo.schoolYearId;
        
        // Nếu không có thông tin học kỳ hiện tại, trả về tất cả
        if (!currentSemester || !currentSchoolYearId) {
            LoggerService.warn('[filterClassesByCurrentSemester] No current semester info, returning all classes', {
                currentSemester: currentSemester,
                currentSchoolYearId: currentSchoolYearId,
                semesterInfo: currentSemesterInfo
            });
            return classes.map(function(c) {
                return Object.assign({}, c, { isCurrentSemester: false });
            });
        }
        
        // Filter classes theo học kỳ hiện tại
        var filteredClasses = classes.filter(function(c) {
            var classSemester = normalizeSemester(c.semester);
            var classSchoolYearId = c.schoolYearId || c.academicYearId;
            
            var semesterMatch = classSemester === currentSemester;
            var schoolYearMatch = classSchoolYearId === currentSchoolYearId;
            var matches = semesterMatch && schoolYearMatch;
            
            // Match nếu semester và schoolYearId khớp
            return matches;
        });
        // Nếu filterOnly = true và có lớp học kỳ hiện tại, chỉ trả về những lớp đó
        if (filterOnly && filteredClasses.length > 0) {
            return filteredClasses.map(function(c) {
                return Object.assign({}, c, { isCurrentSemester: true });
            });
        }
        
        // Nếu filterOnly = false hoặc không có lớp học kỳ hiện tại, trả về tất cả nhưng sort
        var allClasses = classes.map(function(c) {
            var classSemester = normalizeSemester(c.semester);
            var classSchoolYearId = c.schoolYearId || c.academicYearId;
            var isCurrent = classSemester === currentSemester && 
                           (classSchoolYearId === currentSchoolYearId || 
                            classSchoolYearId === currentSchoolYearId);
            
            return Object.assign({}, c, { isCurrentSemester: isCurrent });
        });
        
        // Sort: học kỳ hiện tại lên đầu
        if (sortByCurrent) {
            allClasses.sort(function(a, b) {
                if (a.isCurrentSemester && !b.isCurrentSemester) return -1;
                if (!a.isCurrentSemester && b.isCurrentSemester) return 1;
                // Nếu cùng loại, sort theo semester (1, 2, 3)
                var aSem = normalizeSemester(a.semester) || 999;
                var bSem = normalizeSemester(b.semester) || 999;
                if (aSem !== bSem) {
                    return aSem - bSem;
                }
                // Nếu cùng semester, sort theo classCode
                return (a.classCode || '').localeCompare(b.classCode || '');
            });
        }
        
        return allClasses;
    };
    
    /**
     * Helper function để load và filter classes theo học kỳ hiện tại
     * @param {Function} loadClassesFn - Function để load classes (return Promise)
     * @param {Object} options - Options: {filterOnly: boolean, sortByCurrent: boolean, forceRefresh: boolean}
     * @returns {Promise<Array>} - Danh sách lớp đã filter
     */
    this.loadAndFilterClasses = function(loadClassesFn, options) {
        options = options || {};
        
        return this.getCurrentSemesterInfo(options.forceRefresh)
            .then(function(currentSemesterInfo) {
                return loadClassesFn()
                    .then(function(classes) {
                        return this.filterClassesByCurrentSemester(classes, currentSemesterInfo, options);
                    }.bind(this));
            }.bind(this));
    };
    
    /**
     * Clear cache (khi cần refresh)
     */
    this.clearCache = function() {
        currentSemesterCache = null;
        cacheExpiry = null;
    };
}]);

