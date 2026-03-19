using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    /// <summary>
    /// Academic Year = NIÊN KHÓA (Cohort - 4 năm)
    /// VD: K21 (2021-2025), K22 (2022-2026), K23 (2023-2027)
    /// 
    /// NOTE: Không còn dùng cho NĂM HỌC (1 năm) nữa!
    /// Năm học (School Year) được quản lý trong bảng school_years
    /// </summary>
    [Table("academic_years")]
    public class AcademicYear
    {
        [Key]
        [Column("academic_year_id")]
        [MaxLength(50)]
        public string AcademicYearId { get; set; } = string.Empty;

        /// <summary>
        /// Year name: "2021-2025" (4 năm)
        /// </summary>
        [Required]
        [Column("year_name")]
        [MaxLength(50)]
        public string YearName { get; set; } = string.Empty;

        /// <summary>
        /// Cohort code: K21, K22, K23, K24
        /// </summary>
        [Column("cohort_code")]
        [MaxLength(10)]
        public string? CohortCode { get; set; }

        /// <summary>
        /// Start year: 2021, 2022, 2023, 2024
        /// </summary>
        [Required]
        [Column("start_year")]
        public int StartYear { get; set; }

        /// <summary>
        /// End year: Start + 4 (2021 → 2025)
        /// </summary>
        [Required]
        [Column("end_year")]
        public int EndYear { get; set; }

        /// <summary>
        /// Duration in years (default 4 for undergraduate)
        /// </summary>
        [Column("duration_years")]
        public int DurationYears { get; set; } = 4;

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = false;

        // ================================
        // 🔹 Audit fields
        // ================================

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

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

        // ================================
        // 🔹 Calculated properties
        // ================================

        /// <summary>
        /// Display name: "Khóa 21 (2021-2025)"
        /// </summary>
        [NotMapped]
        public string DisplayName => $"Khóa {CohortCode?.Replace("K", "")} ({StartYear}-{EndYear})";

        /// <summary>
        /// Current year of study (1-4)
        /// </summary>
        [NotMapped]
        public int CurrentYear
        {
            get
            {
                var currentYear = DateTime.Now.Year;
                if (currentYear < StartYear) return 0; // Not started yet
                if (currentYear > EndYear) return DurationYears + 1; // Graduated
                return currentYear - StartYear + 1; // 1, 2, 3, 4
            }
        }

        /// <summary>
        /// Is this cohort currently active (within duration)?
        /// </summary>
        [NotMapped]
        public bool IsCurrentlyActive => DateTime.Now.Year >= StartYear && DateTime.Now.Year <= EndYear;

        /// <summary>
        /// Has this cohort graduated?
        /// </summary>
        [NotMapped]
        public bool HasGraduated => DateTime.Now.Year > EndYear;
    }
}
