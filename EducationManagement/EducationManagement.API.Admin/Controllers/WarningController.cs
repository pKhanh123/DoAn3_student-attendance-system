using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.Advisor;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    /// <summary>
    /// Controller for manual warning trigger and management
    /// </summary>
    [ApiController]
    [Route("api-edu/warnings")]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    public class WarningController : ControllerBase
    {
        private readonly AdvisorService _advisorService;

        public WarningController(AdvisorService advisorService)
        {
            _advisorService = advisorService;
        }

        /// <summary>
        /// Manual trigger: Check and send warnings for all students exceeding threshold
        /// </summary>
        [HttpPost("check-and-send")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> CheckAndSendWarnings(
            [FromQuery] decimal? threshold = null,
            [FromQuery] string? classId = null,
            [FromQuery] string? facultyId = null,
            [FromQuery] string? majorId = null)
        {
            try
            {
                // Get threshold from config if not provided
                var attendanceThreshold = threshold ?? 20.0m;

                // Create filters object
                var filters = new StudentFiltersDto
                {
                    FacultyId = facultyId,
                    MajorId = majorId,
                    ClassId = classId
                };

                // Get list of students exceeding threshold
                var (warnings, totalCount) = await _advisorService.GetAttendanceWarningsAsync(
                    page: 1,
                    pageSize: 1000, // Get all warnings
                    attendanceThreshold: attendanceThreshold,
                    filters: filters
                );

                if (warnings.Count == 0)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Không có sinh viên nào vượt ngưỡng cảnh báo",
                        sentCount = 0,
                        totalCount = 0
                    });
                }

                // Send emails
                int sentCount = 0;
                var errors = new System.Collections.Generic.List<string>();

                foreach (var warning in warnings)
                {
                    try
                    {
                        await _advisorService.SendWarningEmailAsync(
                            warning.StudentId,
                            "attendance",
                            null,
                            null
                        );
                        sentCount++;
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"{warning.StudentCode} ({warning.FullName}): {ex.Message}");
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = $"Đã gửi {sentCount}/{warnings.Count} cảnh báo",
                    sentCount,
                    totalCount = warnings.Count,
                    errors = errors.Any() ? errors : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi hệ thống",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get list of students exceeding threshold (without sending email)
        /// </summary>
        [HttpGet("list")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetWarningList(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] decimal? threshold = null,
            [FromQuery] string? classId = null,
            [FromQuery] string? facultyId = null,
            [FromQuery] string? majorId = null)
        {
            try
            {
                var attendanceThreshold = threshold ?? 20.0m;

                // Create filters object
                var filters = new StudentFiltersDto
                {
                    FacultyId = facultyId,
                    MajorId = majorId,
                    ClassId = classId
                };

                var (warnings, totalCount) = await _advisorService.GetAttendanceWarningsAsync(
                    page,
                    pageSize,
                    attendanceThreshold,
                    filters
                );

                return Ok(new
                {
                    success = true,
                    data = warnings,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi hệ thống",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Send warning to specific students
        /// </summary>
        [HttpPost("send-to-students")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> SendWarningsToStudents(
            [FromBody] SendWarningsRequest request)
        {
            if (request == null || request.StudentIds == null || request.StudentIds.Count == 0)
            {
                return BadRequest(new { success = false, message = "Danh sách sinh viên không được rỗng" });
            }

            try
            {
                await _advisorService.SendBulkWarningEmailAsync(
                    request.StudentIds,
                    request.WarningType ?? "attendance",
                    request.CustomSubject,
                    request.CustomMessage
                );

                return Ok(new
                {
                    success = true,
                    message = $"Đã gửi cảnh báo cho {request.StudentIds.Count} sinh viên"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi hệ thống",
                    error = ex.Message
                });
            }
        }
    }

    public class SendWarningsRequest
    {
        public System.Collections.Generic.List<string> StudentIds { get; set; } = new();
        public string? WarningType { get; set; } = "attendance"; // "attendance", "academic", "both"
        public string? CustomSubject { get; set; }
        public string? CustomMessage { get; set; }
    }
}

