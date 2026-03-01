using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("grades")]
    public class Grade
    {
        [Key]
        [Column("grade_id")]
        public string GradeId { get; set; } = string.Empty;

        [Required]
        [Column("enrollment_id")]
        [MaxLength(50)]
        public string EnrollmentId { get; set; } = string.Empty;

        [Column("midterm_score")]
        public decimal? MidtermScore { get; set; }

        [Column("final_score")]
        public decimal? FinalScore { get; set; }

        [Column("attendance_score")]
        public decimal? AttendanceScore { get; set; }

        [Column("assignment_score")]
        public decimal? AssignmentScore { get; set; }

        [Column("total_score")]
        public decimal? TotalScore { get; set; }

        [Column("letter_grade")]
        [MaxLength(5)]
        public string? LetterGrade { get; set; }

        // 🔹 NotMapped properties từ JOIN SP
        [NotMapped]
        public string? StudentId { get; set; }

        [NotMapped]
        public string? StudentCode { get; set; }

        [NotMapped]
        public string? StudentName { get; set; }

        [NotMapped]
        public string? ClassId { get; set; }

        [NotMapped]
        public string? ClassName { get; set; }

        [NotMapped]
        public string? ClassCode { get; set; }

        [NotMapped]
        public string? SchoolYearId { get; set; }

        [NotMapped]
        public string? SchoolYearCode { get; set; }

        [NotMapped]
        public string? Semester { get; set; }

        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public int? Credits { get; set; }

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
    }
}
