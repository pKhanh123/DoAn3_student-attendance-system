using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("classes")]
    public class Class
    {
        [Key]
        [Column("class_id")]
        public string ClassId { get; set; } = string.Empty;

        [Required]
        [Column("class_code")]
        [MaxLength(20)]
        public string ClassCode { get; set; } = string.Empty;

        [Required]
        [Column("class_name")]
        [MaxLength(200)]
        public string ClassName { get; set; } = string.Empty;

        [Required]
        [Column("subject_id")]
        [MaxLength(50)]
        public string SubjectId { get; set; } = string.Empty;

        // 🔹 Thêm để map kết quả SP (s.subject_name, s.credits)
        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public int? Credits { get; set; }

        [Required]
        [Column("lecturer_id")]
        [MaxLength(50)]
        public string LecturerId { get; set; } = string.Empty;

        // 🔹 Thêm để map kết quả SP (u.full_name)
        [NotMapped]
        public string? LecturerName { get; set; }

        [Required]
        [Column("semester")]
        [MaxLength(20)]
        public string Semester { get; set; } = string.Empty;

        [Required]
        [Column("academic_year_id")]
        [MaxLength(50)]
        public string AcademicYearId { get; set; } = string.Empty;

        /// <summary>
        /// NEW: Link to School Year (năm học cụ thể)
        /// </summary>
        [Column("school_year_id")]
        [MaxLength(50)]
        public string? SchoolYearId { get; set; }

        // 🔹 Thêm để map kết quả SP (ay.year_code, ay.year_name)
        [NotMapped]
        public string? YearCode { get; set; }

        [NotMapped]
        public string? AcademicYearName { get; set; }

        [Column("max_students")]
        public int MaxStudents { get; set; } = 50;

        /// <summary>
        /// Số sinh viên hiện tại đã đăng ký (từ cột current_enrollment trong DB)
        /// </summary>
        [Column("current_enrollment")]
        public int CurrentEnrollment { get; set; } = 0;

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
