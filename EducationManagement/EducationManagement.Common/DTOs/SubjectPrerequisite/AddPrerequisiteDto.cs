using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.SubjectPrerequisite
{
    public class AddPrerequisiteDto
    {
        [Required(ErrorMessage = "Subject ID là bắt buộc")]
        public string SubjectId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Prerequisite Subject ID là bắt buộc")]
        public string PrerequisiteSubjectId { get; set; } = string.Empty;

        [Range(0, 10, ErrorMessage = "Điểm tối thiểu phải từ 0 đến 10")]
        public decimal MinimumGrade { get; set; } = 4.0M;

        public bool IsRequired { get; set; } = true;

        [MaxLength(500, ErrorMessage = "Mô tả không quá 500 ký tự")]
        public string? Description { get; set; }
    }
}

