using Microsoft.AspNetCore.Mvc;
using EducationManagement.BLL.Services;
using EducationManagement.Common.Models;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/academic-years")]
    public class AcademicYearController : ControllerBase
    {
        private readonly AcademicYearService _service;

        public AcademicYearController(AcademicYearService service)
        {
            _service = service;
        }

        // ============================================================
        // 🔹 BASIC CRUD
        // ============================================================

        [HttpGet]
        [RequirePermission("ADMIN_ACADEMIC_YEARS")] // ✅ Kiểm tra permission từ database thay vì hardcode roles
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var list = await _service.GetAllAsync();
                return Ok(new { success = true, data = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [RequirePermission("ADMIN_ACADEMIC_YEARS")] // ✅ Kiểm tra permission từ database thay vì hardcode roles
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var item = await _service.GetByIdAsync(id);
                if (item == null) 
                    return NotFound(new { success = false, message = "Không tìm thấy niên khóa" });
                return Ok(new { success = true, data = item });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin")] // ✅ Chỉ Admin được tạo
        public async Task<IActionResult> Create([FromBody] AcademicYear model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ", errors = ModelState });

            try
            {
                var userName = User.Identity?.Name ?? "admin";
                await _service.AddAsync(model, userName);
                return Ok(new { success = true, message = "Thêm niên khóa thành công", data = model });
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
        [Authorize(Roles = "Admin")] // ✅ Chỉ Admin được cập nhật
        public async Task<IActionResult> Update(string id, [FromBody] AcademicYear model)
        {
            // ✅ Validation: Kiểm tra ID không được null hoặc undefined
            if (string.IsNullOrWhiteSpace(id) || id == "undefined" || id == "null")
            {
                return BadRequest(new { success = false, message = "ID niên khóa không hợp lệ. Vui lòng kiểm tra lại." });
            }

            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ", errors = ModelState });

            try
            {
                // ✅ Validation: Kiểm tra model không null
                if (model == null)
                {
                    return BadRequest(new { success = false, message = "Dữ liệu niên khóa không được để trống" });
                }

                // ✅ Nếu model.AcademicYearId rỗng, sử dụng id từ route
                if (string.IsNullOrWhiteSpace(model.AcademicYearId))
                {
                    model.AcademicYearId = id;
                }

                if (id != model.AcademicYearId)
                    return BadRequest(new { success = false, message = $"ID không khớp. Route ID: {id}, Body ID: {model.AcademicYearId}" });

                var userName = User.Identity?.Name ?? "admin";
                await _service.UpdateAsync(model, userName);
                return Ok(new { success = true, message = "Cập nhật niên khóa thành công" });
            }
            catch (ArgumentNullException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                // ✅ Log chi tiết lỗi để debug
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[AcademicYear Update Error] {ex.Message}");
                Console.WriteLine($"[AcademicYear Update Error] StackTrace: {ex.StackTrace}");
                Console.ResetColor();
                
                return StatusCode(500, new { 
                    success = false, 
                    message = "Lỗi hệ thống khi cập nhật niên khóa", 
                    error = ex.Message,
                    details = ex.InnerException?.Message
                });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // ✅ Chỉ Admin được xóa
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await _service.DeleteAsync(id);
                return Ok(new { success = true, message = "Xóa niên khóa thành công" });
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
        // 🔹 AUTO-CREATION ENDPOINTS
        // ============================================================

        /// <summary>
        /// TỰ ĐỘNG tạo niên khóa (cohort) theo chuẩn VN (4 năm)
        /// </summary>
        /// <param name="startYear">Năm bắt đầu (VD: 2025 → K25)</param>
        /// <param name="durationYears">Số năm (mặc định 4)</param>
        [HttpPost("auto-create-cohort")]
        [Authorize(Roles = "Admin")] // ✅ Chỉ Admin được tạo tự động
        public async Task<IActionResult> AutoCreateCohort([FromQuery] int startYear, [FromQuery] int durationYears = 4)
        {
            try
            {
                var userName = User.Identity?.Name ?? "system";
                var cohort = await _service.AutoCreateCohortAsync(startYear, durationYears, userName);
                
                return Ok(new 
                { 
                    success = true,
                    message = $"Đã tự động tạo niên khóa {cohort.CohortCode}",
                    data = cohort
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

        /// <summary>
        /// TỰ ĐỘNG tạo nhiều niên khóa cùng lúc
        /// </summary>
        /// <param name="startYears">Danh sách năm bắt đầu (VD: [2021,2022,2023,2024,2025])</param>
        /// <param name="durationYears">Số năm (mặc định 4)</param>
        [HttpPost("auto-create-multiple-cohorts")]
        [Authorize(Roles = "Admin")] // ✅ Chỉ Admin được tạo tự động
        public async Task<IActionResult> AutoCreateMultipleCohorts([FromBody] int[] startYears, [FromQuery] int durationYears = 4)
        {
            try
            {
                var userName = User.Identity?.Name ?? "system";
                var cohorts = await _service.AutoCreateMultipleCohortsAsync(startYears, durationYears, userName);
                
                return Ok(new 
                { 
                    success = true,
                    message = $"Đã tạo {cohorts.Count} niên khóa",
                    data = cohorts
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
        // 🔹 QUERY ENDPOINTS
        // ============================================================

        /// <summary>
        /// Lấy các niên khóa đang hoạt động (còn trong thời gian đào tạo)
        /// </summary>
        [HttpGet("active-cohorts")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActiveCohorts()
        {
            try
            {
                var cohorts = await _service.GetActiveCohortsAsync();
                return Ok(new { success = true, data = cohorts });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy các niên khóa cho năm hiện tại
        /// </summary>
        [HttpGet("current-cohorts")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCurrentCohorts()
        {
            try
            {
                var cohorts = await _service.GetCohortsForCurrentYearAsync();
                return Ok(new { success = true, data = cohorts });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}
