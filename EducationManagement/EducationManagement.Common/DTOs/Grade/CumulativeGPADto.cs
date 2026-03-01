using System;

namespace EducationManagement.Common.DTOs.Grade
{
    public class CumulativeGPADto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public decimal? CumulativeGpa10 { get; set; }
        public decimal? CumulativeGpa4 { get; set; }
        public int TotalCreditsEarned { get; set; }
        public int AccumulatedCredits { get; set; }
        public int TotalSubjects { get; set; }
        public int PassedSubjects { get; set; }
        public int FailedSubjects { get; set; }
        
        /// <summary>
        /// Overall rank từ database (tiếng Việt có dấu): "Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu", "Kém"
        /// </summary>
        public string? OverallRank { get; set; }
    }
}

