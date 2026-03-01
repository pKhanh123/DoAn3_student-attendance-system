using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Class
{
    public class ClassCreateDto
    {
        [Required(ErrorMessage = "Class code is required")]
        [StringLength(20, ErrorMessage = "Class code cannot exceed 20 characters")]
        public string ClassCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Class name is required")]
        [StringLength(200, ErrorMessage = "Class name cannot exceed 200 characters")]
        public string ClassName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Subject ID is required")]
        [StringLength(50, ErrorMessage = "Subject ID cannot exceed 50 characters")]
        public string SubjectId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Lecturer ID is required")]
        [StringLength(50, ErrorMessage = "Lecturer ID cannot exceed 50 characters")]
        public string LecturerId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Semester is required")]
        [StringLength(20, ErrorMessage = "Semester cannot exceed 20 characters")]
        public string Semester { get; set; } = string.Empty;

        [Required(ErrorMessage = "Academic year ID is required")]
        [StringLength(50, ErrorMessage = "Academic year ID cannot exceed 50 characters")]
        public string AcademicYearId { get; set; } = string.Empty;

        [Range(1, 200, ErrorMessage = "Max students must be between 1 and 200")]
        public int MaxStudents { get; set; } = 50;

        [Required(ErrorMessage = "Created by is required")]
        [StringLength(50, ErrorMessage = "Created by cannot exceed 50 characters")]
        public string CreatedBy { get; set; } = string.Empty;
    }
}
