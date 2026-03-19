using System;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Attendance
{
    public class AttendanceCreateDto
    {
        [Required(ErrorMessage = "Student ID is required")]
        [StringLength(50, ErrorMessage = "Student ID cannot exceed 50 characters")]
        public string StudentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Schedule ID is required")]
        [StringLength(50, ErrorMessage = "Schedule ID cannot exceed 50 characters")]
        public string ScheduleId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Status is required")]
        [StringLength(20, ErrorMessage = "Status cannot exceed 20 characters")]
        public string Status { get; set; } = "Present"; // Present, Absent, Late, Excused

        [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters")]
        public string? Notes { get; set; }

        [StringLength(50, ErrorMessage = "Marked by cannot exceed 50 characters")]
        public string? MarkedBy { get; set; }

        [Required(ErrorMessage = "Created by is required")]
        [StringLength(50, ErrorMessage = "Created by cannot exceed 50 characters")]
        public string CreatedBy { get; set; } = string.Empty;
    }
}
