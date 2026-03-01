using EducationManagement.BLL.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using EducationManagement.Common.Helpers;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/classes")]
    public class ClassController : BaseController
    {
        private readonly ClassService _classService;

        public ClassController(ClassService classService, AuditLogService auditLogService) 
            : base(auditLogService)
        {
            _classService = classService;
        }

        /// <summary>
        /// Lấy danh sách tất cả classes với pagination
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? subjectId = null,
            [FromQuery] string? lecturerId = null,
            [FromQuery] string? academicYearId = null)
        {
            try
            {
                var (items, totalCount) = await _classService.GetAllPagedAsync(
                    page, pageSize, search, subjectId, lecturerId, academicYearId);
                
                return Ok(new
                {
                    success = true,
                    data = items,
                    totalCount = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy class theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var classItem = await _classService.GetClassByIdAsync(id);
                if (classItem == null)
                    return NotFound(new { message = "Không tìm thấy lớp học" });

                return Ok(new { data = classItem });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Tạo class mới
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClassRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var classId = IdGenerator.Generate("class");
                var newId = await _classService.CreateClassAsync(
                    classId,
                    request.ClassCode,
                    request.ClassName,
                    request.SubjectId,
                    request.LecturerId,
                    request.Semester,
                    request.AcademicYearId,
                    request.MaxStudents,
                    request.CreatedBy ?? GetCurrentUserId() ?? "system"
                );

                // ✅ Audit log: Tạo lớp học mới
                await LogCreateAsync("Class", newId, new
                {
                    class_code = request.ClassCode,
                    class_name = request.ClassName,
                    subject_id = request.SubjectId,
                    lecturer_id = request.LecturerId,
                    semester = request.Semester,
                    max_students = request.MaxStudents,
                    action_description = $"Tạo lớp học mới: {request.ClassName} ({request.ClassCode})"
                });

                return Ok(new { message = "Tạo lớp học thành công", classId = newId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật class
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateClassRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin cũ trước khi update
                var oldClass = await _classService.GetClassByIdAsync(id);
                
                await _classService.UpdateClassAsync(
                    id,
                    request.ClassCode,
                    request.ClassName,
                    request.SubjectId,
                    request.LecturerId,
                    request.Semester,
                    request.AcademicYearId,
                    request.MaxStudents,
                    request.UpdatedBy ?? GetCurrentUserId() ?? "system"
                );

                // ✅ Audit log: Cập nhật lớp học
                await LogUpdateAsync("Class", id,
                    oldClass != null ? new
                    {
                        class_code = oldClass.ClassCode,
                        class_name = oldClass.ClassName,
                        max_students = oldClass.MaxStudents
                    } : null,
                    new
                    {
                        class_code = request.ClassCode,
                        class_name = request.ClassName,
                        max_students = request.MaxStudents,
                        action_description = $"Cập nhật lớp học: {request.ClassName} ({request.ClassCode})"
                    });

                return Ok(new { message = "Cập nhật lớp học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Xóa class (soft delete)
        /// </summary>
        [HttpPatch("{id}/activate")]
        [Authorize]
        public async Task<IActionResult> Activate(string id)
        {
            try
            {
                var updatedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _classService.ActivateClassAsync(id, updatedBy);
                return Ok(new { message = "Kích hoạt lớp học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPatch("{id}/deactivate")]
        [Authorize]
        public async Task<IActionResult> Deactivate(string id)
        {
            try
            {
                var updatedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _classService.DeactivateClassAsync(id, updatedBy);
                return Ok(new { message = "Vô hiệu hóa lớp học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                // Lấy thông tin lớp học trước khi xóa
                var classItem = await _classService.GetClassByIdAsync(id);
                
                await _classService.DeleteClassAsync(id, GetCurrentUserId() ?? "system");
                
                // ✅ Audit log: Xóa lớp học
                await LogDeleteAsync("Class", id, new
                {
                    class_code = classItem?.ClassCode,
                    class_name = classItem?.ClassName,
                    deleted_by = GetCurrentUserId() ?? "system",
                    action_description = $"Xóa lớp học: {classItem?.ClassName} ({classItem?.ClassCode})"
                });
                
                return Ok(new { message = "Xóa lớp học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy classes theo lecturer ID hoặc userId
        /// Tự động detect: nếu bắt đầu bằng "USR_" thì là userId, cần convert sang lecturerId
        /// </summary>
        [HttpGet("lecturer/{lecturerId}")]
        public async Task<IActionResult> GetByLecturer(string lecturerId)
        {
            try
            {
                string actualLecturerId = lecturerId;
                
                // Nếu là userId (bắt đầu bằng USR_), cần convert sang lecturerId
                if (lecturerId.StartsWith("USR_", StringComparison.OrdinalIgnoreCase))
                {
                    var lecturerService = HttpContext.RequestServices.GetRequiredService<LecturerService>();
                    var lecturer = await lecturerService.GetByUserIdAsync(lecturerId);
                    
                    if (lecturer == null)
                    {
                        return Ok(new { 
                            data = new List<object>(), 
                            message = "Không tìm thấy giảng viên với userId: " + lecturerId,
                            debug = new { inputId = lecturerId, isUserId = true, lecturerFound = false }
                        });
                    }
                    
                    actualLecturerId = lecturer.LecturerId;
                }
                
                var classes = await _classService.GetClassesByLecturerAsync(actualLecturerId);
                return Ok(new { 
                    data = classes,
                    debug = new { 
                        inputId = lecturerId, 
                        actualLecturerId = actualLecturerId,
                        classesCount = classes.Count 
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy classes theo student ID
        /// </summary>
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetByStudent(string studentId)
        {
            try
            {
                var classes = await _classService.GetClassesByStudentAsync(studentId);
                return Ok(new { data = classes });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }

    // DTOs for Class
    public class CreateClassRequest
    {
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string LecturerId { get; set; } = string.Empty;
        public string Semester { get; set; } = string.Empty;
        public string AcademicYearId { get; set; } = string.Empty;
        public int MaxStudents { get; set; } = 50;
        public string? CreatedBy { get; set; }
    }

    public class UpdateClassRequest
    {
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string LecturerId { get; set; } = string.Empty;
        public string Semester { get; set; } = string.Empty;
        public string AcademicYearId { get; set; } = string.Empty;
        public int MaxStudents { get; set; } = 50;
        public string? UpdatedBy { get; set; }
    }

    public class DeleteClassRequest
    {
        public string? DeletedBy { get; set; }
    }
}

