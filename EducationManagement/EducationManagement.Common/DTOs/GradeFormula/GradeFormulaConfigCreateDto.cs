using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.GradeFormula
{
    public class GradeFormulaConfigCreateDto
    {
        [StringLength(50, ErrorMessage = "Subject ID cannot exceed 50 characters")]
        public string? SubjectId { get; set; }

        [StringLength(50, ErrorMessage = "Class ID cannot exceed 50 characters")]
        public string? ClassId { get; set; }

        [StringLength(50, ErrorMessage = "School Year ID cannot exceed 50 characters")]
        public string? SchoolYearId { get; set; }

        [Required(ErrorMessage = "Midterm weight is required")]
        [Range(0, 1, ErrorMessage = "Midterm weight must be between 0 and 1")]
        public decimal MidtermWeight { get; set; } = 0.30m;

        [Required(ErrorMessage = "Final weight is required")]
        [Range(0, 1, ErrorMessage = "Final weight must be between 0 and 1")]
        public decimal FinalWeight { get; set; } = 0.70m;

        [Range(0, 1, ErrorMessage = "Assignment weight must be between 0 and 1")]
        public decimal? AssignmentWeight { get; set; } = 0.00m;

        [Range(0, 1, ErrorMessage = "Quiz weight must be between 0 and 1")]
        public decimal? QuizWeight { get; set; } = 0.00m;

        [Range(0, 1, ErrorMessage = "Project weight must be between 0 and 1")]
        public decimal? ProjectWeight { get; set; } = 0.00m;

        [StringLength(500, ErrorMessage = "Custom formula cannot exceed 500 characters")]
        public string? CustomFormula { get; set; }

        [StringLength(20, ErrorMessage = "Rounding method cannot exceed 20 characters")]
        public string? RoundingMethod { get; set; } = "STANDARD"; // STANDARD, CEILING, FLOOR, NONE

        [Range(0, 4, ErrorMessage = "Decimal places must be between 0 and 4")]
        public int? DecimalPlaces { get; set; } = 2;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        public bool IsDefault { get; set; } = false;

        [Required(ErrorMessage = "Created by is required")]
        [StringLength(50, ErrorMessage = "Created by cannot exceed 50 characters")]
        public string CreatedBy { get; set; } = string.Empty;
    }
}

