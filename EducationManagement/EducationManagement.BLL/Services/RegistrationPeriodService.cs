using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EducationManagement.Common.DTOs.RegistrationPeriod;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class RegistrationPeriodService
    {
        private readonly RegistrationPeriodRepository _repository;

        public RegistrationPeriodService(RegistrationPeriodRepository repository)
        {
            _repository = repository;
        }

        // ============================================================
        // 1️⃣ GET ALL
        // ============================================================
        public async Task<List<PeriodDetailDto>> GetAllAsync(string? periodType = null)
        {
            return await _repository.GetAllAsync(periodType);
        }
        
        // ============================================================
        // 1️⃣.1 GET RETAKE PERIODS
        // ============================================================
        public async Task<List<PeriodDetailDto>> GetRetakePeriodsAsync()
        {
            return await _repository.GetRetakePeriodsAsync();
        }

        // ============================================================
        // 2️⃣ GET ACTIVE PERIOD
        // ============================================================
        public async Task<PeriodDetailDto?> GetActiveAsync()
        {
            return await _repository.GetActiveAsync();
        }

        // ============================================================
        // 3️⃣ GET BY ID
        // ============================================================
        public async Task<PeriodDetailDto?> GetByIdAsync(string periodId)
        {
            if (string.IsNullOrWhiteSpace(periodId))
                throw new ArgumentException("Period ID không được để trống");

            return await _repository.GetByIdAsync(periodId);
        }

        // ============================================================
        // 4️⃣ CREATE
        // ============================================================
        public async Task<string> CreateAsync(CreatePeriodDto dto, string createdBy)
        {
            // Validation
            ValidateCreateDto(dto);

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            // Business logic: Validate date range
            if (dto.StartDate >= dto.EndDate)
                throw new ArgumentException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");

            if (dto.StartDate < DateTime.Now.AddDays(-1))
                throw new ArgumentException("Ngày bắt đầu không thể ở quá khứ");

            // Check for overlapping periods (optional - can be handled in SP)
            // var existingPeriods = await _repository.GetAllAsync();
            // foreach (var period in existingPeriods)
            // {
            //     if (period.AcademicYearId == dto.AcademicYearId && period.Semester == dto.Semester)
            //     {
            //         if (period.Status == "OPEN")
            //             throw new Exception("Đã có đợt đăng ký OPEN cho học kỳ này");
            //     }
            // }

            return await _repository.CreateAsync(dto, createdBy);
        }

        // ============================================================
        // 5️⃣ UPDATE
        // ============================================================
        public async Task UpdateAsync(string periodId, UpdatePeriodDto dto, string updatedBy)
        {
            if (string.IsNullOrWhiteSpace(periodId))
                throw new ArgumentException("Period ID không được để trống");

            ValidateUpdateDto(dto);

            if (string.IsNullOrWhiteSpace(updatedBy))
                throw new ArgumentException("UpdatedBy không được để trống");

            // Validate date range
            if (dto.StartDate >= dto.EndDate)
                throw new ArgumentException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");

            // Check if exists
            var existing = await _repository.GetByIdAsync(periodId);
            if (existing == null)
                throw new Exception($"Không tìm thấy đợt đăng ký với ID: {periodId}");

            // Don't allow updating if period is already closed
            if (existing.Status == "CLOSED")
                throw new Exception("Không thể cập nhật đợt đăng ký đã đóng");

            await _repository.UpdateAsync(periodId, dto, updatedBy);
        }

        // ============================================================
        // 6️⃣ DELETE (Soft Delete)
        // ============================================================
        public async Task DeleteAsync(string periodId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(periodId))
                throw new ArgumentException("Period ID không được để trống");

            if (string.IsNullOrWhiteSpace(deletedBy))
                throw new ArgumentException("DeletedBy không được để trống");

            // Check if exists
            var existing = await _repository.GetByIdAsync(periodId);
            if (existing == null)
                throw new Exception($"Không tìm thấy đợt đăng ký với ID: {periodId}");

            // Check if there are enrollments in this period
            if (existing.TotalEnrollments > 0)
                throw new Exception($"Không thể xóa đợt đăng ký vì đã có {existing.TotalEnrollments} lượt đăng ký");

            await _repository.DeleteAsync(periodId, deletedBy);
        }

        // ============================================================
        // 7️⃣ OPEN PERIOD
        // ============================================================
        public async Task OpenPeriodAsync(string periodId, string openedBy)
        {
            if (string.IsNullOrWhiteSpace(periodId))
                throw new ArgumentException("Period ID không được để trống");

            if (string.IsNullOrWhiteSpace(openedBy))
                throw new ArgumentException("OpenedBy không được để trống");

            // Check if exists
            var existing = await _repository.GetByIdAsync(periodId);
            if (existing == null)
                throw new Exception($"Không tìm thấy đợt đăng ký với ID: {periodId}");

            // Validate dates
            if (DateTime.Now < existing.StartDate)
                throw new Exception("Chưa đến thời gian mở đợt đăng ký");

            if (DateTime.Now > existing.EndDate)
                throw new Exception("Đã quá thời gian đăng ký");

            if (existing.Status == "OPEN")
                throw new Exception("Đợt đăng ký đã được mở");

            if (existing.Status == "CLOSED")
                throw new Exception("Không thể mở lại đợt đăng ký đã đóng");

            // The SP will close other open periods automatically
            await _repository.OpenPeriodAsync(periodId, openedBy);
        }

        // ============================================================
        // 8️⃣ CLOSE PERIOD
        // ============================================================
        public async Task ClosePeriodAsync(string periodId, string closedBy)
        {
            if (string.IsNullOrWhiteSpace(periodId))
                throw new ArgumentException("Period ID không được để trống");

            if (string.IsNullOrWhiteSpace(closedBy))
                throw new ArgumentException("ClosedBy không được để trống");

            // Check if exists
            var existing = await _repository.GetByIdAsync(periodId);
            if (existing == null)
                throw new Exception($"Không tìm thấy đợt đăng ký với ID: {periodId}");

            if (existing.Status == "CLOSED")
                throw new Exception("Đợt đăng ký đã được đóng");

            if (existing.Status == "UPCOMING")
                throw new Exception("Không thể đóng đợt đăng ký chưa mở");

            await _repository.ClosePeriodAsync(periodId, closedBy);
        }

        // ============================================================
        // 9️⃣ PERIOD CLASSES MANAGEMENT
        // ============================================================
        public async Task<List<Dictionary<string, object>>> GetClassesByPeriodAsync(string periodId)
        {
            var dt = await _repository.GetClassesByPeriodAsync(periodId);
            var list = new List<Dictionary<string, object>>();
            foreach (System.Data.DataRow row in dt.Rows)
            {
                var dict = new Dictionary<string, object>();
                foreach (System.Data.DataColumn col in dt.Columns)
                {
                    dict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                }
                list.Add(dict);
            }
            return list;
        }

        public async Task<List<Dictionary<string, object>>> GetAvailableClassesForPeriodAsync(string periodId)
        {
            var dt = await _repository.GetAvailableClassesForPeriodAsync(periodId);
            var list = new List<Dictionary<string, object>>();
            foreach (System.Data.DataRow row in dt.Rows)
            {
                var dict = new Dictionary<string, object>();
                foreach (System.Data.DataColumn col in dt.Columns)
                {
                    dict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                }
                list.Add(dict);
            }
            return list;
        }

        public async Task AddClassToPeriodAsync(string periodId, string classId, string createdBy)
        {
            await _repository.AddClassToPeriodAsync(periodId, classId, createdBy);
        }

        public async Task RemoveClassFromPeriodAsync(string periodClassId, string updatedBy)
        {
            await _repository.RemoveClassFromPeriodAsync(periodClassId, updatedBy);
        }

        // ============================================================
        // PRIVATE VALIDATION HELPERS
        // ============================================================
        private void ValidateCreateDto(CreatePeriodDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.PeriodName))
                throw new ArgumentException("Tên đợt đăng ký không được để trống");

            if (string.IsNullOrWhiteSpace(dto.AcademicYearId))
                throw new ArgumentException("Năm học không được để trống");

            if (dto.Semester < 1 || dto.Semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");
        }

        private void ValidateUpdateDto(UpdatePeriodDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.PeriodName))
                throw new ArgumentException("Tên đợt đăng ký không được để trống");

            if (string.IsNullOrWhiteSpace(dto.AcademicYearId))
                throw new ArgumentException("Năm học không được để trống");

            if (dto.Semester < 1 || dto.Semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");
        }
    }
}

