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
    public class FacultyService
    {
        private readonly FacultyRepository _repo;

        public FacultyService(FacultyRepository repo)
        {
            _repo = repo;
        }

        public Task<List<Faculty>> GetAllAsync() => _repo.GetAllAsync();
        
        public Task<(List<Faculty> items, int totalCount)> GetAllPagedAsync(
            int page = 1, int pageSize = 10, string? search = null) 
            => _repo.GetAllPagedAsync(page, pageSize, search);
        
        public Task<Faculty?> GetByIdAsync(string id) => _repo.GetByIdAsync(id);
        
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
                    $"Ví dụ: CNTT, SE, IT101");
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
        
        public async Task AddAsync(Faculty f)
        {
            // ✅ Format validation
            ValidateCodeFormat(f.FacultyCode, "Mã khoa");
            ValidateNameFormat(f.FacultyName, "Tên khoa");
            
            // Auto uppercase mã code
            f.FacultyCode = f.FacultyCode.ToUpper().Trim();
            f.FacultyName = f.FacultyName.Trim();
            
            await _repo.AddAsync(f);
        }
        
        public async Task UpdateAsync(Faculty f)
        {
            // ✅ Format validation
            ValidateCodeFormat(f.FacultyCode, "Mã khoa");
            ValidateNameFormat(f.FacultyName, "Tên khoa");
            
            // Auto uppercase mã code
            f.FacultyCode = f.FacultyCode.ToUpper().Trim();
            f.FacultyName = f.FacultyName.Trim();
            
            await _repo.UpdateAsync(f);
        }
        
        /// <summary>
        /// Kiểm tra ràng buộc trước khi xóa Faculty
        /// </summary>
        public Task<FacultyConstraintDto> CheckConstraintsAsync(string id) => _repo.CheckConstraintsAsync(id);
        
        /// <summary>
        /// Xóa Faculty với validation
        /// </summary>
        public async Task DeleteAsync(string id)
        {
            var constraints = await CheckConstraintsAsync(id);
            if (constraints.HasActiveRelations)
            {
                var message = "Không thể xóa khoa này vì còn dữ liệu liên quan đang hoạt động:\n";
                if (constraints.ActiveDepartmentCount > 0)
                    message += $"- {constraints.ActiveDepartmentCount} bộ môn đang hoạt động\n";
                if (constraints.ActiveMajorCount > 0)
                    message += $"- {constraints.ActiveMajorCount} ngành đang hoạt động\n";
                message += "\nVui lòng xóa hoặc vô hiệu hóa các dữ liệu liên quan trước.";
                throw new InvalidOperationException(message);
            }
            
            await _repo.DeleteAsync(id);
        }
    }
}
