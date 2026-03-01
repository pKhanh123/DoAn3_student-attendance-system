using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("subjects")]
    public class Subject
    {
        [Key]
        [Column("subject_id")]
        public string SubjectId { get; set; } = string.Empty;

        [Required]
        [Column("subject_code")]
        [MaxLength(20)]
        public string SubjectCode { get; set; } = string.Empty;

        [Required]
        [Column("subject_name")]
        [MaxLength(200)]
        public string SubjectName { get; set; } = string.Empty;

        [Required]
        [Column("credits")]
        public int Credits { get; set; }

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        [Column("department_id")]
        [MaxLength(50)]
        public string? DepartmentId { get; set; }

        // 🔹 Thêm để map kết quả SP (d.department_name)
        [NotMapped]
        public string? DepartmentName { get; set; }

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