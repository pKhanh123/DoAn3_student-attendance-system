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
    public class DepartmentService
    {
        private readonly DepartmentRepository _repo;
        private readonly FacultyRepository _facultyRepo;

        public DepartmentService(DepartmentRepository repo, FacultyRepository facultyRepo)
        {
            _repo = repo;
            _facultyRepo = facultyRepo;
        }

        public Task<List<Department>> GetAllAsync() => _repo.GetAllAsync();
        
        public Task<(List<Department> items, int totalCount)> GetAllPagedAsync(
            int page = 1, int pageSize = 10, string? search = null) 
            => _repo.GetAllPagedAsync(page, pageSize, search);
        
        public Task<Department?> GetByIdAsync(string id) => _repo.GetByIdAsync(id);
        
        public Task<string> GenerateNextCodeAsync() => _repo.GenerateNextCodeAsync();
        
        /// <summary>
        /// Validate format mã code: chỉ chữ in hoa và số, không khoảng trắng, không ký tự đặc biệt
        /// </summary>
        private void ValidateCodeFormat(string code, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(code))
                return; // Cho phép để trống vì có thể auto generate
            
            // Chỉ cho phép chữ in hoa và số, độ dài 2-20 ký tự
            if (!System.Text.RegularExpressions.Regex.IsMatch(code, @"^[A-Z0-9]{2,20}$"))
            {
                throw new ArgumentException(
                    $"{fieldName} phải là chữ in hoa và số, từ 2-20 ký tự, không có khoảng trắng hoặc ký tự đặc biệt. " +
                    $"Ví dụ: DEPT001, CS101");
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
        
        public async Task AddAsync(Department department)
        {
            // ✅ Format validation
            ValidateCodeFormat(department.DepartmentCode, "Mã bộ môn");
            ValidateNameFormat(department.DepartmentName, "Tên bộ môn");
            
            // ✅ Validate: Faculty phải tồn tại
            var faculty = await _facultyRepo.GetByIdAsync(department.FacultyId);
            if (faculty == null)
                throw new Exception("Khoa không tồn tại!");

            // Auto uppercase mã code nếu có
            if (!string.IsNullOrWhiteSpace(department.DepartmentCode))
                department.DepartmentCode = department.DepartmentCode.ToUpper().Trim();
            department.DepartmentName = department.DepartmentName.Trim();

            await _repo.AddAsync(department);
        }

        public async Task<int> UpdateAsync(Department department)
        {
            // ✅ Format validation
            ValidateCodeFormat(department.DepartmentCode, "Mã bộ môn");
            ValidateNameFormat(department.DepartmentName, "Tên bộ môn");
            
            // ✅ Validate: Faculty phải tồn tại khi update
            var faculty = await _facultyRepo.GetByIdAsync(department.FacultyId);
            if (faculty == null)
                throw new Exception("Khoa không tồn tại!");
            
            // Auto uppercase mã code nếu có
            if (!string.IsNullOrWhiteSpace(department.DepartmentCode))
                department.DepartmentCode = department.DepartmentCode.ToUpper().Trim();
            department.DepartmentName = department.DepartmentName.Trim();
            
            return await _repo.UpdateAsync(department);
        }

        /// <summary>
        /// Kiểm tra ràng buộc trước khi xóa Department
        /// </summary>
        public Task<DepartmentConstraintDto> CheckConstraintsAsync(string id) => _repo.CheckConstraintsAsync(id);
        
        /// <summary>
        /// Xóa Department với validation
        /// </summary>
        public async Task DeleteAsync(string id)
        {
            var constraints = await CheckConstraintsAsync(id);
            if (constraints.HasActiveRelations)
            {
                var message = "Không thể xóa bộ môn này vì còn dữ liệu liên quan đang hoạt động:\n";
                if (constraints.ActiveSubjectCount > 0)
                    message += $"- {constraints.ActiveSubjectCount} môn học đang hoạt động\n";
                if (constraints.ActiveLecturerCount > 0)
                    message += $"- {constraints.ActiveLecturerCount} giảng viên đang hoạt động\n";
                message += "\nVui lòng xóa hoặc vô hiệu hóa các dữ liệu liên quan trước.";
                throw new InvalidOperationException(message);
            }
            
            await _repo.DeleteAsync(id);
        }
    }
}

