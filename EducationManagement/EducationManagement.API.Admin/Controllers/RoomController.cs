using Microsoft.AspNetCore.Mvc;
using EducationManagement.BLL.Services;
using EducationManagement.Common.Models;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.API.Admin.Authorization;
using System;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/rooms")]
    public class RoomController : BaseController
    {
        private readonly RoomService _service;

        public RoomController(RoomService service, AuditLogService auditLogService) : base(auditLogService)
        {
            _service = service;
        }

        // ============================================================
        // 🔹 GET ALL - Lấy danh sách (có pagination)
        // ============================================================
        [HttpGet]
        [RequirePermission("ADMIN_ROOMS")] // ✅ Permission từ database
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var (items, totalCount) = await _service.GetPagedAsync(page, pageSize, search, isActive);
                
                return Ok(new
                {
                    success = true,
                    data = items,
                    totalCount = totalCount,
                    page = page,
                    pageSize = pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 GET BY ID - Lấy chi tiết
        // ============================================================
        [HttpGet("{id}")]
        [RequirePermission("ADMIN_ROOMS")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var room = await _service.GetByIdAsync(id);
                return Ok(new { success = true, data = room });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 SEARCH - Tìm kiếm (không pagination)
        // ============================================================
        [HttpGet("search")]
        [RequirePermission("ADMIN_ROOMS")] // ✅ Permission từ database
        public async Task<IActionResult> Search(
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var items = await _service.SearchAsync(search, isActive);
                return Ok(new { success = true, data = items, totalCount = items.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 CREATE - Tạo mới
        // ============================================================
        [HttpPost]
        [RequirePermission("ADMIN_ROOMS")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] Room model)
        {
            try
            {
                var actor = GetCurrentUserId() ?? "System";
                await _service.AddAsync(model, actor);

                // ✅ Audit Log: Create Room (wrap in try-catch to not fail room creation if audit log fails)
                try
                {
                    await LogCreateAsync("Room", model.RoomId, new
                    {
                        room_code = model.RoomCode,
                        building = model.Building,
                        capacity = model.Capacity,
                        is_active = model.IsActive
                    });
                }
                catch (Exception auditEx)
                {
                    // Log audit error but don't fail the request
                    // Could use ILogger here if available
                }

                return Ok(new { success = true, message = "✅ Thêm phòng học thành công!", data = new { roomId = model.RoomId } });
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

        // ============================================================
        // 🔹 UPDATE - Cập nhật
        // ============================================================
        [HttpPut("{id}")]
        [RequirePermission("ADMIN_ROOMS")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] Room model)
        {
            try
            {
                if (id != model.RoomId)
                    return BadRequest(new { success = false, message = "ID không khớp!" });

                // Lấy oldRoom trước khi update
                var oldRoom = await _service.GetByIdAsync(id);

                var actor = GetCurrentUserId() ?? "System";
                await _service.UpdateAsync(model, actor);

                // ✅ Audit Log: Update Room
                await LogUpdateAsync("Room", model.RoomId,
                    new
                    {
                        room_code = oldRoom.RoomCode,
                        building = oldRoom.Building,
                        capacity = oldRoom.Capacity,
                        is_active = oldRoom.IsActive
                    },
                    new
                    {
                        room_code = model.RoomCode,
                        building = model.Building,
                        capacity = model.Capacity,
                        is_active = model.IsActive
                    });

                return Ok(new { success = true, message = "✅ Cập nhật phòng học thành công!" });
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

        // ============================================================
        // 🔹 DELETE - Xóa (soft delete)
        // ============================================================
        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_ROOMS")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                // Lấy room trước khi xóa (có thể throw InvalidOperationException nếu không tìm thấy)
                Room? room = null;
                try
                {
                    room = await _service.GetByIdAsync(id);
                }
                catch (InvalidOperationException)
                {
                    // Phòng không tồn tại hoặc đã bị xóa
                    // Tiếp tục thử xóa (idempotent operation - nếu đã xóa rồi thì cũng coi như thành công)
                }

                var actor = GetCurrentUserId() ?? "System";
                
                try
                {
                    var result = await _service.DeleteAsync(id, actor);

                    // Kiểm tra xem phòng đã bị xóa chưa
                    Room? roomAfterDelete = null;
                    try
                    {
                        roomAfterDelete = await _service.GetByIdAsync(id);
                    }
                    catch
                    {
                        // Phòng đã bị xóa (GetByIdAsync throw exception)
                        roomAfterDelete = null;
                    }
                    
                    var isDeleted = roomAfterDelete == null;

                    // Nếu phòng đã bị xóa (không tìm thấy) → thành công
                    if (isDeleted)
                    {
                        // ✅ Audit Log: Delete Room (chỉ log nếu có room info)
                        if (room != null)
                        {
                            try
                            {
                                await LogDeleteAsync("Room", id, new
                                {
                                    room_code = room.RoomCode,
                                    building = room.Building,
                                    capacity = room.Capacity
                                });
                            }
                            catch
                            {
                                // Ignore audit log errors
                            }
                        }

                        return Ok(new { success = true, message = "🗑 Xóa phòng học thành công!" });
                    }

                    // Nếu result = false và phòng chưa bị xóa → thực sự có lỗi
                    if (!result)
                    {
                        return BadRequest(new { success = false, message = "Không thể xóa phòng học" });
                    }
                }
                catch (InvalidOperationException deleteEx)
                {
                    // Nếu exception là "Không tìm thấy phòng học" → có thể đã bị xóa trước đó
                    if (deleteEx.Message.Contains("Không tìm thấy phòng học"))
                    {
                        return Ok(new { success = true, message = "🗑 Phòng học đã được xóa trước đó" });
                    }
                    // Nếu là lỗi khác (ví dụ: đang được sử dụng) → throw lại
                    throw;
                }

                return Ok(new { success = true, message = "🗑 Xóa phòng học thành công!" });
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
    }
}

