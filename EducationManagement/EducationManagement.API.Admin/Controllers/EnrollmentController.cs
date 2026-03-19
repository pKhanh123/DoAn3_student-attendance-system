using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.Enrollment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/enrollments")]
    public class EnrollmentController : BaseController
    {
        private readonly EnrollmentService _service;

        public EnrollmentController(EnrollmentService service, AuditLogService auditLogService) 
            : base(auditLogService)
        {
            _service = service;
        }

        // ============================================================
        // 1️⃣ GET ALL
        // ============================================================
        [HttpGet]
        [RequireAnyPermission("ADMIN_ENROLLMENTS", "ADVISOR_ENROLLMENTS")] // ✅ Permission từ database (Admin hoặc Advisor)
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var enrollments = await _service.GetAllEnrollmentsAsync();
                return Ok(new
                {
                    success = true,
                    data = enrollments,
                    totalCount = enrollments.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 2️⃣ GET BY ID
        // ============================================================
        [HttpGet("{id}")]
        [RequireAnyPermission("ADMIN_ENROLLMENTS", "ADV_ENROLLMENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var enrollment = await _service.GetEnrollmentByIdAsync(id);
                if (enrollment == null)
                    return NotFound(new { success = false, message = "Không tìm thấy đăng ký học phần" });

                return Ok(new { success = true, data = enrollment });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 3️⃣ GET BY STUDENT
        // ============================================================
        [HttpGet("student/{studentId}")]
        [RequireAnyPermission("STUDENT_ENROLLMENT", "ADMIN_ENROLLMENTS", "ADVISOR_ENROLLMENTS")] // ✅ Cho phép student xem enrollments của mình
        public async Task<IActionResult> GetByStudent(string studentId)
        {
            try
            {
                var enrollments = await _service.GetEnrollmentsByStudentAsync(studentId);
                return Ok(new
                {
                    success = true,
                    data = enrollments,
                    totalCount = enrollments.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 4️⃣ GET BY CLASS
        // ============================================================
        [HttpGet("class/{classId}")]
        public async Task<IActionResult> GetByClass(string classId)
        {
            try
            {
                var enrollments = await _service.GetEnrollmentsByClassAsync(classId);
                return Ok(new
                {
                    success = true,
                    data = enrollments,
                    totalCount = enrollments.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 4️⃣.1 GET CLASS ROSTER (Students in class)
        // ============================================================
        [HttpGet("class/{classId}/roster")]
        [Authorize] // Cho phép giảng viên xem danh sách sinh viên trong lớp
        public async Task<IActionResult> GetClassRoster(string classId)
        {
            try
            {
                var students = await _service.GetClassRosterAsync(classId);
                return Ok(new
                {
                    success = true,
                    data = students,
                    totalCount = students.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 5️⃣ REGISTER (Student)
        // ============================================================
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterEnrollmentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                var enrollmentId = await _service.RegisterAsync(dto.StudentId, dto.ClassId, userId);

                // ✅ Audit log: Đăng ký học phần
                await LogCreateAsync("Enrollment", enrollmentId, new
                {
                    student_id = dto.StudentId,
                    class_id = dto.ClassId,
                    enrollment_status = "PENDING",
                    registered_by = userId,
                    action_description = $"Sinh viên đăng ký học phần: ClassId={dto.ClassId}"
                });

                return Ok(new
                {
                    success = true,
                    message = "Đăng ký học phần thành công",
                    enrollmentId
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 6️⃣ APPROVE (Admin & Advisor)
        // ============================================================
        [HttpPost("{id}/approve")]
        [RequireAnyPermission("ADMIN_ENROLLMENTS", "ADV_ENROLLMENTS")] // ✅ Permission từ database
        public async Task<IActionResult> Approve(string id)
        {
            try
            {
                // Lấy thông tin enrollment trước khi approve
                var enrollment = await _service.GetEnrollmentByIdAsync(id);
                var approvedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                
                await _service.ApproveAsync(id, approvedBy);

                // ✅ Audit log: Duyệt đăng ký học phần
                await LogApproveAsync("Enrollment", id, new
                {
                    enrollment_id = id,
                    student_id = enrollment?.StudentId,
                    class_id = enrollment?.ClassId,
                    approved_by = approvedBy,
                    action_description = $"Duyệt đăng ký học phần: EnrollmentId={id}"
                });

                return Ok(new { success = true, message = "Đã phê duyệt đăng ký thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 7️⃣ DROP ENROLLMENT (Student)
        // ============================================================
        [HttpPost("{id}/drop")]
        public async Task<IActionResult> Drop(string id, [FromBody] DropEnrollmentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin enrollment trước khi drop
                var enrollment = await _service.GetEnrollmentByIdAsync(id);
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                
                await _service.DropAsync(id, dto.Reason, userId);

                // ✅ Audit log: Hủy đăng ký học phần
                await LogUpdateAsync("Enrollment", id,
                    enrollment != null ? new
                    {
                        enrollment_status = enrollment.EnrollmentStatus,
                        class_id = enrollment.ClassId
                    } : null,
                    new
                    {
                        enrollment_status = "DROPPED",
                        drop_reason = dto.Reason,
                        dropped_by = userId,
                        action_description = $"Hủy đăng ký học phần: EnrollmentId={id}, Lý do: {dto.Reason}"
                    });

                return Ok(new { success = true, message = "Đã hủy đăng ký học phần thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 8️⃣ WITHDRAW (Admin Only)
        // ============================================================
        [HttpPost("{id}/withdraw")]
        [RequirePermission("ADMIN_ENROLLMENTS")] // ✅ Permission từ database
        public async Task<IActionResult> Withdraw(string id, [FromBody] WithdrawEnrollmentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin enrollment trước khi withdraw
                var enrollment = await _service.GetEnrollmentByIdAsync(id);
                var withdrawnBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                
                await _service.WithdrawAsync(id, dto.Reason, withdrawnBy);

                // ✅ Audit log: Rút học phần (Admin)
                await LogUpdateAsync("Enrollment", id,
                    enrollment != null ? new
                    {
                        enrollment_status = enrollment.EnrollmentStatus,
                        class_id = enrollment.ClassId
                    } : null,
                    new
                    {
                        enrollment_status = "WITHDRAWN",
                        withdraw_reason = dto.Reason,
                        withdrawn_by = withdrawnBy,
                        action_description = $"Admin rút học phần: EnrollmentId={id}, Lý do: {dto.Reason}"
                    });

                return Ok(new { success = true, message = "Đã rút học phần thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 9️⃣ GET ENROLLMENT SUMMARY (Student)
        // ============================================================
        [HttpGet("student/{studentId}/summary")]
        public async Task<IActionResult> GetSummary(
            string studentId,
            [FromQuery] int? semester = null,
            [FromQuery] string? academicYearId = null)
        {
            try
            {
                var summary = await _service.GetSummaryAsync(studentId, semester, academicYearId);
                return Ok(new { success = true, data = summary });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔟 GET AVAILABLE CLASSES (Student)
        // ============================================================
        [HttpGet("student/{studentId}/available-classes")]
        public async Task<IActionResult> GetAvailableClasses(
            string studentId,
            [FromQuery] int? semester = null,
            [FromQuery] string? academicYearId = null)
        {
            try
            {
                var classes = await _service.GetAvailableClassesAsync(studentId, semester, academicYearId);
                return Ok(new
                {
                    success = true,
                    data = classes,
                    totalCount = classes.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 1️⃣1️⃣ GET PENDING ENROLLMENTS (Admin & Advisor)
        // ============================================================
        [HttpGet("pending")]
        [RequireAnyPermission("ADMIN_ENROLLMENTS", "ADV_ENROLLMENTS")] // ✅ Permission từ database
        public async Task<IActionResult> GetPendingEnrollments(
            [FromQuery] string? studentId = null,
            [FromQuery] string? classId = null,
            [FromQuery] string? subjectId = null,
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var (enrollments, totalCount) = await _service.GetPendingEnrollmentsAsync(
                    studentId, classId, subjectId, schoolYearId, semester, page, pageSize);

                return Ok(new
                {
                    success = true,
                    data = enrollments,
                    page = page,
                    pageSize = pageSize,
                    totalCount = totalCount,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}
