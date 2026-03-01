using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Organization;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class MajorService
    {
        private readonly MajorRepository _repo;
        private readonly FacultyRepository _facultyRepo;

        public MajorService(MajorRepository repo, FacultyRepository facultyRepo)
        {
            _repo = repo;
            _facultyRepo = facultyRepo;
        }

        public async Task<List<Major>> GetAllAsync() => await _repo.GetAllAsync();
        
        public Task<(List<Major> items, int totalCount)> GetAllPagedAsync(
            int page = 1, int pageSize = 10, string? search = null) 
            => _repo.GetAllPagedAsync(page, pageSize, search);

        public async Task<Major?> GetByIdAsync(string id) => await _repo.GetByIdAsync(id);

        public async Task<List<Major>> GetByFacultyAsync(string facultyId)
        {
            return await _repo.GetByFacultyAsync(facultyId);
        }

        /// <summary>
        /// Validate format mã code: chỉ chữ in hoa và số, không khoảng trắng, không ký tự đặc biệt
        /// </summary>
        private void ValidateCodeFormat(string code, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException($"{fieldName} không được để trống");
            
            // Chỉ cho phép chữ in hoa và số, độ dài 2-20 ký tự
            if (!System.Text.RegularExpressions.Regex.IsMatch(code, @"^[A-Z0-9]{2,20}$"))
            {
                throw new ArgumentException(
                    $"{fieldName} phải là chữ in hoa và số, từ 2-20 ký tự, không có khoảng trắng hoặc ký tự đặc biệt. " +
                    $"Ví dụ: SE, IT, CS101");
            }
        }
        
        /// <summary>
        /// Validate format tên: không chỉ khoảng trắng, độ dài hợp lệ
        /// </summary>
        private void ValidateNameFormat(string name, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException($"{fieldName} không được để trống");
            
            var trimmed = name.Trim();
            if (trimmed.Length < 3)
                throw new ArgumentException($"{fieldName} phải có ít nhất 3 ký tự");
            
            if (trimmed.Length > 200)
                throw new ArgumentException($"{fieldName} không được vượt quá 200 ký tự");
        }
        
        public async Task AddAsync(Major major)
        {
            // ✅ Format validation
            ValidateCodeFormat(major.MajorCode, "Mã ngành");
            ValidateNameFormat(major.MajorName, "Tên ngành");
            
            // ✅ Ràng buộc nghiệp vụ: Faculty phải tồn tại
            var faculty = await _facultyRepo.GetByIdAsync(major.FacultyId);
            if (faculty == null)
                throw new Exception("Khoa không tồn tại!");

            // Auto uppercase mã code
            major.MajorCode = major.MajorCode.ToUpper().Trim();
            major.MajorName = major.MajorName.Trim();
            
            major.MajorId = Guid.NewGuid().ToString();
            major.CreatedAt = DateTime.Now;

            await _repo.AddAsync(major);
        }

        public async Task UpdateAsync(Major major)
        {
            // ✅ Format validation
            ValidateCodeFormat(major.MajorCode, "Mã ngành");
            ValidateNameFormat(major.MajorName, "Tên ngành");
            
            // ✅ Validate: Faculty phải tồn tại khi update
            var faculty = await _facultyRepo.GetByIdAsync(major.FacultyId);
            if (faculty == null)
                throw new Exception("Khoa không tồn tại!");
            
            // Auto uppercase mã code
            major.MajorCode = major.MajorCode.ToUpper().Trim();
            major.MajorName = major.MajorName.Trim();
            
            major.UpdatedAt = DateTime.Now;
            await _repo.UpdateAsync(major);
        }

        /// <summary>
        /// Kiểm tra ràng buộc trước khi xóa Major
        /// </summary>
        public Task<MajorConstraintDto> CheckConstraintsAsync(string id) => _repo.CheckConstraintsAsync(id);
        
        /// <summary>
        /// Xóa Major với validation
        /// </summary>
        public async Task DeleteAsync(string id)
        {
            var constraints = await CheckConstraintsAsync(id);
            if (constraints.HasActiveRelations)
            {
                var message = $"Không thể xóa ngành này vì còn {constraints.ActiveStudentCount} sinh viên đang hoạt động.\n";
                message += "Vui lòng chuyển sinh viên sang ngành khác trước khi xóa.";
                throw new InvalidOperationException(message);
            }
            
            await _repo.DeleteAsync(id);
        }
    }
}
