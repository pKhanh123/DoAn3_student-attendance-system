using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Service cho Academic Year (Niên khóa - 4 năm)
    /// </summary>
    public class AcademicYearService
    {
        private readonly AcademicYearRepository _repo;

        public AcademicYearService(AcademicYearRepository repo)
        {
            _repo = repo;
        }

        // ============================================================
        // 🔹 BASIC CRUD
        // ============================================================

        public Task<List<AcademicYear>> GetAllAsync() => _repo.GetAllAsync();
        
        public Task<AcademicYear?> GetByIdAsync(string id) => _repo.GetByIdAsync(id);

        public async Task AddAsync(AcademicYear entity, string createdBy = "system")
        {
            // Validate
            if (entity.StartYear >= entity.EndYear)
                throw new Exception("❌ Năm kết thúc phải sau năm bắt đầu!");

            // Generate cohort code if not provided
            if (string.IsNullOrEmpty(entity.CohortCode))
                entity.CohortCode = $"K{entity.StartYear % 100}";

            // Check duplicate
            if (!string.IsNullOrEmpty(entity.YearName) && await _repo.ExistsCodeAsync(entity.YearName))
                throw new Exception($"❌ Niên khóa '{entity.YearName}' đã tồn tại!");

            entity.AcademicYearId = entity.AcademicYearId ?? Guid.NewGuid().ToString();
            entity.CreatedAt = DateTime.Now;
            entity.CreatedBy = createdBy;

            await _repo.AddAsync(entity);
        }

        public async Task UpdateAsync(AcademicYear entity, string updatedBy = "system")
        {
            // ✅ Validation: Kiểm tra entity không null
            if (entity == null)
                throw new ArgumentNullException(nameof(entity), "❌ AcademicYear entity không được null");

            // ✅ Validation: Kiểm tra ID có tồn tại
            if (string.IsNullOrWhiteSpace(entity.AcademicYearId))
                throw new ArgumentException("❌ AcademicYearId không được để trống", nameof(entity));

            // ✅ Validation: Kiểm tra năm hợp lệ
            if (entity.StartYear >= entity.EndYear)
                throw new ArgumentException("❌ Năm kết thúc phải sau năm bắt đầu!", nameof(entity));

            // ✅ Validation: Kiểm tra record có tồn tại không
            var existing = await _repo.GetByIdAsync(entity.AcademicYearId);
            if (existing == null)
                throw new ArgumentException($"❌ Không tìm thấy niên khóa với ID: {entity.AcademicYearId}", nameof(entity));

            entity.UpdatedAt = DateTime.Now;
            entity.UpdatedBy = updatedBy;
            await _repo.UpdateAsync(entity);
        }

        public Task DeleteAsync(string id) => _repo.DeleteAsync(id);

        // ============================================================
        // 🔹 AUTO-CREATION (Vietnamese University Standard)
        // ============================================================

        /// <summary>
        /// TỰ ĐỘNG tạo Niên khóa (Cohort) theo chuẩn Việt Nam
        /// </summary>
        /// <param name="startYear">Năm bắt đầu (VD: 2024)</param>
        /// <param name="durationYears">Số năm (mặc định 4 năm cho đại học)</param>
        /// <param name="createdBy">Người tạo</param>
        public async Task<AcademicYear> AutoCreateCohortAsync(int startYear, int durationYears = 4, string createdBy = "system")
        {
            // Validate
            if (startYear < 2020 || startYear > 2050)
                throw new Exception("❌ Năm bắt đầu không hợp lệ (2020-2050)");

            if (durationYears < 3 || durationYears > 6)
                throw new Exception("❌ Thời gian đào tạo không hợp lệ (3-6 năm)");

            var endYear = startYear + durationYears;
            var cohortCode = $"K{startYear % 100}";
            var yearName = $"{startYear}-{endYear}";
            var academicYearId = $"AY{startYear}";
            var description = $"Niên khóa {cohortCode} ({startYear}-{endYear})";

            var academicYear = new AcademicYear
            {
                AcademicYearId = academicYearId,
                YearName = yearName,
                CohortCode = cohortCode,
                StartYear = startYear,
                EndYear = endYear,
                DurationYears = durationYears,
                Description = description,
                IsActive = false, // Admin sẽ kích hoạt thủ công nếu cần
                CreatedBy = createdBy
            };

            await AddAsync(academicYear, createdBy);
            return academicYear;
        }

        /// <summary>
        /// Tự động tạo nhiều niên khóa (VD: K21, K22, K23, K24, K25)
        /// </summary>
        public async Task<List<AcademicYear>> AutoCreateMultipleCohortsAsync(int[] startYears, int durationYears = 4, string createdBy = "system")
        {
            var cohorts = new List<AcademicYear>();

            foreach (var year in startYears)
            {
                try
                {
                    var cohort = await AutoCreateCohortAsync(year, durationYears, createdBy);
                    cohorts.Add(cohort);
                }
                catch (Exception ex)
                {
                    // Skip if already exists
                }
            }

            return cohorts;
        }

        // ============================================================
        // 🔹 BUSINESS LOGIC
        // ============================================================

        /// <summary>
        /// Lấy niên khóa đang hoạt động
        /// </summary>
        public async Task<List<AcademicYear>> GetActiveCohortsAsync()
        {
            var all = await _repo.GetAllAsync();
            return all.Where(a => a.IsCurrentlyActive).ToList();
        }

        /// <summary>
        /// Lấy niên khóa cho năm hiện tại
        /// </summary>
        public async Task<List<AcademicYear>> GetCohortsForCurrentYearAsync()
        {
            var all = await _repo.GetAllAsync();
            var currentYear = DateTime.Now.Year;
            return all.Where(a => a.StartYear <= currentYear && a.EndYear >= currentYear).ToList();
        }
    }
}
