using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("grade_formula_config")]
    public class GradeFormulaConfig
    {
        [Key]
        [Column("config_id")]
        public string ConfigId { get; set; } = string.Empty;

        [Column("subject_id")]
        [MaxLength(50)]
        public string? SubjectId { get; set; }

        [Column("class_id")]
        [MaxLength(50)]
        public string? ClassId { get; set; }

        [Column("school_year_id")]
        [MaxLength(50)]
        public string? SchoolYearId { get; set; }

        [Required]
        [Column("midterm_weight")]
        public decimal MidtermWeight { get; set; } = 0.30m;

        [Required]
        [Column("final_weight")]
        public decimal FinalWeight { get; set; } = 0.70m;

        [Column("assignment_weight")]
        public decimal? AssignmentWeight { get; set; } = 0.00m;

        [Column("quiz_weight")]
        public decimal? QuizWeight { get; set; } = 0.00m;

        [Column("project_weight")]
        public decimal? ProjectWeight { get; set; } = 0.00m;

        [Column("custom_formula")]
        [MaxLength(500)]
        public string? CustomFormula { get; set; }

        [Column("rounding_method")]
        [MaxLength(20)]
        public string? RoundingMethod { get; set; } = "STANDARD"; // STANDARD, CEILING, FLOOR, NONE

        [Column("decimal_places")]
        public int? DecimalPlaces { get; set; } = 2;

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        [Column("is_default")]
        public bool IsDefault { get; set; } = false;

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("created_by")]
        [MaxLength(50)]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        [MaxLength(50)]
        public string? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        [MaxLength(50)]
        public string? DeletedBy { get; set; }

        // ==================================================
        // 🔹 NotMapped properties từ JOIN SP
        // ==================================================
        [NotMapped]
        public string? SubjectCode { get; set; }

        [NotMapped]
        public string? SubjectName { get; set; }

        [NotMapped]
        public string? ClassCode { get; set; }

        [NotMapped]
        public string? ClassName { get; set; }

        [NotMapped]
        public string? SchoolYearCode { get; set; }

        [NotMapped]
        public string? SchoolYearName { get; set; }
    }
}

