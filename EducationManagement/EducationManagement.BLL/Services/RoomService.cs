using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class RoomService
    {
        private readonly RoomRepository _repo;

        public RoomService(RoomRepository repo)
        {
            _repo = repo;
        }

        // ============================================================
        // 🔹 Lấy danh sách / chi tiết
        // ============================================================
        public Task<List<Room>> GetAllAsync() => _repo.GetAllAsync();

        public async Task<Room> GetByIdAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                throw new ArgumentException("RoomId không được để trống", nameof(id));

            var room = await _repo.GetByIdAsync(id);
            if (room == null)
                throw new InvalidOperationException("Không tìm thấy phòng học với ID: " + id);

            return room;
        }

        public Task<List<Room>> SearchAsync(string? search, bool? isActive) => _repo.SearchAsync(search, isActive);

        public async Task<(List<Room> items, int totalCount)> GetPagedAsync(int page, int pageSize, string? search, bool? isActive)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100; // Limit max page size

            return await _repo.GetPagedAsync(page, pageSize, search, isActive);
        }

        // ============================================================
        // 🔹 Thêm mới phòng học
        // ============================================================
        public async Task AddAsync(Room model, string? actor)
        {
            // ✅ Validation
            if (string.IsNullOrWhiteSpace(model.RoomCode))
                throw new InvalidOperationException("Mã phòng học không được để trống");

            // ✅ Kiểm tra RoomCode unique
            var exists = await _repo.ExistsByCodeAsync(model.RoomCode);
            if (exists)
                throw new InvalidOperationException("Mã phòng học đã tồn tại trong hệ thống: " + model.RoomCode);

            // ✅ Kiểm tra Capacity > 0 nếu có giá trị
            if (model.Capacity.HasValue && model.Capacity.Value <= 0)
                throw new InvalidOperationException("Sức chứa phòng học phải lớn hơn 0");

            // ✅ Set default values
            model.RoomId = Guid.NewGuid().ToString("N");
            model.CreatedAt = DateTime.Now;
            model.CreatedBy = actor;
            model.IsActive = true;

            await _repo.AddAsync(model);
        }

        // ============================================================
        // 🔹 Cập nhật phòng học
        // ============================================================
        public async Task UpdateAsync(Room model, string? actor)
        {
            // ✅ Validation
            if (string.IsNullOrWhiteSpace(model.RoomId))
                throw new ArgumentException("RoomId không được để trống", nameof(model.RoomId));

            if (string.IsNullOrWhiteSpace(model.RoomCode))
                throw new InvalidOperationException("Mã phòng học không được để trống");

            // ✅ Kiểm tra room tồn tại
            var exists = await _repo.ExistsAsync(model.RoomId);
            if (!exists)
                throw new InvalidOperationException("Không tìm thấy phòng học với ID: " + model.RoomId);

            // ✅ Kiểm tra RoomCode unique (exclude chính nó)
            var codeExists = await _repo.ExistsByCodeAsync(model.RoomCode, model.RoomId);
            if (codeExists)
                throw new InvalidOperationException("Mã phòng học đã tồn tại trong hệ thống: " + model.RoomCode);

            // ✅ Kiểm tra Capacity > 0 nếu có giá trị
            if (model.Capacity.HasValue && model.Capacity.Value <= 0)
                throw new InvalidOperationException("Sức chứa phòng học phải lớn hơn 0");

            // ✅ Set update values
            model.UpdatedAt = DateTime.Now;
            model.UpdatedBy = actor;

            await _repo.UpdateAsync(model);
        }

        // ============================================================
        // 🔹 Xóa phòng học (soft delete)
        // ============================================================
        public async Task<bool> DeleteAsync(string id, string? actor)
        {
            // ✅ Validation
            if (string.IsNullOrWhiteSpace(id))
                throw new ArgumentException("RoomId không được để trống", nameof(id));

            // ✅ Kiểm tra room tồn tại
            var room = await _repo.GetByIdAsync(id);
            if (room == null)
                throw new InvalidOperationException("Không tìm thấy phòng học với ID: " + id);

            // ✅ Kiểm tra ràng buộc: Room không được sử dụng trong timetable_sessions
            var isInUse = await _repo.IsRoomInUseAsync(id);
            if (isInUse)
                throw new InvalidOperationException("Không thể xóa phòng học đang được sử dụng trong lịch giảng dạy");

            // ✅ Soft delete
            var result = await _repo.SoftDeleteAsync(id, actor);
            return result > 0;
        }
    }
}

