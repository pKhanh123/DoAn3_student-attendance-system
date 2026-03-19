using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.BLL.Services;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    /// <summary>
    /// Controller gửi email thông báo
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api-edu/email")]
    public class EmailController : ControllerBase
    {
        private readonly EmailService _emailService;

        public EmailController(EmailService emailService)
        {
            _emailService = emailService;
        }

        /// <summary>
        /// Gửi email đơn giản
        /// </summary>
        [HttpPost("send")]
        public async Task<IActionResult> SendEmail([FromBody] EmailRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ToEmail) || 
                string.IsNullOrWhiteSpace(request.Subject) || 
                string.IsNullOrWhiteSpace(request.Body))
            {
                return BadRequest(new { message = "Thiếu thông tin email" });
            }

            try
            {
                await _emailService.SendEmailAsync(request.ToEmail, request.Subject, request.Body, request.IsHtml);
                return Ok(new { message = "Email đã được gửi thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi gửi email", error = ex.Message });
            }
        }

        /// <summary>
        /// Gửi email cho nhiều người
        /// </summary>
        [HttpPost("send-bulk")]
        public async Task<IActionResult> SendBulkEmail([FromBody] BulkEmailRequest request)
        {
            if (request.ToEmails == null || !request.ToEmails.Any() || 
                string.IsNullOrWhiteSpace(request.Subject) || 
                string.IsNullOrWhiteSpace(request.Body))
            {
                return BadRequest(new { message = "Thiếu thông tin email" });
            }

            try
            {
                await _emailService.SendBulkEmailAsync(request.ToEmails, request.Subject, request.Body, request.IsHtml);
                return Ok(new { message = $"Đã gửi email đến {request.ToEmails.Count} người nhận" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi gửi email", error = ex.Message });
            }
        }

        /// <summary>
        /// Gửi cảnh báo vắng học
        /// </summary>
        [HttpPost("attendance-warning")]
        [RequireAnyPermission("TCH_CLASSES", "ADVISOR_WARNINGS", "ADMIN_REPORTS")] // ✅ Permission từ database
        public async Task<IActionResult> SendAttendanceWarning([FromBody] AttendanceWarningRequest request)
        {
            try
            {
                await _emailService.SendAttendanceWarningAsync(
                    request.StudentEmail, 
                    request.StudentName, 
                    request.ClassName, 
                    request.AbsentRate);
                
                return Ok(new { message = "Đã gửi email cảnh báo vắng học" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi gửi email", error = ex.Message });
            }
        }

        /// <summary>
        /// Gửi thông báo điểm
        /// </summary>
        [HttpPost("grade-notification")]
        [RequireAnyPermission("TCH_CLASSES", "ADMIN_STUDENTS")] // ✅ Permission từ database
        public async Task<IActionResult> SendGradeNotification([FromBody] GradeNotificationRequest request)
        {
            try
            {
                await _emailService.SendGradeNotificationAsync(
                    request.StudentEmail, 
                    request.StudentName, 
                    request.ClassName, 
                    request.FinalGrade);
                
                return Ok(new { message = "Đã gửi email thông báo điểm" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi gửi email", error = ex.Message });
            }
        }
    }

    // DTOs for Email requests
    public class EmailRequest
    {
        public string ToEmail { get; set; } = "";
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
        public bool IsHtml { get; set; } = true;
    }

    public class BulkEmailRequest
    {
        public List<string> ToEmails { get; set; } = new();
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
        public bool IsHtml { get; set; } = true;
    }

    public class AttendanceWarningRequest
    {
        public string StudentEmail { get; set; } = "";
        public string StudentName { get; set; } = "";
        public string ClassName { get; set; } = "";
        public double AbsentRate { get; set; }
    }

    public class GradeNotificationRequest
    {
        public string StudentEmail { get; set; } = "";
        public string StudentName { get; set; } = "";
        public string ClassName { get; set; } = "";
        public double FinalGrade { get; set; }
    }
}

