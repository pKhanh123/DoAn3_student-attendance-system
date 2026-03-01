using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Enrollment
{
    public class EnrollmentCreateDto
    {
        [Required(ErrorMessage = "Class ID là bắt buộc")]
        [MaxLength(50)]
        public string ClassId { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}

