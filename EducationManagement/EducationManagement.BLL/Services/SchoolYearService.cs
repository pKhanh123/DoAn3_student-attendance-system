using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class SchoolYearService
    {
        private readonly SchoolYearRepository _repo;
        private readonly AcademicYearRepository _academicYearRepo;

        public SchoolYearService(SchoolYearRepository repo, AcademicYearRepository academicYearRepo)
        {
            _repo = repo;
            _academicYearRepo = academicYearRepo;
        }

        // ============================================================
        // 🔹 BASIC CRUD
        // ============================================================

        public Task<List<SchoolYear>> GetAllAsync() => _repo.GetAllAsync();

        public Task<SchoolYear?> GetByIdAsync(string id) => _repo.GetByIdAsync(id);

        public Task<SchoolYear?> GetCurrentAsync() => _repo.GetCurrentAsync();

        public Task<SchoolYear?> GetActiveAsync() => _repo.GetActiveAsync();

        public async Task AddAsync(SchoolYear entity, string createdBy = "system")
        {
            // Validate
            if (entity.StartDate >= entity.EndDate)
                throw new Exception("❌ Ngày kết thúc phải sau ngày bắt đầu!");

            entity.SchoolYearId = entity.SchoolYearId ?? Guid.NewGuid().ToString();
            entity.CreatedAt = DateTime.Now;
            entity.CreatedBy = createdBy;

            await _repo.AddAsync(entity);
        }

        public async Task UpdateAsync(SchoolYear entity, string updatedBy = "system")
        {
            entity.UpdatedAt = DateTime.Now;
            entity.UpdatedBy = updatedBy;
            await _repo.UpdateAsync(entity);
        }

        public Task DeleteAsync(string id, string deletedBy = "system") 
            => _repo.DeleteAsync(id, deletedBy);

        // ============================================================
        // 🔹 AUTO-CREATION (Vietnamese University Standard)
        // ============================================================

        /// <summary>
        /// Tự động tạo năm học theo chuẩn Việt Nam
        /// </summary>
        public async Task<SchoolYear> AutoCreateSchoolYearAsync(int startYear, string? academicYearId = null, string createdBy = "system")
        {
            var schoolYearId = $"SY{startYear}";
            var yearCode = $"{startYear}-{startYear + 1}";
            var yearName = $"Năm học {yearCode}";

            // Vietnamese academic calendar
            var startDate = new DateTime(startYear, 9, 1);           // 01-Sep
            var endDate = new DateTime(startYear + 1, 6, 30);        // 30-Jun
            var semester1Start = new DateTime(startYear, 9, 1);      // 01-Sep
            var semester1End = new DateTime(startYear + 1, 1, 31);   // 31-Jan
            var semester2Start = new DateTime(startYear + 1, 2, 1);  // 01-Feb
            var semester2End = new DateTime(startYear + 1, 6, 30);   // 30-Jun

            var schoolYear = new SchoolYear
            {
                SchoolYearId = schoolYearId,
                YearCode = yearCode,
                YearName = yearName,
                AcademicYearId = academicYearId,
                StartDate = startDate,
                EndDate = endDate,
                Semester1Start = semester1Start,
                Semester1End = semester1End,
                Semester2Start = semester2Start,
                Semester2End = semester2End,
                IsActive = false,
                CurrentSemester = null,
                CreatedBy = createdBy
            };

            await AddAsync(schoolYear, createdBy);
            return schoolYear;
        }

        /// <summary>
        /// Tự động tạo nhiều năm học cho một niên khóa (4 năm)
        /// </summary>
        public async Task<List<SchoolYear>> AutoCreateSchoolYearsForCohortAsync(string academicYearId, string createdBy = "system")
        {
            var academicYear = await _academicYearRepo.GetByIdAsync(academicYearId);
            if (academicYear == null)
                throw new Exception($"❌ Không tìm thấy niên khóa {academicYearId}");

            var schoolYears = new List<SchoolYear>();

            for (int i = 0; i < academicYear.DurationYears; i++)
            {
                var year = academicYear.StartYear + i;
                try
                {
                    var schoolYear = await AutoCreateSchoolYearAsync(year, academicYearId, createdBy);
                    schoolYears.Add(schoolYear);
                }
                catch (Exception ex)
                {
                    // Skip if already exists
                }
            }

            return schoolYears;
        }

        // ============================================================
        // 🔹 AUTO-TRANSITION
        // ============================================================

        /// <summary>
        /// Tự động chuyển học kỳ dựa vào ngày hiện tại
        /// Gọi trong background job mỗi ngày
        /// </summary>
        public async Task AutoTransitionSemesterAsync(string executedBy = "system")
        {
            await _repo.AutoTransitionSemesterAsync(executedBy);
        }

        /// <summary>
        /// Tự động chuyển sang năm học mới
        /// </summary>
        public async Task AutoTransitionToNewSchoolYearAsync(string newSchoolYearId, string executedBy = "system")
        {
            await _repo.AutoTransitionToNewSchoolYearAsync(newSchoolYearId, executedBy);
        }

        /// <summary>
        /// FORCE chuyển học kỳ (CHỈ DÙNG CHO TEST)
        /// Cho phép force chuyển sang học kỳ cụ thể mà không cần kiểm tra ngày tháng
        /// </summary>
        public async Task<(string SchoolYearId, int? OldSemester, int NewSemester)> ForceTransitionSemesterAsync(int targetSemester, string executedBy = "system")
        {
            var active = await _repo.GetActiveAsync();
            if (active == null)
                throw new Exception("❌ Không có năm học nào đang active!");

            var oldSemester = active.CurrentSemester;
            var schoolYearId = active.SchoolYearId;

            // Tính GPA cho học kỳ cũ (nếu có và khác với học kỳ mới)
            if (oldSemester.HasValue && oldSemester.Value != targetSemester)
            {
                try
                {
                    // Dùng school_year_id để tính GPA (phù hợp hơn với cấu trúc dữ liệu)
                    await _repo.CalculateGPAForSemesterBySchoolYearAsync(schoolYearId, oldSemester.Value, executedBy);
                }
                catch (Exception ex)
                {
                    // Log warning nhưng không throw - vẫn cho phép chuyển học kỳ
                    // Exception có thể do stored procedure không tồn tại hoặc lỗi khác
                    System.Diagnostics.Debug.WriteLine($"⚠️ Warning: Could not calculate GPA for semester {oldSemester}: {ex.Message}");
                }
            }

            // Force update current_semester
            active.CurrentSemester = targetSemester;
            active.UpdatedBy = executedBy;
            await _repo.UpdateAsync(active);

            return (schoolYearId, oldSemester, targetSemester);
        }

        /// <summary>
        /// Kích hoạt năm học (set active)
        /// </summary>
        public async Task ActivateSchoolYearAsync(string schoolYearId, int initialSemester = 1, string updatedBy = "system")
        {
            // Deactivate all other school years
            var allSchoolYears = await _repo.GetAllAsync();
            foreach (var sy in allSchoolYears)
            {
                if (sy.IsActive)
                {
                    sy.IsActive = false;
                    sy.UpdatedBy = updatedBy;
                    await _repo.UpdateAsync(sy);
                }
            }

            // Activate target school year
            var target = await _repo.GetByIdAsync(schoolYearId);
            if (target == null)
                throw new Exception($"❌ Không tìm thấy năm học {schoolYearId}");

            target.IsActive = true;
            target.CurrentSemester = initialSemester;
            target.UpdatedBy = updatedBy;
            await _repo.UpdateAsync(target);
        }

        // ============================================================
        // 🔹 BUSINESS LOGIC
        // ============================================================

        /// <summary>
        /// Kiểm tra xem hiện tại có đang trong kỳ đăng ký không
        /// </summary>
        public async Task<bool> IsRegistrationPeriodAsync()
        {
            var current = await _repo.GetCurrentAsync();
            if (current == null) return false;

            // Typically registration is 2 weeks before semester starts
            var today = DateTime.Now;
            
            if (current.Semester1Start.HasValue)
            {
                var regStart1 = current.Semester1Start.Value.AddDays(-14);
                var regEnd1 = current.Semester1Start.Value.AddDays(7);
                if (today >= regStart1 && today <= regEnd1)
                    return true;
            }

            if (current.Semester2Start.HasValue)
            {
                var regStart2 = current.Semester2Start.Value.AddDays(-14);
                var regEnd2 = current.Semester2Start.Value.AddDays(7);
                if (today >= regStart2 && today <= regEnd2)
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Lấy thông tin học kỳ hiện tại
        /// Fallback: Nếu không có current, thử lấy active school year
        /// </summary>
        public async Task<(string SchoolYearCode, int? Semester, string SemesterName)> GetCurrentSemesterInfoAsync()
        {
            var current = await _repo.GetCurrentAsync();
            if (current == null)
            {
                // Fallback: Try to get active school year
                var active = await _repo.GetActiveAsync();
                if (active != null)
                {
                    return (active.YearCode, active.CurrentSemester ?? active.DetectedSemester, active.SemesterName);
                }
                return ("N/A", null, "Ngoài học kỳ");
            }

            return (current.YearCode, current.CurrentSemester ?? current.DetectedSemester, current.SemesterName);
        }
    }
}

