using System;
using System.Linq;
using System.Threading.Tasks;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Models;

namespace EducationManagement.BLL.Services
{
    public class AuthService
    {
        private readonly UserRepository _userRepository;
        private readonly IRefreshTokenStore _refreshStore;

        public AuthService(UserRepository userRepository, IRefreshTokenStore refreshStore)
        {
            _userRepository = userRepository;
            _refreshStore = refreshStore;
        }

        // 🔹 Kiểm tra thông tin đăng nhập
        public async Task<User?> ValidateUserAsync(string username, string password)
        {
            var normalizedUsername = username.Trim().ToLower();
            var dbLookupStart = DateTime.UtcNow;

            // 🔍 DEBUG LOG
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AuthService.ValidateUserAsync] Looking up user: {normalizedUsername} [{dbLookupStart:HH:mm:ss.fff}]");
            Console.ResetColor();

            // ✅ Lấy user từ repository
            var user = await _userRepository.GetByUsernameAsync(normalizedUsername);
            
            var dbLookupTime = (DateTime.UtcNow - dbLookupStart).TotalMilliseconds;
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AuthService.ValidateUserAsync] ⏱️ Database lookup took: {dbLookupTime:F2}ms");
            Console.ResetColor();

            if (user == null)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[AuthService.ValidateUserAsync] ❌ User not found: {normalizedUsername}");
                Console.ResetColor();
                return null;
            }
            
            if (!user.IsActive)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[AuthService.ValidateUserAsync] ❌ User is not active: {normalizedUsername}");
                Console.ResetColor();
                return null;
            }

            // 🔍 DEBUG LOG
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AuthService.ValidateUserAsync] User found: {user.Username} (ID: {user.UserId}, Active: {user.IsActive})");
            Console.WriteLine($"[AuthService.ValidateUserAsync] Checking password...");
            Console.ResetColor();

            // ✅ Kiểm tra mật khẩu (BCrypt)
            // 🔧 FIX: Trim hash để tránh trailing spaces từ database
            var passwordHash = user.PasswordHash?.Trim() ?? "";
            var bcryptStartTime = DateTime.UtcNow;
            
            // 🔍 DEBUG LOG - KHÔNG log password hash thực tế vì bảo mật
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AuthService.ValidateUserAsync] Password hash exists: {!string.IsNullOrEmpty(passwordHash)}");
            Console.WriteLine($"[AuthService.ValidateUserAsync] Password hash length: {passwordHash.Length}");
            Console.WriteLine($"[AuthService.ValidateUserAsync] Password hash prefix: {(passwordHash.Length >= 10 ? passwordHash.Substring(0, 10) : "N/A")}");
            Console.WriteLine($"[AuthService.ValidateUserAsync] Password length: {password?.Length ?? 0}");
            Console.WriteLine($"[AuthService.ValidateUserAsync] Password (first 3 chars): {(password?.Length >= 3 ? password.Substring(0, 3) : "N/A")}");
            Console.ResetColor();
            
            var isValid = BCrypt.Net.BCrypt.Verify(password, passwordHash);
            
            var bcryptTime = (DateTime.UtcNow - bcryptStartTime).TotalMilliseconds;
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[AuthService.ValidateUserAsync] ⏱️ BCrypt verification took: {bcryptTime:F2}ms");
            Console.ResetColor();

            if (!isValid)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[AuthService.ValidateUserAsync] ❌ Password verification failed for: {normalizedUsername}");
                Console.ResetColor();
                return null;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[AuthService.ValidateUserAsync] ✅ Password verified successfully for: {normalizedUsername}");
            Console.ResetColor();
            return user;
        }

        // 🔹 Hash mật khẩu dùng chung
        public string HashPassword(string password, int workFactor = 12)
        {
            // ⚙️ Work factor 12 để tương thích với hash cũ ($2b$12$)
            // Có thể giảm xuống 10 trong môi trường dev/test cho nhanh
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: workFactor);
        }

        // 🔹 Verify mật khẩu dùng chung
        public bool VerifyPassword(string password, string passwordHash)
        {
            // 🔧 FIX: Trim hash để tránh trailing spaces từ database
            var hash = passwordHash?.Trim() ?? "";
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }

        // 🔹 Lưu refresh token
        public async Task SaveRefreshTokenAsync(string userId, RefreshToken refreshToken)
        {
            await _refreshStore.SaveAsync(userId, refreshToken);
        }

        // 🔹 Lấy refresh token từ DB
        public async Task<RefreshToken?> GetRefreshTokenAsync(string token)
        {
            return await _refreshStore.GetByTokenAsync(token);
        }

        // 🔹 Revoke refresh token (đánh dấu không dùng nữa)
        public async Task RevokeRefreshTokenAsync(Guid id)
        {
            await _refreshStore.RevokeAsync(id);
        }

        // 🔹 Lấy thông tin user từ DB
        public async Task<User?> GetUserByIdAsync(string userId)
        {
            return await _userRepository.GetByIdAsync(userId);
        }

        // 🔹 Lấy thông tin user theo email (cho forgot password)
        public async Task<User?> GetUserByEmailAsync(string email)
        {
            return await _userRepository.GetByEmailAsync(email);
        }

        // 🔹 Cập nhật mật khẩu user
        public async Task<bool> UpdatePasswordAsync(string userId, string newPassword)
        {
            return await _userRepository.UpdatePasswordAsync(userId, HashPassword(newPassword));
        }
    }
}
