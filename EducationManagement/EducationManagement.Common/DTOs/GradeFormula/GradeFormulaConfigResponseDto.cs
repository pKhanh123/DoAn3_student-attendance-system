using System;
using System.Collections.Generic;

namespace EducationManagement.Common.DTOs.GradeFormula
{
    public class GradeFormulaConfigResponseDto
    {
        public string ConfigId { get; set; } = string.Empty;
        public string? SubjectId { get; set; }
        public string? ClassId { get; set; }
        public string? SchoolYearId { get; set; }
        public decimal MidtermWeight { get; set; }
        public decimal FinalWeight { get; set; }
        public decimal? AssignmentWeight { get; set; }
        public decimal? QuizWeight { get; set; }
        public decimal? ProjectWeight { get; set; }
        public string? CustomFormula { get; set; }
        public string? RoundingMethod { get; set; }
        public int? DecimalPlaces { get; set; }
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        // Additional info from joins
        public string? SubjectCode { get; set; }
        public string? SubjectName { get; set; }
        public string? ClassCode { get; set; }
        public string? ClassName { get; set; }
        public string? SchoolYearCode { get; set; }
        public string? SchoolYearName { get; set; }
    }

    public class GradeFormulaConfigListResponseDto
    {
        public List<GradeFormulaConfigResponseDto> Configs { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class GradeFormulaResolveRequestDto
    {
        public string? ClassId { get; set; }
        public string? SubjectId { get; set; }
        public string? SchoolYearId { get; set; }
    }
}

