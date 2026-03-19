namespace EducationManagement.Common.DTOs.Report
{
    public class AdvisorReportDto
    {
        public int TotalStudents { get; set; }
        public int WarningStudents { get; set; }
        public decimal AverageGpa { get; set; }
        public decimal AverageAttendanceRate { get; set; }
        public List<ClassStatDto> ClassStats { get; set; } = new();
    }

    public class ClassStatDto
    {
        public string ClassId { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int WarningStudents { get; set; }
        public decimal AverageGpa { get; set; }
        public decimal AverageAttendanceRate { get; set; }
    }
}
