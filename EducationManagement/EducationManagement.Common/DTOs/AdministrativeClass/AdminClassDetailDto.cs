using System;

namespace EducationManagement.Common.DTOs.AdministrativeClass
{
    /// <summary>
    /// Chi tiết lớp hành chính (bao gồm thông tin liên quan)
    /// </summary>
    public class AdminClassDetailDto
    {
        public string AdminClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        
        // Major info
        public string? MajorId { get; set; }
        public string? MajorName { get; set; }
        public string? MajorCode { get; set; }
        
        // Advisor info (GVCN)
        public string? AdvisorId { get; set; }
        public string? AdvisorName { get; set; }
        public string? AdvisorEmail { get; set; }
        public string? AdvisorPhone { get; set; }
        
        // Academic year info
        public string? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        
        // Class details
        public int CohortYear { get; set; }
        public int MaxStudents { get; set; }
        public int CurrentStudents { get; set; }
        public int AvailableSlots => MaxStudents - CurrentStudents;
        public double FillPercentage => MaxStudents > 0 ? (double)CurrentStudents / MaxStudents * 100 : 0;
        public bool IsFull => CurrentStudents >= MaxStudents;
        
        public string? Description { get; set; }
        
        // Faculty & Department
        public string? FacultyName { get; set; }
        public string? DepartmentName { get; set; }
        
        // Statistics (if applicable)
        public double? AverageGPA { get; set; }
        public double? AttendanceRate { get; set; }
        public int? TotalMaleStudents { get; set; }
        public int? TotalFemaleStudents { get; set; }
        
        // Audit
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}

