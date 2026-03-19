using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EducationManagement.Common.DTOs
{
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime RefreshTokenExpiry { get; set; }

        public string UserId { get; set; } = string.Empty;     // 👈 thêm
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;  // 👈 thêm
    }
}
