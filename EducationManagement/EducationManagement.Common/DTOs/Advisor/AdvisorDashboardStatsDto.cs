namespace EducationManagement.Common.DTOs.Advisor
{
    /// <summary>
    /// DTO for Advisor Dashboard Statistics
    /// </summary>
    public class AdvisorDashboardStatsDto
    {
        public int TotalStudents { get; set; }
        public int WarningAttendanceStudents { get; set; }
        public int LowGpaStudents { get; set; }
        public int ExcellentStudents { get; set; }
        public decimal AverageAttendanceRate { get; set; }
        public decimal AveragePassRate { get; set; }
        public decimal AverageGpa { get; set; }
    }
}

