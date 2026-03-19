using System.ComponentModel.DataAnnotations;

namespace EducationManagement.Common.DTOs.AdministrativeClass
{
    /// <summary>
    /// DTO cho chức năng chuyển sinh viên từ lớp này sang lớp khác
    /// </summary>
    public class TransferStudentDto
    {
        [Required(ErrorMessage = "Mã sinh viên không được để trống")]
        public string StudentId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Lý do chuyển lớp không được để trống")]
        [StringLength(500, ErrorMessage = "Lý do chuyển lớp không được vượt quá 500 ký tự")]
        public string? TransferReason { get; set; }
    }
}









