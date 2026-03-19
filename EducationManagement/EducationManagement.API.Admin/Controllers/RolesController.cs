using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Models;
using EducationManagement.Common.Helpers;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/roles")]
    public class RolesController : ControllerBase
    {
        private readonly RoleRepository _roleRepository;

        public RolesController(RoleRepository roleRepository)
        {
            _roleRepository = roleRepository;
        }

        #region 🔹 GET: Danh sách và chi tiết
        /// <summary>
        /// Lấy danh sách tất cả vai trò (Role)
        /// </summary>
        [HttpGet]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> GetAll()
        {
            var roles = await _roleRepository.GetAllAsync();
            
            var result = roles.Select(r => new
            {
                r.RoleId,
                r.RoleName,
                r.Description,
                r.IsActive,
                r.CreatedAt,
                r.UpdatedAt
            });

            return Ok(new { data = result });
        }

        /// <summary>
        /// Lấy chi tiết 1 vai trò theo ID
        /// </summary>
        [HttpGet("{id}")]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            var role = await _roleRepository.GetByIdAsync(id);

            if (role == null || role.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy vai trò" });

            return Ok(new { data = role });
        }
        #endregion

        #region 🔹 POST: Tạo Role mới
        /// <summary>
        /// Tạo mới một vai trò (Role)
        /// </summary>
        [HttpPost]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] Role request)
        {
            if (string.IsNullOrWhiteSpace(request.RoleName))
                return BadRequest(new { message = "Tên vai trò không được để trống" });

            if (await _roleRepository.ExistsByNameAsync(request.RoleName))
                return BadRequest(new { message = "Tên vai trò đã tồn tại" });

            // Tạo ID ngắn, có tiền tố role-
            request.RoleId = IdGenerator.Generate("role");
            request.CreatedAt = DateTime.UtcNow;
            request.CreatedBy = User.FindFirstValue(ClaimTypes.NameIdentifier);
            request.IsActive = true;

            await _roleRepository.CreateAsync(request);

            return Ok(new
            {
                message = "Tạo vai trò thành công",
                data = new { request.RoleId, request.RoleName }
            });
        }
        #endregion

        #region 🔹 PUT: Cập nhật Role
        /// <summary>
        /// Cập nhật thông tin vai trò theo ID
        /// </summary>
        [HttpPut("{id}")]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] Role request)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null || role.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy vai trò" });

            if (await _roleRepository.ExistsByNameAsync(request.RoleName, id))
                return BadRequest(new { message = "Tên vai trò đã tồn tại" });

            role.RoleName = request.RoleName;
            role.Description = request.Description;
            role.UpdatedAt = DateTime.UtcNow;
            role.UpdatedBy = User.FindFirstValue(ClaimTypes.NameIdentifier);

            await _roleRepository.UpdateAsync(role);

            return Ok(new { message = "Cập nhật vai trò thành công" });
        }
        #endregion

        #region 🔹 DELETE: Xoá mềm Role
        /// <summary>
        /// Xoá mềm vai trò (đặt DeletedAt và IsActive = false)
        /// </summary>
        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null || role.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy vai trò" });

            var deletedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            await _roleRepository.SoftDeleteAsync(id, deletedBy);

            return Ok(new { message = "Đã xoá vai trò thành công" });
        }
        #endregion

        #region 🔹 PUT: Bật/Tắt trạng thái hoạt động
        /// <summary>
        /// Chuyển trạng thái kích hoạt (active/inactive) cho Role
        /// </summary>
        [HttpPut("{id}/toggle-status")]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> ToggleStatus(string id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null || role.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy vai trò" });

            var updatedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            await _roleRepository.ToggleStatusAsync(id, updatedBy);
            
            // Lấy lại role để kiểm tra trạng thái mới
            var updatedRole = await _roleRepository.GetByIdAsync(id);

            return Ok(new
            {
                message = $"Đã {(updatedRole!.IsActive ? "kích hoạt" : "vô hiệu hóa")} vai trò thành công",
                isActive = updatedRole.IsActive
            });
        }
        #endregion
    }
}
