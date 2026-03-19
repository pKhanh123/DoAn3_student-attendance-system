using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Enrollment
{
    public class RegisterEnrollmentDto
    {
        [Required(ErrorMessage = "Student ID là bắt buộc")]
        public string StudentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Class ID là bắt buộc")]
        public string ClassId { get; set; } = string.Empty;

        [MaxLength(500, ErrorMessage = "Ghi chú không quá 500 ký tự")]
        public string? Notes { get; set; }
    }
}

