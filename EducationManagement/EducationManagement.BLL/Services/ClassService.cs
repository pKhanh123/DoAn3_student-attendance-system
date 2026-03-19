using EducationManagement.Common.Models;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class ClassService
    {
        private readonly ClassRepository _classRepository;

        public ClassService(ClassRepository classRepository)
        {
            _classRepository = classRepository;
        }

        /// <summary>
        /// Lấy tất cả classes - KHÔNG PAGINATION
        /// </summary>
        public async Task<List<Class>> GetAllClassesAsync()
        {
            return await _classRepository.GetAllAsync();
        }

        /// <summary>
        /// Lấy tất cả classes với pagination
        /// </summary>
        public Task<(List<Class> items, int totalCount)> GetAllPagedAsync(
            int page = 1, 
            int pageSize = 10, 
            string? search = null,
            string? subjectId = null,
            string? lecturerId = null,
            string? academicYearId = null) 
            => _classRepository.GetAllPagedAsync(page, pageSize, search, subjectId, lecturerId, academicYearId);

        /// <summary>
        /// Lấy class theo ID
        /// </summary>
        public async Task<Class?> GetClassByIdAsync(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _classRepository.GetByIdAsync(classId);
        }

        /// <summary>
        /// Tạo class mới
        /// </summary>
        public async Task<string> CreateClassAsync(string classId, string classCode, string className,
            string subjectId, string lecturerId, string semester, string academicYearId,
            int maxStudents, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(classCode))
                throw new ArgumentException("Mã lớp không được để trống");

            if (string.IsNullOrWhiteSpace(className))
                throw new ArgumentException("Tên lớp không được để trống");

            if (string.IsNullOrWhiteSpace(subjectId))
                throw new ArgumentException("Subject ID không được để trống");

            if (string.IsNullOrWhiteSpace(lecturerId))
                throw new ArgumentException("Lecturer ID không được để trống");

            if (maxStudents <= 0)
                throw new ArgumentException("Sĩ số tối đa phải lớn hơn 0");

            return await _classRepository.CreateAsync(classId, classCode, className,
                subjectId, lecturerId, semester, academicYearId, maxStudents, createdBy);
        }

        /// <summary>
        /// Cập nhật class với validation nghiệp vụ
        /// </summary>
        public async Task UpdateClassAsync(string classId, string classCode, string className,
            string subjectId, string lecturerId, string semester, string academicYearId,
            int maxStudents, string updatedBy)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(classCode))
                throw new ArgumentException("Mã lớp không được để trống");

            if (string.IsNullOrWhiteSpace(className))
                throw new ArgumentException("Tên lớp không được để trống");

            if (maxStudents <= 0)
                throw new ArgumentException("Sĩ số tối đa phải lớn hơn 0");

            // Lấy thông tin class hiện tại để so sánh
            var existingClass = await _classRepository.GetByIdAsync(classId);
            if (existingClass == null)
                throw new Exception($"Không tìm thấy lớp học phần với ID: {classId}");

            // Kiểm tra current_enrollment
            var currentEnrollment = await _classRepository.GetCurrentEnrollmentAsync(classId);
            if (maxStudents < currentEnrollment)
                throw new Exception($"Không thể giảm sĩ số tối đa xuống {maxStudents} vì hiện tại đã có {currentEnrollment} sinh viên đăng ký. Sĩ số tối đa phải >= {currentEnrollment}");

            // Kiểm tra enrollments
            var enrollmentCount = await _classRepository.GetEnrollmentCountAsync(classId);
            var hasEnrollments = enrollmentCount > 0;

            // Kiểm tra grades
            var gradeCount = await _classRepository.GetGradeCountAsync(classId);
            var hasGrades = gradeCount > 0;

            // Kiểm tra attendances
            var attendanceCount = await _classRepository.GetAttendanceCountAsync(classId);
            var hasAttendances = attendanceCount > 0;

            // Validation: Không cho phép thay đổi các field quan trọng nếu đã có dữ liệu
            if (hasEnrollments || hasGrades || hasAttendances)
            {
                // Không cho phép thay đổi subjectId nếu đã có enrollments hoặc grades
                if (existingClass.SubjectId != subjectId)
                {
                    if (hasGrades)
                        throw new Exception($"Không thể thay đổi môn học vì lớp đã có {gradeCount} bản ghi điểm số. Vui lòng tạo lớp mới thay vì chỉnh sửa.");
                    if (hasEnrollments)
                        throw new Exception($"Không thể thay đổi môn học vì lớp đã có {enrollmentCount} sinh viên đăng ký. Vui lòng tạo lớp mới thay vì chỉnh sửa.");
                }

                // Không cho phép thay đổi semester nếu đã có enrollments, grades hoặc attendances
                if (existingClass.Semester != semester)
                {
                    var reasons = new List<string>();
                    if (hasEnrollments) reasons.Add($"{enrollmentCount} đăng ký");
                    if (hasGrades) reasons.Add($"{gradeCount} bản ghi điểm");
                    if (hasAttendances) reasons.Add($"{attendanceCount} bản ghi điểm danh");
                    
                    throw new Exception($"Không thể thay đổi học kỳ vì lớp đã có dữ liệu: {string.Join(", ", reasons)}. Vui lòng tạo lớp mới thay vì chỉnh sửa.");
                }

                // Không cho phép thay đổi academicYearId nếu đã có enrollments
                if (existingClass.AcademicYearId != academicYearId)
                {
                    if (hasEnrollments)
                        throw new Exception($"Không thể thay đổi niên khóa vì lớp đã có {enrollmentCount} sinh viên đăng ký. Vui lòng tạo lớp mới thay vì chỉnh sửa.");
                }

                // Cảnh báo khi thay đổi lecturerId nếu đã có attendances
                if (existingClass.LecturerId != lecturerId && hasAttendances)
                {
                    // Cho phép nhưng có thể log warning
                    System.Diagnostics.Debug.WriteLine($"⚠️ Warning: Thay đổi giảng viên cho lớp có {attendanceCount} bản ghi điểm danh. ClassId: {classId}");
                }
            }

            await _classRepository.UpdateAsync(classId, classCode, className,
                subjectId, lecturerId, semester, academicYearId, maxStudents, updatedBy);
        }

        /// <summary>
        /// Xóa class (soft delete)
        /// </summary>
        public async Task DeleteClassAsync(string classId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            await _classRepository.DeleteAsync(classId, deletedBy);
        }

        public async Task ActivateClassAsync(string classId, string updatedBy)
        {
            await _classRepository.UpdateIsActiveAsync(classId, true, updatedBy);
        }

        public async Task DeactivateClassAsync(string classId, string updatedBy)
        {
            await _classRepository.UpdateIsActiveAsync(classId, false, updatedBy);
        }

        /// <summary>
        /// Lấy classes theo lecturer ID
        /// </summary>
        public async Task<List<Class>> GetClassesByLecturerAsync(string lecturerId)
        {
            if (string.IsNullOrWhiteSpace(lecturerId))
                throw new ArgumentException("Lecturer ID không được để trống");

            return await _classRepository.GetByLecturerIdAsync(lecturerId);
        }

        /// <summary>
        /// Lấy classes theo student ID
        /// </summary>
        public async Task<List<Class>> GetClassesByStudentAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _classRepository.GetByStudentIdAsync(studentId);
        }
    }
}

