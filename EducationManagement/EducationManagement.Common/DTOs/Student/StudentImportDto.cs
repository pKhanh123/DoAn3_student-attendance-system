namespace EducationManagement.Common.DTOs.Student
{
    public class StudentImportDto
    {
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public string MajorId { get; set; } = string.Empty;
        public string? AcademicYearId { get; set; }
    }

    public class BatchImportResultDto
    {
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<ImportErrorDto> Errors { get; set; } = new();
    }

    public class ImportErrorDto
    {
        public int RowNumber { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }
}

