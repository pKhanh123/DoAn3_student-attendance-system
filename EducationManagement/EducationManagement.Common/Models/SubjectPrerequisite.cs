using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    /// <summary>
    /// Điều kiện tiên quyết môn học - Subject Prerequisites
    /// Định nghĩa môn học cần hoàn thành trước khi đăng ký môn khác
    /// </summary>
    [Table("subject_prerequisites")]
    public class SubjectPrerequisite
    {
        [Key]
        [Column("prerequisite_id")]
        [MaxLength(50)]
        public string PrerequisiteId { get; set; } = string.Empty;

        [Required]
        [Column("subject_id")]
        [MaxLength(50)]
        public string SubjectId { get; set; } = string.Empty;

        [Required]
        [Column("prerequisite_subject_id")]
        [MaxLength(50)]
        public string PrerequisiteSubjectId { get; set; } = string.Empty;

        [Column("minimum_grade")]
        public decimal MinimumGrade { get; set; } = 4.0M;

        [Column("is_required")]
        public bool IsRequired { get; set; } = true;

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        // Audit fields
        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

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

        // Navigation properties
        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public string? SubjectCode { get; set; }

        [NotMapped]
        public string? PrerequisiteSubjectName { get; set; }

        [NotMapped]
        public string? PrerequisiteSubjectCode { get; set; }

        [NotMapped]
        public int? PrerequisiteCredits { get; set; }

        // Display helpers
        [NotMapped]
        public string RequiredType => IsRequired ? "Bắt buộc" : "Tùy chọn";

        [NotMapped]
        public string DisplayText => $"{SubjectName} yêu cầu: {PrerequisiteSubjectName} (≥{MinimumGrade})";
    }
}

