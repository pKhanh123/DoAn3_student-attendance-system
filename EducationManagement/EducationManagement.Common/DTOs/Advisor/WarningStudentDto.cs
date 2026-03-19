namespace EducationManagement.Common.DTOs.Advisor
{
    /// <summary>
    /// DTO for Warning Students (students with attendance or academic issues)
    /// </summary>
    public class WarningStudentDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? ClassName { get; set; }
        public string? FacultyName { get; set; }
        public string? MajorName { get; set; }
        public decimal? Gpa { get; set; }
        public decimal? AttendanceRate { get; set; }
        public string WarningType { get; set; } = string.Empty; // "attendance", "academic", "both"
        public int Priority { get; set; } // Higher priority = more urgent
    }
}

