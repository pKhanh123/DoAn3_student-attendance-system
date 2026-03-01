using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.User
{
    public class UserUpdateAdminDto
    {
        [Required(ErrorMessage = "Full name is required")]
        [StringLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone cannot exceed 20 characters")]
        public string? Phone { get; set; }

        [Required(ErrorMessage = "Role ID is required")]
        public string RoleId { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }
}
