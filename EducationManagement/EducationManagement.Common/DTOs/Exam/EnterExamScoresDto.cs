using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Exam
{
    /// <summary>
    /// DTO để nhập điểm cho cả ca thi
    /// </summary>
    public class EnterExamScoresDto
    {
        [Required(ErrorMessage = "Exam ID không được để trống")]
        [StringLength(50)]
        public string ExamId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Danh sách điểm không được để trống")]
        [MinLength(1, ErrorMessage = "Danh sách điểm phải có ít nhất 1 sinh viên")]
        public List<ExamScoreDto> Scores { get; set; } = new List<ExamScoreDto>();

        [Required(ErrorMessage = "Người nhập điểm không được để trống")]
        [StringLength(50)]
        public string EnteredBy { get; set; } = string.Empty;
    }
}

