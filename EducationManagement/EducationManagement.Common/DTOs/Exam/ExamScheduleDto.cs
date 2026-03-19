using System;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO cho lịch thi
    /// </summary>
    public class ExamScheduleDto
    {
        public string ExamId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string? ClassCode { get; set; }
        public string? ClassName { get; set; }
        public string SubjectId { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public string? SubjectName { get; set; }
        public DateTime ExamDate { get; set; }
        public TimeSpan ExamTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? Building { get; set; }
        public int? RoomCapacity { get; set; }
        public string ExamType { get; set; } = string.Empty;
        public string ExamTypeName { get; set; } = string.Empty;
        public int? SessionNo { get; set; }
        public string? ProctorLecturerId { get; set; }
        public string? ProctorName { get; set; }
        public int Duration { get; set; }
        public int? MaxStudents { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "PLANNED";
        public string StatusName { get; set; } = string.Empty;
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
        public string? SchoolYearName { get; set; }
        public int? Semester { get; set; }
        public int? AssignedStudents { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}

