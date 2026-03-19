using System;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO để hiển thị lịch thi cho sinh viên
    /// </summary>
    public class StudentExamScheduleDto
    {
        public string ExamId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string? ClassCode { get; set; }
        public string? ClassName { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public DateTime ExamDate { get; set; }
        public TimeSpan ExamTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? RoomCode { get; set; }
        public string? Building { get; set; }
        public string ExamType { get; set; } = string.Empty;
        public string ExamTypeName => ExamType switch
        {
            "GIỮA_HỌC_PHẦN" => "Thi giữa học phần",
            "KẾT_THÚC_HỌC_PHẦN" => "Thi kết thúc học phần",
            _ => ExamType
        };
        public int? SessionNo { get; set; }
        public int? SeatNumber { get; set; }
        public string AssignmentStatus { get; set; } = string.Empty;
        public string AssignmentStatusName => AssignmentStatus switch
        {
            "ASSIGNED" => "Đã phân ca thi",
            "NOT_QUALIFIED" => "Không đủ điều kiện dự thi",
            "ATTENDED" => "Đã dự thi",
            "ABSENT" => "Vắng thi",
            "EXCUSED" => "Vắng thi có lý do",
            _ => AssignmentStatus
        };
        public string ExamStatus { get; set; } = string.Empty;
        public string? Notes { get; set; }

        // Helper properties
        public string TimeSlot => $"{ExamTime:hh\\:mm} - {EndTime:hh\\:mm}";
        public string DateDisplay => ExamDate.ToString("dd/MM/yyyy");
        public bool IsQualified => AssignmentStatus != "NOT_QUALIFIED";
        public bool IsUpcoming => ExamDate >= DateTime.Today;
    }
}

