using Microsoft.AspNetCore.Authorization;

namespace EducationManagement.API.Admin.Authorization
{
    /// <summary>
    /// Custom authorization attribute để kiểm tra một trong nhiều permissions
    /// Sử dụng: [RequireAnyPermission("ADMIN_ACADEMIC_YEARS", "VIEW_ACADEMIC_YEARS")]
    /// </summary>
    public class RequireAnyPermissionAttribute : AuthorizeAttribute
    {
        public RequireAnyPermissionAttribute(params string[] permissionCodes)
        {
            // Tạo policy name từ nhiều permission codes
            Policy = $"Permission:Any:{string.Join(",", permissionCodes)}";
        }
    }
}

