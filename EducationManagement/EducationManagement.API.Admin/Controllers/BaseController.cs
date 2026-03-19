using EducationManagement.BLL.Services;
using EducationManagement.DAL.Repositories;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

namespace EducationManagement.API.Admin.Controllers
{
    /// <summary>
    /// Base controller with audit logging helper methods
    /// </summary>
    public class BaseController : ControllerBase
    {
        protected readonly AuditLogService? _auditLogService;

        public BaseController(AuditLogService? auditLogService = null)
        {
            _auditLogService = auditLogService;
        }

        /// <summary>
        /// Get current user ID from JWT token
        /// </summary>
        protected string? GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        /// <summary>
        /// Get current user full name from JWT token (if available)
        /// </summary>
        protected string? GetCurrentUserFullName()
        {
            return User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("FullName");
        }

        /// <summary>
        /// Create audit log entry
        /// Note: Action and EntityType are stored in English for consistency.
        /// Frontend will format them to Vietnamese for display.
        /// </summary>
        protected async Task LogAuditAsync(
            string action,
            string entityType,
            string? entityId = null,
            object? oldValues = null,
            object? newValues = null)
        {
            if (_auditLogService == null) return;

            try
            {
                await _auditLogService.CreateAuditLogAsync(new AuditLogDto
                {
                    UserId = GetCurrentUserId(),
                    Action = action,
                    EntityType = entityType,
                    EntityId = entityId,
                    OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
                    NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = HttpContext.Request.Headers["User-Agent"].ToString()
                });
            }
            catch
            {
                // Don't fail the request if audit logging fails
                // Log error silently (could add logger here if needed)
            }
        }

        /// <summary>
        /// Shortcut for CREATE action
        /// </summary>
        protected Task LogCreateAsync(string entityType, string? entityId, object? data)
            => LogAuditAsync("CREATE", entityType, entityId, null, data);

        /// <summary>
        /// Shortcut for UPDATE action
        /// </summary>
        protected Task LogUpdateAsync(string entityType, string? entityId, object? oldData, object? newData)
            => LogAuditAsync("UPDATE", entityType, entityId, oldData, newData);

        /// <summary>
        /// Shortcut for DELETE action
        /// </summary>
        protected Task LogDeleteAsync(string entityType, string? entityId, object? data)
            => LogAuditAsync("DELETE", entityType, entityId, data, null);

        /// <summary>
        /// Shortcut for LOGIN action
        /// </summary>
        protected Task LogLoginAsync(string userId, object? data)
            => LogAuditAsync("LOGIN", "Auth", userId, null, data);

        /// <summary>
        /// Shortcut for LOGOUT action
        /// </summary>
        protected Task LogLogoutAsync(string userId)
            => LogAuditAsync("LOGOUT", "Auth", userId, null, null);

        /// <summary>
        /// Shortcut for APPROVE action (Duyệt)
        /// </summary>
        protected Task LogApproveAsync(string entityType, string? entityId, object? data)
            => LogAuditAsync("APPROVE", entityType, entityId, null, data);

        /// <summary>
        /// Shortcut for REJECT action (Từ chối)
        /// </summary>
        protected Task LogRejectAsync(string entityType, string? entityId, object? data)
            => LogAuditAsync("REJECT", entityType, entityId, null, data);

        /// <summary>
        /// Shortcut for IMPORT action (Nhập dữ liệu)
        /// </summary>
        protected Task LogImportAsync(string entityType, object? data)
            => LogAuditAsync("IMPORT", entityType, null, null, data);

        /// <summary>
        /// Shortcut for EXPORT action (Xuất dữ liệu)
        /// </summary>
        protected Task LogExportAsync(string entityType, object? data)
            => LogAuditAsync("EXPORT", entityType, null, null, data);

        /// <summary>
        /// Helper để tạo object audit log với thông tin tiếng Việt rõ ràng
        /// </summary>
        protected object CreateAuditData(string action, string entityName, object? data = null)
        {
            var auditData = new Dictionary<string, object?>
            {
                ["action"] = action,
                ["entity_name"] = entityName,
                ["timestamp"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };

            if (data != null)
            {
                // Thêm thông tin từ data vào auditData
                var properties = data.GetType().GetProperties();
                foreach (var prop in properties)
                {
                    var value = prop.GetValue(data);
                    if (value != null)
                    {
                        auditData[prop.Name] = value;
                    }
                }
            }

            return auditData;
        }
    }
}

