using System;
using System.Collections.Generic;

namespace EducationManagement.Common.DTOs.GradeAppeal
{
    public class GradeAppealResponseDto
    {
        public string AppealId { get; set; } = string.Empty;
        public string GradeId { get; set; } = string.Empty;
        public string EnrollmentId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string AppealReason { get; set; } = string.Empty;
        public decimal? CurrentScore { get; set; }
        public decimal? ExpectedScore { get; set; }
        public string? SupportingDocs { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Priority { get; set; }
        public string? LecturerResponse { get; set; }
        public string? LecturerId { get; set; }
        public string? LecturerDecision { get; set; }
        public string? AdvisorId { get; set; }
        public string? AdvisorResponse { get; set; }
        public string? AdvisorDecision { get; set; }
        public decimal? FinalScore { get; set; }
        public string? ResolutionNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? ResolvedBy { get; set; }

        // Additional info from joins
        public string? StudentCode { get; set; }
        public string? StudentName { get; set; }
        public string? StudentEmail { get; set; }
        public string? ClassCode { get; set; }
        public string? ClassName { get; set; }
        public string? SubjectName { get; set; }
        public string? SubjectCode { get; set; }
        public decimal? MidtermScore { get; set; }
        public decimal? GradeFinalScore { get; set; } // Final score from grades table (subject final score)
        public decimal? TotalScore { get; set; }
        public string? LetterGrade { get; set; }
        public string? LecturerCode { get; set; }
        public string? LecturerName { get; set; }
        public string? LecturerEmail { get; set; }
        public string? AdvisorCode { get; set; }
        public string? AdvisorName { get; set; }
        public string? AdvisorEmail { get; set; }
    }

    public class GradeAppealListResponseDto
    {
        public List<GradeAppealResponseDto> Appeals { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}

