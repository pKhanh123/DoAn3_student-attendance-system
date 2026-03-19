using System;
using System.Collections.Generic;

namespace EducationManagement.Common.DTOs.Advisor
{
    public class StudentGpaProgressDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public List<GpaProgressItemDto> ProgressItems { get; set; } = new();
        public decimal? AverageGpa { get; set; }
        public decimal? ClassAverageGpa { get; set; }
        public string? Trend { get; set; } // "increasing", "decreasing", "stable"
    }
    
    public class GpaProgressItemDto
    {
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public int? Semester { get; set; }
        public decimal? Gpa { get; set; }
        public decimal? ClassAverageGpa { get; set; }
        public DateTime? CalculatedAt { get; set; }
    }
    
    public class StudentAttendanceProgressDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public List<AttendanceProgressItemDto> ProgressItems { get; set; } = new();
        public decimal? AverageAttendanceRate { get; set; }
        public decimal? ClassAverageAttendanceRate { get; set; }
        public string? Trend { get; set; } // "increasing", "decreasing", "stable"
    }
    
    public class AttendanceProgressItemDto
    {
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public int? Semester { get; set; }
        public decimal AttendanceRate { get; set; }
        public decimal? ClassAverageAttendanceRate { get; set; }
        public int TotalSessions { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
    }
    
    public class StudentTrendsDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public List<TrendAlertDto> Alerts { get; set; } = new();
        public string? GpaTrend { get; set; } // "increasing", "decreasing", "stable"
        public string? AttendanceTrend { get; set; } // "increasing", "decreasing", "stable"
        public bool HasGpaDecline { get; set; }
        public bool HasAttendanceDecline { get; set; }
        public bool HasImprovement { get; set; }
    }
    
    public class TrendAlertDto
    {
        public string AlertType { get; set; } = string.Empty; // "gpa_decline", "attendance_decline", "improvement"
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Severity { get; set; } = "info"; // "info", "warning", "danger", "success"
        public DateTime? DetectedAt { get; set; }
    }
}

