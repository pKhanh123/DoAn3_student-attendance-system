using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Retake
{
    /// <summary>
    /// DTO for updating RetakeRecord status
    /// </summary>
    public class RetakeRecordUpdateDto
    {
        [Required(ErrorMessage = "Status is required")]
        [StringLength(20, ErrorMessage = "Status cannot exceed 20 characters")]
        public string Status { get; set; } = string.Empty; // PENDING, APPROVED, REJECTED, COMPLETED

        [StringLength(1000, ErrorMessage = "Advisor notes cannot exceed 1000 characters")]
        public string? AdvisorNotes { get; set; }

        [StringLength(50, ErrorMessage = "Updated by cannot exceed 50 characters")]
        public string? UpdatedBy { get; set; }
    }
}

