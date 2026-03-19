using System;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO để cập nhật lịch thi
    /// </summary>
    public class UpdateExamScheduleDto
    {
        [Required(ErrorMessage = "Exam ID không được để trống")]
        [StringLength(50)]
        public string ExamId { get; set; } = string.Empty;

        public DateTime? ExamDate { get; set; }
        public TimeSpan? ExamTime { get; set; }
        public TimeSpan? EndTime { get; set; }

        [StringLength(50)]
        public string? RoomId { get; set; }

        public int? SessionNo { get; set; }

        [StringLength(50)]
        public string? ProctorLecturerId { get; set; }

        [Range(1, 600, ErrorMessage = "Thời lượng thi phải từ 1 đến 600 phút")]
        public int? Duration { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Số lượng tối đa sinh viên phải lớn hơn 0")]
        public int? MaxStudents { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }

        [StringLength(20)]
        public string? Status { get; set; }

        [StringLength(50)]
        public string UpdatedBy { get; set; } = string.Empty;
    }
}

