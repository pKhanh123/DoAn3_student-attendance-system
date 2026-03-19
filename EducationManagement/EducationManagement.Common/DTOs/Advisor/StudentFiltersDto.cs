namespace EducationManagement.Common.DTOs.Advisor
{
    /// <summary>
    /// DTO for filtering students in advisor endpoints
    /// </summary>
    public class StudentFiltersDto
    {
        public string? FacultyId { get; set; }
        public string? MajorId { get; set; }
        public string? ClassId { get; set; }
        public string? CohortYear { get; set; }
        public string? Search { get; set; }
        public string? WarningStatus { get; set; } // "attendance", "academic", "both", "none"
        public decimal? GpaMin { get; set; }
        public decimal? GpaMax { get; set; }
        public decimal? AttendanceRateMin { get; set; }
        public decimal? AttendanceRateMax { get; set; }
        public bool ShowAll { get; set; } = false; // Cho phép hiển thị toàn bộ sinh viên không cần filter
    }
}

