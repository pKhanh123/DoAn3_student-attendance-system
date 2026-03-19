namespace EducationManagement.Common.DTOs.SubjectPrerequisite
{
    public class MissingPrerequisiteDto
    {
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public decimal MinimumGrade { get; set; }
        public decimal? CurrentGrade { get; set; }
        public bool IsRequired { get; set; }
        public string Reason { get; set; } = string.Empty; // "Chưa học" or "Điểm chưa đạt"
    }
}

