using EducationManagement.BLL.Services;
using EducationManagement.API.Admin.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/graduation")]
    public class GraduationController : BaseController
    {
        private readonly GraduationService _service;

        public GraduationController(GraduationService service, AuditLogService auditLogService)
            : base(auditLogService)
        {
            _service = service;
        }

        [HttpPost("requirements")]
        [RequirePermission("ADMIN_GRADUATION")]
        public async Task<IActionResult> CreateRequirement([FromBody] CreateRequirementRequest request)
        {
            try
            {
                var createdBy = GetCurrentUserId() ?? "system";
                var requirementId = await _service.CreateRequirementAsync(
                    request.MajorId, request.RequiredCredits, request.MinGpa, createdBy);

                await LogCreateAsync("GraduationRequirement", requirementId, new { request.MajorId, request.RequiredCredits, request.MinGpa });

                return Ok(new { success = true, message = "Tạo yêu cầu tốt nghiệp thành công", requirementId });
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

        [HttpGet("requirements/{majorId}")]
        [RequireAnyPermission("ADMIN_GRADUATION", "ADVISOR_GRADUATION", "STUDENT_GRADUATION")]
        public async Task<IActionResult> GetRequirementByMajor(string majorId)
        {
            try
            {
                var dt = await _service.GetRequirementByMajorAsync(majorId);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data = data.Count > 0 ? data[0] : null });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("check-eligibility/{studentId}")]
        [RequireAnyPermission("ADMIN_GRADUATION", "ADVISOR_GRADUATION", "STUDENT_GRADUATION")]
        public async Task<IActionResult> CheckEligibility(string studentId)
        {
            try
            {
                var dt = await _service.CheckEligibilityAsync(studentId);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data = data.Count > 0 ? data[0] : null });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPost("applications")]
        [RequireAnyPermission("ADMIN_GRADUATION", "STUDENT_GRADUATION")]
        public async Task<IActionResult> CreateApplication([FromBody] CreateApplicationRequest request)
        {
            try
            {
                var createdBy = GetCurrentUserId() ?? "system";
                var applicationId = await _service.CreateApplicationAsync(
                    request.StudentId, request.SchoolYearId, request.Semester, createdBy);

                await LogCreateAsync("GraduationApplication", applicationId, new { request.StudentId, request.SchoolYearId, request.Semester });

                return Ok(new { success = true, message = "Tạo đơn xét tốt nghiệp thành công", applicationId });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("applications/student/{studentId}")]
        [RequireAnyPermission("ADMIN_GRADUATION", "ADVISOR_GRADUATION", "STUDENT_GRADUATION")]
        public async Task<IActionResult> GetApplicationsByStudent(string studentId)
        {
            try
            {
                var dt = await _service.GetApplicationsByStudentAsync(studentId);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data, totalCount = data.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("applications/{applicationId}")]
        [RequireAnyPermission("ADMIN_GRADUATION", "ADVISOR_GRADUATION", "STUDENT_GRADUATION")]
        public async Task<IActionResult> GetApplicationById(string applicationId)
        {
            try
            {
                var dt = await _service.GetApplicationByIdAsync(applicationId);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data = data.Count > 0 ? data[0] : null });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("applications")]
        [RequireAnyPermission("ADMIN_GRADUATION", "ADVISOR_GRADUATION")]
        public async Task<IActionResult> GetAllApplications([FromQuery] string? academicYearId = null, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var dt = await _service.GetAllApplicationsAsync(academicYearId, pageNumber, pageSize);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data, totalCount = data.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPut("applications/{applicationId}/status")]
        [RequireAnyPermission("ADMIN_GRADUATION", "ADVISOR_GRADUATION")]
        public async Task<IActionResult> UpdateApplicationStatus(string applicationId, [FromBody] UpdateStatusRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId() ?? "system";
                string? verifiedBy = request.Status == "VERIFIED" ? currentUserId : null;
                string? approvedBy = request.Status == "APPROVED" ? currentUserId : null;

                await _service.UpdateApplicationStatusAsync(applicationId, request.Status, verifiedBy, approvedBy, request.Note);

                await LogUpdateAsync("GraduationApplication", applicationId, null, new { Status = request.Status, Note = request.Note });

                return Ok(new { success = true, message = "Cập nhật trạng thái đơn thành công" });
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

        [HttpPost("applications/{applicationId}/issue-diploma")]
        [RequirePermission("ADMIN_GRADUATION")]
        public async Task<IActionResult> IssueDiploma(string applicationId, [FromBody] IssueDiplomaRequest request)
        {
            try
            {
                var issuedBy = GetCurrentUserId() ?? "system";
                await _service.IssueDiplomaAsync(applicationId, request.DiplomaNumber, request.IssueDate, issuedBy);

                await LogUpdateAsync("GraduationApplication", applicationId, null, new { DiplomaNumber = request.DiplomaNumber, IssueDate = request.IssueDate });

                return Ok(new { success = true, message = "Cấp bằng tốt nghiệp thành công" });
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

        private static System.Collections.Generic.List<System.Collections.Generic.Dictionary<string, object?>> DataTableToList(DataTable dt)
        {
            var list = new System.Collections.Generic.List<System.Collections.Generic.Dictionary<string, object?>>();
            foreach (DataRow row in dt.Rows)
            {
                var dict = new System.Collections.Generic.Dictionary<string, object?>();
                foreach (DataColumn col in dt.Columns)
                {
                    dict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                }
                list.Add(dict);
            }
            return list;
        }
    }

    public class CreateRequirementRequest
    {
        public string MajorId { get; set; } = string.Empty;
        public int RequiredCredits { get; set; }
        public decimal MinGpa { get; set; }
    }

    public class CreateApplicationRequest
    {
        public string StudentId { get; set; } = string.Empty;
        public string SchoolYearId { get; set; } = string.Empty;
        public int Semester { get; set; }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class IssueDiplomaRequest
    {
        public string DiplomaNumber { get; set; } = string.Empty;
        public DateTime IssueDate { get; set; }
    }
}
