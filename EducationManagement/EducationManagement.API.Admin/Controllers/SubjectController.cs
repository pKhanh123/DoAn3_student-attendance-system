using Microsoft.AspNetCore.Mvc;
using EducationManagement.BLL.Services;
using EducationManagement.Common.Models;
using Microsoft.AspNetCore.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api-edu/subjects")]
    public class SubjectController : BaseController
    {
        private readonly SubjectService _service;

        public SubjectController(SubjectService service, AuditLogService auditLogService) 
            : base(auditLogService)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? departmentId = null)
        {
            try
            {
                var (items, totalCount) = await _service.GetAllPagedAsync(page, pageSize, search, departmentId);
                
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
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // 🔹 Aggregate endpoint: Subjects with lecturer count
        [HttpGet("with-lecturer-count")]
        public async Task<IActionResult> GetAllWithLecturerCount()
        {
            try
            {
                var list = await _service.GetAllWithLecturerCountAsync();
                return Ok(new { success = true, data = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var subject = await _service.GetByIdAsync(id);
                if (subject == null) 
                    return NotFound(new { success = false, message = "Không tìm thấy môn học" });
                return Ok(new { success = true, data = subject });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("by-department/{depId}")]
        public async Task<IActionResult> GetByDepartment(string depId)
        {
            try
            {
                var list = await _service.GetByDepartmentAsync(depId);
                return Ok(new { success = true, data = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Subject model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ", errors = ModelState });

            try
            {
                await _service.AddAsync(model);
                
                // ✅ Audit log: Tạo môn học mới
                await LogCreateAsync("Subject", model.SubjectId, new
                {
                    subject_code = model.SubjectCode,
                    subject_name = model.SubjectName,
                    credits = model.Credits,
                    department_id = model.DepartmentId,
                    action_description = $"Thêm môn học mới: {model.SubjectName} ({model.SubjectCode})"
                });
                
                return Ok(new { success = true, message = "Thêm môn học thành công", data = model });
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

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] Subject model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ", errors = ModelState });

            try
            {
                if (id != model.SubjectId)
                    return BadRequest(new { success = false, message = "ID không khớp" });

                // Lấy thông tin cũ trước khi update
                var oldSubject = await _service.GetByIdAsync(id);
                
                await _service.UpdateAsync(model);
                
                // ✅ Audit log: Cập nhật môn học
                await LogUpdateAsync("Subject", id,
                    oldSubject != null ? new
                    {
                        subject_name = oldSubject.SubjectName,
                        credits = oldSubject.Credits,
                        department_id = oldSubject.DepartmentId
                    } : null,
                    new
                    {
                        subject_name = model.SubjectName,
                        credits = model.Credits,
                        department_id = model.DepartmentId,
                        action_description = $"Cập nhật môn học: {model.SubjectName} ({model.SubjectCode})"
                    });
                
                return Ok(new { success = true, message = "Cập nhật môn học thành công" });
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                // Lấy thông tin môn học trước khi xóa
                var subject = await _service.GetByIdAsync(id);
                
                await _service.DeleteAsync(id);
                
                // ✅ Audit log: Xóa môn học
                await LogDeleteAsync("Subject", id, new
                {
                    subject_code = subject?.SubjectCode,
                    subject_name = subject?.SubjectName,
                    action_description = $"Xóa môn học: {subject?.SubjectName} ({subject?.SubjectCode})"
                });
                
                return Ok(new { success = true, message = "Xóa môn học thành công" });
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
