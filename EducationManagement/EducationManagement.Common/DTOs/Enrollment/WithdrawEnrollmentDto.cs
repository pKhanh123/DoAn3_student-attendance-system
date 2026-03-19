using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Enrollment
{
    public class WithdrawEnrollmentDto
    {
        [Required(ErrorMessage = "Lý do rút học phần là bắt buộc")]
        [MaxLength(500, ErrorMessage = "Lý do không quá 500 ký tự")]
        public string Reason { get; set; } = string.Empty;
    }
}

