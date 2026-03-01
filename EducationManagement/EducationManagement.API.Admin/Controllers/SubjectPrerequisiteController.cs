using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.SubjectPrerequisite;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/subject-prerequisites")]
    public class SubjectPrerequisiteController : ControllerBase
    {
        private readonly SubjectPrerequisiteService _service;

        public SubjectPrerequisiteController(SubjectPrerequisiteService service)
        {
            _service = service;
        }

        // ============================================================
        // 1️⃣ GET PREREQUISITES BY SUBJECT
        // ============================================================
        [HttpGet("by-subject/{subjectId}")]
        public async Task<IActionResult> GetBySubject(string subjectId)
        {
            try
            {
                var prerequisites = await _service.GetBySubjectAsync(subjectId);
                return Ok(new
                {
                    success = true,
                    data = prerequisites,
                    totalCount = prerequisites.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 2️⃣ CHECK PREREQUISITES
        // ============================================================
        [HttpGet("check")]
        public async Task<IActionResult> Check(
            [FromQuery] string studentId,
            [FromQuery] string subjectId)
        {
            try
            {
                var (eligible, missingPrereqs) = await _service.CheckPrerequisitesAsync(studentId, subjectId);

                return Ok(new
                {
                    success = true,
                    eligible,
                    missingPrerequisites = missingPrereqs,
                    message = eligible
                        ? "Sinh viên đủ điều kiện đăng ký môn học"
                        : $"Thiếu {missingPrereqs.Count} môn tiên quyết"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 3️⃣ ADD PREREQUISITE (Admin Only)
        // ============================================================
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Add([FromBody] AddPrerequisiteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                var prerequisiteId = await _service.AddAsync(dto, createdBy);

                return Ok(new
                {
                    success = true,
                    message = "Thêm điều kiện tiên quyết thành công",
                    prerequisiteId
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
        // 4️⃣ DELETE PREREQUISITE (Admin Only)
        // ============================================================
        [HttpDelete("{prerequisiteId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(string prerequisiteId)
        {
            try
            {
                var deletedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
                await _service.DeleteAsync(prerequisiteId, deletedBy);

                return Ok(new { success = true, message = "Xóa điều kiện tiên quyết thành công" });
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

