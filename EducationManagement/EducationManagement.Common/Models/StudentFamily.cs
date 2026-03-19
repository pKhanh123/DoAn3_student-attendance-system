using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("student_family")]
    public class StudentFamily
    {
        [Key]
        [Column("student_family_id")]
        public string StudentFamilyId { get; set; } = string.Empty;

        [Required]
        [Column("student_id")]
        [StringLength(50)]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        [Column("relation_type")]
        [StringLength(30)]
        public string RelationType { get; set; } = string.Empty;

        [Required]
        [Column("full_name")]
        [StringLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Column("birth_year")]
        public int? BirthYear { get; set; }

        [Column("phone")]
        [StringLength(20)]
        public string? Phone { get; set; }

        [Column("nationality")]
        [StringLength(50)]
        public string? Nationality { get; set; }

        [Column("ethnicity")]
        [StringLength(30)]
        public string? Ethnicity { get; set; }

        [Column("religion")]
        [StringLength(50)]
        public string? Religion { get; set; }

        [Column("permanent_address")]
        [StringLength(250)]
        public string? PermanentAddress { get; set; }

        [Column("job")]
        [StringLength(150)]
        public string? Job { get; set; }

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

























