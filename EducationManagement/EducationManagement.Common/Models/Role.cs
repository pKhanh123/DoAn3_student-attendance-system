using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("roles")]
    public class Role
    {
        [Column("role_id")]
        public string? RoleId { get; set; }

        [Column("role_name")]
        public string RoleName { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }   // cho phép NULL

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("created_by")]
        public string? CreatedBy { get; set; }     // cho phép NULL

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public string? UpdatedBy { get; set; }     // cho phép NULL

        [Column("is_active")]
        public bool IsActive { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        public string? DeletedBy { get; set; }     // cho phép NULL

        // Quan hệ 1-n: Một Role có nhiều Users
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
