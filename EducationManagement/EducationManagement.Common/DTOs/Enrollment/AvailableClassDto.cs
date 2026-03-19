namespace EducationManagement.Common.DTOs.Enrollment
{
    /// <summary>
    /// Lớp có thể đăng ký (bao gồm thông tin eligibility)
    /// </summary>
    public class AvailableClassDto
    {
        public string ClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        
        // Subject info
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int Credits { get; set; }
        
        // Lecturer info
        public string? LecturerId { get; set; }
        public string? LecturerName { get; set; }
        
        // Schedule & capacity
        public string? Schedule { get; set; }
        public string? Room { get; set; }
        public int MaxStudents { get; set; }
        public int CurrentEnrollment { get; set; }
        public int AvailableSlots => MaxStudents - CurrentEnrollment;
        public bool IsFull => CurrentEnrollment >= MaxStudents;
        
        // Eligibility
        public bool IsEligible { get; set; }
        public string? IneligibleReason { get; set; }
        
        // Additional flags
        public bool IsAlreadyEnrolled { get; set; }
        public bool HasScheduleConflict { get; set; }
        public bool MissingPrerequisites { get; set; }
        public string? ConflictingClassName { get; set; }
    }
}

