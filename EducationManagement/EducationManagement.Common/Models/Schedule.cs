using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("schedules")]
    public class Schedule
    {
        [Key]
        [Column("schedule_id")]
        public string ScheduleId { get; set; } = string.Empty;

        [Required]
        [Column("class_id")]
        [MaxLength(50)]
        public string ClassId { get; set; } = string.Empty;

        // 🔹 Thêm để map kết quả SP (c.class_name, c.class_code)
        [NotMapped]
        public string? ClassName { get; set; }

        [NotMapped]
        public string? ClassCode { get; set; }

        [Column("room")]
        [MaxLength(50)]
        public string? Room { get; set; }

        [Column("day_of_week")]
        [MaxLength(20)]
        public string? DayOfWeek { get; set; }

        [Required]
        [Column("start_time")]
        public DateTime StartTime { get; set; }

        [Required]
        [Column("end_time")]
        public DateTime EndTime { get; set; }

        [Required]
        [Column("schedule_type")]
        [MaxLength(20)]
        public string ScheduleType { get; set; } = "Lecture"; // Lecture, Lab, Exam

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
