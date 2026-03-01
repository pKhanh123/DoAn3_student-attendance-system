using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs;
using EducationManagement.Common.DTOs.User;
using EducationManagement.Common.Models;
using EducationManagement.Common.Helpers;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Route("api-edu/auth")]
    public class AuthController : BaseController
    {
        private readonly AuthService _authService;
        private readonly JwtService _jwtService;
        private readonly OTPService _otpService;
        private readonly EmailService _emailService;
        private readonly string _avatarFolder;
        private readonly string _gatewayUrl;

        public AuthController(
            AuthService authService, 
            JwtService jwtService,
            OTPService otpService,
            EmailService emailService,
            IConfiguration configuration,
            AuditLogService auditLogService) : base(auditLogService)
        {
            _authService = authService;
            _jwtService = jwtService;
            _otpService = otpService;
            _emailService = emailService;
            
            // ✅ Dùng Gateway URL (Microservices pattern)
            _gatewayUrl = configuration["GatewayUrl"] ?? "https://localhost:7033";

            // ✅ Xác định thư mục chứa avatar
            var projectRoot = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
            _avatarFolder = Path.Combine(projectRoot!, "Avatar_User");

            if (!Directory.Exists(_avatarFolder))
                Directory.CreateDirectory(_avatarFolder);

        }

        // ============================================================
        // 🔹 LOGIN
        // ============================================================
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // ⏱️ PERFORMANCE TRACKING
            var startTime = DateTime.UtcNow;
            
            // 🔍 DEBUG LOG
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[AuthController.Login] ✅ Request reached controller! [{DateTime.UtcNow:HH:mm:ss.fff}]");
            Console.WriteLine($"[AuthController.Login] Request: {request?.Username ?? "null"}");
            Console.ResetColor();
            
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[AuthController.Login] ❌ BadRequest: Missing credentials");
                Console.ResetColor();
                return BadRequest(new { message = "Vui lòng nhập đầy đủ tài khoản và mật khẩu" });
            }

            // 🔍 DEBUG LOG
            var validationStartTime = DateTime.UtcNow;
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[AuthController.Login] Validating user: {request.Username} [{validationStartTime:HH:mm:ss.fff}]");
            Console.ResetColor();
            
            var user = await _authService.ValidateUserAsync(request.Username, request.Password);
            
            var validationTime = (DateTime.UtcNow - validationStartTime).TotalMilliseconds;
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AuthController.Login] ⏱️ User validation took: {validationTime:F2}ms");
            Console.ResetColor();
            
            // 🔍 DEBUG LOG
            if (user == null)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[AuthController.Login] ❌ User validation failed for: {request.Username}");
                Console.WriteLine($"[AuthController.Login] Returning 401 Unauthorized");
                Console.ResetColor();
                // Return consistent error message
                return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng" });
            }
            
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[AuthController.Login] ✅ User validated: {user.Username} (ID: {user.UserId})");
            Console.ResetColor();

            // ✅ Sinh token
            var tokenStartTime = DateTime.UtcNow;
            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken();
            await _authService.SaveRefreshTokenAsync(user.UserId, refreshToken);
            var tokenTime = (DateTime.UtcNow - tokenStartTime).TotalMilliseconds;
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AuthController.Login] ⏱️ Token generation & save took: {tokenTime:F2}ms");
            Console.ResetColor();

            // ✅ Chuẩn hóa đường dẫn avatar
            string avatarPath = FileHelper.NormalizeAvatarUrl(user.AvatarUrl, _avatarFolder);
            
            // ✅ Build full URL qua Gateway (Microservices pattern)
            // Frontend sẽ load từ Gateway: https://localhost:7033/avatars/user-001.jpg
            // Gateway sẽ proxy request đến Admin API:5227
            string fullAvatarUrl = $"{_gatewayUrl}{avatarPath}";

            // ✅ Tạo response
            var response = new LoginResponse
            {
                Token = accessToken,
                RefreshToken = refreshToken.Token,
                RefreshTokenExpiry = refreshToken.ExpiresAt.ToUniversalTime(),
                UserId = user.UserId,
                Username = user.Username,
                Role = user.RoleName ?? "User",
                FullName = user.FullName ?? string.Empty,
                AvatarUrl = fullAvatarUrl
            };

            // ✅ Audit Log: Login (async, không block response)
            // Chạy audit log trong background để không làm chậm response
            var auditStartTime = DateTime.UtcNow;
            _ = Task.Run(async () =>
            {
                try
                {
                    await LogLoginAsync(user.UserId, new { 
                        ten_dang_nhap = user.Username, 
                        vai_tro = user.RoleName,
                        thoi_gian_dang_nhap = DateTime.UtcNow 
                    });
                    var auditTime = (DateTime.UtcNow - auditStartTime).TotalMilliseconds;
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.WriteLine($"[AuthController.Login] ⏱️ Audit log (background) took: {auditTime:F2}ms");
                    Console.ResetColor();
                }
                catch (Exception ex)
                {
                    // Không fail request nếu audit log fail
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"[AuthController.Login] ⚠️ Audit log failed: {ex.Message}");
                    Console.ResetColor();
                }
            });

            var totalTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[AuthController.Login] ✅ Login completed in: {totalTime:F2}ms");
            Console.WriteLine($"[AuthController.Login] ✅ Response: 200 OK for {user.Username}");
            Console.ResetColor();
            
            return Ok(new { data = response });
        }

        // ============================================================
        // 🔹 REFRESH TOKEN
        // ============================================================
        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RefreshToken))
                return BadRequest(new { message = "Thiếu refresh token" });

            var oldToken = await _authService.GetRefreshTokenAsync(request.RefreshToken);
            if (oldToken == null || !oldToken.IsActive)
                return Unauthorized(new { message = "Refresh token không hợp lệ hoặc đã hết hạn" });

            var user = await _authService.GetUserByIdAsync(oldToken.UserId);
            if (user == null)
                return Unauthorized(new { message = "Không tìm thấy người dùng" });

            // ✅ Tạo token mới
            var newAccessToken = _jwtService.GenerateAccessToken(user);
            var newRefreshToken = _jwtService.GenerateRefreshToken();

            await _authService.RevokeRefreshTokenAsync(oldToken.Id);
            await _authService.SaveRefreshTokenAsync(user.UserId, newRefreshToken);

            return Ok(new
            {
                Token = newAccessToken,
                RefreshToken = newRefreshToken.Token,
                RefreshTokenExpiry = newRefreshToken.ExpiresAt
            });
        }

        // ============================================================
        // 🔹 LOGOUT
        // ============================================================
        [HttpPost("logout")]
        [AllowAnonymous] // ✅ Cho phép logout mà không cần authentication (token có thể đã hết hạn)
        public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RefreshToken))
                return BadRequest(new { message = "Thiếu refresh token" });

            var token = await _authService.GetRefreshTokenAsync(request.RefreshToken);
            if (token != null)
            {
                await _authService.RevokeRefreshTokenAsync(token.Id);
                
                // ✅ Audit Log: Logout (nếu có user ID từ token)
                if (!string.IsNullOrEmpty(token.UserId))
                {
                    await LogLogoutAsync(token.UserId);
                }
            }

            return Ok(new { message = "Đăng xuất thành công" });
        }

        // ============================================================
        // 🔹 FORGOT PASSWORD - GỬI OTP
        // ============================================================
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập email" });
            }

            try
            {
                var email = request.Email.Trim().ToLower();
                
                // Kiểm tra email có tồn tại trong hệ thống không
                var user = await _authService.GetUserByEmailAsync(email);
                if (user == null)
                {
                    // Không tiết lộ email có tồn tại hay không (security best practice)
                    return Ok(new { 
                        success = true, 
                        message = "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được mã OTP qua email." 
                    });
                }

                // Generate OTP 4 số
                var otp = await _otpService.GenerateOTPAsync(email);

                // Gửi email OTP
                await _emailService.SendOTPEmailAsync(email, otp, user.FullName ?? user.Username);

                // ✅ Audit Log: Forgot Password Request
                await LogAuditAsync("FORGOT_PASSWORD_REQUEST", "Auth", user.UserId, null, new
                {
                    email = email,
                    thoi_gian = DateTime.UtcNow
                });

                return Ok(new { 
                    success = true, 
                    message = "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư." 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        // ============================================================
        // 🔹 VERIFY OTP
        // ============================================================
        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOTP([FromBody] VerifyOTPRequest request)
        {
            if (request == null || 
                string.IsNullOrWhiteSpace(request.Email) || 
                string.IsNullOrWhiteSpace(request.OTP))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ email và mã OTP" });
            }

            try
            {
                var email = request.Email.Trim().ToLower();
                var otp = request.OTP.Trim();

                // Verify OTP
                var (isValid, message) = await _otpService.VerifyOTPAsync(email, otp);
                
                if (!isValid)
                {
                    return BadRequest(new { success = false, message });
                }

                // Kiểm tra user tồn tại
                var user = await _authService.GetUserByEmailAsync(email);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = "Email không tồn tại trong hệ thống" });
                }

                // ✅ Audit Log: OTP Verified
                await LogAuditAsync("OTP_VERIFIED", "Auth", user.UserId, null, new
                {
                    email = email,
                    thoi_gian = DateTime.UtcNow
                });

                return Ok(new { 
                    success = true, 
                    message = "Mã OTP hợp lệ. Bạn có thể đặt lại mật khẩu.",
                    data = new { email = email }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        // ============================================================
        // 🔹 GET OTP REMAINING TIME (for countdown timer)
        // ============================================================
        [HttpGet("otp-remaining-time")]
        [AllowAnonymous]
        public async Task<IActionResult> GetOTPRemainingTime([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { success = false, message = "Email không được để trống" });
            }

            try
            {
                var remainingSeconds = await _otpService.GetRemainingSecondsAsync(email.Trim().ToLower());
                
                if (remainingSeconds == null)
                {
                    return Ok(new { success = false, remainingSeconds = 0, message = "Mã OTP không tồn tại hoặc đã hết hạn" });
                }

                return Ok(new { success = true, remainingSeconds = remainingSeconds.Value });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        // ============================================================
        // 🔹 RESET PASSWORD
        // ============================================================
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (request == null || 
                string.IsNullOrWhiteSpace(request.Email) || 
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ thông tin" });
            }

            // Validate password strength
            if (request.NewPassword.Length < 6)
            {
                return BadRequest(new { success = false, message = "Mật khẩu phải có ít nhất 6 ký tự" });
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest(new { success = false, message = "Mật khẩu xác nhận không khớp" });
            }

            try
            {
                var email = request.Email.Trim().ToLower();

                // Kiểm tra OTP đã được verify chưa
                var isOTPVerified = await _otpService.IsOTPVerifiedAsync(email);
                if (!isOTPVerified)
                {
                    return BadRequest(new { 
                        success = false, 
                        message = "Mã OTP chưa được xác thực hoặc đã hết hạn. Vui lòng thực hiện lại từ đầu." 
                    });
                }

                // Lấy user
                var user = await _authService.GetUserByEmailAsync(email);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = "Email không tồn tại trong hệ thống" });
                }

                // Cập nhật mật khẩu
                var success = await _authService.UpdatePasswordAsync(user.UserId, request.NewPassword);
                if (!success)
                {
                    return StatusCode(500, new { success = false, message = "Không thể cập nhật mật khẩu. Vui lòng thử lại sau." });
                }

                // Xóa OTP sau khi reset thành công
                await _otpService.InvalidateOTPAsync(email);

                // ✅ Audit Log: Password Reset
                await LogAuditAsync("PASSWORD_RESET", "Auth", user.UserId, null, new
                {
                    email = email,
                    thoi_gian = DateTime.UtcNow
                });

                return Ok(new { 
                    success = true, 
                    message = "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới." 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }
    }

    // DTOs for Forgot Password Flow
    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class VerifyOTPRequest
    {
        public string Email { get; set; } = string.Empty;
        public string OTP { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
