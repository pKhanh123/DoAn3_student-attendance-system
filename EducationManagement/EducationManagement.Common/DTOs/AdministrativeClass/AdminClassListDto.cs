namespace EducationManagement.Common.DTOs.AdministrativeClass
{
    /// <summary>
    /// DTO cho danh sách lớp hành chính (ít thông tin hơn Detail)
    /// </summary>
    public class AdminClassListDto
    {
        public string AdminClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        
        public string? MajorName { get; set; }
        public string? MajorCode { get; set; }
        public string? AdvisorName { get; set; }
        public string? FacultyName { get; set; }
        
        // Academic Year info
        public string? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        
        public int CohortYear { get; set; }
        public int MaxStudents { get; set; }
        public int CurrentStudents { get; set; }
        
        public int AvailableSlots => MaxStudents - CurrentStudents;
        public double FillPercentage => MaxStudents > 0 ? (double)CurrentStudents / MaxStudents * 100 : 0;
        public bool IsFull => CurrentStudents >= MaxStudents;
        
        public bool IsActive { get; set; }
    }
}

