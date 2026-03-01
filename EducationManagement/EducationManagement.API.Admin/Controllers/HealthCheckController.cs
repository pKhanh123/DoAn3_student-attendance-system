using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Diagnostics;

namespace EducationManagement.API.Admin.Controllers
{
    /// <summary>
    /// Health Check endpoint để kiểm tra trạng thái hệ thống
    /// </summary>
    [ApiController]
    [AllowAnonymous] // ✅ Public endpoint cho monitoring
    [Route("api-edu/health")]
    public class HealthCheckController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly string _connectionString;

        public HealthCheckController(IConfiguration configuration)
        {
            _configuration = configuration;
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? "";
        }

        /// <summary>
        /// Kiểm tra trạng thái cơ bản
        /// </summary>
        [HttpGet]
        public IActionResult GetHealth()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                service = "Education Management API",
                version = "1.0.0"
            });
        }

        /// <summary>
        /// Kiểm tra trạng thái chi tiết (database, memory, etc.)
        /// </summary>
        [HttpGet("detailed")]
        public async Task<IActionResult> GetDetailedHealth()
        {
            var health = new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                service = "Education Management API",
                version = "1.0.0",
                checks = new Dictionary<string, object>()
            };

            // 1. Database check
            var dbHealth = await CheckDatabaseAsync();
            health.checks["database"] = dbHealth;

            // 2. Memory check
            var memoryHealth = CheckMemory();
            health.checks["memory"] = memoryHealth;

            // 3. Disk space check
            var diskHealth = CheckDiskSpace();
            health.checks["disk"] = diskHealth;

            // Determine overall status
            var allHealthy = health.checks.Values
                .All(check => check is Dictionary<string, object> dict && 
                             dict.ContainsKey("status") && 
                             dict["status"]?.ToString() == "healthy");

            var response = new
            {
                status = allHealthy ? "healthy" : "unhealthy",
                health.timestamp,
                health.service,
                health.version,
                health.checks
            };

            return allHealthy ? Ok(response) : StatusCode(503, response);
        }

        private async Task<Dictionary<string, object>> CheckDatabaseAsync()
        {
            try
            {
                var stopwatch = Stopwatch.StartNew();
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();
                
                using var command = new SqlCommand("SELECT 1", connection);
                await command.ExecuteScalarAsync();
                
                stopwatch.Stop();

                return new Dictionary<string, object>
                {
                    { "status", "healthy" },
                    { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" },
                    { "database", connection.Database }
                };
            }
            catch (Exception ex)
            {
                return new Dictionary<string, object>
                {
                    { "status", "unhealthy" },
                    { "error", ex.Message }
                };
            }
        }

        private Dictionary<string, object> CheckMemory()
        {
            try
            {
                var process = Process.GetCurrentProcess();
                var memoryMB = process.WorkingSet64 / 1024 / 1024;

                return new Dictionary<string, object>
                {
                    { "status", memoryMB < 500 ? "healthy" : "warning" },
                    { "workingSet", $"{memoryMB} MB" },
                    { "privateMemory", $"{process.PrivateMemorySize64 / 1024 / 1024} MB" }
                };
            }
            catch (Exception ex)
            {
                return new Dictionary<string, object>
                {
                    { "status", "unhealthy" },
                    { "error", ex.Message }
                };
            }
        }

        private Dictionary<string, object> CheckDiskSpace()
        {
            try
            {
                var drive = new DriveInfo(Path.GetPathRoot(AppDomain.CurrentDomain.BaseDirectory) ?? "C:\\");
                var freeSpaceGB = drive.AvailableFreeSpace / 1024 / 1024 / 1024;
                var totalSpaceGB = drive.TotalSize / 1024 / 1024 / 1024;
                var usedPercentage = ((totalSpaceGB - freeSpaceGB) / totalSpaceGB) * 100;

                return new Dictionary<string, object>
                {
                    { "status", usedPercentage < 90 ? "healthy" : "warning" },
                    { "freeSpace", $"{freeSpaceGB} GB" },
                    { "totalSpace", $"{totalSpaceGB} GB" },
                    { "usedPercentage", $"{usedPercentage:F1}%" }
                };
            }
            catch (Exception ex)
            {
                return new Dictionary<string, object>
                {
                    { "status", "unhealthy" },
                    { "error", ex.Message }
                };
            }
        }

        /// <summary>
        /// Ping endpoint đơn giản
        /// </summary>
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new { message = "pong", timestamp = DateTime.UtcNow });
        }
    }
}

