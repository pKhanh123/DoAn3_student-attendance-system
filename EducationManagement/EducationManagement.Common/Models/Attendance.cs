using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("attendances")]
    public class Attendance
    {
        [Key]
        [Column("attendance_id")]
        public string AttendanceId { get; set; } = string.Empty;

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
        [Column("schedule_id")]
        [MaxLength(50)]
        public string ScheduleId { get; set; } = string.Empty;

        // 🔹 Thêm để map kết quả SP (sch.start_time, sch.room, c.class_name)
        [NotMapped]
        public DateTime? ScheduleStartTime { get; set; }

        [NotMapped]
        public string? Room { get; set; }

        [NotMapped]
        public string? ClassName { get; set; }

        // 🔹 Thêm để map kết quả SP (sub.subject_name)
        [NotMapped]
        public string? SubjectName { get; set; }

        // 🔹 Thêm để map kết quả SP (l.full_name as lecturer_name)
        [NotMapped]
        public string? LecturerName { get; set; }

        [Column("attendance_date")]
        public DateTime AttendanceDate { get; set; } = DateTime.Now;

        [Required]
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "Present"; // Present, Absent, Late, Excused

        [Column("notes")]
        [MaxLength(500)]
        public string? Notes { get; set; }

        [Column("marked_by")]
        [MaxLength(50)]
        public string? MarkedBy { get; set; }

        // 🔹 Thêm để map kết quả SP (u.full_name)
        [NotMapped]
        public string? MarkedByName { get; set; }

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
