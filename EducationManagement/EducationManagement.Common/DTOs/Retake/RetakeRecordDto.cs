using System;

namespace EducationManagement.Common.DTOs.Retake
{
    /// <summary>
    /// DTO for RetakeRecord response
    /// </summary>
    public class RetakeRecordDto
    {
        public string RetakeId { get; set; } = string.Empty;
        public string EnrollmentId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string? StudentCode { get; set; }
        public string? StudentName { get; set; }
        public string ClassId { get; set; } = string.Empty;
        public string? ClassCode { get; set; }
        public string? ClassName { get; set; }
        public string SubjectId { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public string? SubjectName { get; set; }
        public string Reason { get; set; } = string.Empty; // ATTENDANCE, GRADE, BOTH
        public decimal? ThresholdValue { get; set; }
        public decimal? CurrentValue { get; set; }
        public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, COMPLETED
        public string? AdvisorNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? ResolvedBy { get; set; }
        public string? SchoolYearCode { get; set; }
        public int? Semester { get; set; }
    }
}

