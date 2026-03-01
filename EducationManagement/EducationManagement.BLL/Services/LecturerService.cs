using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class LecturerService
    {
        private readonly LecturerRepository _repo;
        private readonly DepartmentRepository _depRepo;

        public LecturerService(LecturerRepository repo, DepartmentRepository depRepo)
        {
            _repo = repo;
            _depRepo = depRepo;
        }

        // ============================================================
        // 🔹 Lấy danh sách / chi tiết
        // ============================================================
        public Task<List<Lecturer>> GetAllAsync() => _repo.GetAllAsync();

        public Task<Lecturer?> GetByIdAsync(string id) => _repo.GetByIdAsync(id);

        public Task<Lecturer?> GetByUserIdAsync(string userId) => _repo.GetByUserIdAsync(userId);

        // ============================================================
        // 🔹 Thêm mới giảng viên
        // ============================================================
        public async Task AddAsync(Lecturer model)
        {
            // ✅ Ràng buộc 1: Bộ môn phải tồn tại
            var dep = await _depRepo.GetByIdAsync(model.DepartmentId);
            if (dep == null)
                throw new Exception("❌ Bộ môn không tồn tại trong hệ thống.");

            // ✅ Ràng buộc 2: 1 user chỉ có 1 giảng viên
            var exists = await _repo.GetByUserIdAsync(model.UserId);
            if (exists != null)
                throw new Exception("❌ Giảng viên này đã tồn tại trong hệ thống.");

            model.LecturerId = Guid.NewGuid().ToString();
            model.CreatedAt = DateTime.Now;
            model.IsActive = true;

            await _repo.AddAsync(model);
        }

        // ============================================================
        // 🔹 Cập nhật giảng viên
        // ============================================================
        public async Task UpdateAsync(Lecturer model)
        {
            model.UpdatedAt = DateTime.Now;
            await _repo.UpdateAsync(model);
        }

        // ============================================================
        // 🔹 Xóa mềm giảng viên
        // ============================================================
        public Task DeleteAsync(string id) => _repo.DeleteAsync(id);
    }
}
