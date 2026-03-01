using System;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO cho phân sinh viên vào ca thi
    /// </summary>
    public class ExamAssignmentDto
    {
        public string AssignmentId { get; set; } = string.Empty;
        public string ExamId { get; set; } = string.Empty;
        public string EnrollmentId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string? StudentCode { get; set; }
        public string? StudentName { get; set; }
        public int? SeatNumber { get; set; }
        public string Status { get; set; } = "ASSIGNED";
        public string StatusName => Status switch
        {
            "ASSIGNED" => "Đã phân ca thi",
            "NOT_QUALIFIED" => "Không đủ điều kiện dự thi",
            "ATTENDED" => "Đã dự thi",
            "ABSENT" => "Vắng thi",
            "EXCUSED" => "Vắng thi có lý do",
            _ => Status
        };
        public string? Notes { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? CreatedBy { get; set; }

        public bool IsQualified => Status != "NOT_QUALIFIED";
    }
}

