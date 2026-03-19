using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Notification
{
    public class NotificationCreateDto
    {
        [Required(ErrorMessage = "Recipient ID is required")]
        [StringLength(50, ErrorMessage = "Recipient ID cannot exceed 50 characters")]
        public string RecipientId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Title is required")]
        [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Content is required")]
        [StringLength(2000, ErrorMessage = "Content cannot exceed 2000 characters")]
        public string Content { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Type cannot exceed 50 characters")]
        public string Type { get; set; } = "System"; // GradeAppeal, Enrollment, AttendanceWarning, AcademicWarning, GradeUpdate, System

        public string? CreatedBy { get; set; }

        public DateTime? SentDate { get; set; }
    }
}

