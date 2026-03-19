using System;

namespace EducationManagement.Common.DTOs.SubjectPrerequisite
{
    public class PrerequisiteDetailDto
    {
        public string PrerequisiteId { get; set; } = string.Empty;
        
        // Subject info (môn cần điều kiện)
        public string SubjectId { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public string? SubjectName { get; set; }
        public int? SubjectCredits { get; set; }
        
        // Prerequisite subject info (môn tiên quyết)
        public string PrerequisiteSubjectId { get; set; } = string.Empty;
        public string? PrerequisiteSubjectCode { get; set; }
        public string? PrerequisiteSubjectName { get; set; }
        public int? PrerequisiteCredits { get; set; }
        
        // Requirement details
        public decimal MinimumGrade { get; set; }
        public bool IsRequired { get; set; }
        public string? Description { get; set; }
        
        // Display helpers
        public string RequiredType => IsRequired ? "Bắt buộc" : "Tùy chọn";
        public string DisplayText => $"{SubjectName} yêu cầu: {PrerequisiteSubjectName} (≥{MinimumGrade})";
        
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
    }
}

