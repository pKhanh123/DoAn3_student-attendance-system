using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.AdministrativeClass
{
    public class UpdateAdminClassDto
    {
        [Required(ErrorMessage = "Mã lớp là bắt buộc")]
        [MaxLength(20, ErrorMessage = "Mã lớp không quá 20 ký tự")]
        public string ClassCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên lớp là bắt buộc")]
        [MaxLength(150, ErrorMessage = "Tên lớp không quá 150 ký tự")]
        public string ClassName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? MajorId { get; set; }

        [MaxLength(50)]
        public string? AdvisorId { get; set; }

        [MaxLength(50)]
        public string? AcademicYearId { get; set; }

        [Required(ErrorMessage = "Khóa là bắt buộc")]
        [Range(2000, 2100, ErrorMessage = "Khóa phải từ 2000 đến 2100")]
        public int CohortYear { get; set; }

        [Range(1, 200, ErrorMessage = "Sĩ số tối đa từ 1 đến 200")]
        public int MaxStudents { get; set; } = 50;

        [MaxLength(500, ErrorMessage = "Mô tả không quá 500 ký tự")]
        public string? Description { get; set; }
    }
}

