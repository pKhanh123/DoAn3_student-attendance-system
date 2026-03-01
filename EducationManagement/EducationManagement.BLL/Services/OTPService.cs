using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Service quản lý OTP (One-Time Password) cho forgot password
    /// </summary>
    public class OTPService
    {
        private readonly IDistributedCache _cache;
        private const int OTP_EXPIRY_MINUTES = 5; // OTP hết hạn sau 5 phút
        private const string OTP_PREFIX = "OTP_FORGOT_PASSWORD_";

        public OTPService(IDistributedCache cache)
        {
            _cache = cache;
        }

        /// <summary>
        /// Generate OTP 4 số và lưu vào cache
        /// </summary>
        public async Task<string> GenerateOTPAsync(string email)
        {
            // Generate OTP 4 số (0000-9999)
            var random = new Random();
            var otp = random.Next(1000, 9999).ToString("D4"); // Đảm bảo luôn có 4 số

            // Lưu OTP vào cache với key là email
            var cacheKey = $"{OTP_PREFIX}{email.ToLower().Trim()}";
            var otpData = new OTPData
            {
                Code = otp,
                Email = email.ToLower().Trim(),
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(OTP_EXPIRY_MINUTES),
                Attempts = 0
            };

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRY_MINUTES)
            };

            var jsonData = JsonSerializer.Serialize(otpData);
            await _cache.SetStringAsync(cacheKey, jsonData, options);

            return otp;
        }

        /// <summary>
        /// Verify OTP
        /// </summary>
        public async Task<(bool IsValid, string? Message)> VerifyOTPAsync(string email, string otp)
        {
            var cacheKey = $"{OTP_PREFIX}{email.ToLower().Trim()}";
            var cachedData = await _cache.GetStringAsync(cacheKey);

            if (string.IsNullOrEmpty(cachedData))
            {
                return (false, "Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.");
            }

            var otpData = JsonSerializer.Deserialize<OTPData>(cachedData);
            if (otpData == null)
            {
                return (false, "Dữ liệu OTP không hợp lệ.");
            }

            // Kiểm tra hết hạn
            if (DateTime.UtcNow > otpData.ExpiresAt)
            {
                await _cache.RemoveAsync(cacheKey);
                return (false, "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
            }

            // Kiểm tra số lần thử (tối đa 5 lần)
            if (otpData.Attempts >= 5)
            {
                await _cache.RemoveAsync(cacheKey);
                return (false, "Đã vượt quá số lần thử cho phép. Vui lòng yêu cầu mã mới.");
            }

            // Tăng số lần thử
            otpData.Attempts++;
            var updatedJson = JsonSerializer.Serialize(otpData);
            await _cache.SetStringAsync(cacheKey, updatedJson, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRY_MINUTES)
            });

            // Kiểm tra OTP
            if (otpData.Code != otp.Trim())
            {
                return (false, $"Mã OTP không đúng. Bạn còn {5 - otpData.Attempts} lần thử.");
            }

            // OTP đúng - đánh dấu đã verify (không xóa ngay, để dùng cho reset password)
            otpData.IsVerified = true;
            var verifiedJson = JsonSerializer.Serialize(otpData);
            await _cache.SetStringAsync(cacheKey, verifiedJson, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) // Cho thêm 10 phút để reset password
            });

            return (true, "Mã OTP hợp lệ.");
        }

        /// <summary>
        /// Kiểm tra OTP đã được verify chưa (cho reset password)
        /// </summary>
        public async Task<bool> IsOTPVerifiedAsync(string email)
        {
            var cacheKey = $"{OTP_PREFIX}{email.ToLower().Trim()}";
            var cachedData = await _cache.GetStringAsync(cacheKey);

            if (string.IsNullOrEmpty(cachedData))
                return false;

            var otpData = JsonSerializer.Deserialize<OTPData>(cachedData);
            return otpData?.IsVerified == true && DateTime.UtcNow <= otpData.ExpiresAt;
        }

        /// <summary>
        /// Xóa OTP sau khi reset password thành công
        /// </summary>
        public async Task InvalidateOTPAsync(string email)
        {
            var cacheKey = $"{OTP_PREFIX}{email.ToLower().Trim()}";
            await _cache.RemoveAsync(cacheKey);
        }

        /// <summary>
        /// Lấy thời gian còn lại của OTP (để hiển thị countdown)
        /// </summary>
        public async Task<int?> GetRemainingSecondsAsync(string email)
        {
            var cacheKey = $"{OTP_PREFIX}{email.ToLower().Trim()}";
            var cachedData = await _cache.GetStringAsync(cacheKey);

            if (string.IsNullOrEmpty(cachedData))
                return null;

            var otpData = JsonSerializer.Deserialize<OTPData>(cachedData);
            if (otpData == null || DateTime.UtcNow > otpData.ExpiresAt)
                return null;

            var remaining = (int)(otpData.ExpiresAt - DateTime.UtcNow).TotalSeconds;
            return remaining > 0 ? remaining : 0;
        }

        private class OTPData
        {
            public string Code { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public DateTime CreatedAt { get; set; }
            public DateTime ExpiresAt { get; set; }
            public int Attempts { get; set; }
            public bool IsVerified { get; set; }
        }
    }
}

