namespace EducationManagement.Common.DTOs.AdministrativeClass
{
    /// <summary>
    /// Báo cáo thống kê lớp hành chính
    /// </summary>
    public class AdminClassReportDto
    {
        public string AdminClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        
        // Student statistics
        public int TotalStudents { get; set; }
        public int MaleStudents { get; set; }
        public int FemaleStudents { get; set; }
        
        // Academic performance
        public double AverageGPA { get; set; }
        public double HighestGPA { get; set; }
        public double LowestGPA { get; set; }
        public int StudentsAbove3_5 { get; set; }  // Giỏi
        public int StudentsAbove3_0 { get; set; }  // Khá
        public int StudentsAbove2_0 { get; set; }  // Trung bình
        public int StudentsBelow2_0 { get; set; }  // Yếu
        
        // Attendance
        public double AttendanceRate { get; set; }
        public int StudentsWithGoodAttendance { get; set; } // >= 80%
        public int StudentsWithPoorAttendance { get; set; }  // < 50%
        
        // Warnings & Alerts
        public int StudentsAtRisk { get; set; } // GPA < 2.0 hoặc attendance < 50%
        public int StudentsNeedingAttention { get; set; }
        
        // Additional info
        public string? AdvisorName { get; set; }
        public string? MajorName { get; set; }
        public int CohortYear { get; set; }
    }
}

