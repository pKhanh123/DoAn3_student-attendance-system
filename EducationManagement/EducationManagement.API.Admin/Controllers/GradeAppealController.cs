using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.GradeAppeal;
using EducationManagement.Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/grade-appeals")]
    public class GradeAppealController : BaseController
    {
        private readonly GradeAppealService _appealService;

        public GradeAppealController(GradeAppealService appealService, AuditLogService auditLogService)
            : base(auditLogService)
        {
            _appealService = appealService;
        }

        [HttpPost]
        [RequireAnyPermission("STUDENT_APPEALS", "ADMIN_STUDENTS")] // ✅ STUDENT_APPEALS (executable) thay vì STUDENT_SECTION_STUDY (menu-only)
        public async Task<IActionResult> Create([FromBody] GradeAppealCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .Select(x => new
                    {
                        field = x.Key,
                        errors = x.Value?.Errors.Select(e => e.ErrorMessage)
                    })
                    .ToList();
                
                return BadRequest(new
                {
                    message = "Dữ liệu không hợp lệ",
                    errors = errors
                });
            }

            try
            {
                Console.WriteLine($"[GradeAppealController] Create - Starting. DTO: GradeId={dto.GradeId}, StudentId={dto.StudentId}, ComponentType={dto.ComponentType}");
                
                var appealId = await _appealService.CreateAppealAsync(dto);
                Console.WriteLine($"[GradeAppealController] ✅ CreateAppealAsync completed. AppealId: {appealId}");
                
                // ✅ Audit log: Tạo yêu cầu phúc khảo (wrapped in try-catch to not fail request)
                try
                {
                    Console.WriteLine($"[GradeAppealController] Attempting audit log...");
                    await LogCreateAsync("GradeAppeal", appealId, new
                    {
                        student_id = dto.StudentId,
                        grade_id = dto.GradeId,
                        class_id = dto.ClassId,
                        appeal_reason = dto.AppealReason,
                        current_score = dto.CurrentScore,
                        expected_score = dto.ExpectedScore,
                        component_type = dto.ComponentType,
                        action_description = $"Tạo yêu cầu phúc khảo: Lý do={dto.AppealReason}, Điểm hiện tại={dto.CurrentScore}, Điểm mong muốn={dto.ExpectedScore}, Thành phần={dto.ComponentType}"
                    });
                    Console.WriteLine($"[GradeAppealController] ✅ Audit log completed");
                }
                catch (Exception auditEx)
                {
                    Console.WriteLine($"[GradeAppealController] ⚠️ Audit log failed (non-critical): {auditEx.Message}");
                    // Don't fail the request if audit logging fails
                }
                
                return Ok(new { message = "Tạo yêu cầu phúc khảo thành công", appealId });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Log detailed error information
                var errorDetails = new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace,
                    innerException = ex.InnerException?.Message,
                    source = ex.Source
                };
                
                Console.WriteLine($"[GradeAppealController] Error creating appeal: {System.Text.Json.JsonSerializer.Serialize(errorDetails)}");
                
                return StatusCode(500, new 
                { 
                    message = "Lỗi hệ thống", 
                    error = ex.Message,
                    details = ex.InnerException?.Message ?? ex.StackTrace
                });
            }
        }

        [HttpGet]
        [RequireAnyPermission("ADVISOR_APPEALS", "ADMIN_STUDENTS", "TCH_CLASSES", "STUDENT_APPEALS")] // ✅ STUDENT_APPEALS (executable) thay vì STUDENT_SECTION_STUDY (menu-only)
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null,
            [FromQuery] string? studentId = null,
            [FromQuery] string? lecturerId = null,
            [FromQuery] string? advisorId = null,
            [FromQuery] string? classId = null)
        {
            try
            {
                var (appeals, totalCount) = await _appealService.GetAllAppealsAsync(
                    page, pageSize, status, studentId, lecturerId, advisorId, classId);

                return Ok(new
                {
                    data = appeals,
                    totalCount,
                    page,
                    pageSize
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [RequireAnyPermission("ADVISOR_APPEALS", "ADMIN_STUDENTS", "TCH_CLASSES", "STUDENT_APPEALS")] // ✅ STUDENT_APPEALS (executable) thay vì STUDENT_SECTION_STUDY (menu-only)
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var appeal = await _appealService.GetAppealByIdAsync(id);
                if (appeal == null)
                    return NotFound(new { message = "Không tìm thấy yêu cầu phúc khảo" });

                return Ok(new { data = appeal });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPut("{id}/lecturer-response")]
        [RequireAnyPermission("TCH_CLASSES", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> UpdateLecturerResponse(string id, [FromBody] GradeAppealLecturerResponseDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin cũ trước khi update
                var oldAppeal = await _appealService.GetAppealByIdAsync(id);
                
                await _appealService.UpdateLecturerResponseAsync(id, dto);
                
                // ✅ Audit log: Phản hồi giảng viên
                await LogUpdateAsync("GradeAppeal", id,
                    oldAppeal != null ? new
                    {
                        lecturer_response = oldAppeal.LecturerResponse,
                        lecturer_decision = oldAppeal.LecturerDecision,
                        lecturer_id = oldAppeal.LecturerId,
                        status = oldAppeal.Status,
                        student_id = oldAppeal.StudentId,
                        grade_id = oldAppeal.GradeId
                    } : null,
                    new
                    {
                        lecturer_response = dto.LecturerResponse,
                        lecturer_decision = dto.LecturerDecision,
                        lecturer_id = dto.LecturerId ?? GetCurrentUserId(),
                        status = "REVIEWING",
                        student_id = oldAppeal?.StudentId,
                        grade_id = oldAppeal?.GradeId,
                        action_description = $"Giảng viên phản hồi phúc khảo: Quyết định={dto.LecturerDecision}, Phản hồi={dto.LecturerResponse ?? "Không có"}"
                    });
                
                return Ok(new { message = "Cập nhật phản hồi giảng viên thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPut("{id}/advisor-decision")]
        [RequireAnyPermission("ADVISOR_APPEALS", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> UpdateAdvisorDecision(string id, [FromBody] GradeAppealAdvisorDecisionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin cũ trước khi update
                var oldAppeal = await _appealService.GetAppealByIdAsync(id);
                
                await _appealService.UpdateAdvisorDecisionAsync(id, dto);
                
                // ✅ Audit log: Quyết định cố vấn (có thể điều chỉnh điểm)
                await LogUpdateAsync("GradeAppeal", id,
                    oldAppeal != null ? new
                    {
                        advisor_response = oldAppeal.AdvisorResponse,
                        advisor_decision = oldAppeal.AdvisorDecision,
                        advisor_id = oldAppeal.AdvisorId,
                        final_score = oldAppeal.FinalScore,
                        status = oldAppeal.Status,
                        student_id = oldAppeal.StudentId,
                        grade_id = oldAppeal.GradeId,
                        current_score = oldAppeal.CurrentScore
                    } : null,
                    new
                    {
                        advisor_response = dto.AdvisorResponse,
                        advisor_decision = dto.AdvisorDecision,
                        advisor_id = dto.AdvisorId ?? GetCurrentUserId(),
                        final_score = dto.FinalScore,
                        resolution_notes = dto.ResolutionNotes,
                        status = dto.AdvisorDecision == "APPROVE" ? "APPROVED" : "REJECTED",
                        student_id = oldAppeal?.StudentId,
                        grade_id = oldAppeal?.GradeId,
                        action_description = dto.AdvisorDecision == "APPROVE" && dto.FinalScore.HasValue
                            ? $"Cố vấn phê duyệt và điều chỉnh điểm: {oldAppeal?.CurrentScore ?? oldAppeal?.FinalScore} → {dto.FinalScore}"
                            : $"Cố vấn quyết định: {dto.AdvisorDecision}, Phản hồi={dto.AdvisorResponse ?? "Không có"}"
                    });
                
                // Nếu điều chỉnh điểm, log thêm action GRADE_ADJUST
                if (dto.AdvisorDecision == "APPROVE" && dto.FinalScore.HasValue && oldAppeal != null)
                {
                    await LogAuditAsync("GRADE_ADJUST", "Grade", oldAppeal.GradeId, 
                        new { total_score = oldAppeal.CurrentScore ?? oldAppeal.FinalScore },
                        new
                        {
                            total_score = dto.FinalScore,
                            grade_id = oldAppeal.GradeId,
                            appeal_id = id,
                            student_id = oldAppeal.StudentId,
                            action_description = $"Điều chỉnh điểm sau phúc khảo: {oldAppeal.CurrentScore ?? oldAppeal.FinalScore} → {dto.FinalScore}"
                        });
                }
                
                return Ok(new { message = "Cập nhật quyết định cố vấn thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPut("{id}/cancel")]
        [RequireAnyPermission("STUDENT_APPEALS", "ADMIN_STUDENTS")] // ✅ STUDENT_APPEALS (executable) thay vì STUDENT_SECTION_STUDY (menu-only)
        public async Task<IActionResult> Cancel(string id, [FromBody] GradeAppealCancelDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin appeal trước khi hủy
                var appeal = await _appealService.GetAppealByIdAsync(id);
                var cancelledBy = dto.CancelledBy ?? GetCurrentUserId() ?? "system";
                
                await _appealService.CancelAppealAsync(id, cancelledBy);
                
                // ✅ Audit log: Hủy yêu cầu phúc khảo
                await LogUpdateAsync("GradeAppeal", id,
                    appeal != null ? new
                    {
                        status = appeal.Status,
                        student_id = appeal.StudentId,
                        grade_id = appeal.GradeId,
                        appeal_reason = appeal.AppealReason
                    } : null,
                    new
                    {
                        status = "CANCELLED",
                        cancelled_by = cancelledBy,
                        student_id = appeal?.StudentId,
                        grade_id = appeal?.GradeId,
                        action_description = $"Hủy yêu cầu phúc khảo: Mã yêu cầu={id}, Mã sinh viên={appeal?.StudentId}, Lý do={appeal?.AppealReason ?? "Không có"}"
                    });
                
                return Ok(new { message = "Hủy yêu cầu phúc khảo thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}

