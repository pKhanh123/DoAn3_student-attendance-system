using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    /// <summary>
    /// Đợt đăng ký học phần - Registration Period
    /// Định nghĩa thời gian sinh viên có thể đăng ký môn học
    /// </summary>
    [Table("registration_periods")]
    public class RegistrationPeriod
    {
        [Key]
        [Column("period_id")]
        [MaxLength(50)]
        public string PeriodId { get; set; } = string.Empty;

        [Required]
        [Column("period_name")]
        [MaxLength(200)]
        public string PeriodName { get; set; } = string.Empty;

        [Required]
        [Column("academic_year_id")]
        [MaxLength(50)]
        public string AcademicYearId { get; set; } = string.Empty;

        [Required]
        [Column("semester")]
        public int Semester { get; set; }

        [Required]
        [Column("start_date")]
        public DateTime StartDate { get; set; }

        [Required]
        [Column("end_date")]
        public DateTime EndDate { get; set; }

        [Required]
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "UPCOMING"; // UPCOMING, OPEN, CLOSED

        [Required]
        [Column("period_type")]
        [MaxLength(20)]
        public string PeriodType { get; set; } = "NORMAL"; // NORMAL: đăng ký học phần thường, RETAKE: đăng ký học lại

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
        public string? AcademicYearName { get; set; }

        [NotMapped]
        public int? StartYear { get; set; }

        [NotMapped]
        public int? EndYear { get; set; }

        // Calculated properties
        [NotMapped]
        public bool IsOpen => Status == "OPEN" && DateTime.Now >= StartDate && DateTime.Now <= EndDate;

        [NotMapped]
        public bool IsClosed => Status == "CLOSED" || DateTime.Now > EndDate;

        [NotMapped]
        public bool IsUpcoming => Status == "UPCOMING" || DateTime.Now < StartDate;

        [NotMapped]
        public int DaysRemaining
        {
            get
            {
                if (DateTime.Now > EndDate) return 0;
                return (EndDate - DateTime.Now).Days;
            }
        }

        [NotMapped]
        public string SemesterName => Semester switch
        {
            1 => "Học kỳ 1 (Tháng 9 - Tháng 1)",
            2 => "Học kỳ 2 (Tháng 2 - Tháng 6)",
            _ => $"Học kỳ {Semester}"
        };
    }
}

