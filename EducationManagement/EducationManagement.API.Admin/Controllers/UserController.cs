using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.User;
using EducationManagement.Common.Helpers;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication cho tất cả endpoints
    [Route("api-edu/users")]
    public class UserController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly UserRepository _userRepository;
        private readonly string _gatewayUrl;

        public UserController(IWebHostEnvironment env, UserRepository userRepository, IConfiguration configuration)
        {
            _env = env;
            _userRepository = userRepository;
            _gatewayUrl = configuration["GatewayUrl"] ?? "https://localhost:7033";
        }

        #region 🔹 GET: Lấy thông tin user hiện tại (từ token)
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token không hợp lệ" });

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            var dto = MapToDto(user);
            return Ok(new { data = dto });
        }
        #endregion

        #region 🔹 PUT: Cập nhật thông tin + avatar (FormData)
        [HttpPut("me")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateProfile([FromForm] UserUpdateRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token không hợp lệ" });

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            // ✅ Cập nhật thông tin cơ bản (chỉ update nếu có giá trị)
            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName;
            if (!string.IsNullOrWhiteSpace(request.Email))
                user.Email = request.Email;
            if (!string.IsNullOrWhiteSpace(request.Phone))
                user.Phone = request.Phone;
                
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = userId;

            // ✅ Xác định đúng thư mục EducationManagement\Avatar_User
            var projectRoot = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
            var avatarRoot = Path.Combine(projectRoot!, "Avatar_User");
            var uploadPath = avatarRoot;

            if (!Directory.Exists(uploadPath))
                Directory.CreateDirectory(uploadPath);

            // ✅ Xử lý upload avatar mới
            if (request.Avatar != null && request.Avatar.Length > 0)
            {
                var extension = Path.GetExtension(request.Avatar.FileName).ToLower();
                // Convert USER001 → user-001, LEC001 → lec-001
                var userIdFormatted = System.Text.RegularExpressions.Regex.Replace(
                    user.UserId.ToLower(), 
                    @"([a-z]+)(\d+)", 
                    "$1-$2"
                );
                var fileName = $"{userIdFormatted}{extension}";
                var filePath = Path.Combine(uploadPath, fileName);

                // Xóa file cũ nếu tồn tại
                if (System.IO.File.Exists(filePath))
                {
                    try { System.IO.File.Delete(filePath); } catch { }
                }

                // Lưu file mới
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await request.Avatar.CopyToAsync(stream);
                }

                // ✅ Lưu đường dẫn tương đối
                user.AvatarUrl = $"/avatars/{fileName}";
            }

            await _userRepository.UpdateAsync(user);

            // ✅ Tạo URL đầy đủ để FE hiển thị qua Gateway
            var fullAvatarUrl = FileHelper.BuildFullAvatarUrl(
                _gatewayUrl,
                user.AvatarUrl ?? "/avatars/default.png"
            );

            return Ok(new
            {
                message = "Cập nhật thông tin thành công",
                data = new { avatarUrl = fullAvatarUrl }
            });
        }
        #endregion

        #region 🔹 POST: Upload avatar riêng
        [HttpPost("avatar")]
        [DisableRequestSizeLimit]
        public async Task<IActionResult> UploadAvatar([FromForm] AvatarUploadRequest request)
        {
            // Lấy userId từ token
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId))
                return Unauthorized(new { message = "Token không hợp lệ" });

            // Nếu không cung cấp userId thì dùng currentUserId
            var targetUserId = string.IsNullOrEmpty(request.UserId) ? currentUserId : request.UserId;

            var user = await _userRepository.GetByIdAsync(targetUserId);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            if (request.Avatar == null || request.Avatar.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file ảnh" });

            // Validate file type
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var extension = Path.GetExtension(request.Avatar.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = "Chỉ chấp nhận file ảnh JPG, PNG, GIF" });

            // Validate file size (5MB)
            if (request.Avatar.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Kích thước file không được vượt quá 5MB" });

            // ✅ Xác định thư mục upload
            var projectRoot = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
            var avatarRoot = Path.Combine(projectRoot!, "Avatar_User");
            var uploadPath = avatarRoot;

            if (!Directory.Exists(uploadPath))
                Directory.CreateDirectory(uploadPath);

            // ✅ Tạo tên file unique (format: user-001.jpg)
            // Convert USER001 → user-001, LEC001 → lec-001
            var userIdFormatted = System.Text.RegularExpressions.Regex.Replace(
                user.UserId.ToLower(), 
                @"([a-z]+)(\d+)", 
                "$1-$2"
            );
            var fileName = $"{userIdFormatted}{extension}";
            var filePath = Path.Combine(uploadPath, fileName);

            // Xóa file cũ nếu tồn tại
            if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { }
            }

            // ✅ Lưu file mới
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Avatar.CopyToAsync(stream);
            }

            // ✅ Cập nhật DB - LƯU PATH TƯƠNG ĐỐI
            user.AvatarUrl = $"/avatars/{fileName}";
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = currentUserId;
            await _userRepository.UpdateAsync(user);

            // ✅ Tạo URL đầy đủ để FE hiển thị
            var fullAvatarUrl = FileHelper.BuildFullAvatarUrl(_gatewayUrl, user.AvatarUrl);


            return Ok(new
            {
                message = "Tải ảnh đại diện thành công",
                avatarUrl = fullAvatarUrl,
                data = new { avatarUrl = fullAvatarUrl }
            });
        }
        #endregion

        #region 📌 DTO nội bộ
        public class UserUpdateRequest
        {
            public string? FullName { get; set; }
            public string? Email { get; set; }
            public string? Phone { get; set; }
            public IFormFile? Avatar { get; set; }
        }

        public class AvatarUploadRequest
        {
            public IFormFile Avatar { get; set; } = null!;
            public string? UserId { get; set; }
        }
        #endregion

        #region 📌 Helper: Map entity → DTO
        private UserResponseDto MapToDto(User user)
        {
            string relativePath = user.AvatarUrl?.Trim() ?? "";

            // ✅ Chuẩn hóa đường dẫn để tránh lỗi ghép path
            if (string.IsNullOrEmpty(relativePath))
            {
                relativePath = "/avatars/default.png";
            }
            else
            {
                // ép dấu / và đảm bảo có tiền tố "uploads/"
                relativePath = relativePath.Replace("\\", "/");
                if (!relativePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) &&
                    !relativePath.StartsWith("/avatars/", StringComparison.OrdinalIgnoreCase))
                {
                    relativePath = "/uploads/" + relativePath.TrimStart('/');
                }

                var projectRoot = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
                var avatarRoot = Path.Combine(projectRoot!, "Avatar_User");
                var physicalPath = Path.Combine(
                    avatarRoot,
                    relativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)
                );

                if (!System.IO.File.Exists(physicalPath))
                    relativePath = "/avatars/default.png";
            }

            return new UserResponseDto
            {
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone ?? string.Empty,
                RoleId = user.RoleId,
                RoleName = user.Role?.RoleName ?? user.RoleName,
                AvatarUrl = FileHelper.BuildFullAvatarUrl(_gatewayUrl, relativePath) ?? string.Empty
            };
        }
        #endregion
    }
}
