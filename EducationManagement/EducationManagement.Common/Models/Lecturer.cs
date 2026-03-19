using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("lecturers")]
    public class Lecturer
    {
        [Key]
        [Column("lecturer_id")]
        public string LecturerId { get; set; } = string.Empty;

        [Column("user_id")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Column("department_id")]
        [Required]
        public string DepartmentId { get; set; } = string.Empty;

        [Column("academic_title")]
        public string? AcademicTitle { get; set; }     // GS, PGS, TS,...

        [Column("degree")]
        public string? Degree { get; set; }            // ThS, TS,...

        [Column("specialization")]
        public string? Specialization { get; set; }    // Chuyên ngành

        [Column("position")]
        public string? Position { get; set; }          // Chức vụ

        [Column("join_date")]
        public DateTime? JoinDate { get; set; }

        // 🔹 Thêm để map kết quả SP (u.username, u.full_name, u.email)
        [NotMapped]
        public string? Username { get; set; }

        [NotMapped]
        public string? FullName { get; set; }

        [NotMapped]
        public string? Email { get; set; }

        // 🔹 Thêm để map kết quả SP (d.department_name)
        [NotMapped]
        public string? DepartmentName { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("created_by")]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public string? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        public string? DeletedBy { get; set; }
    }
}
