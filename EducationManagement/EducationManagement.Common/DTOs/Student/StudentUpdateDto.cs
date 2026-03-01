namespace EducationManagement.Common.DTOs.Student
{
    public class UpdateStudentFullDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime Dob { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? FacultyId { get; set; }
        public string? MajorId { get; set; }
        public string? AcademicYearId { get; set; }
        public string? CohortYear { get; set; }

        public string? Nationality { get; set; }
        public string? Ethnicity { get; set; }
        public string? Religion { get; set; }
        public string? Hometown { get; set; }
        public string? CurrentAddress { get; set; }
        public string? BankNo { get; set; }
        public string? BankName { get; set; }
        public string? InsuranceNo { get; set; }
        public string? IssuePlace { get; set; }
        public DateTime? IssueDate { get; set; }
        public string? Facebook { get; set; }

        public string? FamilyFullName { get; set; }
        public string? RelationType { get; set; }
        public int? BirthYear { get; set; }
        public string? PhoneFamily { get; set; }
        public string? JobFamily { get; set; }

        public string UpdatedBy { get; set; } = string.Empty;
    }
}










