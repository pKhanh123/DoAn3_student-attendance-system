using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.AdministrativeClass
{
    /// <summary>
    /// DTO để phân sinh viên vào lớp hành chính
    /// </summary>
    public class AssignStudentsDto
    {
        [Required(ErrorMessage = "Danh sách sinh viên là bắt buộc")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất 1 sinh viên")]
        public List<string> StudentIds { get; set; } = new();
    }
}

