using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using EducationManagement.Common.Models;
using Microsoft.Extensions.Configuration;

namespace EducationManagement.BLL.Services
{
    public class JwtService
    {
        private readonly IConfiguration _config;

        public JwtService(IConfiguration config)
        {
            _config = config;
        }

        // ============================================================
        // 🔹 TẠO ACCESS TOKEN (JWT)
        // ============================================================
        public string GenerateAccessToken(User user)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            var secretKey = _config["Jwt:SecretKey"]
                            ?? throw new InvalidOperationException("Missing Jwt:SecretKey in appsettings.json");

            var issuer = _config["Jwt:Issuer"] ?? "EducationManagement";
            var audience = _config["Jwt:Audience"] ?? "EducationClient";
            var expireMinutes = Convert.ToDouble(_config["Jwt:ExpireMinutes"] ?? "60");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId ?? string.Empty),
                new Claim(ClaimTypes.Name, user.Username ?? string.Empty),
                new Claim("FullName", user.FullName ?? string.Empty),
                new Claim(ClaimTypes.Role, user.RoleName ?? user.Role?.RoleName ?? "User")
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(expireMinutes),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            string jwt = tokenHandler.WriteToken(token);
            
            // Console.WriteLine($"[JWT] ✅ Token created for user '{user.Username}' (exp: {expireMinutes} mins)"); // Tắt để tránh spam log
            return jwt;
        }

        // ============================================================
        // 🔹 TẠO REFRESH TOKEN (ngẫu nhiên, lưu trong DB)
        // ============================================================
        public RefreshToken GenerateRefreshToken()
        {
            return new RefreshToken
            {
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7) // có thể chỉnh qua config
            };
        }
    }
}
