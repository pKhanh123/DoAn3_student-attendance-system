using System;

namespace EducationManagement.Common.DTOs.Advisor
{
    public class AdvisorStudentDetailDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public DateTime? Dob { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? FacultyId { get; set; }
        public string? FacultyName { get; set; }
        public string? MajorId { get; set; }
        public string? MajorName { get; set; }
        public string? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public string? ClassId { get; set; }
        public string? ClassName { get; set; }
        public string? CohortYear { get; set; }
        public bool IsActive { get; set; }
        
        // Academic Summary
        public decimal? CumulativeGpa { get; set; }
        public decimal? AttendanceRate { get; set; }
        public int? TotalCreditsEarned { get; set; }
        public int? TotalCreditsRegistered { get; set; }
        public int? TotalSubjects { get; set; }
        public int? PassedSubjects { get; set; }
        public int? FailedSubjects { get; set; }
        
        // Warning Status
        public string WarningType { get; set; } = "none"; // attendance, academic, both, none
        public int Priority { get; set; } // 0: none, 1: academic, 2: attendance, 3: both
    }
}

