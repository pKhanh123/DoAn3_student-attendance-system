using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Enrollment
{
    public class DropEnrollmentDto
    {
        [Required(ErrorMessage = "Lý do hủy đăng ký là bắt buộc")]
        [MaxLength(500, ErrorMessage = "Lý do không quá 500 ký tự")]
        public string Reason { get; set; } = string.Empty;
    }
}

