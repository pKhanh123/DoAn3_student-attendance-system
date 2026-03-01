using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("retake_records")]
    public class RetakeRecord
    {
        [Key]
        [Column("retake_id")]
        public string RetakeId { get; set; } = string.Empty;

        [Required]
        [Column("enrollment_id")]
        [MaxLength(50)]
        public string EnrollmentId { get; set; } = string.Empty;

        [Required]
        [Column("student_id")]
        [MaxLength(50)]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        [Column("class_id")]
        [MaxLength(50)]
        public string ClassId { get; set; } = string.Empty;

        [Required]
        [Column("subject_id")]
        [MaxLength(50)]
        public string SubjectId { get; set; } = string.Empty;

        [Required]
        [Column("reason")]
        [MaxLength(20)]
        public string Reason { get; set; } = string.Empty; // ATTENDANCE, GRADE, BOTH

        [Column("threshold_value")]
        public decimal? ThresholdValue { get; set; }

        [Column("current_value")]
        public decimal? CurrentValue { get; set; }

        [Required]
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, COMPLETED

        [Column("advisor_notes")]
        [MaxLength(1000)]
        public string? AdvisorNotes { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("created_by")]
        [MaxLength(50)]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        [MaxLength(50)]
        public string? UpdatedBy { get; set; }

        [Column("resolved_at")]
        public DateTime? ResolvedAt { get; set; }

        [Column("resolved_by")]
        [MaxLength(50)]
        public string? ResolvedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        [MaxLength(50)]
        public string? DeletedBy { get; set; }

        // ==================================================
        // 🔹 NotMapped properties từ JOIN SP
        // ==================================================
        [NotMapped]
        public string? StudentCode { get; set; }

        [NotMapped]
        public string? StudentName { get; set; }

        [NotMapped]
        public string? ClassCode { get; set; }

        [NotMapped]
        public string? ClassName { get; set; }

        [NotMapped]
        public string? SubjectCode { get; set; }

        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public string? SchoolYearCode { get; set; }

        [NotMapped]
        public int? Semester { get; set; }

        [NotMapped]
        public DateTime? EnrollmentDate { get; set; }
    }
}

