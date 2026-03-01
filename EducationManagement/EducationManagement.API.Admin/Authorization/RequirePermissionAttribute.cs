using Microsoft.AspNetCore.Authorization;

namespace EducationManagement.API.Admin.Authorization
{
    /// <summary>
    /// Custom authorization attribute để kiểm tra permission thay vì role
    /// Sử dụng: [RequirePermission("ADMIN_ACADEMIC_YEARS")]
    /// </summary>
    public class RequirePermissionAttribute : AuthorizeAttribute
    {
        public RequirePermissionAttribute(string permissionCode)
        {
            Policy = $"Permission:{permissionCode}";
        }
    }
}

