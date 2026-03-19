using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.Enrollment
{
    public class BulkEnrollmentDto
    {
        [Required(ErrorMessage = "Danh sách lớp là bắt buộc")]
        [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 lớp")]
        public List<string> ClassIds { get; set; } = new();

        public string? Notes { get; set; }
    }
}

