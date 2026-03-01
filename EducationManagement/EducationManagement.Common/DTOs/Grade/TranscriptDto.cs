using System;

namespace EducationManagement.Common.DTOs.Grade
{
    public class TranscriptDto
    {
        public string GpaId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public string? CohortCode { get; set; }
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public string? SchoolYearName { get; set; }
        public int? Semester { get; set; }
        public string? SemesterText { get; set; }
        public decimal? Gpa10 { get; set; }
        public decimal? Gpa4 { get; set; }
        public int? TotalCredits { get; set; }
        public int? AccumulatedCredits { get; set; }
        
        /// <summary>
        /// Rank text từ database (tiếng Việt có dấu): "Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu", "Kém"
        /// </summary>
        public string? RankText { get; set; }
        
        public DateTime? CalculatedAt { get; set; }
    }
}

