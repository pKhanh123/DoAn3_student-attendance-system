using System;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO để hiển thị thông tin sinh viên trong lớp học phần
    /// </summary>
    public class ClassStudentDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string EnrollmentId { get; set; } = string.Empty;
        public DateTime EnrollmentDate { get; set; }
        public string? EnrollmentStatus { get; set; }
    }
}

