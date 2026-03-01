namespace EducationManagement.Common.DTOs.Enrollment
{
    /// <summary>
    /// Request/Response cho việc kiểm tra eligibility
    /// </summary>
    public class EligibilityCheckRequest
    {
        public string StudentId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
    }

    public class EligibilityCheckResponse
    {
        public bool IsEligible { get; set; }
        public string? ErrorMessage { get; set; }
        
        // Detailed checks
        public bool IsInRegistrationPeriod { get; set; }
        public bool HasAvailableSlots { get; set; }
        public bool IsNotAlreadyEnrolled { get; set; }
        public bool NoScheduleConflict { get; set; }
        public bool HasPrerequisites { get; set; }
        
        public string? ConflictingClass { get; set; }
        public string? MissingPrerequisite { get; set; }
    }
}

