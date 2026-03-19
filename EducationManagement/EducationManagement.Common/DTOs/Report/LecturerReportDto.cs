namespace EducationManagement.Common.DTOs.Report
{
    public class LecturerReportDto
    {
        public int TotalClasses { get; set; }
        public int TotalStudents { get; set; }
        public decimal AverageAttendanceRate { get; set; }
        public decimal AveragePassRate { get; set; }
        public List<ClassReportDto> ClassReports { get; set; } = new();
    }

    public class ClassReportDto
    {
        public string ClassId { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public decimal AttendanceRate { get; set; }
        public decimal PassRate { get; set; }
    }
}
