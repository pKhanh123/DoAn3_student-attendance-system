using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using System.Security.Claims;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.API.Admin.Authorization
{
    /// <summary>
    /// Authorization Handler để kiểm tra permission từ database
    /// </summary>
    public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly PermissionRepository _permissionRepository;

        public PermissionAuthorizationHandler(PermissionRepository permissionRepository)
        {
            _permissionRepository = permissionRepository;
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionRequirement requirement)
        {
            // Lấy role từ claims
            var roleName = context.User.FindFirst("role")?.Value
                ?? context.User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrEmpty(roleName))
            {
                context.Fail();
                return;
            }

            // Lấy permissions của role từ database
            var permissions = await _permissionRepository.GetByRoleNameAsync(roleName);
            
            // ✅ CHỈ LẤY EXECUTABLE PERMISSIONS (bỏ qua menu-only permissions)
            // Menu-only permissions (is_menu_only = true) chỉ dùng để hiển thị menu,
            // KHÔNG dùng để check authorization
            var executablePermissions = permissions
                .Where(p => !p.IsMenuOnly) // Bỏ qua menu-only permissions
                .Select(p => p.PermissionCode)
                .ToList();

            // Kiểm tra xem role có permission cần thiết không
            // Hỗ trợ nhiều permission codes (OR logic)
            if (requirement.PermissionCodes.Any(code => 
                executablePermissions.Contains(code, StringComparer.OrdinalIgnoreCase)))
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }
        }
    }

    /// <summary>
    /// Requirement cho permission authorization
    /// </summary>
    public class PermissionRequirement : IAuthorizationRequirement
    {
        public string[] PermissionCodes { get; }

        public PermissionRequirement(params string[] permissionCodes)
        {
            PermissionCodes = permissionCodes;
        }
        
        // Constructor cũ để tương thích
        public PermissionRequirement(string permissionCode) : this(new[] { permissionCode })
        {
        }
    }
}

