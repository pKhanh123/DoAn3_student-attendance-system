using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Retake
{
    /// <summary>
    /// DTO for creating RetakeRecord
    /// </summary>
    public class RetakeRecordCreateDto
    {
        [Required(ErrorMessage = "Enrollment ID is required")]
        [StringLength(50, ErrorMessage = "Enrollment ID cannot exceed 50 characters")]
        public string EnrollmentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Student ID is required")]
        [StringLength(50, ErrorMessage = "Student ID cannot exceed 50 characters")]
        public string StudentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Class ID is required")]
        [StringLength(50, ErrorMessage = "Class ID cannot exceed 50 characters")]
        public string ClassId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Subject ID is required")]
        [StringLength(50, ErrorMessage = "Subject ID cannot exceed 50 characters")]
        public string SubjectId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Reason is required")]
        [StringLength(20, ErrorMessage = "Reason cannot exceed 20 characters")]
        public string Reason { get; set; } = string.Empty; // ATTENDANCE, GRADE, BOTH

        public decimal? ThresholdValue { get; set; }

        public decimal? CurrentValue { get; set; }

        [StringLength(50, ErrorMessage = "Created by cannot exceed 50 characters")]
        public string? CreatedBy { get; set; }
    }
}

