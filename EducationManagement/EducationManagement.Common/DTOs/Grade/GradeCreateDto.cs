using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Grade
{
    public class GradeCreateDto
    {
        [Required(ErrorMessage = "Student ID is required")]
        [StringLength(50, ErrorMessage = "Student ID cannot exceed 50 characters")]
        public string StudentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Class ID is required")]
        [StringLength(50, ErrorMessage = "Class ID cannot exceed 50 characters")]
        public string ClassId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Grade type is required")]
        [StringLength(20, ErrorMessage = "Grade type cannot exceed 20 characters")]
        public string GradeType { get; set; } = string.Empty; // Quiz, Midterm, Final, Assignment

        [Required(ErrorMessage = "Score is required")]
        [Range(0, 10, ErrorMessage = "Score must be between 0 and 10")]
        public decimal Score { get; set; }

        [Required(ErrorMessage = "Max score is required")]
        [Range(0, 10, ErrorMessage = "Max score must be between 0 and 10")]
        public decimal MaxScore { get; set; } = 10.0m;

        [Required(ErrorMessage = "Weight is required")]
        [Range(0, 1, ErrorMessage = "Weight must be between 0 and 1")]
        public decimal Weight { get; set; } = 1.0m;

        [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
        public string? Notes { get; set; }

        [StringLength(50, ErrorMessage = "Graded by cannot exceed 50 characters")]
        public string? GradedBy { get; set; }

        [Required(ErrorMessage = "Created by is required")]
        [StringLength(50, ErrorMessage = "Created by cannot exceed 50 characters")]
        public string CreatedBy { get; set; } = string.Empty;
    }
}
