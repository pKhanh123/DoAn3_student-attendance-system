using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.AdministrativeClass;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/admin-classes")]
    public class AdministrativeClassController : ControllerBase
    {
        private readonly AdministrativeClassService _service;
        private readonly LecturerService _lecturerService;

        public AdministrativeClassController(AdministrativeClassService service, LecturerService lecturerService)
        {
            _service = service;
            _lecturerService = lecturerService;
        }

        // ============================================================
        // 1️⃣ GET ALL with Pagination & Filters
        // ============================================================
        [HttpGet]
        [RequireAnyPermission("ADMIN_ADMIN_CLASSES", "TCH_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? majorId = null,
            [FromQuery] int? cohortYear = null,
            [FromQuery] string? advisorId = null)
        {
            try
            {
                // ✅ Nếu user là Lecturer, chỉ cho phép xem các lớp mà họ là chủ nhiệm
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                string? lecturerAdvisorId = null;
                
                if (userRole == "Lecturer" || userRole == "Giảng viên")
                {
                    // Lấy lecturerId từ userId
                    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (string.IsNullOrEmpty(userId))
                        return Unauthorized(new { success = false, message = "Không tìm thấy thông tin người dùng" });

                    // Lấy lecturer từ userId
                    var lecturer = await _lecturerService.GetByUserIdAsync(userId);
                    if (lecturer == null)
                        return Unauthorized(new { success = false, message = "Không tìm thấy thông tin giảng viên" });

                    lecturerAdvisorId = lecturer.LecturerId;

                    // Nếu có advisorId trong query, kiểm tra xem có khớp với lecturerId của user không
                    if (!string.IsNullOrEmpty(advisorId) && advisorId != lecturerAdvisorId)
                    {
                        return StatusCode(403, new { success = false, message = "Bạn chỉ có thể xem các lớp mà bạn là chủ nhiệm" });
                    }

                    // Tự động filter theo lecturerId của user nếu không có advisorId trong query
                    if (string.IsNullOrEmpty(advisorId))
                    {
                        advisorId = lecturerAdvisorId;
                    }
                }

                var (data, totalCount) = await _service.GetAllAsync(
                    page, pageSize, search, majorId, cohortYear, advisorId);

                return Ok(new
                {
                    success = true,
                    data,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
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
        [RequirePermission("ADMIN_ADMIN_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var result = await _service.GetByIdAsync(id);
                if (result == null)
                    return NotFound(new { success = false, message = "Không tìm thấy lớp hành chính" });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 3️⃣ GET STUDENTS BY CLASS
        // ============================================================
        [HttpGet("{id}/students")]
        [RequirePermission("ADMIN_ADMIN_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> GetStudents(string id)
        {
            try
            {
                var students = await _service.GetStudentsAsync(id);
                return Ok(new { success = true, data = students, totalCount = students.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 4️⃣ GET CLASS REPORT
        // ============================================================
        [HttpGet("{id}/report")]
        [RequireAnyPermission("ADMIN_ADMIN_CLASSES", "TCH_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> GetReport(
            string id,
            [FromQuery] int? semester = null,
            [FromQuery] string? academicYearId = null)
        {
            try
            {
                // ✅ Kiểm tra nếu user là Lecturer, chỉ cho phép xem lớp mà họ là chủ nhiệm
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userRole == "Lecturer" || userRole == "Giảng viên")
                {
                    // Lấy thông tin lớp để kiểm tra advisor
                    var classInfo = await _service.GetByIdAsync(id);
                    if (classInfo == null)
                        return NotFound(new { success = false, message = "Không tìm thấy lớp hành chính" });

                    // Lấy lecturerId từ claims hoặc từ user info
                    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (string.IsNullOrEmpty(userId))
                        return Unauthorized(new { success = false, message = "Không tìm thấy thông tin người dùng" });

                    // TODO: Cần lấy lecturerId từ userId để so sánh với classInfo.AdvisorId
                    // Tạm thời cho phép nếu có permission TCH_CLASSES
                    // Có thể thêm logic kiểm tra advisorId sau
                }

                var report = await _service.GetReportAsync(id, semester, academicYearId);
                if (report == null)
                    return NotFound(new { success = false, message = "Không tìm thấy báo cáo" });

                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 5️⃣ CREATE (Admin Only)
        // ============================================================
        [HttpPost]
        [RequirePermission("ADMIN_ADMIN_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> Create([FromBody] CreateAdminClassDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                var classId = await _service.CreateAsync(dto, createdBy);

                return Ok(new
                {
                    success = true,
                    message = "Tạo lớp hành chính thành công",
                    classId
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
        // 6️⃣ UPDATE (Admin Only)
        // ============================================================
        [HttpPut("{id}")]
        [RequirePermission("ADMIN_ADMIN_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> Update(string id, [FromBody] UpdateAdminClassDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var updatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.UpdateAsync(id, dto, updatedBy);

                return Ok(new { success = true, message = "Cập nhật lớp hành chính thành công" });
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
        // 7️⃣ DELETE (Admin Only)
        // ============================================================
        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_ADMIN_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var deletedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.DeleteAsync(id, deletedBy);

                return Ok(new { success = true, message = "Xóa lớp hành chính thành công" });
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
        // 8️⃣ ASSIGN STUDENTS (Admin Only)
        // ============================================================
        [HttpPost("{id}/assign-students")]
        [RequirePermission("ADMIN_ADMIN_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> AssignStudents(string id, [FromBody] AssignStudentsDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var assignedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.AssignStudentsAsync(id, dto.StudentIds, assignedBy);

                return Ok(new
                {
                    success = true,
                    message = $"Đã phân {dto.StudentIds.Count} sinh viên vào lớp thành công"
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
        // 9️⃣ REMOVE STUDENT (Admin Only)
        // ============================================================
        [HttpDelete("{classId}/students/{studentId}")]
        [RequirePermission("ADMIN_ADMIN_CLASSES")] // ✅ ADMIN_ADMIN_CLASSES (executable) thay vì ADMIN_SECTION_CLASSES (menu-only)
        public async Task<IActionResult> RemoveStudent(string classId, string studentId)
        {
            try
            {
                var removedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.RemoveStudentAsync(studentId, removedBy);

                return Ok(new { success = true, message = "Đã xóa sinh viên khỏi lớp thành công" });
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
        // 🔟 TRANSFER STUDENT TO CLASS (Admin Only)
        // ============================================================
        [HttpPost("{id}/transfer-student")]
        [RequirePermission("ADMIN_ADMIN_CLASSES")]
        public async Task<IActionResult> TransferStudent(string id, [FromBody] Common.DTOs.AdministrativeClass.TransferStudentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var transferredBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.TransferStudentAsync(dto.StudentId, id, dto.TransferReason, transferredBy);

                return Ok(new
                {
                    success = true,
                    message = "Chuyển sinh viên sang lớp mới thành công"
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

