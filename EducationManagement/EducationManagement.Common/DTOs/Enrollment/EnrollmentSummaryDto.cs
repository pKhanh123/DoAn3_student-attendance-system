namespace EducationManagement.Common.DTOs.Enrollment
{
    public class EnrollmentSummaryDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int? Semester { get; set; }
        
        public int TotalEnrolled { get; set; }
        public int TotalApproved { get; set; }
        public int TotalPending { get; set; }
        public int TotalDropped { get; set; }
        public int TotalWithdrawn { get; set; }
        
        public int TotalCredits { get; set; }
        public int MaxCredits { get; set; } = 24; // Default max credits per semester
        
        public bool CanEnrollMore => TotalCredits < MaxCredits;
        public int RemainingCredits => Math.Max(0, MaxCredits - TotalCredits);
    }
}

