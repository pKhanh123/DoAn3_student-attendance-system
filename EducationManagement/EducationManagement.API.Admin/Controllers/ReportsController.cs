using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.Report;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly ReportService _reportService;
        private readonly StudentService _studentService;

        public ReportsController(ReportService reportService, StudentService studentService)
        {
            _reportService = reportService;
            _studentService = studentService;
        }

        /// <summary>
        /// Get admin reports
        /// GET /api-edu/reports/admin
        /// Cho phép cả Admin và Advisor truy cập
        /// </summary>
        [HttpGet("admin")]
        [RequireAnyPermission("ADMIN_REPORTS", "ADVISOR_DASHBOARD", "ADVISOR_REPORTS")] // ✅ Cho phép cả Admin và Advisor
        public async Task<IActionResult> GetAdminReports(
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] string? facultyId = null,
            [FromQuery] string? majorId = null)
        {
            try
            {
                var report = await _reportService.GetAdminReportAsync(schoolYearId, semester, facultyId, majorId);
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get advisor reports
        /// GET /api-edu/reports/advisor
        /// </summary>
        [HttpGet("advisor")]
        [RequireAnyPermission("ADVISOR_DASHBOARD", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetAdvisorReports(
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] string? facultyId = null,
            [FromQuery] string? majorId = null,
            [FromQuery] string? classId = null,
            [FromQuery] int? cohortYear = null)
        {
            try
            {
                var report = await _reportService.GetAdvisorReportAsync(schoolYearId, semester, facultyId, majorId, classId, cohortYear);
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get lecturer reports
        /// GET /api-edu/reports/lecturer
        /// </summary>
        [HttpGet("lecturer")]
        [RequireAnyPermission("TCH_CLASSES", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetLecturerReports(
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] string? classId = null)
        {
            try
            {
                var report = await _reportService.GetLecturerReportAsync(schoolYearId, semester, classId);
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student reports
        /// GET /api-edu/reports/student
        /// </summary>
        [HttpGet("student")]
        [RequireAnyPermission("STUDENT_REPORTS", "ADMIN_REPORTS")] // ✅ STUDENT_REPORTS (executable) thay vì STUDENT_SECTION_STUDY (menu-only)
        public async Task<IActionResult> GetStudentReports(
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null)
        {
            try
            {
                // Get student ID from claims
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                
                // Debug log
                Console.WriteLine($"[DEBUG ReportsController] UserId from NameIdentifier claim: {userId}");
                Console.WriteLine($"[DEBUG ReportsController] SchoolYearId: {schoolYearId}");
                Console.WriteLine($"[DEBUG ReportsController] Semester: {semester}");
                
                // Log all claims for debugging
                var allClaims = User.Claims.Select(c => $"{c.Type}={c.Value}").ToList();
                Console.WriteLine($"[DEBUG ReportsController] All claims: {string.Join(", ", allClaims)}");
                
                if (string.IsNullOrEmpty(userId))
                {
                    Console.WriteLine("[ERROR ReportsController] UserId is null or empty");
                    return Unauthorized(new { success = false, message = "Không tìm thấy thông tin sinh viên" });
                }

                // Map userId to student_id
                // userId from claims is actually user_id, need to find student_id from students table
                var student = await _studentService.GetStudentByUserIdAsync(userId);
                if (student == null)
                {
                    Console.WriteLine($"[ERROR ReportsController] Cannot find student with userId: {userId}");
                    return Unauthorized(new { success = false, message = "Không tìm thấy thông tin sinh viên" });
                }

                var studentId = student.StudentId;
                Console.WriteLine($"[DEBUG ReportsController] Mapped userId '{userId}' to studentId '{studentId}'");
                Console.WriteLine($"[DEBUG ReportsController] Student code: {student.StudentCode}, Name: {student.FullName}");
                
                var report = await _reportService.GetStudentReportAsync(studentId, schoolYearId, semester);
                
                Console.WriteLine($"[DEBUG ReportsController] Report generated - Overview.CumulativeGpa: {report.Overview?.CumulativeGpa}");
                Console.WriteLine($"[DEBUG ReportsController] Report generated - Overview.CreditsEarned: {report.Overview?.CreditsEarned}");
                Console.WriteLine($"[DEBUG ReportsController] Report generated - Overview.TotalSubjects: {report.Overview?.TotalSubjects}");
                
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR ReportsController] Exception: {ex.Message}");
                Console.WriteLine($"[ERROR ReportsController] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}
