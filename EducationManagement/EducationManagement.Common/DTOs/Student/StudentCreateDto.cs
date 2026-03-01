using System;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Student
{
    public class StudentCreateDto
    {
        [Required(ErrorMessage = "User ID is required")]
        public string UserId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Student code is required")]
        [StringLength(20, ErrorMessage = "Student code cannot exceed 20 characters")]
        public string StudentCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Full name is required")]
        [StringLength(150, ErrorMessage = "Full name cannot exceed 150 characters")]
        public string FullName { get; set; } = string.Empty;

        [StringLength(10, ErrorMessage = "Gender cannot exceed 10 characters")]
        public string? Gender { get; set; }

        public DateTime? Dob { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(150, ErrorMessage = "Email cannot exceed 150 characters")]
        public string? Email { get; set; }

        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone cannot exceed 20 characters")]
        public string? Phone { get; set; }

        [StringLength(50, ErrorMessage = "Faculty ID cannot exceed 50 characters")]
        public string? FacultyId { get; set; }

        [StringLength(50, ErrorMessage = "Major ID cannot exceed 50 characters")]
        public string? MajorId { get; set; }

        [StringLength(50, ErrorMessage = "Academic year ID cannot exceed 50 characters")]
        public string? AcademicYearId { get; set; }

        [StringLength(10, ErrorMessage = "Cohort year cannot exceed 10 characters")]
        public string? CohortYear { get; set; }

        [Required(ErrorMessage = "Created by is required")]
        [StringLength(50, ErrorMessage = "Created by cannot exceed 50 characters")]
        public string CreatedBy { get; set; } = string.Empty;
    }
}