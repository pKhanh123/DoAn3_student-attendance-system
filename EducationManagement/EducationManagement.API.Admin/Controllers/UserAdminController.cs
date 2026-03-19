using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Models;
using EducationManagement.Common.Helpers;
using EducationManagement.Common.DTOs.User;
using EducationManagement.BLL.Services;
using EducationManagement.API.Admin.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication, nhưng không giới hạn role
    [Route("api-edu/account-management")]
    public class UserAdminController : BaseController
    {
        private readonly UserRepository _userRepository;
        private readonly RoleRepository _roleRepository;
        private readonly AuthService _authService;
        private readonly string _avatarFolder;
        private readonly string _gatewayUrl;

        public UserAdminController(
            UserRepository userRepository, 
            RoleRepository roleRepository, 
            AuthService authService, 
            IConfiguration configuration,
            AuditLogService auditLogService) : base(auditLogService)
        {
            _userRepository = userRepository;
            _roleRepository = roleRepository;
            _authService = authService;
            _gatewayUrl = configuration["GatewayUrl"] ?? "https://localhost:7033";

            // ✅ Xác định thư mục Avatar_User ở gốc solution
            var solutionRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), @"..", @".."));
            _avatarFolder = Path.Combine(solutionRoot, "Avatar_User");

            if (!Directory.Exists(_avatarFolder))
                Directory.CreateDirectory(_avatarFolder);
        }

        #region 🔹 GET: Danh sách + Chi tiết
        [HttpGet]
        [RequirePermission("ADMIN_USERS")] // ✅ Permission từ database
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? roleId = null,
            [FromQuery] bool? isActive = null)
        {
            var (users, totalCount) = await _userRepository.GetAllAsync(page, pageSize, search, roleId, isActive);

            // DEBUG LOGGING đã tắt để tránh spam console
            // Console.WriteLine($"🐛 DEBUG - GetAll: {users.Count} users, total {totalCount}");

            // ✅ Đơn giản hóa mapping để test
            var result = users.Select(u => new UserListDto
            {
                UserId = u.UserId,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.Phone,
                RoleId = u.RoleId,
                RoleName = u.RoleName ?? string.Empty,
                AvatarUrl = string.IsNullOrEmpty(u.AvatarUrl) 
                    ? $"{_gatewayUrl}/avatars/default.png"
                    : $"{_gatewayUrl}{u.AvatarUrl}",
                IsActive = u.IsActive,
                LastLoginAt = u.LastLoginAt,
                CreatedAt = u.CreatedAt,
                CreatedBy = u.CreatedBy,
                UpdatedAt = u.UpdatedAt,
                UpdatedBy = u.UpdatedBy
            }).ToList();

            return Ok(new
            {
                data = result,
                pagination = new
                {
                    page,
                    pageSize,
                    totalCount,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                }
            });
        }

        [HttpGet("{id}")]
        [RequirePermission("ADMIN_USERS")] // ✅ Permission từ database
        public async Task<IActionResult> GetById(string id)
        {
            var user = await _userRepository.GetByIdAsync(id);

            if (user == null || user.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            string avatarPath = string.IsNullOrEmpty(user.AvatarUrl)
                ? "/avatars/default.png"
                : user.AvatarUrl;

            var relative = avatarPath.TrimStart('/');
            var physicalPath = Path.Combine(_avatarFolder, relative.Replace('/', Path.DirectorySeparatorChar));
            if (!System.IO.File.Exists(physicalPath))
                avatarPath = "/avatars/default.png";

            var userDto = new UserListDto
            {
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                RoleId = user.RoleId,
                RoleName = user.RoleName ?? string.Empty, // UserRepository đã lấy từ SP
                AvatarUrl = FileHelper.BuildFullAvatarUrl(_gatewayUrl, avatarPath) ?? string.Empty,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt,
                CreatedBy = user.CreatedBy,
                UpdatedAt = user.UpdatedAt,
                UpdatedBy = user.UpdatedBy
            };

            return Ok(new { data = userDto });
        }
        #endregion

        #region 🔹 POST/PUT/DELETE: CRUD
        [HttpPost]
        [RequirePermission("ADMIN_USERS")] // ✅ Permission từ database
        public async Task<IActionResult> Create([FromBody] UserCreateDto request)
        {
            if (await _userRepository.ExistsByUsernameAsync(request.Username))
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại" });

            if (await _userRepository.ExistsByEmailAsync(request.Email))
                return BadRequest(new { message = "Email đã tồn tại" });

            var role = await _roleRepository.GetByIdAsync(request.RoleId);
            if (role == null)
                return BadRequest(new { message = "Role không hợp lệ" });

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var user = new User
            {
                // user-xxxxxxx
                UserId = IdGenerator.Generate("user"),
                Username = request.Username,
                PasswordHash = _authService.HashPassword(request.Password),
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                RoleId = request.RoleId,
                IsActive = request.IsActive,
                // ✅ Ảnh mặc định luôn tồn tại
                AvatarUrl = "/avatars/default.png",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = currentUserId
            };

            await _userRepository.CreateAsync(user);

            // ✅ Audit Log: Create User
            await LogCreateAsync("User", user.UserId, new {
                username = user.Username,
                full_name = user.FullName,
                email = user.Email,
                role_id = user.RoleId,
                is_active = user.IsActive
            });

            return Ok(new { message = "Tạo người dùng thành công", userId = user.UserId });
        }

        [HttpPut("{id}")]
        [RequirePermission("ADMIN_USERS")] // ✅ Permission từ database
        public async Task<IActionResult> Update(string id, [FromBody] UserUpdateAdminDto request)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            if (await _userRepository.ExistsByEmailAsync(request.Email, id))
                return BadRequest(new { message = "Email đã được sử dụng" });

            var role = await _roleRepository.GetByIdAsync(request.RoleId);
            if (role == null)
                return BadRequest(new { message = "Role không hợp lệ" });

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Capture old values for audit
            var oldValues = new {
                full_name = user.FullName,
                email = user.Email,
                phone = user.Phone,
                role_id = user.RoleId,
                is_active = user.IsActive
            };

            user.FullName = request.FullName;
            user.Email = request.Email;
            user.Phone = request.Phone;
            user.RoleId = request.RoleId;
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = currentUserId;

            await _userRepository.UpdateAsync(user);

            // ✅ Audit Log: Update User
            await LogUpdateAsync("User", user.UserId, oldValues, new {
                full_name = user.FullName,
                email = user.Email,
                phone = user.Phone,
                role_id = user.RoleId,
                is_active = user.IsActive
            });

            return Ok(new { message = "Cập nhật người dùng thành công" });
        }

        [HttpDelete("{id}")]
        [RequirePermission("ADMIN_USERS")] // ✅ Permission từ database
        public async Task<IActionResult> Delete(string id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (user.UserId == currentUserId)
                return BadRequest(new { message = "Không thể xoá tài khoản của chính bạn" });

            await _userRepository.SoftDeleteAsync(id, currentUserId ?? "system");

            // ✅ Audit Log: Delete User
            await LogDeleteAsync("User", user.UserId, new {
                username = user.Username,
                full_name = user.FullName,
                email = user.Email
            });

            return Ok(new { message = "Đã xoá người dùng thành công" });
        }
        #endregion

        #region 🔹 PUT: Toggle trạng thái hoạt động
        [HttpPut("{id}/toggle-status")]
        [RequirePermission("ADMIN_USERS")] // ✅ Permission từ database
        public async Task<IActionResult> ToggleStatus(string id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (user.UserId == currentUserId)
                return BadRequest(new { message = "Không thể vô hiệu hóa tài khoản của chính bạn" });

            var oldStatus = user.IsActive;
            
            await _userRepository.ToggleStatusAsync(id, currentUserId ?? "system");
            
            // Lấy lại để check trạng thái
            var updatedUser = await _userRepository.GetByIdAsync(id);

            // ✅ Audit Log: Toggle Status
            await LogUpdateAsync("User", user.UserId, 
                new { is_active = oldStatus }, 
                new { is_active = updatedUser!.IsActive });

            return Ok(new
            {
                message = $"Tài khoản {(updatedUser.IsActive ? "đã được kích hoạt" : "đã bị vô hiệu hoá")}",
                isActive = updatedUser.IsActive
            });
        }
        #endregion
    }
}
