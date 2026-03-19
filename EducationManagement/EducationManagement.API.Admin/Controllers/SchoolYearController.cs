using Microsoft.AspNetCore.Mvc;
using EducationManagement.BLL.Services;
using EducationManagement.Common.Models;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/school-years")]
    public class SchoolYearController : ControllerBase
    {
        private readonly SchoolYearService _service;

        public SchoolYearController(SchoolYearService service)
        {
            _service = service;
        }

        // ============================================================
        // 🔹 BASIC CRUD
        // ============================================================

        /// <summary>
        /// Lấy tất cả năm học
        /// </summary>
        [HttpGet]
        [Authorize] // Cho phép tất cả user đã đăng nhập (Admin, Lecturer, Advisor, Student)
        public async Task<IActionResult> GetAll()
        {
            var list = await _service.GetAllAsync();
            return Ok(list);
        }
        
        /// <summary>
        /// Lấy danh sách năm học (public - cho giảng viên, cố vấn)
        /// </summary>
        [HttpGet("list")]
        [Authorize] // Cho phép tất cả user đã đăng nhập
        public async Task<IActionResult> GetList()
        {
            var list = await _service.GetAllAsync();
            return Ok(new { success = true, data = list });
        }

        /// <summary>
        /// Lấy năm học theo ID
        /// </summary>
        [HttpGet("{id}")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound(new { message = "❌ Không tìm thấy năm học!" });
            return Ok(item);
        }

        /// <summary>
        /// Tạo năm học mới (thủ công)
        /// </summary>
        [HttpPost]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] SchoolYear model)
        {
            try
            {
                var userName = User.Identity?.Name ?? "admin";
                await _service.AddAsync(model, userName);
                return Ok(new { message = "✅ Thêm năm học thành công!", data = model });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật năm học
        /// </summary>
        [HttpPut("{id}")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] SchoolYear model)
        {
            try
            {
                if (id != model.SchoolYearId)
                    return BadRequest(new { message = "❌ ID không khớp!" });

                var userName = User.Identity?.Name ?? "admin";
                await _service.UpdateAsync(model, userName);
                return Ok(new { message = "✅ Cập nhật năm học thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa năm học
        /// </summary>
        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var userName = User.Identity?.Name ?? "admin";
                await _service.DeleteAsync(id, userName);
                return Ok(new { message = "🗑 Xóa năm học thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ============================================================
        // 🔹 AUTO-CREATION ENDPOINTS
        // ============================================================

        /// <summary>
        /// TỰ ĐỘNG tạo năm học theo chuẩn VN (Tháng 9 - Tháng 6, 2 học kỳ)
        /// </summary>
        /// <param name="startYear">Năm bắt đầu (VD: 2024 → 2024-2025)</param>
        /// <param name="academicYearId">Niên khóa liên kết (optional)</param>
        [HttpPost("auto-create")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> AutoCreate([FromQuery] int startYear, [FromQuery] string? academicYearId = null)
        {
            try
            {
                var userName = User.Identity?.Name ?? "system";
                var schoolYear = await _service.AutoCreateSchoolYearAsync(startYear, academicYearId, userName);
                
                return Ok(new 
                { 
                    message = $"✅ Đã tự động tạo năm học {schoolYear.YearCode}",
                    data = schoolYear
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// TỰ ĐỘNG tạo 4 năm học cho một niên khóa
        /// </summary>
        [HttpPost("auto-create-for-cohort")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> AutoCreateForCohort([FromQuery] string academicYearId)
        {
            try
            {
                var userName = User.Identity?.Name ?? "system";
                var schoolYears = await _service.AutoCreateSchoolYearsForCohortAsync(academicYearId, userName);
                
                return Ok(new 
                { 
                    message = $"✅ Đã tạo {schoolYears.Count} năm học cho niên khóa {academicYearId}",
                    data = schoolYears
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ============================================================
        // 🔹 QUERY ENDPOINTS
        // ============================================================

        /// <summary>
        /// Lấy năm học HIỆN TẠI (dựa vào ngày hệ thống)
        /// Fallback: Nếu không có năm học khớp ngày, trả về năm học đang active
        /// </summary>
        [HttpGet("current")]
        [AllowAnonymous] // Cho phép student/lecturer xem
        public async Task<IActionResult> GetCurrent()
        {
            var current = await _service.GetCurrentAsync();
            if (current == null)
            {
                // Fallback: Try to get active school year
                var active = await _service.GetActiveAsync();
                if (active != null)
                {
                    return Ok(active);
                }
                return Ok(new { message = "⚠️ Không có năm học nào đang diễn ra hoặc được kích hoạt!" });
            }
            
            return Ok(current);
        }

        /// <summary>
        /// Lấy năm học ĐANG ACTIVE
        /// </summary>
        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActive()
        {
            var active = await _service.GetActiveAsync();
            if (active == null)
                return Ok(new { message = "⚠️ Không có năm học nào được kích hoạt!" });
            
            return Ok(active);
        }

        /// <summary>
        /// Lấy thông tin học kỳ hiện tại
        /// </summary>
        [HttpGet("current-semester-info")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCurrentSemesterInfo()
        {
            var (yearCode, semester, semesterName) = await _service.GetCurrentSemesterInfoAsync();
            
            return Ok(new 
            {
                schoolYearCode = yearCode,
                currentSemester = semester,
                semesterName = semesterName,
                timestamp = DateTime.Now
            });
        }

        // ============================================================
        // 🔹 TRANSITION ENDPOINTS
        // ============================================================

        /// <summary>
        /// TỰ ĐỘNG chuyển học kỳ (gọi trong background job hoặc thủ công)
        /// </summary>
        [HttpPost("auto-transition-semester")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> AutoTransitionSemester()
        {
            try
            {
                var userName = User.Identity?.Name ?? "system";
                await _service.AutoTransitionSemesterAsync(userName);
                
                return Ok(new { message = "✅ Đã kiểm tra và chuyển học kỳ (nếu cần)" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// TỰ ĐỘNG chuyển sang năm học mới
        /// </summary>
        [HttpPost("auto-transition-year")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> AutoTransitionToNewYear([FromQuery] string newSchoolYearId)
        {
            try
            {
                var userName = User.Identity?.Name ?? "system";
                await _service.AutoTransitionToNewSchoolYearAsync(newSchoolYearId, userName);
                
                return Ok(new { message = $"✅ Đã chuyển sang năm học {newSchoolYearId}" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// FORCE chuyển học kỳ (CHỈ DÙNG CHO TEST)
        /// Cho phép force chuyển sang học kỳ cụ thể mà không cần kiểm tra ngày tháng
        /// </summary>
        [HttpPost("force-transition-semester/{targetSemester}")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> ForceTransitionSemester([FromRoute] int targetSemester)
        {
            // Check ModelState first
            if (!ModelState.IsValid)
            {
                return BadRequest(new { 
                    message = "❌ Dữ liệu không hợp lệ",
                    errors = ModelState,
                    receivedValue = targetSemester
                });
            }

            try
            {
                if (targetSemester < 1 || targetSemester > 2)
                {
                    return BadRequest(new { 
                        message = "❌ Học kỳ phải là 1 hoặc 2",
                        receivedValue = targetSemester
                    });
                }

                var userName = User.Identity?.Name ?? "system";
                var result = await _service.ForceTransitionSemesterAsync(targetSemester, userName);
                
                return Ok(new 
                { 
                    message = $"✅ Đã force chuyển sang Học kỳ {targetSemester}",
                    schoolYearId = result.SchoolYearId,
                    oldSemester = result.OldSemester,
                    newSemester = result.NewSemester
                });
            }
            catch (Exception ex)
            {
                // Return detailed error for debugging
                return BadRequest(new { 
                    message = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace,
                    targetSemester = targetSemester
                });
            }
        }

        /// <summary>
        /// Kích hoạt năm học (set active)
        /// </summary>
        [HttpPost("{id}/activate")]
        [RequirePermission("ADMIN_SCHOOL_YEARS")] // ✅ Permission từ database
        public async Task<IActionResult> Activate(string id, [FromQuery] int initialSemester = 1)
        {
            try
            {
                var userName = User.Identity?.Name ?? "admin";
                await _service.ActivateSchoolYearAsync(id, initialSemester, userName);
                
                return Ok(new { message = $"✅ Đã kích hoạt năm học {id} (HK{initialSemester})" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ============================================================
        // 🔹 UTILITY ENDPOINTS
        // ============================================================

        /// <summary>
        /// Kiểm tra xem hiện tại có đang trong kỳ đăng ký không
        /// </summary>
        [HttpGet("is-registration-period")]
        [AllowAnonymous]
        public async Task<IActionResult> IsRegistrationPeriod()
        {
            var isRegistration = await _service.IsRegistrationPeriodAsync();
            
            return Ok(new 
            {
                isRegistrationPeriod = isRegistration,
                message = isRegistration ? "✅ Đang trong kỳ đăng ký" : "⚠️ Ngoài kỳ đăng ký"
            });
        }
    }
}

