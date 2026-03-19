using System;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.RegistrationPeriod
{
    public class CreatePeriodDto
    {
        [Required(ErrorMessage = "Tên đợt đăng ký là bắt buộc")]
        [MaxLength(200, ErrorMessage = "Tên đợt không quá 200 ký tự")]
        public string PeriodName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Năm học là bắt buộc")]
        [MaxLength(50)]
        public string AcademicYearId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Học kỳ là bắt buộc")]
        [Range(1, 3, ErrorMessage = "Học kỳ phải là 1, 2, hoặc 3")]
        public int Semester { get; set; }

        [Required(ErrorMessage = "Ngày bắt đầu là bắt buộc")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "Ngày kết thúc là bắt buộc")]
        public DateTime EndDate { get; set; }

        [MaxLength(20)]
        public string PeriodType { get; set; } = "NORMAL"; // NORMAL: đăng ký học phần thường, RETAKE: đăng ký học lại

        [MaxLength(500)]
        public string? Description { get; set; }
    }
}

