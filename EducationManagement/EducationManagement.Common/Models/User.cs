using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("users")]
    public class User
    {
        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("username")]
        public string Username { get; set; } = string.Empty;

        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Column("phone")]
        public string? Phone { get; set; }

        [Column("full_name")]
        public string FullName { get; set; } = string.Empty;

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("role_id")]
        public string RoleId { get; set; } = string.Empty;

        // 🔹 Chỉ dùng để map kết quả từ Stored Procedure
        [NotMapped]
        public string? RoleName { get; set; }

        // 🔹 Dành cho EF nếu bạn có navigation
        public Role? Role { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true; // ✅ Thêm mặc định để tránh null bool

        // ============================================================
        // 🔹 Audit fields
        // ============================================================

        [Column("last_login_at")]
        public DateTime? LastLoginAt { get; set; }   // ✅ nullable

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now; // ✅ luôn có giá trị

        [Column("created_by")]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }     // ✅ nullable

        [Column("updated_by")]
        public string? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }     // ✅ nullable

        [Column("deleted_by")]
        public string? DeletedBy { get; set; }
    }
}
