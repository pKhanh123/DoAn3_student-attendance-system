namespace EducationManagement.Common.DTOs.Student
{
    public class StudentFamilyDto
    {
        public string StudentFamilyId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string RelationType { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public int? BirthYear { get; set; }
        public string? Phone { get; set; }
        public string? Nationality { get; set; }
        public string? Ethnicity { get; set; }
        public string? Religion { get; set; }
        public string? PermanentAddress { get; set; }
        public string? Job { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}

























