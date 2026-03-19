using EducationManagement.BLL.Services;
using EducationManagement.DAL.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [ApiController]
    [Route("api-edu/audit-logs")]
    public class AuditLogController : ControllerBase
    {
        private readonly AuditLogService _auditLogService;

        public AuditLogController(AuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        [HttpGet]
        [RequireAnyPermission("ADMIN_AUDIT_LOGS", "ADVISOR_REPORTS", "ADVISOR_DASHBOARD")] // ✅ Cho phép cả Admin và Advisor
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] string? search = null,
            [FromQuery] string? action = null,
            [FromQuery] string? entityType = null,
            [FromQuery] string? userId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var (logs, totalCount) = await _auditLogService.GetAllAuditLogsAsync(
                    page, pageSize, search, action, entityType, userId, fromDate, toDate);

                return Ok(new
                {
                    data = logs,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [RequireAnyPermission("ADMIN_AUDIT_LOGS", "ADVISOR_REPORTS", "ADVISOR_DASHBOARD")] // ✅ Cho phép cả Admin và Advisor
        public async Task<IActionResult> GetById(long id)
        {
            try
            {
                var log = await _auditLogService.GetAuditLogByIdAsync(id);
                if (log == null)
                {
                    return NotFound(new { message = "Không tìm thấy audit log" });
                }

                return Ok(new { data = log });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("user/{userId}")]
        [RequireAnyPermission("ADMIN_AUDIT_LOGS", "ADVISOR_REPORTS", "ADVISOR_DASHBOARD")] // ✅ Cho phép cả Admin và Advisor
        public async Task<IActionResult> GetByUser(
            string userId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            try
            {
                var (logs, totalCount) = await _auditLogService.GetAuditLogsByUserAsync(userId, page, pageSize);

                return Ok(new
                {
                    data = logs,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("entity/{entityType}/{entityId}")]
        [RequireAnyPermission("ADMIN_AUDIT_LOGS", "ADVISOR_REPORTS", "ADVISOR_DASHBOARD")] // ✅ Cho phép cả Admin và Advisor
        public async Task<IActionResult> GetByEntity(
            string entityType,
            string entityId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            try
            {
                var (logs, totalCount) = await _auditLogService.GetAuditLogsByEntityAsync(entityType, entityId, page, pageSize);

                return Ok(new
                {
                    data = logs,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AuditLogDto auditLog)
        {
            try
            {
                // Get IP Address and User Agent from request
                auditLog.IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                auditLog.UserAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                var logId = await _auditLogService.CreateAuditLogAsync(auditLog);

                return Ok(new { message = "Tạo audit log thành công", data = new { logId } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}

