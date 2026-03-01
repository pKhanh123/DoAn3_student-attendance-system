namespace EducationManagement.Common.DTOs.Advisor
{
    public class AcademicWarningDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? ClassName { get; set; }
        public string? FacultyName { get; set; }
        public string? MajorName { get; set; }
        public string? CohortYear { get; set; }
        public decimal? Gpa { get; set; }
    }
}

