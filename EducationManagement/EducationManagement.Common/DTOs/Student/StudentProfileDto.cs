namespace EducationManagement.Common.DTOs.Student
{
    public class StudentProfileDto
    {
        public string StudentId { get; set; } = string.Empty;
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
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}

























