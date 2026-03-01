using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.GradeAppeal
{
    public class GradeAppealLecturerResponseDto
    {
        [Required(ErrorMessage = "Lecturer ID is required")]
        [StringLength(50, ErrorMessage = "Lecturer ID cannot exceed 50 characters")]
        public string LecturerId { get; set; } = string.Empty;

        [StringLength(1000, ErrorMessage = "Response cannot exceed 1000 characters")]
        public string? LecturerResponse { get; set; }

        [Required(ErrorMessage = "Decision is required")]
        [StringLength(20, ErrorMessage = "Decision cannot exceed 20 characters")]
        public string LecturerDecision { get; set; } = string.Empty; // APPROVE, REJECT, NEED_REVIEW

        [Required(ErrorMessage = "Updated by is required")]
        [StringLength(50, ErrorMessage = "Updated by cannot exceed 50 characters")]
        public string UpdatedBy { get; set; } = string.Empty;
    }

    public class GradeAppealAdvisorDecisionDto
    {
        [Required(ErrorMessage = "Advisor ID is required")]
        [StringLength(50, ErrorMessage = "Advisor ID cannot exceed 50 characters")]
        public string AdvisorId { get; set; } = string.Empty;

        [StringLength(1000, ErrorMessage = "Response cannot exceed 1000 characters")]
        public string? AdvisorResponse { get; set; }

        [Required(ErrorMessage = "Decision is required")]
        [StringLength(20, ErrorMessage = "Decision cannot exceed 20 characters")]
        public string AdvisorDecision { get; set; } = string.Empty; // APPROVE, REJECT

        [Range(0, 10, ErrorMessage = "Final score must be between 0 and 10")]
        public decimal? FinalScore { get; set; }

        [StringLength(1000, ErrorMessage = "Resolution notes cannot exceed 1000 characters")]
        public string? ResolutionNotes { get; set; }

        [Required(ErrorMessage = "Updated by is required")]
        [StringLength(50, ErrorMessage = "Updated by cannot exceed 50 characters")]
        public string UpdatedBy { get; set; } = string.Empty;
    }

    public class GradeAppealCancelDto
    {
        [Required(ErrorMessage = "Cancelled by is required")]
        [StringLength(50, ErrorMessage = "Cancelled by cannot exceed 50 characters")]
        public string CancelledBy { get; set; } = string.Empty;
    }
}

