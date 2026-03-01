  using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Subject;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class SubjectService
    {
        private readonly SubjectRepository _repo;
        private readonly DepartmentRepository _depRepo;
        private readonly ClassRepository _classRepo;

        public SubjectService(SubjectRepository repo, DepartmentRepository depRepo, ClassRepository classRepo)
        {
            _repo = repo;
            _depRepo = depRepo;
            _classRepo = classRepo;
        }

        public Task<List<Subject>> GetAllAsync() => _repo.GetAllAsync();
        
        public Task<(List<Subject> items, int totalCount)> GetAllPagedAsync(
            int page = 1, int pageSize = 10, string? search = null, string? departmentId = null) 
            => _repo.GetAllPagedAsync(page, pageSize, search, departmentId);
        
        public Task<Subject?> GetByIdAsync(string id) => _repo.GetByIdAsync(id);
        public Task<List<Subject>> GetByDepartmentAsync(string departmentId) => _repo.GetByDepartmentAsync(departmentId);

        public async Task AddAsync(Subject model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            // 🔹 Kiểm tra trùng mã môn học
            if (string.IsNullOrWhiteSpace(model.SubjectCode))
                throw new ArgumentException("Mã môn học không được để trống", nameof(model));

            if (await _repo.ExistsCodeAsync(model.SubjectCode))
                throw new InvalidOperationException($"Mã môn học '{model.SubjectCode}' đã tồn tại.");

            // 🔹 Kiểm tra bộ môn có tồn tại không
            if (string.IsNullOrWhiteSpace(model.DepartmentId))
                throw new ArgumentException("Bộ môn không được để trống", nameof(model));

            var dep = await _depRepo.GetByIdAsync(model.DepartmentId);
            if (dep == null)
                throw new ArgumentException($"Bộ môn với ID '{model.DepartmentId}' không tồn tại.", nameof(model));

            model.SubjectId = Guid.NewGuid().ToString();
            model.CreatedAt = DateTime.Now;
            await _repo.AddAsync(model);
        }

        public async Task UpdateAsync(Subject model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (string.IsNullOrWhiteSpace(model.SubjectId))
                throw new ArgumentException("Subject ID không được để trống", nameof(model));

            // Check if subject exists
            var existing = await _repo.GetByIdAsync(model.SubjectId);
            if (existing == null)
                throw new ArgumentException($"Không tìm thấy môn học với ID: {model.SubjectId}", nameof(model));

            // If DepartmentId is provided, validate it exists
            if (!string.IsNullOrWhiteSpace(model.DepartmentId))
            {
                var dep = await _depRepo.GetByIdAsync(model.DepartmentId);
                if (dep == null)
                    throw new ArgumentException($"Bộ môn với ID '{model.DepartmentId}' không tồn tại.", nameof(model));
            }

            model.UpdatedAt = DateTime.Now;
            await _repo.UpdateAsync(model);
        }

        public Task DeleteAsync(string id) => _repo.DeleteAsync(id);

        /// <summary>
        /// Trả về danh sách môn học kèm số lượng giảng viên đang dạy (distinct theo lecturer_id)
        /// Không cần thay đổi DB: tính toán bằng cách gom nhóm từ bảng classes.
        /// </summary>
        public async Task<List<SubjectWithCountDto>> GetAllWithLecturerCountAsync()
        {
            var subjects = await _repo.GetAllAsync();
            var classes = await _classRepo.GetAllAsync();

            // Đếm distinct giảng viên theo môn
            var subjectIdToLecturerCount = classes
                .GroupBy(c => c.SubjectId)
                .ToDictionary(g => g.Key, g => g.Select(c => c.LecturerId).Distinct().Count());

            var result = subjects.Select(s => new SubjectWithCountDto
            {
                SubjectId = s.SubjectId,
                SubjectCode = s.SubjectCode,
                SubjectName = s.SubjectName,
                Credits = s.Credits,
                DepartmentId = s.DepartmentId,
                DepartmentName = s.DepartmentName,
                LecturerCount = subjectIdToLecturerCount.TryGetValue(s.SubjectId, out var cnt) ? cnt : 0
            }).ToList();

            return result;
        }
    }
}
