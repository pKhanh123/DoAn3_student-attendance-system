using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("RolePermissions")] // ✅ Map đúng tên bảng trong SQL Server
    public class RolePermission
    {
        [Key]
        [Column("RolePermissionId")]
        [Required]
        [StringLength(50)]
        public string RolePermissionId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("RoleId")]
        [StringLength(50)]
        public string RoleId { get; set; } = string.Empty;

        [Required]
        [Column("PermissionId")]
        [StringLength(50)]
        public string PermissionId { get; set; } = string.Empty;

        [Required]
        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("CreatedBy")]
        [StringLength(50)]
        public string? CreatedBy { get; set; }

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [Column("UpdatedBy")]
        [StringLength(50)]
        public string? UpdatedBy { get; set; }

        [Column("DeletedAt")]
        public DateTime? DeletedAt { get; set; }

        // ============================================================
        // 🔹 Navigation properties
        // ============================================================
        [ForeignKey(nameof(RoleId))]
        public virtual Role? Role { get; set; }

        [ForeignKey(nameof(PermissionId))]
        public virtual Permission? Permission { get; set; }
    }
}
