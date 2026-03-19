using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("gpas")]
    public class GPA
    {
        [Key]
        [Column("gpa_id")]
        public string GpaId { get; set; } = string.Empty;

        [Required]
        [Column("student_id")]
        [MaxLength(50)]
        public string StudentId { get; set; } = string.Empty;

        // 🔹 Thêm để map kết quả SP (s.student_code, s.full_name)
        [NotMapped]
        public string? StudentCode { get; set; }

        [NotMapped]
        public string? StudentName { get; set; }

        [Required]
        [Column("term")]
        [MaxLength(20)]
        public string Term { get; set; } = string.Empty; // Fall 2024, Spring 2025

        [Required]
        [Column("academic_year_id")]
        [MaxLength(50)]
        public string AcademicYearId { get; set; } = string.Empty;

        // 🔹 Link to School Year (năm học cụ thể)
        [Column("school_year_id")]
        [MaxLength(50)]
        public string? SchoolYearId { get; set; }

        // 🔹 Thêm để map kết quả SP (ay.year_code)
        [NotMapped]
        public string? YearCode { get; set; }

        [NotMapped]
        public string? SchoolYearCode { get; set; }

        [Column("gpa10")]
        [Range(0, 10, ErrorMessage = "GPA 10 must be between 0 and 10")]
        public decimal? Gpa10 { get; set; }

        [Column("gpa4")]
        [Range(0, 4, ErrorMessage = "GPA 4 must be between 0 and 4")]
        public decimal? Gpa4 { get; set; }

        [Column("accumulated_credits")]
        public int? AccumulatedCredits { get; set; }

        [Column("rank_text")]
        [MaxLength(50)]
        public string? RankText { get; set; } // Xuất sắc, Giỏi, Khá, Trung bình, Yếu, Kém (Tiếng Việt có dấu - encoding UTF-8)

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
