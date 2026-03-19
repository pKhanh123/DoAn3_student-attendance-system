namespace EducationManagement.Common.DTOs.Retake
{
    /// <summary>
    /// DTO cho lớp học lại (bao gồm số lượng đăng ký)
    /// </summary>
    public class RetakeClassDto
    {
        public string ClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int Credits { get; set; }
        
        public string? LecturerId { get; set; }
        public string? LecturerName { get; set; }
        
        public string? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? Building { get; set; }
        
        public int? MaxStudents { get; set; }
        public int CurrentEnrollment { get; set; }
        public int AvailableSeats { get; set; }
        
        public bool IsRegistered { get; set; } // Sinh viên đã đăng ký lớp này chưa
        
        public string SchoolYearCode { get; set; } = string.Empty;
        public int Semester { get; set; }
        
        public string? ScheduleInfo { get; set; } // Thông tin lịch học (ví dụ: "T2 Tiết 1-3, T4 Tiết 7-9")
        
        // Display helpers
        public bool IsFull => MaxStudents.HasValue && CurrentEnrollment >= MaxStudents.Value;
        public string EnrollmentStatus => IsFull ? "Đã đầy" : $"{CurrentEnrollment}/{MaxStudents ?? 0}";
    }
}

