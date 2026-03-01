using Microsoft.AspNetCore.Mvc;
using EducationManagement.BLL.Services;
using EducationManagement.Common.Models;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/majors")]
    public class MajorController : BaseController
    {
        private readonly MajorService _service;

        public MajorController(MajorService service, AuditLogService auditLogService) : base(auditLogService)
        {
            _service = service;
        }

        [HttpGet]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null)
        {
            try
            {
                var (items, totalCount) = await _service.GetAllPagedAsync(page, pageSize, search);
                
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

        [HttpGet("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            var major = await _service.GetByIdAsync(id);
            if (major == null) return NotFound();
            return Ok(major);
        }

        [HttpGet("by-faculty/{facultyId}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> GetByFaculty(string facultyId)
        {
            var list = await _service.GetByFacultyAsync(facultyId);
            return Ok(list);
        }

        [HttpPost]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] Major model)
        {
            try
            {
                await _service.AddAsync(model);

                // ✅ Audit Log: Create Major
                await LogCreateAsync("Major", model.MajorId, new {
                    major_code = model.MajorCode,
                    major_name = model.MajorName,
                    faculty_id = model.FacultyId
                });

                return Ok(new { message = "Thêm ngành học thành công!" });
            }
            catch (ArgumentException ex)
            {
                // ✅ Format validation errors
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] Major model)
        {
            if (id != model.MajorId)
                return BadRequest(new { message = "ID không khớp!" });

            try
            {
                var oldMajor = await _service.GetByIdAsync(id);
                if (oldMajor == null)
                    return NotFound(new { message = "Không tìm thấy ngành học" });

                await _service.UpdateAsync(model);

                // ✅ Audit Log: Update Major
                await LogUpdateAsync("Major", model.MajorId,
                    new { major_name = oldMajor.MajorName, faculty_id = oldMajor.FacultyId },
                    new { major_name = model.MajorName, faculty_id = model.FacultyId });

                return Ok(new { message = "Cập nhật ngành học thành công!" });
            }
            catch (ArgumentException ex)
            {
                // ✅ Format validation errors
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) when (ex.Message.Contains("Khoa không tồn tại"))
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var major = await _service.GetByIdAsync(id);
                if (major == null)
                    return NotFound(new { message = "Không tìm thấy ngành học" });

                await _service.DeleteAsync(id);

                // ✅ Audit Log: Delete Major
                await LogDeleteAsync("Major", id, new {
                    major_code = major.MajorCode,
                    major_name = major.MajorName
                });

                return Ok(new { message = "Xóa ngành học thành công!" });
            }
            catch (InvalidOperationException ex)
            {
                // ✅ Trả về thông báo lỗi rõ ràng với số lượng records
                return BadRequest(new { 
                    message = ex.Message,
                    errorType = "CONSTRAINT_VIOLATION"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}
