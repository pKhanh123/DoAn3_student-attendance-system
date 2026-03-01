using System;

namespace EducationManagement.Common.DTOs.Retake
{
    /// <summary>
    /// DTO cho môn học trượt của sinh viên
    /// </summary>
    public class FailedSubjectDto
    {
        public string RetakeId { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int Credits { get; set; }
        
        public string FailedClassId { get; set; } = string.Empty;
        public string FailedClassCode { get; set; } = string.Empty;
        public string FailedClassName { get; set; } = string.Empty;
        
        public string Reason { get; set; } = string.Empty; // ATTENDANCE, GRADE, BOTH
        public decimal? CurrentValue { get; set; }
        public decimal? ThresholdValue { get; set; }
        public string RetakeStatus { get; set; } = string.Empty; // PENDING, APPROVED, REJECTED, COMPLETED
        
        public string SchoolYearId { get; set; } = string.Empty;
        public string SchoolYearCode { get; set; } = string.Empty;
        public int Semester { get; set; }
        
        public DateTime RetakeCreatedAt { get; set; }
        
        // Display helpers
        public string ReasonText => Reason switch
        {
            "ATTENDANCE" => "Vắng học quá 20%",
            "GRADE" => "Điểm thấp (< 5.0)",
            "BOTH" => "Vắng học và điểm thấp",
            _ => "Không xác định"
        };
        
        public bool CanRegister => RetakeStatus == "APPROVED";
    }
}

