using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EducationManagement.Common.Models
{
    public class RefreshToken
    {
        public Guid Id { get; set; } = Guid.NewGuid();   // Khóa chính

        // 🔑 UserId là string để khớp với User.cs
        public string UserId { get; set; } = string.Empty;

        public string Token { get; set; } = string.Empty;                // Chuỗi token
        public DateTime ExpiresAt { get; set; }          // Thời gian hết hạn
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? RevokedAt { get; set; }         // Khi logout / revoke

        // Thuộc tính tiện lợi
        public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
        public bool IsActive => RevokedAt == null && !IsExpired;
    }
}