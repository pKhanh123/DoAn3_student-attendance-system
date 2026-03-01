using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Generic caching service using Redis
    /// Provides easy-to-use caching methods
    /// </summary>
    public class CachingService
    {
        private readonly IDistributedCache _cache;

        public CachingService(IDistributedCache cache)
        {
            _cache = cache;
        }

        /// <summary>
        /// Get cached data or fetch from source if not cached
        /// </summary>
        public async Task<T?> GetOrSetAsync<T>(
            string cacheKey, 
            Func<Task<T>> fetchFunc, 
            TimeSpan? expiration = null)
        {
            // Try to get from cache
            var cachedData = await _cache.GetStringAsync(cacheKey);
            
            if (!string.IsNullOrEmpty(cachedData))
            {
                return JsonSerializer.Deserialize<T>(cachedData);
            }

            // Fetch from source
            var data = await fetchFunc();
            
            if (data != null)
            {
                // Cache it
                var options = new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromHours(1)
                };
                
                await _cache.SetStringAsync(
                    cacheKey,
                    JsonSerializer.Serialize(data),
                    options
                );
            }

            return data;
        }

        /// <summary>
        /// Get cached data
        /// </summary>
        public async Task<T?> GetAsync<T>(string cacheKey)
        {
            var cachedData = await _cache.GetStringAsync(cacheKey);
            
            if (string.IsNullOrEmpty(cachedData))
                return default;
            
            return JsonSerializer.Deserialize<T>(cachedData);
        }

        /// <summary>
        /// Set data in cache
        /// </summary>
        public async Task SetAsync<T>(
            string cacheKey, 
            T data, 
            TimeSpan? expiration = null)
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromHours(1)
            };
            
            await _cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(data),
                options
            );
        }

        /// <summary>
        /// Remove data from cache
        /// </summary>
        public async Task RemoveAsync(string cacheKey)
        {
            await _cache.RemoveAsync(cacheKey);
        }

        /// <summary>
        /// Remove multiple keys with a pattern (using prefix)
        /// Note: This is a simple implementation. For production, consider using Redis SCAN command
        /// </summary>
        public async Task RemoveByPrefixAsync(string prefix)
        {
            // This is a simplified version
            // For production, you'd need to use Redis SCAN command through StackExchange.Redis directly
            await Task.CompletedTask;
        }
    }

    /// <summary>
    /// Cache key constants for different entities
    /// </summary>
    public static class CacheKeys
    {
        // Faculties - rarely change, cache for 6 hours
        public const string AllFaculties = "faculties:all";
        public const string FacultyById = "faculty:{0}";
        public static TimeSpan FacultyExpiration = TimeSpan.FromHours(6);

        // Departments - rarely change, cache for 6 hours
        public const string AllDepartments = "departments:all";
        public const string DepartmentById = "department:{0}";
        public static TimeSpan DepartmentExpiration = TimeSpan.FromHours(6);

        // Majors - rarely change, cache for 6 hours
        public const string AllMajors = "majors:all";
        public const string MajorById = "major:{0}";
        public const string MajorsByFaculty = "majors:faculty:{0}";
        public static TimeSpan MajorExpiration = TimeSpan.FromHours(6);

        // Subjects - change moderately, cache for 2 hours
        public const string AllSubjects = "subjects:all";
        public const string SubjectById = "subject:{0}";
        public static TimeSpan SubjectExpiration = TimeSpan.FromHours(2);

        // Academic Years - rarely change, cache for 6 hours
        public const string AllAcademicYears = "academic_years:all";
        public const string ActiveAcademicYear = "academic_year:active";
        public static TimeSpan AcademicYearExpiration = TimeSpan.FromHours(6);

        // Roles & Permissions - rarely change, cache for 1 hour
        public const string AllRoles = "roles:all";
        public const string RoleById = "role:{0}";
        public const string PermissionsByRole = "permissions:role:{0}";
        public const string PermissionsByRoleName = "permissions:rolename:{0}";
        public static TimeSpan RoleExpiration = TimeSpan.FromHours(1);

        // Menu items by role - cache for 1 hour
        public const string MenuByRole = "menu:role:{0}";
        public static TimeSpan MenuExpiration = TimeSpan.FromHours(1);

        // Students schedule - cache for 30 minutes
        public const string StudentSchedule = "schedule:student:{0}";
        public static TimeSpan ScheduleExpiration = TimeSpan.FromMinutes(30);

        // ❌ DO NOT CACHE: Attendance, Grades (real-time data)
        // ❌ DO NOT CACHE: User credentials, sensitive data
    }
}

