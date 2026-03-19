using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("students")]
    public class Student
    {
        [Key]
        [Column("student_id")]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        [Column("user_id")]
        [MaxLength(50)]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [Column("student_code")]
        [MaxLength(20)]
        public string StudentCode { get; set; } = string.Empty;

        [Required]
        [Column("full_name")]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Column("gender")]
        [MaxLength(10)]
        public string? Gender { get; set; }

        [Column("dob")]
        public DateTime? Dob { get; set; }

        [Column("email")]
        [MaxLength(150)]
        public string? Email { get; set; }

        [Column("phone")]
        [MaxLength(20)]
        public string? Phone { get; set; }

        [Column("faculty_id")]
        [MaxLength(50)]
        public string? FacultyId { get; set; }

        // 🔹 Thêm để map kết quả SP (f.faculty_name)
        [NotMapped]
        public string? FacultyName { get; set; }

        [Column("major_id")]
        [MaxLength(50)]
        public string? MajorId { get; set; }

        // 🔹 Thêm để map kết quả SP (m.major_name)
        [NotMapped]
        public string? MajorName { get; set; }

        [Column("academic_year_id")]
        [MaxLength(50)]
        public string? AcademicYearId { get; set; }

        // 🔹 Thêm để map kết quả SP (ay.year_code)
        [NotMapped]
        public string? YearCode { get; set; }

        [Column("cohort_year")]
        [MaxLength(10)]
        public string? CohortYear { get; set; }

        // ==================================================
        // 🔹 PHASE 1: Administrative Class (Lớp hành chính)
        // ==================================================
        [Column("admin_class_id")]
        [MaxLength(50)]
        public string? AdminClassId { get; set; }

        [NotMapped]
        public string? AdminClassName { get; set; }

        [NotMapped]
        public string? AdminClassCode { get; set; }

        [NotMapped]
        public string? AdvisorName { get; set; }

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









