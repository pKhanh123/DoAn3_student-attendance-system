using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.RegistrationPeriod;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/registration-periods")]
    public class RegistrationPeriodController : BaseController
    {
        private readonly RegistrationPeriodService _service;

        public RegistrationPeriodController(RegistrationPeriodService service, AuditLogService auditLogService) 
            : base(auditLogService)
        {
            _service = service;
        }

        // ============================================================
        // 1️⃣ GET ALL
        // ============================================================
        [HttpGet]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> GetAll([FromQuery] string? periodType = null)
        {
            try
            {
                var periods = await _service.GetAllAsync(periodType);
                return Ok(new
                {
                    success = true,
                    data = periods,
                    totalCount = periods.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 1️⃣.1 GET RETAKE PERIODS
        // ============================================================
        [HttpGet("retake")]
        [RequirePermission("VIEW_RETAKE_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> GetRetakePeriods()
        {
            try
            {
                var periods = await _service.GetRetakePeriodsAsync();
                return Ok(new
                {
                    success = true,
                    data = periods,
                    totalCount = periods.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 2️⃣ GET ACTIVE PERIOD (Admin/Advisor)
        // ============================================================
        [HttpGet("active")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> GetActive()
        {
            try
            {
                var activePeriod = await _service.GetActiveAsync();
                // Trả về 200 để FE không báo 404 khi không có đợt mở
                if (activePeriod == null)
                    return Ok(new { success = false, message = "Không có đợt đăng ký nào đang mở", data = (object?)null });

                return Ok(new { success = true, data = activePeriod });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 2️⃣.1 GET ACTIVE PERIOD FOR STUDENT (Student)
        // ============================================================
        [HttpGet("active/student")]
        [RequireAnyPermission("STUDENT_ENROLLMENT", "VIEW_RETAKE_PERIODS")] // ✅ Cho phép student xem đợt đăng ký đang mở
        public async Task<IActionResult> GetActiveForStudent()
        {
            try
            {
                var activePeriod = await _service.GetActiveAsync();
                // Trả về 200 để FE không báo 404 khi không có đợt mở
                if (activePeriod == null)
                    return Ok(new { success = false, message = "Không có đợt đăng ký nào đang mở", data = (object?)null });

                return Ok(new { success = true, data = activePeriod });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 3️⃣ GET BY ID
        // ============================================================
        [HttpGet("{id}")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var period = await _service.GetByIdAsync(id);
                if (period == null)
                    return NotFound(new { success = false, message = "Không tìm thấy đợt đăng ký" });

                return Ok(new { success = true, data = period });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 4️⃣ CREATE (Admin Only)
        // ============================================================
        [HttpPost]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] CreatePeriodDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                var periodId = await _service.CreateAsync(dto, createdBy);

                // ✅ Audit log: Tạo đợt đăng ký
                var periodTypeText = dto.PeriodType == "NORMAL" ? "Đăng ký học phần" : dto.PeriodType == "RETAKE" ? "Đăng ký học lại" : dto.PeriodType;
                await LogCreateAsync("RegistrationPeriod", periodId, new
                {
                    period_name = dto.PeriodName,
                    period_type = dto.PeriodType,
                    period_type_text = periodTypeText,
                    academic_year_id = dto.AcademicYearId,
                    semester = dto.Semester,
                    start_date = dto.StartDate,
                    end_date = dto.EndDate,
                    action_description = $"Tạo đợt đăng ký: {dto.PeriodName} ({periodTypeText})"
                });

                return Ok(new
                {
                    success = true,
                    message = "Tạo đợt đăng ký thành công",
                    periodId
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
        // 5️⃣ UPDATE (Admin Only)
        // ============================================================
        [HttpPut("{id}")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] UpdatePeriodDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin cũ trước khi update
                var oldPeriod = await _service.GetByIdAsync(id);
                var updatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                
                await _service.UpdateAsync(id, dto, updatedBy);

                // ✅ Audit log: Cập nhật đợt đăng ký
                await LogUpdateAsync("RegistrationPeriod", id,
                    oldPeriod != null ? new
                    {
                        period_name = oldPeriod.PeriodName,
                        start_date = oldPeriod.StartDate,
                        end_date = oldPeriod.EndDate,
                        status = oldPeriod.Status
                    } : null,
                    new
                    {
                        period_name = dto.PeriodName,
                        start_date = dto.StartDate,
                        end_date = dto.EndDate,
                        action_description = $"Cập nhật đợt đăng ký: {dto.PeriodName}"
                    });

                return Ok(new { success = true, message = "Cập nhật đợt đăng ký thành công" });
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
        // 6️⃣ DELETE (Admin Only)
        // ============================================================
        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                // Lấy thông tin đợt đăng ký trước khi xóa
                var period = await _service.GetByIdAsync(id);
                var deletedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                
                await _service.DeleteAsync(id, deletedBy);

                // ✅ Audit log: Xóa đợt đăng ký
                await LogDeleteAsync("RegistrationPeriod", id, new
                {
                    period_name = period?.PeriodName,
                    period_type = period?.PeriodType,
                    deleted_by = deletedBy,
                    action_description = $"Xóa đợt đăng ký: {period?.PeriodName}"
                });

                return Ok(new { success = true, message = "Xóa đợt đăng ký thành công" });
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
        // 7️⃣ OPEN PERIOD (Admin Only)
        // ============================================================
        [HttpPost("{id}/open")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> Open(string id)
        {
            try
            {
                // Lấy thông tin đợt đăng ký trước khi mở
                var period = await _service.GetByIdAsync(id);
                var openedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                
                await _service.OpenPeriodAsync(id, openedBy);

                // ✅ Audit log: Mở đợt đăng ký
                await LogUpdateAsync("RegistrationPeriod", id,
                    period != null ? new { status = period.Status } : null,
                    new
                    {
                        status = "OPEN",
                        opened_by = openedBy,
                        action_description = $"Mở đợt đăng ký: {period?.PeriodName}"
                    });

                return Ok(new
                {
                    success = true,
                    message = "Đã mở đợt đăng ký thành công. Các đợt khác đã tự động đóng."
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
        // 8️⃣ CLOSE PERIOD (Admin Only)
        // ============================================================
        [HttpPost("{id}/close")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> Close(string id)
        {
            try
            {
                // Lấy thông tin đợt đăng ký trước khi đóng
                var period = await _service.GetByIdAsync(id);
                var closedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? GetCurrentUserId() ?? "system";
                
                await _service.ClosePeriodAsync(id, closedBy);

                // ✅ Audit log: Đóng đợt đăng ký
                await LogUpdateAsync("RegistrationPeriod", id,
                    period != null ? new { status = period.Status } : null,
                    new
                    {
                        status = "CLOSED",
                        closed_by = closedBy,
                        action_description = $"Đóng đợt đăng ký: {period?.PeriodName}"
                    });

                return Ok(new { success = true, message = "Đã đóng đợt đăng ký thành công" });
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
        // 9️⃣ PERIOD CLASSES MANAGEMENT
        // ============================================================
        [HttpGet("{id}/classes")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> GetClassesByPeriod(string id)
        {
            try
            {
                var data = await _service.GetClassesByPeriodAsync(id);
                return Ok(new { success = true, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("{id}/available-classes")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> GetAvailableClassesForPeriod(string id)
        {
            try
            {
                var data = await _service.GetAvailableClassesForPeriodAsync(id);
                return Ok(new { success = true, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("{id}/classes")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> AddClassToPeriod(string id, [FromBody] AddClassToPeriodInput input)
        {
            try
            {
                var createdBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.AddClassToPeriodAsync(id, input.ClassId, createdBy);
                return Ok(new { success = true, message = "Thêm lớp vào đợt đăng ký thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("classes/{periodClassId}")]
        [RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
        public async Task<IActionResult> RemoveClassFromPeriod(string periodClassId)
        {
            try
            {
                var updatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.RemoveClassFromPeriodAsync(periodClassId, updatedBy);
                return Ok(new { success = true, message = "Xóa lớp khỏi đợt đăng ký thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class AddClassToPeriodInput
    {
        public string ClassId { get; set; } = string.Empty;
    }
}

