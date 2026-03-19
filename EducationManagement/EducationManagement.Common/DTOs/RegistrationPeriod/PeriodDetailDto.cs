using System;

namespace EducationManagement.Common.DTOs.RegistrationPeriod
{
    public class PeriodDetailDto
    {
        public string PeriodId { get; set; } = string.Empty;
        public string PeriodName { get; set; } = string.Empty;
        
        public string AcademicYearId { get; set; } = string.Empty;
        public string? AcademicYearName { get; set; }
        public int? StartYear { get; set; }
        public int? EndYear { get; set; }
        
        public int Semester { get; set; }
        public string SemesterName => Semester switch
        {
            1 => "Học kỳ 1",
            2 => "Học kỳ 2",
            3 => "Học kỳ hè",
            _ => $"Học kỳ {Semester}"
        };
        
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        
        public string PeriodType { get; set; } = "NORMAL"; // NORMAL: đăng ký học phần thường, RETAKE: đăng ký học lại
        
        public string? Description { get; set; }
        
        // Calculated properties
        public bool IsOpen => Status == "OPEN" && DateTime.Now >= StartDate && DateTime.Now <= EndDate;
        public bool IsClosed => Status == "CLOSED" || DateTime.Now > EndDate;
        public bool IsUpcoming => Status == "UPCOMING" || DateTime.Now < StartDate;
        
        public int DaysRemaining
        {
            get
            {
                if (DateTime.Now > EndDate) return 0;
                return (EndDate - DateTime.Now).Days;
            }
        }
        
        // Statistics
        public int? TotalEnrollments { get; set; }
        public int? TotalStudentsEnrolled { get; set; }
        
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
    }
}

