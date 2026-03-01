using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("grade_appeals")]
    public class GradeAppeal
    {
        [Key]
        [Column("appeal_id")]
        public string AppealId { get; set; } = string.Empty;

        [Required]
        [Column("grade_id")]
        [MaxLength(50)]
        public string GradeId { get; set; } = string.Empty;

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
        [Column("appeal_reason")]
        [MaxLength(1000)]
        public string AppealReason { get; set; } = string.Empty;

        [Column("current_score")]
        public decimal? CurrentScore { get; set; }

        [Column("expected_score")]
        public decimal? ExpectedScore { get; set; }

        [Column("component_type")]
        [MaxLength(20)]
        public string? ComponentType { get; set; } // MIDTERM, FINAL, ATTENDANCE, ASSIGNMENT

        [Column("supporting_docs")]
        [MaxLength(500)]
        public string? SupportingDocs { get; set; }

        [Required]
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "PENDING"; // PENDING, REVIEWING, APPROVED, REJECTED, CANCELLED

        [Column("priority")]
        [MaxLength(10)]
        public string? Priority { get; set; } = "NORMAL"; // LOW, NORMAL, HIGH, URGENT

        [Column("lecturer_response")]
        [MaxLength(1000)]
        public string? LecturerResponse { get; set; }

        [Column("lecturer_id")]
        [MaxLength(50)]
        public string? LecturerId { get; set; }

        [Column("lecturer_decision")]
        [MaxLength(20)]
        public string? LecturerDecision { get; set; } // APPROVE, REJECT, NEED_REVIEW

        [Column("advisor_id")]
        [MaxLength(50)]
        public string? AdvisorId { get; set; }

        [Column("advisor_response")]
        [MaxLength(1000)]
        public string? AdvisorResponse { get; set; }

        [Column("advisor_decision")]
        [MaxLength(20)]
        public string? AdvisorDecision { get; set; } // APPROVE, REJECT

        [Column("final_score")]
        public decimal? FinalScore { get; set; }

        [Column("resolution_notes")]
        [MaxLength(1000)]
        public string? ResolutionNotes { get; set; }

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
        public string? StudentEmail { get; set; }

        [NotMapped]
        public string? StudentUserId { get; set; }

        [NotMapped]
        public string? ClassCode { get; set; }

        [NotMapped]
        public string? ClassName { get; set; }

        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public string? SubjectCode { get; set; }

        [NotMapped]
        public decimal? MidtermScore { get; set; }

        [NotMapped]
        public decimal? GradeFinalScore { get; set; } // Final score from grades table (subject final score)

        [NotMapped]
        public decimal? TotalScore { get; set; }

        [NotMapped]
        public string? LetterGrade { get; set; }

        [NotMapped]
        public string? LecturerCode { get; set; }

        [NotMapped]
        public string? LecturerName { get; set; }

        [NotMapped]
        public string? LecturerEmail { get; set; }

        [NotMapped]
        public string? AdvisorCode { get; set; }

        [NotMapped]
        public string? AdvisorName { get; set; }

        [NotMapped]
        public string? AdvisorEmail { get; set; }

        [NotMapped]
        public string? AdvisorUserId { get; set; }

        [NotMapped]
        public string? LecturerUserId { get; set; }
    }
}

