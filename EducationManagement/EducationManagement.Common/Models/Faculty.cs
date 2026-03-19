using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("faculties")]
    public class Faculty
    {
        [Key]
        [Column("faculty_id")]
        public string? FacultyId { get; set; }

        [Column("faculty_code")]
        [Required]
        [MaxLength(20)]
        public string FacultyCode { get; set; } = string.Empty;

        [Column("faculty_name")]
        [Required]
        [MaxLength(200)]
        public string FacultyName { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("created_by")]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public string? UpdatedBy { get; set; }

        // ==================================================
        // 🔹 Soft delete & trạng thái
        // ==================================================
        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        public string? DeletedBy { get; set; }

        // ==================================================
        // 🔹 Count properties (not mapped to database, used for DTO)
        // ==================================================
        [NotMapped]
        public int DepartmentCount { get; set; }

        [NotMapped]
        public int MajorCount { get; set; }
    }
}
