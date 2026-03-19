using Microsoft.AspNetCore.Mvc;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Models;
using EducationManagement.Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.BLL.Services;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/departments")]
    public class DepartmentController : BaseController
    {
        private readonly DepartmentService _service;

        public DepartmentController(DepartmentService service, AuditLogService auditLogService) : base(auditLogService)
        {
            _service = service;
        }

        // ============================================================
        // 🔹 GET: Lấy danh sách tất cả bộ môn với pagination
        // ============================================================
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
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 GET: Lấy bộ môn theo ID
        // ============================================================
        [HttpGet("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var department = await _service.GetByIdAsync(id);
                if (department == null)
                    return NotFound(new { message = "Không tìm thấy bộ môn" });

                return Ok(new { data = department });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 GET: Lấy bộ môn theo khoa
        // ============================================================
        [HttpGet("faculty/{facultyId}")]
        public async Task<IActionResult> GetByFaculty(string facultyId)
        {
            try
            {
                var allDepartments = await _service.GetAllAsync();
                var departments = allDepartments.FindAll(d => d.FacultyId == facultyId);
                return Ok(new { data = departments });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 POST: Tạo bộ môn mới
        // ============================================================
        [HttpPost]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] Department model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Generate ID if not provided
                if (string.IsNullOrEmpty(model.DepartmentId))
                    model.DepartmentId = IdGenerator.Generate("dep");

                // ✅ Tự động sinh mã bộ môn (DEPT001, DEPT002...)
                if (string.IsNullOrWhiteSpace(model.DepartmentCode))
                {
                    model.DepartmentCode = await _service.GenerateNextCodeAsync();
                }

                model.CreatedBy = User.Identity?.Name ?? "system";
                model.CreatedAt = DateTime.Now;

                await _service.AddAsync(model);

                // ✅ Audit Log: Create Department (Tiếng Việt)
                await LogCreateAsync("Department", model.DepartmentId, new {
                    ma_bo_mon = model.DepartmentCode,
                    ten_bo_mon = model.DepartmentName,
                    ma_khoa = model.FacultyId
                });

                return Ok(new { message = "Thêm bộ môn thành công!", data = model });
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

        // ============================================================
        // 🔹 PUT: Cập nhật bộ môn
        // ============================================================
        [HttpPut("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] Department model)
        {
            if (id != model.DepartmentId)
                return BadRequest(new { message = "ID không khớp!" });

            try
            {
                var oldDept = await _service.GetByIdAsync(id);
                if (oldDept == null)
                    return NotFound(new { message = "Không tìm thấy bộ môn" });
                
                model.UpdatedBy = User.Identity?.Name ?? "system";
                model.UpdatedAt = DateTime.Now;

                var rowsAffected = await _service.UpdateAsync(model);
                if (rowsAffected == 0)
                    return NotFound(new { message = "Không tìm thấy bộ môn" });

                // ✅ Audit Log: Update Department (Tiếng Việt)
                if (oldDept != null)
                {
                    await LogUpdateAsync("Department", model.DepartmentId,
                        new { ten_bo_mon = oldDept.DepartmentName, ma_khoa = oldDept.FacultyId },
                        new { ten_bo_mon = model.DepartmentName, ma_khoa = model.FacultyId });
                }

                return Ok(new { message = "Cập nhật bộ môn thành công!" });
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

        // ============================================================
        // 🔹 DELETE: Xóa bộ môn (soft delete)
        // ============================================================
        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_ORGANIZATION")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var dept = await _service.GetByIdAsync(id);
                if (dept == null)
                    return NotFound(new { message = "Không tìm thấy bộ môn" });

                await _service.DeleteAsync(id);

                // ✅ Audit Log: Delete Department (Tiếng Việt)
                await LogDeleteAsync("Department", id, new {
                    ma_bo_mon = dept.DepartmentCode,
                    ten_bo_mon = dept.DepartmentName
                });

                return Ok(new { message = "Xóa bộ môn thành công!" });
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

        // ============================================================
        // 🔹 GET: Thống kê số môn học theo bộ môn
        // ============================================================
        [HttpGet("stats/subjects")]
        public Task<IActionResult> GetSubjectStats()
        {
            try
            {
                // TODO: Implement stored procedure for statistics
                return Task.FromResult<IActionResult>(Ok(new { data = new List<object>(), message = "Chức năng đang phát triển" }));
            }
            catch (Exception ex)
            {
                return Task.FromResult<IActionResult>(StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message }));
            }
        }

        // ============================================================
        // 🔹 GET: Thống kê số giảng viên theo bộ môn
        // ============================================================
        [HttpGet("stats/lecturers")]
        public Task<IActionResult> GetLecturerStats()
        {
            try
            {
                // TODO: Implement stored procedure for statistics
                return Task.FromResult<IActionResult>(Ok(new { data = new List<object>(), message = "Chức năng đang phát triển" }));
            }
            catch (Exception ex)
            {
                return Task.FromResult<IActionResult>(StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message }));
            }
        }
    }
}
