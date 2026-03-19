using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("student_profiles")]
    public class StudentProfile
    {
        [Key]
        [Column("student_id")]
        public string StudentId { get; set; } = string.Empty;

        [Column("nationality")]
        [StringLength(50)]
        public string? Nationality { get; set; }

        [Column("ethnicity")]
        [StringLength(30)]
        public string? Ethnicity { get; set; }

        [Column("religion")]
        [StringLength(50)]
        public string? Religion { get; set; }

        [Column("hometown")]
        [StringLength(250)]
        public string? Hometown { get; set; }

        [Column("current_address")]
        [StringLength(250)]
        public string? CurrentAddress { get; set; }

        [Column("bank_no")]
        [StringLength(30)]
        public string? BankNo { get; set; }

        [Column("bank_name")]
        [StringLength(100)]
        public string? BankName { get; set; }

        [Column("insurance_no")]
        [StringLength(30)]
        public string? InsuranceNo { get; set; }

        [Column("issue_place")]
        [StringLength(100)]
        public string? IssuePlace { get; set; }

        [Column("issue_date")]
        public DateTime? IssueDate { get; set; }

        [Column("facebook")]
        [StringLength(200)]
        public string? Facebook { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("created_by")]
        [StringLength(50)]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        [StringLength(50)]
        public string? UpdatedBy { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        [StringLength(50)]
        public string? DeletedBy { get; set; }

        // Navigation properties
        public virtual Student Student { get; set; } = null!;
    }
}

























