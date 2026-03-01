using System;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO để tạo lịch thi mới
    /// </summary>
    public class CreateExamScheduleDto
    {
        [Required(ErrorMessage = "Class ID không được để trống")]
        [StringLength(50)]
        public string ClassId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Subject ID không được để trống")]
        [StringLength(50)]
        public string SubjectId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ngày thi không được để trống")]
        public DateTime ExamDate { get; set; }

        [Required(ErrorMessage = "Giờ bắt đầu không được để trống")]
        public TimeSpan ExamTime { get; set; }

        [Required(ErrorMessage = "Giờ kết thúc không được để trống")]
        public TimeSpan EndTime { get; set; }

        [StringLength(50)]
        public string? RoomId { get; set; }

        [Required(ErrorMessage = "Loại kỳ thi không được để trống")]
        [StringLength(20)]
        public string ExamType { get; set; } = "GIỮA_HỌC_PHẦN"; // GIỮA_HỌC_PHẦN, KẾT_THÚC_HỌC_PHẦN

        public int? SessionNo { get; set; }

        [StringLength(50)]
        public string? ProctorLecturerId { get; set; }

        [Required(ErrorMessage = "Thời lượng thi không được để trống")]
        [Range(1, 600, ErrorMessage = "Thời lượng thi phải từ 1 đến 600 phút")]
        public int Duration { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Số lượng tối đa sinh viên phải lớn hơn 0")]
        public int? MaxStudents { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "PLANNED";

        [StringLength(50)]
        public string? SchoolYearId { get; set; }

        public int? Semester { get; set; }

        [StringLength(50)]
        public string CreatedBy { get; set; } = string.Empty;
    }
}

