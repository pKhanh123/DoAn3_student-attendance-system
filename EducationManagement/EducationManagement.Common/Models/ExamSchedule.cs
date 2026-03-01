using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    /// <summary>
    /// Lịch thi - Exam Schedule
    /// </summary>
    [Table("exam_schedules")]
    public class ExamSchedule
    {
        [Key]
        [Column("exam_id")]
        [MaxLength(50)]
        public string ExamId { get; set; } = string.Empty;

        [Required]
        [Column("class_id")]
        [MaxLength(50)]
        public string ClassId { get; set; } = string.Empty;

        [Required]
        [Column("subject_id")]
        [MaxLength(50)]
        public string SubjectId { get; set; } = string.Empty;

        [Required]
        [Column("exam_date")]
        public DateTime ExamDate { get; set; }

        [Required]
        [Column("exam_time")]
        public TimeSpan ExamTime { get; set; }

        [Required]
        [Column("end_time")]
        public TimeSpan EndTime { get; set; }

        [Column("room_id")]
        [MaxLength(50)]
        public string? RoomId { get; set; }

        [Required]
        [Column("exam_type")]
        [MaxLength(20)]
        public string ExamType { get; set; } = "GIỮA_HỌC_PHẦN"; // GIỮA_HỌC_PHẦN, KẾT_THÚC_HỌC_PHẦN

        [Column("session_no")]
        public int? SessionNo { get; set; }

        [Column("proctor_lecturer_id")]
        [MaxLength(50)]
        public string? ProctorLecturerId { get; set; }

        [Required]
        [Column("duration")]
        public int Duration { get; set; } // Thời lượng thi (phút)

        [Column("max_students")]
        public int? MaxStudents { get; set; }

        [Column("notes")]
        [MaxLength(500)]
        public string? Notes { get; set; }

        [Required]
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "PLANNED"; // PLANNED, CONFIRMED, COMPLETED, CANCELLED

        [Column("school_year_id")]
        [MaxLength(50)]
        public string? SchoolYearId { get; set; }

        [Column("semester")]
        public int? Semester { get; set; }

        // ==================================================
        // 🔹 NotMapped properties từ JOIN SP
        // ==================================================
        [NotMapped]
        public string? ClassCode { get; set; }

        [NotMapped]
        public string? ClassName { get; set; }

        [NotMapped]
        public string? SubjectCode { get; set; }

        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public string? RoomCode { get; set; }

        [NotMapped]
        public string? Building { get; set; }

        [NotMapped]
        public int? RoomCapacity { get; set; }

        [NotMapped]
        public string? ProctorName { get; set; }

        [NotMapped]
        public string? SchoolYearCode { get; set; }

        [NotMapped]
        public string? SchoolYearName { get; set; }

        [NotMapped]
        public int? AssignedStudents { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
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

        // ==================================================
        // 🔹 Calculated properties
        // ==================================================
        [NotMapped]
        public string ExamTypeName => ExamType switch
        {
            "GIỮA_HỌC_PHẦN" => "Thi giữa học phần",
            "KẾT_THÚC_HỌC_PHẦN" => "Thi kết thúc học phần",
            _ => ExamType
        };

        [NotMapped]
        public string StatusName => Status switch
        {
            "PLANNED" => "Đã lên kế hoạch",
            "CONFIRMED" => "Đã xác nhận",
            "COMPLETED" => "Đã hoàn thành",
            "CANCELLED" => "Đã hủy",
            _ => Status
        };
    }
}

