using System;

namespace EducationManagement.Common.DTOs.Enrollment
{
    public class EnrollmentDetailDto
    {
        public string EnrollmentId { get; set; } = string.Empty;
        
        // Student info
        public string StudentId { get; set; } = string.Empty;
        public string? StudentCode { get; set; }
        public string? StudentName { get; set; }
        
        // Class info
        public string ClassId { get; set; } = string.Empty;
        public string? ClassCode { get; set; }
        public string? ClassName { get; set; }
        
        // Subject info
        public string? SubjectId { get; set; }
        public string? SubjectCode { get; set; }
        public string? SubjectName { get; set; }
        public int? Credits { get; set; }
        
        // Lecturer info
        public string? LecturerName { get; set; }
        
        // Schedule info
        public string? Schedule { get; set; }
        public string? Room { get; set; }
        
        // Enrollment info
        public DateTime EnrollmentDate { get; set; }
        public string EnrollmentStatus { get; set; } = string.Empty;
        public DateTime? DropDeadline { get; set; }
        public string? Notes { get; set; }
        public string? DropReason { get; set; }
        
        public bool CanDrop => DropDeadline.HasValue && DateTime.Now <= DropDeadline.Value && EnrollmentStatus == "APPROVED";
        public int? DaysUntilDropDeadline
        {
            get
            {
                if (!DropDeadline.HasValue) return null;
                var days = (DropDeadline.Value - DateTime.Now).Days;
                return days < 0 ? 0 : days;
            }
        }
    }
}

