using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    /// <summary>
    /// Phân sinh viên vào ca thi - Exam Assignment
    /// </summary>
    [Table("exam_assignments")]
    public class ExamAssignment
    {
        [Key]
        [Column("assignment_id")]
        [MaxLength(50)]
        public string AssignmentId { get; set; } = string.Empty;

        [Required]
        [Column("exam_id")]
        [MaxLength(50)]
        public string ExamId { get; set; } = string.Empty;

        [Required]
        [Column("enrollment_id")]
        [MaxLength(50)]
        public string EnrollmentId { get; set; } = string.Empty;

        [Required]
        [Column("student_id")]
        [MaxLength(50)]
        public string StudentId { get; set; } = string.Empty;

        [Column("seat_number")]
        public int? SeatNumber { get; set; }

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "ASSIGNED"; // ASSIGNED, NOT_QUALIFIED, ATTENDED, ABSENT, EXCUSED

        [Column("notes")]
        [MaxLength(500)]
        public string? Notes { get; set; }

        // ==================================================
        // 🔹 NotMapped properties từ JOIN SP
        // ==================================================
        [NotMapped]
        public string? StudentCode { get; set; }

        [NotMapped]
        public string? StudentName { get; set; }

        [NotMapped]
        public string? ExamDate { get; set; }

        [NotMapped]
        public string? ExamType { get; set; }

        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public string? RoomCode { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("created_by")]
        [MaxLength(50)]
        public string? CreatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        [MaxLength(50)]
        public string? DeletedBy { get; set; }

        // ==================================================
        // 🔹 Calculated properties
        // ==================================================
        [NotMapped]
        public string StatusName => Status switch
        {
            "ASSIGNED" => "Đã phân ca thi",
            "NOT_QUALIFIED" => "Không đủ điều kiện dự thi",
            "ATTENDED" => "Đã dự thi",
            "ABSENT" => "Vắng thi",
            "EXCUSED" => "Vắng thi có lý do",
            _ => Status
        };

        [NotMapped]
        public bool IsQualified => Status != "NOT_QUALIFIED";
    }
}

