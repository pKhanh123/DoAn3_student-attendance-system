using System;

namespace EducationManagement.Common.DTOs.Grade
{
    public class GradeSummaryDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public string? Semester { get; set; }
        public decimal? Gpa10 { get; set; }
        public decimal? Gpa4 { get; set; }
        public int TotalCredits { get; set; }
        public int AccumulatedCredits { get; set; }
        
        /// <summary>
        /// Rank text từ database (tiếng Việt có dấu): "Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu", "Kém"
        /// </summary>
        public string? RankText { get; set; }
        
        public int TotalSubjects { get; set; }
        public int PassedSubjects { get; set; }
        public int FailedSubjects { get; set; }
    }
}

