using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO cho điểm của sinh viên trong kỳ thi
    /// </summary>
    public class ExamScoreDto
    {
        [Required(ErrorMessage = "Assignment ID không được để trống")]
        [StringLength(50)]
        public string AssignmentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Student ID không được để trống")]
        [StringLength(50)]
        public string StudentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Enrollment ID không được để trống")]
        [StringLength(50)]
        public string EnrollmentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Điểm không được để trống")]
        [Range(0, 10, ErrorMessage = "Điểm phải trong khoảng 0-10")]
        public decimal Score { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }

        public string Status { get; set; } = "ATTENDED"; // ATTENDED, ABSENT, EXCUSED
    }
}

