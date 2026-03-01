using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.Advisor;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/advisor")]
    public class AdvisorController : BaseController
    {
        private readonly AdvisorService _advisorService;

        public AdvisorController(AdvisorService advisorService, AuditLogService auditLogService) 
            : base(auditLogService)
        {
            _advisorService = advisorService;
        }

        /// <summary>
        /// Get dashboard statistics for advisor
        /// Advisor (Cố vấn phòng đào tạo) quản lý CHUNG TOÀN BỘ sinh viên của trường.
        /// Không filter theo advisor_id, chỉ filter theo Faculty, Major, Class (optional).
        /// Nếu không có filter, trả về thống kê toàn trường.
        /// GET /api-edu/advisor/dashboard/stats
        /// </summary>
        [HttpGet("dashboard/stats")]
        [RequireAnyPermission("ADVISOR_DASHBOARD", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetDashboardStats([FromQuery] StudentFiltersDto? filters)
        {
            try
            {
                var stats = await _advisorService.GetDashboardStatsAsync(filters);
                return Ok(new { data = stats });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get warning students (students with attendance or academic issues)
        /// Advisor có thể xem cảnh báo của TOÀN BỘ sinh viên (không filter theo advisor_id).
        /// Filter theo Faculty, Major, Class là optional để xem chi tiết.
        /// GET /api-edu/advisor/dashboard/warning-students
        /// </summary>
        [HttpGet("dashboard/warning-students")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetWarningStudents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] StudentFiltersDto? filters = null)
        {
            try
            {
                var (students, totalCount) = await _advisorService.GetWarningStudentsAsync(
                    page, pageSize, filters);

                return Ok(new
                {
                    data = students,
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
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student detail with academic summary
        /// GET /api-edu/advisor/students/{studentId}
        /// </summary>
        [HttpGet("students/{studentId}")]
        [RequireAnyPermission("ADVISOR_STUDENTS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetStudentDetail(string studentId)
        {
            try
            {
                var student = await _advisorService.GetStudentDetailAsync(studentId);
                if (student == null)
                {
                    return NotFound(new { message = "Không tìm thấy sinh viên" });
                }
                return Ok(new { data = student });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student grades with filters (mandatory filter validation)
        /// GET /api-edu/advisor/students/{studentId}/grades
        /// </summary>
        [HttpGet("students/{studentId}/grades")]
        [RequireAnyPermission("ADVISOR_STUDENTS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetStudentGrades(
            string studentId,
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] string? subjectId = null)
        {
            try
            {
                var (grades, summary) = await _advisorService.GetStudentGradesAsync(
                    studentId, schoolYearId, semester, subjectId);

                return Ok(new
                {
                    data = grades,
                    summary = summary
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student attendance with filters (mandatory filter validation)
        /// GET /api-edu/advisor/students/{studentId}/attendance
        /// </summary>
        [HttpGet("students/{studentId}/attendance")]
        [RequireAnyPermission("ADVISOR_STUDENTS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetStudentAttendance(
            string studentId,
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] string? subjectId = null)
        {
            try
            {
                var response = await _advisorService.GetStudentAttendanceAsync(
                    studentId, schoolYearId, semester, subjectId);

                return Ok(new { data = response });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get students list with filters (mandatory filter validation for performance)
        /// Advisor có thể xem TOÀN BỘ sinh viên, nhưng cần ít nhất 1 filter để tránh load quá nhiều data.
        /// Filter có thể là: Faculty, Major, Class, Cohort Year, Search, Warning Status, GPA range, Attendance rate.
        /// GET /api-edu/advisor/students
        /// </summary>
        [HttpGet("students")]
        [RequireAnyPermission("ADVISOR_STUDENTS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetStudents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] StudentFiltersDto? filters = null,
            [FromQuery] bool showAll = false)
        {
            try
            {
                // Set ShowAll flag if provided as separate query parameter
                if (showAll && filters != null)
                {
                    filters.ShowAll = true;
                }
                else if (showAll && filters == null)
                {
                    filters = new StudentFiltersDto { ShowAll = true };
                }
                
                var (students, totalCount) = await _advisorService.GetStudentsAsync(page, pageSize, filters);

                return Ok(new
                {
                    data = students,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student GPA progress
        /// GET /api-edu/advisor/students/{studentId}/progress/gpa
        /// </summary>
        [HttpGet("students/{studentId}/progress/gpa")]
        [RequireAnyPermission("ADVISOR_STUDENTS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetStudentGpaProgress(
            string studentId,
            [FromQuery] string? schoolYearId = null)
        {
            try
            {
                var progress = await _advisorService.GetStudentGpaProgressAsync(studentId, schoolYearId);
                if (progress == null)
                {
                    return NotFound(new { message = "Không tìm thấy sinh viên" });
                }
                return Ok(new { data = progress });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student attendance progress
        /// GET /api-edu/advisor/students/{studentId}/progress/attendance
        /// </summary>
        [HttpGet("students/{studentId}/progress/attendance")]
        [RequireAnyPermission("ADVISOR_STUDENTS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetStudentAttendanceProgress(
            string studentId,
            [FromQuery] string? schoolYearId = null)
        {
            try
            {
                var progress = await _advisorService.GetStudentAttendanceProgressAsync(studentId, schoolYearId);
                if (progress == null)
                {
                    return NotFound(new { message = "Không tìm thấy sinh viên" });
                }
                return Ok(new { data = progress });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student trends and alerts
        /// GET /api-edu/advisor/students/{studentId}/progress/trends
        /// </summary>
        [HttpGet("students/{studentId}/progress/trends")]
        [RequireAnyPermission("ADVISOR_STUDENTS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetStudentTrends(string studentId)
        {
            try
            {
                var trends = await _advisorService.GetStudentTrendsAsync(studentId);
                if (trends == null)
                {
                    return NotFound(new { message = "Không tìm thấy sinh viên" });
                }
                return Ok(new { data = trends });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get attendance warnings
        /// GET /api-edu/advisor/warnings/attendance
        /// </summary>
        [HttpGet("warnings/attendance")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetAttendanceWarnings(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] decimal? attendanceThreshold = null,
            [FromQuery] StudentFiltersDto? filters = null)
        {
            try
            {
                var (warnings, totalCount) = await _advisorService.GetAttendanceWarningsAsync(page, pageSize, attendanceThreshold, filters);

                return Ok(new
                {
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
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get academic warnings
        /// GET /api-edu/advisor/warnings/academic
        /// </summary>
        [HttpGet("warnings/academic")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetAcademicWarnings(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] decimal? gpaThreshold = null,
            [FromQuery] StudentFiltersDto? filters = null)
        {
            try
            {
                var (warnings, totalCount) = await _advisorService.GetAcademicWarningsAsync(page, pageSize, gpaThreshold, filters);

                return Ok(new
                {
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
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Send warning email
        /// POST /api-edu/advisor/warnings/send-email
        /// </summary>
        [HttpPost("warnings/send-email")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> SendWarningEmail([FromBody] SendWarningEmailDto request)
        {
            try
            {
                if (request.StudentIds == null || request.StudentIds.Count == 0)
                {
                    return BadRequest(new { message = "Danh sách sinh viên không được để trống" });
                }

                if (string.IsNullOrEmpty(request.WarningType))
                {
                    return BadRequest(new { message = "Loại cảnh báo không được để trống" });
                }

                if (request.StudentIds.Count == 1)
                {
                    await _advisorService.SendWarningEmailAsync(
                        request.StudentIds[0], 
                        request.WarningType, 
                        request.CustomSubject, 
                        request.CustomMessage);
                    return Ok(new { message = "Email đã được gửi thành công" });
                }
                else
                {
                    await _advisorService.SendBulkWarningEmailAsync(
                        request.StudentIds, 
                        request.WarningType, 
                        request.CustomSubject, 
                        request.CustomMessage);
                    return Ok(new { message = $"Đã gửi email cho {request.StudentIds.Count} sinh viên" });
                }
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi gửi email", error = ex.Message });
            }
        }

        /// <summary>
        /// Get warning configuration
        /// GET /api-edu/advisor/warning-config
        /// </summary>
        [HttpGet("warning-config")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetWarningConfig()
        {
            try
            {
                var config = await _advisorService.GetWarningConfigAsync();
                return Ok(new { data = config });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Update warning configuration
        /// PUT /api-edu/advisor/warning-config
        /// </summary>
        [HttpPut("warning-config")]
        [RequireAnyPermission("ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> UpdateWarningConfig([FromBody] WarningConfigDto config)
        {
            try
            {
                // Get current user ID from claims
                var userId = User?.FindFirst("userId")?.Value ?? User?.FindFirst("sub")?.Value;
                await _advisorService.UpdateWarningConfigAsync(config, userId);
                return Ok(new { message = "Cấu hình đã được cập nhật thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}

