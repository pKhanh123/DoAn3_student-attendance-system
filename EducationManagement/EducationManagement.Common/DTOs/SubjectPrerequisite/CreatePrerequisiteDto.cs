using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.SubjectPrerequisite
{
    public class CreatePrerequisiteDto
    {
        [Required(ErrorMessage = "Subject ID là bắt buộc")]
        [MaxLength(50)]
        public string SubjectId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Prerequisite Subject ID là bắt buộc")]
        [MaxLength(50)]
        public string PrerequisiteSubjectId { get; set; } = string.Empty;

        [Range(0, 10, ErrorMessage = "Điểm tối thiểu từ 0 đến 10")]
        public decimal MinimumGrade { get; set; } = 4.0M;

        public bool IsRequired { get; set; } = true;

        [MaxLength(500)]
        public string? Description { get; set; }
    }
}

