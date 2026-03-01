using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    /// <summary>
    /// School Year = NĂM HỌC (1 năm = 2 học kỳ)
    /// VD: 2024-2025 (HK1: Tháng 9 - Tháng 1, HK2: Tháng 2 - Tháng 6)
    /// 
    /// MỖI SINH VIÊN sẽ trải qua 4 năm học trong 1 niên khóa (cohort)
    /// </summary>
    [Table("school_years")]
    public class SchoolYear
    {
        [Key]
        [Column("school_year_id")]
        [MaxLength(50)]
        public string SchoolYearId { get; set; } = string.Empty;

        /// <summary>
        /// Year code: "2024-2025"
        /// </summary>
        [Required]
        [Column("year_code")]
        [MaxLength(20)]
        public string YearCode { get; set; } = string.Empty;

        /// <summary>
        /// Year name: "Năm học 2024-2025"
        /// </summary>
        [Required]
        [Column("year_name")]
        [MaxLength(100)]
        public string YearName { get; set; } = string.Empty;

        /// <summary>
        /// Link to Academic Year (Cohort) - Optional
        /// Một năm học có thể phục vụ nhiều niên khóa
        /// </summary>
        [Column("academic_year_id")]
        [MaxLength(50)]
        public string? AcademicYearId { get; set; }

        /// <summary>
        /// Start date: 01-Sep-2024
        /// </summary>
        [Required]
        [Column("start_date")]
        public DateTime StartDate { get; set; }

        /// <summary>
        /// End date: 30-Jun-2025
        /// </summary>
        [Required]
        [Column("end_date")]
        public DateTime EndDate { get; set; }

        // ================================
        // 🔹 SEMESTER DATES (Auto-calculated)
        // ================================

        /// <summary>
        /// Semester 1 start: 01-Sep-2024
        /// </summary>
        [Column("semester1_start")]
        public DateTime? Semester1Start { get; set; }

        /// <summary>
        /// Semester 1 end: 31-Jan-2025
        /// </summary>
        [Column("semester1_end")]
        public DateTime? Semester1End { get; set; }

        /// <summary>
        /// Semester 2 start: 01-Feb-2025
        /// </summary>
        [Column("semester2_start")]
        public DateTime? Semester2Start { get; set; }

        /// <summary>
        /// Semester 2 end: 30-Jun-2025
        /// </summary>
        [Column("semester2_end")]
        public DateTime? Semester2End { get; set; }

        // ================================
        // 🔹 STATUS
        // ================================

        /// <summary>
        /// Is this the active school year? (Only 1 can be active at a time)
        /// </summary>
        [Column("is_active")]
        public bool IsActive { get; set; } = false;

        /// <summary>
        /// Current semester: 1, 2, or NULL (not in semester period)
        /// </summary>
        [Column("current_semester")]
        public int? CurrentSemester { get; set; }

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
        // 🔹 Navigation properties
        // ================================

        [NotMapped]
        public string? CohortCode { get; set; }

        [NotMapped]
        public string? CohortName { get; set; }

        // ================================
        // 🔹 Calculated properties
        // ================================

        /// <summary>
        /// Is school year currently ongoing?
        /// </summary>
        [NotMapped]
        public bool IsOngoing => DateTime.Now >= StartDate && DateTime.Now <= EndDate;

        /// <summary>
        /// Is school year in the future?
        /// </summary>
        [NotMapped]
        public bool IsUpcoming => DateTime.Now < StartDate;

        /// <summary>
        /// Has school year ended?
        /// </summary>
        [NotMapped]
        public bool HasEnded => DateTime.Now > EndDate;

        /// <summary>
        /// Get current semester based on date (auto-detect)
        /// </summary>
        [NotMapped]
        public int? DetectedSemester
        {
            get
            {
                var today = DateTime.Now;
                if (Semester1Start.HasValue && Semester1End.HasValue &&
                    today >= Semester1Start.Value && today <= Semester1End.Value)
                    return 1;

                if (Semester2Start.HasValue && Semester2End.HasValue &&
                    today >= Semester2Start.Value && today <= Semester2End.Value)
                    return 2;

                return null; // Outside semester period (summer break)
            }
        }

        /// <summary>
        /// Semester display name
        /// </summary>
        [NotMapped]
        public string SemesterName => CurrentSemester switch
        {
            1 => "Học kỳ 1",
            2 => "Học kỳ 2",
            _ => "Ngoài học kỳ"
        };

        /// <summary>
        /// Full display: "2024-2025 (HK1)"
        /// </summary>
        [NotMapped]
        public string FullDisplay => CurrentSemester.HasValue 
            ? $"{YearCode} ({SemesterName})" 
            : YearCode;

        /// <summary>
        /// Days until semester 1 starts (if upcoming)
        /// </summary>
        [NotMapped]
        public int? DaysUntilStart => Semester1Start.HasValue && DateTime.Now < Semester1Start.Value
            ? (Semester1Start.Value - DateTime.Now).Days
            : null;

        /// <summary>
        /// Days until current semester ends
        /// </summary>
        [NotMapped]
        public int? DaysUntilSemesterEnd
        {
            get
            {
                var today = DateTime.Now;
                if (CurrentSemester == 1 && Semester1End.HasValue && today <= Semester1End.Value)
                    return (Semester1End.Value - today).Days;

                if (CurrentSemester == 2 && Semester2End.HasValue && today <= Semester2End.Value)
                    return (Semester2End.Value - today).Days;

                return null;
            }
        }

        /// <summary>
        /// Progress percentage (0-100)
        /// </summary>
        [NotMapped]
        public double ProgressPercentage
        {
            get
            {
                if (!IsOngoing) return HasEnded ? 100 : 0;

                var totalDays = (EndDate - StartDate).TotalDays;
                var elapsedDays = (DateTime.Now - StartDate).TotalDays;
                return Math.Min(100, Math.Max(0, (elapsedDays / totalDays) * 100));
            }
        }
    }
}

