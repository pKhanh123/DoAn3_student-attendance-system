using System;

namespace EducationManagement.Common.DTOs.Advisor
{
    public class AdvisorStudentGradeDto
    {
        public string GradeId { get; set; } = string.Empty;
        public string EnrollmentId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int? Credits { get; set; }
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public string? SchoolYearName { get; set; }
        public int? Semester { get; set; }
        public decimal? MidtermScore { get; set; }
        public decimal? FinalScore { get; set; }
        public decimal? TotalScore { get; set; }
        public string? LetterGrade { get; set; }
        public DateTime? CreatedAt { get; set; }
    }
    
    public class AdvisorStudentGradesSummaryDto
    {
        public decimal? SemesterGpa { get; set; }
        public decimal? CumulativeGpa { get; set; }
        public int TotalCredits { get; set; }
        public int PassedCredits { get; set; }
        public int FailedCredits { get; set; }
        public int TotalSubjects { get; set; }
        public int PassedSubjects { get; set; }
        public int FailedSubjects { get; set; }
    }
}

