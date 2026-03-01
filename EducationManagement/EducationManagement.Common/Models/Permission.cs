using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("Permissions")]
    public class Permission
    {
        [Key]
        [Column("PermissionId")]
        public string PermissionId { get; set; } = Guid.NewGuid().ToString();

        [Column("PermissionCode")]
        [Required, MaxLength(100)]
        public string PermissionCode { get; set; } = string.Empty;

        [Column("PermissionName")]
        [Required, MaxLength(200)]
        public string PermissionName { get; set; } = string.Empty;

        // 🔹 Dùng cho menu con (dropdown trong FE)
        [Column("ParentCode")]
        [MaxLength(100)]
        public string? ParentCode { get; set; }

        // 🔹 Icon hiển thị (FontAwesome)
        [Column("Icon")]
        [MaxLength(100)]
        public string? Icon { get; set; }

        [Column("Description")]
        public string? Description { get; set; }

        // ✅ Thứ tự hiển thị menu
        [Column("SortOrder")]
        public int? SortOrder { get; set; }

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        // ✅ Flag để phân biệt: menu-only permissions (chỉ cho menu) vs executable permissions (check authorization)
        [Column("IsMenuOnly")]
        public bool IsMenuOnly { get; set; } = false;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("CreatedBy")]
        public string? CreatedBy { get; set; }

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [Column("UpdatedBy")]
        public string? UpdatedBy { get; set; }

        [Column("DeletedAt")]
        public DateTime? DeletedAt { get; set; }
    }
}
