using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.GradeFormula
{
    public class GradeFormulaConfigUpdateDto
    {
        [Range(0, 1, ErrorMessage = "Midterm weight must be between 0 and 1")]
        public decimal? MidtermWeight { get; set; }

        [Range(0, 1, ErrorMessage = "Final weight must be between 0 and 1")]
        public decimal? FinalWeight { get; set; }

        [Range(0, 1, ErrorMessage = "Assignment weight must be between 0 and 1")]
        public decimal? AssignmentWeight { get; set; }

        [Range(0, 1, ErrorMessage = "Quiz weight must be between 0 and 1")]
        public decimal? QuizWeight { get; set; }

        [Range(0, 1, ErrorMessage = "Project weight must be between 0 and 1")]
        public decimal? ProjectWeight { get; set; }

        [StringLength(500, ErrorMessage = "Custom formula cannot exceed 500 characters")]
        public string? CustomFormula { get; set; }

        [StringLength(20, ErrorMessage = "Rounding method cannot exceed 20 characters")]
        public string? RoundingMethod { get; set; }

        [Range(0, 4, ErrorMessage = "Decimal places must be between 0 and 4")]
        public int? DecimalPlaces { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        public bool? IsDefault { get; set; }

        [Required(ErrorMessage = "Updated by is required")]
        [StringLength(50, ErrorMessage = "Updated by cannot exceed 50 characters")]
        public string UpdatedBy { get; set; } = string.Empty;
    }
}

