using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("majors")]
    public class Major
    {
        [Key]
        [Column("major_id")]
        public string MajorId { get; set; } = string.Empty;

        [Required]
        [Column("major_code")]
        [MaxLength(20)]
        public string MajorCode { get; set; } = string.Empty;

        [Required]
        [Column("major_name")]
        [MaxLength(200)]
        public string MajorName { get; set; } = string.Empty;

        [Required]
        [Column("faculty_id")]
        [MaxLength(50)]
        public string FacultyId { get; set; } = string.Empty;

        // 🔹 Thêm để map kết quả SP (f.faculty_name)
        [NotMapped]
        public string? FacultyName { get; set; }

        [Column("description")]
        [MaxLength(255)]
        public string? Description { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("created_by")]
        [MaxLength(50)]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        [MaxLength(50)]
        public string? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        [MaxLength(50)]
        public string? DeletedBy { get; set; }
    }
}