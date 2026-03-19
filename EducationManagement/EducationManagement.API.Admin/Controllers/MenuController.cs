    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc;
    using System.Security.Claims;
    using EducationManagement.DAL.Repositories;

    namespace EducationManagement.API.Admin.Controllers
    {
        [ApiController]
        [Authorize] // ✅ Cho phép mọi user đăng nhập (Admin, Teacher, Student, Advisor)
        [Route("api-edu/menu")] // ✅ Route thống nhất toàn hệ thống
        public class MenuController : ControllerBase
        {
            private readonly PermissionRepository _permissionRepository;

            public MenuController(PermissionRepository permissionRepository)
            {
                _permissionRepository = permissionRepository;
            }

            /// <summary>
            /// 🔹 Lấy danh sách menu tương ứng với vai trò của user hiện tại
            /// </summary>
            [HttpGet]
            public async Task<IActionResult> GetMenuForCurrentUser()
            {
                try
                {
                    // 🔍 Lấy role từ token
                    var roleName = User.FindFirst("role")?.Value
                        ?? User.FindFirst(ClaimTypes.Role)?.Value;

                    if (string.IsNullOrEmpty(roleName))
                    {
                        return Unauthorized(new { message = "Không xác định được vai trò người dùng." });
                    }

                    // 🔍 Lấy quyền theo RoleName từ repository
                    var permissionsFromDb = await _permissionRepository.GetByRoleNameAsync(roleName);

                    if (!permissionsFromDb.Any())
                    {
                        return Ok(new { role = roleName, menus = new List<object>() });
                    }

                    // ✅ LẤY PERMISSIONS ĐỂ HIỂN THỊ MENU:
                    // 1. Section permissions (is_menu_only = true, parent_code = NULL) - Hiển thị như sections
                    // 2. Menu items (có parent_code, không phân biệt is_menu_only) - Hiển thị như items trong sections
                    // Menu items có thể có is_menu_only = 0 (executable) nhưng vẫn cần hiển thị trong menu
                    var menuPermissions = permissionsFromDb
                        .Where(p => p.IsMenuOnly || !string.IsNullOrEmpty(p.ParentCode)) // Lấy menu-only permissions HOẶC permissions có parent_code
                        .OrderBy(p => p.SortOrder ?? 999)
                        .ThenBy(p => p.PermissionName)
                        .Select(p => new
                        {
                            p.PermissionId,
                            p.PermissionCode,
                            p.PermissionName,
                            p.ParentCode,
                            p.Icon,
                            p.SortOrder
                        })
                        .ToList();

                    if (!menuPermissions.Any())
                    {
                        return Ok(new { role = roleName, menus = new List<object>() });
                    }

                    // ✅ Xây dựng cây menu cha - con (theo ParentCode)
                    // Lọc chỉ lấy sections (parent_code IS NULL hoặc empty)
                    var parentPermissions = menuPermissions
                        .Where(p => string.IsNullOrEmpty(p.ParentCode))
                        .ToList();
                    
                    var menuTree = parentPermissions
                        .OrderBy(p => p.SortOrder ?? 999)
                        .ThenBy(p => p.PermissionName)
                        .Select(parent => new
                        {
                            label = parent.PermissionName,
                            icon = string.IsNullOrWhiteSpace(parent.Icon) ? "fa fa-circle" : parent.Icon,
                            state = FormatState(parent.PermissionCode),
                            sub = menuPermissions
                                .Where(child => !string.IsNullOrEmpty(child.ParentCode) && 
                                       child.ParentCode == parent.PermissionCode)
                                .OrderBy(child => child.SortOrder ?? 999)
                                .ThenBy(child => child.PermissionName)
                                .Select(child => new
                                {
                                    label = child.PermissionName,
                                    icon = string.IsNullOrWhiteSpace(child.Icon) ? "fa fa-angle-right" : child.Icon,
                                    state = FormatState(child.PermissionCode)
                                })
                                .ToList()
                        })
                        .ToList();

                    return Ok(new
                    {
                        role = roleName,
                        menus = menuTree
                    });
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { message = "Đã xảy ra lỗi khi lấy menu.", error = ex.Message });
                }
            }

            // ============================================================
            // 🔧 Helper: Format PermissionCode → State FE
            // ============================================================
            private static string? FormatState(string code)
            {
                if (string.IsNullOrEmpty(code))
                    return null;

                // Xác định prefix FE theo vai trò
                string prefix = code.StartsWith("TEACHER_", StringComparison.OrdinalIgnoreCase) ? "main.teacher." :
                                code.StartsWith("STUDENT_", StringComparison.OrdinalIgnoreCase) ? "main.student." :
                                code.StartsWith("ADVISOR_", StringComparison.OrdinalIgnoreCase) ? "main.advisor." :
                                "main.admin."; // mặc định admin

                // Loại bỏ tiền tố role_
                string raw = code;
                foreach (var rolePrefix in new[] { "ADMIN_", "TEACHER_", "STUDENT_", "ADVISOR_" })
                {
                    if (raw.StartsWith(rolePrefix, StringComparison.OrdinalIgnoreCase))
                    {
                        raw = raw.Substring(rolePrefix.Length);
                        break;
                    }
                }

                // Chuyển sang lowercase & thay "_" bằng "."
                string formatted = raw.ToLower().Replace("_", ".");

                // Thêm prefix
                string fullState = prefix + formatted;

                // Gộp 2 phần cuối (vd: user.account → userAccount)
                var parts = fullState.Split('.');
                if (parts.Length > 3)
                {
                    var lastTwo = parts[^2] + char.ToUpper(parts[^1][0]) + parts[^1].Substring(1);
                    fullState = string.Join(".", parts.Take(parts.Length - 2)) + "." + lastTwo;
                }

                return fullState;
            }
            
            /// <summary>
            /// 🔹 Lấy danh sách quyền (permissions) của user hiện tại
            /// </summary>
            [HttpGet("permissions")]
            public async Task<IActionResult> GetUserPermissions()
            {
                try
                {
                    // 🔍 Lấy role từ token
                    var roleName = User.FindFirst("role")?.Value
                        ?? User.FindFirst(ClaimTypes.Role)?.Value;

                    if (string.IsNullOrEmpty(roleName))
                    {
                        return Unauthorized(new { message = "Không xác định được vai trò người dùng." });
                    }

                    // 🔍 Lấy quyền theo RoleName từ repository
                    var permissionsFromDb = await _permissionRepository.GetByRoleNameAsync(roleName);

                    // ✅ CHỈ TRẢ VỀ EXECUTABLE PERMISSIONS (bỏ qua menu-only permissions)
                    // Menu-only permissions chỉ dùng để hiển thị menu,
                    // KHÔNG cần trả về cho frontend để check authorization
                    var executablePermissions = permissionsFromDb
                        .Where(p => !p.IsMenuOnly) // Chỉ lấy executable permissions
                        .Select(p => p.PermissionCode)
                        .ToList();

                    return Ok(new
                    {
                        role = roleName,
                        permissions = executablePermissions
                    });
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { message = "Đã xảy ra lỗi khi lấy quyền.", error = ex.Message });
                }
            }
        }
    }
