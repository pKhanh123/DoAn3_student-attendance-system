using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.GradeAppeal
{
    public class GradeAppealCreateDto
    {
        [Required(ErrorMessage = "Grade ID is required")]
        [StringLength(50, ErrorMessage = "Grade ID cannot exceed 50 characters")]
        public string GradeId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Enrollment ID is required")]
        [StringLength(50, ErrorMessage = "Enrollment ID cannot exceed 50 characters")]
        public string EnrollmentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Student ID is required")]
        [StringLength(50, ErrorMessage = "Student ID cannot exceed 50 characters")]
        public string StudentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Class ID is required")]
        [StringLength(50, ErrorMessage = "Class ID cannot exceed 50 characters")]
        public string ClassId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Appeal reason is required")]
        [StringLength(1000, ErrorMessage = "Appeal reason cannot exceed 1000 characters")]
        public string AppealReason { get; set; } = string.Empty;

        [Range(0, 10, ErrorMessage = "Current score must be between 0 and 10")]
        public decimal? CurrentScore { get; set; }

        [Range(0, 10, ErrorMessage = "Expected score must be between 0 and 10")]
        public decimal? ExpectedScore { get; set; }

        [Required(ErrorMessage = "Component type is required")]
        [StringLength(20, ErrorMessage = "Component type cannot exceed 20 characters")]
        public string ComponentType { get; set; } = string.Empty; // MIDTERM, FINAL, ATTENDANCE, ASSIGNMENT

        [Required(ErrorMessage = "Created by is required")]
        [StringLength(50, ErrorMessage = "Created by cannot exceed 50 characters")]
        public string CreatedBy { get; set; } = string.Empty;
    }
}

