using System;

namespace EducationManagement.Common.DTOs.Enrollment
{
    /// <summary>
    /// Thời khóa biểu sinh viên
    /// </summary>
    public class StudentScheduleDto
    {
        public string ClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int Credits { get; set; }
        
        public string? LecturerName { get; set; }
        
        // Schedule details
        public int DayOfWeek { get; set; } // 2 = Monday, 3 = Tuesday, ..., 8 = Sunday
        public string DayName => DayOfWeek switch
        {
            2 => "Thứ 2",
            3 => "Thứ 3",
            4 => "Thứ 4",
            5 => "Thứ 5",
            6 => "Thứ 6",
            7 => "Thứ 7",
            8 => "Chủ nhật",
            _ => "N/A"
        };
        
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string TimeSlot => $"{StartTime:hh\\:mm} - {EndTime:hh\\:mm}";
        
        public string? Room { get; set; }
        public string? Building { get; set; }
        
        // Color for calendar display (optional)
        public string? Color { get; set; }
    }
}

