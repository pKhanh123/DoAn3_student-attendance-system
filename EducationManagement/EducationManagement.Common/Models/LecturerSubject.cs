using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("lecturer_subjects")]
    public class LecturerSubject
    {
        [Key]
        [Column("lecturer_subject_id")]
        public string LecturerSubjectId { get; set; } = string.Empty;

        [Required]
        [Column("lecturer_id")]
        [MaxLength(50)]
        public string LecturerId { get; set; } = string.Empty;

        [Required]
        [Column("subject_id")]
        [MaxLength(50)]
        public string SubjectId { get; set; } = string.Empty;

        [Column("is_primary")]
        public bool IsPrimary { get; set; } = false;

        [Column("experience_years")]
        public int ExperienceYears { get; set; } = 0;

        [Column("notes")]
        [MaxLength(500)]
        public string? Notes { get; set; }

        [Column("certified_date")]
        public DateTime? CertifiedDate { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
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
    }
}



