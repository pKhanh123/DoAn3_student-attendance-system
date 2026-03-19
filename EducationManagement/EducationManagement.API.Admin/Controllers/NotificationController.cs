using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.Notification;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/notifications")]
    public class NotificationController : ControllerBase
    {
        private readonly NotificationService _notificationService;

        public NotificationController(NotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        // ============================================================
        // 🔹 GET: Lấy tất cả notifications
        // ============================================================
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? type = null, [FromQuery] bool? isRead = null)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Token không hợp lệ" });

                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 100) pageSize = 100;

                var (notifications, totalCount) = await _notificationService.GetNotificationsByUserAsync(userId, page, pageSize, type, isRead);
                
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                
                return Ok(new 
                { 
                    data = notifications, 
                    page = page, 
                    pageSize = pageSize,
                    totalCount = totalCount,
                    totalPages = totalPages
                });
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

        // ============================================================
        // 🔹 GET: Lấy notifications chưa đọc
        // ============================================================
        [HttpGet("unread")]
        public async Task<IActionResult> GetUnread([FromQuery] int limit = 10)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Token không hợp lệ" });

                if (limit < 1) limit = 10;
                if (limit > 50) limit = 50;

                var notifications = await _notificationService.GetUnreadNotificationsAsync(userId, limit);
                return Ok(new { data = notifications });
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

        // ============================================================
        // 🔹 GET: Lấy số lượng notifications chưa đọc
        // ============================================================
        [HttpGet("unread/count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Token không hợp lệ" });

                var count = await _notificationService.GetUnreadCountAsync(userId);
                return Ok(new { count = count });
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

        // ============================================================
        // 🔹 GET: Lấy notification theo ID
        // ============================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var notification = await _notificationService.GetNotificationByIdAsync(id);
                if (notification == null)
                    return NotFound(new { message = "Không tìm thấy notification" });

                return Ok(new { data = notification });
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

        [HttpGet("my-notifications")]
        public async Task<IActionResult> GetMyNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Token không hợp lệ" });

                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 100) pageSize = 100;

                var (notifications, totalCount) = await _notificationService.GetNotificationsByUserAsync(userId, page, pageSize);
                
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                
                return Ok(new 
                { 
                    data = notifications, 
                    page = page, 
                    pageSize = pageSize,
                    totalCount = totalCount,
                    totalPages = totalPages
                });
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

        [HttpGet("user/{userId}")]
        [RequirePermission("ADMIN_NOTIFICATIONS")] // ✅ Permission từ database
        public async Task<IActionResult> GetByUser(string userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 50;
                if (pageSize > 100) pageSize = 100;

                var (notifications, totalCount) = await _notificationService.GetNotificationsByUserAsync(userId, page, pageSize);
                
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                
                return Ok(new 
                { 
                    data = notifications, 
                    page = page, 
                    pageSize = pageSize,
                    totalCount = totalCount,
                    totalPages = totalPages
                });
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

        // ============================================================
        // 🔹 PUT: Đánh dấu notification đã đọc
        // ============================================================
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                {
                    return BadRequest(new { message = "Notification ID không được để trống" });
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                
                // Try to mark as read - stored procedure will handle validation
                await _notificationService.MarkAsReadAsync(id, userId);
                return Ok(new { message = "Đánh dấu đã đọc thành công" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (SqlException sqlEx)
            {
                // Handle SQL errors (e.g., notification not found)
                if (sqlEx.Number == 50001 || sqlEx.Message.Contains("Không tìm thấy") || sqlEx.Message.Contains("not found"))
                {
                    return NotFound(new { message = "Không tìm thấy thông báo hoặc đã bị xóa" });
                }
                // For debugging: include error details in development
                #if DEBUG
                return StatusCode(500, new { 
                    message = "Lỗi hệ thống khi đánh dấu đã đọc", 
                    error = sqlEx.Message,
                    errorNumber = sqlEx.Number,
                    notificationId = id,
                    userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                });
                #else
                return StatusCode(500, new { message = "Lỗi hệ thống khi đánh dấu đã đọc" });
                #endif
            }
            catch (Exception ex)
            {
                // Check if error message indicates not found
                var errorMessage = ex.Message ?? "";
                if (errorMessage.Contains("Không tìm thấy") || 
                    errorMessage.Contains("not found") || 
                    errorMessage.Contains("does not exist"))
                {
                    return NotFound(new { message = "Không tìm thấy thông báo" });
                }
                // For debugging: include error details in development
                #if DEBUG
                return StatusCode(500, new { 
                    message = "Lỗi hệ thống khi đánh dấu đã đọc", 
                    error = ex.Message,
                    stackTrace = ex.StackTrace,
                    notificationId = id,
                    userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                });
                #else
                return StatusCode(500, new { message = "Lỗi hệ thống khi đánh dấu đã đọc" });
                #endif
            }
        }

        // ============================================================
        // 🔹 PUT: Đánh dấu tất cả đã đọc
        // ============================================================
        [HttpPut("mark-all-read")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Token không hợp lệ" });

                var updatedCount = await _notificationService.MarkAllAsReadAsync(userId, userId);
                return Ok(new { message = "Đánh dấu tất cả đã đọc thành công", updatedCount = updatedCount });
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

        // ============================================================
        // 🔹 DELETE: Xóa notification
        // ============================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                await _notificationService.DeleteNotificationAsync(id, userId);
                return Ok(new { message = "Xóa notification thành công" });
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

        // ============================================================
        // 🔹 POST: Tạo notification
        // ============================================================
        [HttpPost]
        [RequirePermission("ADMIN_NOTIFICATIONS")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] NotificationCreateDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var createdBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
                var notificationId = await _notificationService.CreateNotificationAsync(
                    dto.RecipientId,
                    dto.Title,
                    dto.Content,
                    dto.Type,
                    dto.CreatedBy ?? createdBy,
                    dto.SentDate
                );

                return Ok(new { message = "Tạo notification thành công", notificationId = notificationId });
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

