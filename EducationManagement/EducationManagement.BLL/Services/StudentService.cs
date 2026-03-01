using EducationManagement.Common.DTOs.Student;
using EducationManagement.Common.Models;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BCrypt.Net;

namespace EducationManagement.BLL.Services
{
    public class StudentService
    {
        private readonly StudentRepository _studentRepository;

        public StudentService(StudentRepository studentRepository)
        {
            _studentRepository = studentRepository;
        }

        /// <summary>
        /// Thêm sinh viên mới
        /// Tự động tạo user với mật khẩu là mã sinh viên
        /// </summary>
        public async Task AddStudentAsync(StudentCreateDto model)
        {
            if (string.IsNullOrWhiteSpace(model.StudentCode))
                throw new ArgumentException("Mã sinh viên không được để trống");

            if (string.IsNullOrWhiteSpace(model.FullName))
                throw new ArgumentException("Họ tên không được để trống");

            // Hash password từ StudentCode (mật khẩu mặc định là mã sinh viên)
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(model.StudentCode, workFactor: 12);

            await _studentRepository.AddAsync(model, passwordHash);
        }

        /// <summary>
        /// Cập nhật thông tin sinh viên
        /// </summary>
        public async Task UpdateStudentAsync(UpdateStudentFullDto model)
        {
            if (string.IsNullOrWhiteSpace(model.StudentId))
                throw new ArgumentException("Student ID không được để trống");

            await _studentRepository.UpdateAsync(model);
        }

        /// <summary>
        /// Xóa sinh viên (soft delete)
        /// </summary>
        public async Task DeleteStudentAsync(string studentId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            await _studentRepository.DeleteAsync(studentId, deletedBy);
        }

        /// <summary>
        /// Lấy danh sách sinh viên với phân trang và lọc
        /// </summary>
        public async Task<(List<Student> Students, int TotalCount)> GetAllStudentsAsync(
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? facultyId = null,
            string? majorId = null,
            string? academicYearId = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100; // Giới hạn max pageSize

            return await _studentRepository.GetAllAsync(page, pageSize, search, facultyId, majorId, academicYearId);
        }

        /// <summary>
        /// Lấy sinh viên theo ID
        /// </summary>
        public async Task<Student?> GetStudentByIdAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _studentRepository.GetByIdAsync(studentId);
        }

        /// <summary>
        /// Lấy sinh viên theo User ID
        /// </summary>
        public async Task<Student?> GetStudentByUserIdAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("User ID không được để trống");

            return await _studentRepository.GetByUserIdAsync(userId);
        }

        /// <summary>
        /// Import hàng loạt sinh viên từ Excel
        /// </summary>
        public async Task<BatchImportResultDto> ImportStudentsBatchAsync(List<StudentImportDto> students, string createdBy)
        {
            if (students == null || students.Count == 0)
                throw new ArgumentException("Danh sách sinh viên không được rỗng");

            return await _studentRepository.ImportBatchAsync(students, createdBy);
        }
    }
}

