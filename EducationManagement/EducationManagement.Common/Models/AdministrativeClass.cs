using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    /// <summary>
    /// Lớp hành chính - Administrative Class
    /// Sinh viên được phân vào 1 lớp hành chính cố định suốt khóa học
    /// </summary>
    [Table("administrative_classes")]
    public class AdministrativeClass
    {
        [Key]
        [Column("admin_class_id")]
        [MaxLength(50)]
        public string AdminClassId { get; set; } = string.Empty;

        [Required]
        [Column("class_code")]
        [MaxLength(20)]
        public string ClassCode { get; set; } = string.Empty;

        [Required]
        [Column("class_name")]
        [MaxLength(150)]
        public string ClassName { get; set; } = string.Empty;

        [Column("major_id")]
        [MaxLength(50)]
        public string? MajorId { get; set; }

        [Column("advisor_id")]
        [MaxLength(50)]
        public string? AdvisorId { get; set; }

        [Column("academic_year_id")]
        [MaxLength(50)]
        public string? AcademicYearId { get; set; }

        [Required]
        [Column("cohort_year")]
        public int CohortYear { get; set; }

        [Column("max_students")]
        public int MaxStudents { get; set; } = 50;

        [Column("current_students")]
        public int CurrentStudents { get; set; } = 0;

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

        // Navigation properties (not mapped to DB, filled from JOINs)
        [NotMapped]
        public string? MajorName { get; set; }

        [NotMapped]
        public string? MajorCode { get; set; }

        [NotMapped]
        public string? AdvisorName { get; set; }

        [NotMapped]
        public string? AdvisorEmail { get; set; }

        [NotMapped]
        public string? FacultyName { get; set; }

        [NotMapped]
        public string? DepartmentName { get; set; }

        [NotMapped]
        public string? AcademicYearName { get; set; }

        // Calculated properties
        [NotMapped]
        public int AvailableSlots => MaxStudents - CurrentStudents;

        [NotMapped]
        public double FillPercentage => MaxStudents > 0 ? (double)CurrentStudents / MaxStudents * 100 : 0;

        [NotMapped]
        public bool IsFull => CurrentStudents >= MaxStudents;
    }
}

