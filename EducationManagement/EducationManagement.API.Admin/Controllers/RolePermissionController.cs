using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Models;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/role-permissions")]
    public class RolePermissionController : ControllerBase
    {
        private readonly RoleRepository _roleRepository;
        private readonly PermissionRepository _permissionRepository;

        public RolePermissionController(RoleRepository roleRepository, PermissionRepository permissionRepository)
        {
            _roleRepository = roleRepository;
            _permissionRepository = permissionRepository;
        }

        #region 🔹 GET: Lấy danh sách quyền của 1 Role
        /// <summary>
        /// Lấy danh sách quyền của một vai trò cụ thể
        /// </summary>
        [HttpGet("{roleId}")]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> GetPermissionsByRole(string roleId)
        {
            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null || role.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy vai trò" });

            var allPermissions = await _permissionRepository.GetAllAsync();
            var rolePermIds = await _permissionRepository.GetPermissionIdsByRoleAsync(roleId);

            var result = allPermissions.Select(p => new
            {
                p.PermissionId,
                p.PermissionCode,
                p.PermissionName,
                p.Description,
                p.ParentCode,
                p.Icon,
                p.SortOrder,
                IsAssigned = rolePermIds.Contains(p.PermissionId)
            });

            return Ok(new
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                Permissions = result
            });
        }
        #endregion

        #region 🔹 POST: Gán quyền cho 1 Role
        /// <summary>
        /// Cập nhật danh sách quyền cho một vai trò (Admin only)
        /// </summary>
        [HttpPost("{roleId}")]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> AssignPermissions(string roleId, [FromBody] List<string> permissionIds)
        {
            if (permissionIds == null)
                return BadRequest(new { message = "Danh sách quyền không hợp lệ" });

            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null || role.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy vai trò" });

            // Xóa quyền cũ
            await _permissionRepository.DeleteAllByRoleAsync(roleId);

            // Thêm quyền mới
            var createdBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            foreach (var permissionId in permissionIds)
            {
                await _permissionRepository.AddRolePermissionAsync(roleId, permissionId, createdBy);
            }

            return Ok(new { message = "Cập nhật quyền thành công" });
        }
        #endregion

        #region 🔹 GET: Danh sách tất cả quyền hệ thống
        /// <summary>
        /// Lấy toàn bộ danh sách quyền trong hệ thống
        /// </summary>
        [HttpGet("all")]
        [RequirePermission("ADMIN_ROLES")] // ✅ Permission từ database
        public async Task<IActionResult> GetAllPermissions()
        {
            var permissions = await _permissionRepository.GetAllAsync();
            
            var result = permissions.Select(p => new
            {
                p.PermissionId,
                p.PermissionCode,
                p.PermissionName,
                p.Description,
                p.ParentCode,
                p.Icon,
                p.SortOrder
            })
            .OrderBy(p => p.SortOrder ?? 999)
            .ThenBy(p => p.PermissionName);

            return Ok(result);
        }
        #endregion
    }
}
