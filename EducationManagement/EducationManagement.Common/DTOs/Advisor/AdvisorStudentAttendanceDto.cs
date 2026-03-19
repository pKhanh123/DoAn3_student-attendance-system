using System;
using System.Collections.Generic;

namespace EducationManagement.Common.DTOs.Advisor
{
    public class AdvisorStudentAttendanceDto
    {
        public string AttendanceId { get; set; } = string.Empty;
        public string EnrollmentId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public int? Semester { get; set; }
        public string ScheduleId { get; set; } = string.Empty;
        public DateTime AttendanceDate { get; set; }
        public DateTime? ScheduleStartTime { get; set; }
        public string? Room { get; set; }
        public string Status { get; set; } = string.Empty; // Present, Absent, Late, Excused
        public string? Notes { get; set; }
        public string? MarkedBy { get; set; }
        public string? MarkedByName { get; set; }
    }
    
    public class AdvisorStudentAttendanceSummaryDto
    {
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public int? Semester { get; set; }
        public int TotalSessions { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public int LateCount { get; set; }
        public int ExcusedCount { get; set; }
        public decimal AttendanceRate { get; set; }
        public decimal AbsenceRate { get; set; }
    }
    
    public class AdvisorStudentAttendanceResponseDto
    {
        public List<AdvisorStudentAttendanceDto> Attendances { get; set; } = new();
        public List<AdvisorStudentAttendanceSummaryDto> Summaries { get; set; } = new();
        public AdvisorStudentAttendanceOverallSummaryDto Overall { get; set; } = new();
    }
    
    public class AdvisorStudentAttendanceOverallSummaryDto
    {
        public int TotalSessions { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public int LateCount { get; set; }
        public int ExcusedCount { get; set; }
        public decimal AttendanceRate { get; set; }
        public decimal AbsenceRate { get; set; }
        public int TotalSubjects { get; set; }
    }
}

