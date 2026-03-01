using Microsoft.AspNetCore.Mvc;
using EducationManagement.BLL.Services;
using EducationManagement.Common.Models;
using EducationManagement.Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/faculties")]
    public class FacultyController : BaseController
    {
        private readonly FacultyService _service;

        public FacultyController(FacultyService service, AuditLogService auditLogService) : base(auditLogService)
        {
            _service = service;
        }

        [HttpGet]
        [RequireAnyPermission("ADMIN_ORGANIZATION", "ADVISOR_DASHBOARD", "ADVISOR_REPORTS")] // ✅ Cho phép cả Admin và Advisor đọc
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
        [RequireAnyPermission("ADMIN_ORGANIZATION", "ADVISOR_DASHBOARD", "ADVISOR_REPORTS")] // ✅ Cho phép cả Admin và Advisor đọc
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null)
                return NotFound();
            return Ok(item);
        }

        [HttpPost]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] Faculty f)
        {
            try
            {
                // Validate required fields
                if (string.IsNullOrWhiteSpace(f.FacultyCode))
                {
                    return BadRequest(new { message = "Mã khoa không được để trống." });
                }
                if (string.IsNullOrWhiteSpace(f.FacultyName))
                {
                    return BadRequest(new { message = "Tên khoa không được để trống." });
                }
                
                // Generate ID
                f.FacultyId = IdGenerator.Generate("fac");
                f.CreatedAt = DateTime.Now;
                await _service.AddAsync(f);

                // ✅ Audit Log: Create Faculty
                await LogCreateAsync("Faculty", f.FacultyId, new {
                    faculty_code = f.FacultyCode,
                    faculty_name = f.FacultyName,
                    description = f.Description
                });

                return Ok(new { message = "Tạo khoa thành công!" });
            }
            catch (ArgumentException ex)
            {
                // ✅ Format validation errors
                return BadRequest(new { message = ex.Message });
            }
            catch (Microsoft.Data.SqlClient.SqlException ex)
            {
                // Check for unique constraint violation (error number 2627 or 2601)
                if (ex.Number == 2627 || ex.Number == 2601)
                {
                    if (ex.Message.Contains("faculty_code"))
                    {
                        return BadRequest(new { message = "Mã khoa đã tồn tại. Vui lòng sử dụng mã khác." });
                    }
                    else if (ex.Message.Contains("faculty_name"))
                    {
                        return BadRequest(new { message = "Tên khoa đã tồn tại. Vui lòng sử dụng tên khác." });
                    }
                    return BadRequest(new { message = "Khoa đã tồn tại trong hệ thống." });
                }
                return StatusCode(500, new { message = "Lỗi khi tạo khoa: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi không xác định: " + ex.Message });
            }
        }

        [HttpPut("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] Faculty f)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new { message = "ID không hợp lệ." });
            }
            
            if (string.IsNullOrWhiteSpace(f.FacultyCode))
            {
                return BadRequest(new { message = "Mã khoa không được để trống." });
            }
            if (string.IsNullOrWhiteSpace(f.FacultyName))
            {
                return BadRequest(new { message = "Tên khoa không được để trống." });
            }
            
            // Ensure FacultyId matches the route parameter
            f.FacultyId = id;

            try
            {
                var oldFaculty = await _service.GetByIdAsync(id);
                if (oldFaculty == null)
                {
                    return NotFound(new { message = "Không tìm thấy khoa." });
                }

                f.UpdatedAt = DateTime.Now;
                await _service.UpdateAsync(f);

                // ✅ Audit Log: Update Faculty
                await LogUpdateAsync("Faculty", f.FacultyId, 
                    new { faculty_name = oldFaculty.FacultyName, description = oldFaculty.Description },
                    new { faculty_name = f.FacultyName, description = f.Description });

                return Ok(new { message = "Cập nhật khoa thành công!" });
            }
            catch (ArgumentException ex)
            {
                // ✅ Format validation errors
                return BadRequest(new { message = ex.Message });
            }
            catch (Microsoft.Data.SqlClient.SqlException ex)
            {
                // Check for unique constraint violation
                if (ex.Number == 2627 || ex.Number == 2601)
                {
                    if (ex.Message.Contains("faculty_code"))
                    {
                        return BadRequest(new { message = "Mã khoa đã tồn tại. Vui lòng sử dụng mã khác." });
                    }
                    else if (ex.Message.Contains("faculty_name"))
                    {
                        return BadRequest(new { message = "Tên khoa đã tồn tại. Vui lòng sử dụng tên khác." });
                    }
                    return BadRequest(new { message = "Khoa đã tồn tại trong hệ thống." });
                }
                return StatusCode(500, new { message = "Lỗi khi cập nhật khoa: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi không xác định: " + ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var faculty = await _service.GetByIdAsync(id);
                if (faculty == null)
                    return NotFound(new { message = "Không tìm thấy khoa" });

                await _service.DeleteAsync(id);

                // ✅ Audit Log: Delete Faculty
                await LogDeleteAsync("Faculty", id, new {
                    faculty_code = faculty.FacultyCode,
                    faculty_name = faculty.FacultyName
                });

                return Ok(new { message = "Xóa khoa thành công!" });
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
