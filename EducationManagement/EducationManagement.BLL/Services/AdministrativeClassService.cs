using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EducationManagement.Common.DTOs.AdministrativeClass;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class AdministrativeClassService
    {
        private readonly AdministrativeClassRepository _repository;

        public AdministrativeClassService(AdministrativeClassRepository repository)
        {
            _repository = repository;
        }

        // ============================================================
        // 1️⃣ GET ALL with Pagination
        // ============================================================
        public async Task<(List<AdminClassListDto> data, int totalCount)> GetAllAsync(
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? majorId = null,
            int? cohortYear = null,
            string? advisorId = null)
        {
            // Validation
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            return await _repository.GetAllAsync(page, pageSize, search, majorId, cohortYear, advisorId);
        }

        // ============================================================
        // 2️⃣ GET BY ID
        // ============================================================
        public async Task<AdminClassDetailDto?> GetByIdAsync(string adminClassId)
        {
            if (string.IsNullOrWhiteSpace(adminClassId))
                throw new ArgumentException("Admin Class ID không được để trống");

            return await _repository.GetByIdAsync(adminClassId);
        }

        // ============================================================
        // 3️⃣ CREATE
        // ============================================================
        public async Task<string> CreateAsync(CreateAdminClassDto dto, string createdBy)
        {
            // Business validation
            ValidateCreateDto(dto);

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            // Additional validation: Check duplicates, etc. (if needed)
            // Can add repository.CheckDuplicateClassCode(dto.ClassCode) here

            return await _repository.CreateAsync(dto, createdBy);
        }

        // ============================================================
        // 4️⃣ UPDATE
        // ============================================================
        public async Task UpdateAsync(string adminClassId, UpdateAdminClassDto dto, string updatedBy)
        {
            if (string.IsNullOrWhiteSpace(adminClassId))
                throw new ArgumentException("Admin Class ID không được để trống");

            ValidateUpdateDto(dto);

            if (string.IsNullOrWhiteSpace(updatedBy))
                throw new ArgumentException("UpdatedBy không được để trống");

            // Check if exists
            var existing = await _repository.GetByIdAsync(adminClassId);
            if (existing == null)
                throw new Exception($"Không tìm thấy lớp hành chính với ID: {adminClassId}");

            await _repository.UpdateAsync(adminClassId, dto, updatedBy);
        }

        // ============================================================
        // 5️⃣ DELETE (Soft Delete)
        // ============================================================
        public async Task DeleteAsync(string adminClassId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(adminClassId))
                throw new ArgumentException("Admin Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(deletedBy))
                throw new ArgumentException("DeletedBy không được để trống");

            // Check if exists
            var existing = await _repository.GetByIdAsync(adminClassId);
            if (existing == null)
                throw new Exception($"Không tìm thấy lớp hành chính với ID: {adminClassId}");

            // Check if there are students in the class
            var students = await _repository.GetStudentsByClassAsync(adminClassId);
            if (students.Count > 0)
                throw new Exception($"Không thể xóa lớp vì còn {students.Count} sinh viên trong lớp. Vui lòng chuyển sinh viên ra trước.");

            await _repository.DeleteAsync(adminClassId, deletedBy);
        }

        // ============================================================
        // 6️⃣ GET STUDENTS BY CLASS
        // ============================================================
        public async Task<List<Common.Models.Student>> GetStudentsAsync(string adminClassId)
        {
            if (string.IsNullOrWhiteSpace(adminClassId))
                throw new ArgumentException("Admin Class ID không được để trống");

            // ✅ Recalculate student count before getting students to ensure accuracy
            await _repository.RecalculateStudentCountAsync(adminClassId);

            return await _repository.GetStudentsByClassAsync(adminClassId);
        }

        // ============================================================
        // 7️⃣ ASSIGN STUDENTS (Bulk)
        // ============================================================
        public async Task AssignStudentsAsync(string adminClassId, List<string> studentIds, string assignedBy)
        {
            if (string.IsNullOrWhiteSpace(adminClassId))
                throw new ArgumentException("Admin Class ID không được để trống");

            if (studentIds == null || studentIds.Count == 0)
                throw new ArgumentException("Danh sách sinh viên không được rỗng");

            if (string.IsNullOrWhiteSpace(assignedBy))
                throw new ArgumentException("AssignedBy không được để trống");

            // Check if class exists and has available slots
            var classInfo = await _repository.GetByIdAsync(adminClassId);
            if (classInfo == null)
                throw new Exception($"Không tìm thấy lớp với ID: {adminClassId}");

            if (classInfo.AvailableSlots < studentIds.Count)
                throw new Exception($"Lớp chỉ còn {classInfo.AvailableSlots} chỗ trống, không thể phân {studentIds.Count} sinh viên");

            // Assign each student
            foreach (var studentId in studentIds)
            {
                await _repository.AssignStudentToClassAsync(studentId, adminClassId, assignedBy);
            }
        }

        // ============================================================
        // 8️⃣ REMOVE STUDENT FROM CLASS
        // ============================================================
        public async Task RemoveStudentAsync(string studentId, string removedBy)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(removedBy))
                throw new ArgumentException("RemovedBy không được để trống");

            await _repository.RemoveStudentFromClassAsync(studentId, removedBy);
        }

        // ============================================================
        // 🔟 TRANSFER STUDENT TO CLASS
        // ============================================================
        public async Task TransferStudentAsync(string studentId, string toAdminClassId, string? transferReason, string transferredBy)
        {
            // Validation
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(toAdminClassId))
                throw new ArgumentException("Lớp đích không được để trống");

            if (string.IsNullOrWhiteSpace(transferredBy))
                throw new ArgumentException("TransferredBy không được để trống");

            // Check if student exists
            var students = await _repository.GetStudentsByClassAsync(toAdminClassId);
            // Note: We can't check student existence directly here, but stored procedure will validate

            // Check if target class exists and has available slots
            var targetClass = await _repository.GetByIdAsync(toAdminClassId);
            if (targetClass == null)
                throw new Exception($"Không tìm thấy lớp hành chính với ID: {toAdminClassId}");

            if (targetClass.AvailableSlots < 1)
                throw new Exception($"Lớp chỉ còn {targetClass.AvailableSlots} chỗ trống, không thể chuyển sinh viên");

            // Transfer student (stored procedure will handle all validations and updates)
            await _repository.TransferStudentToClassAsync(studentId, toAdminClassId, transferReason, transferredBy);
        }

        // ============================================================
        // 9️⃣ GET CLASS REPORT
        // ============================================================
        public async Task<AdminClassReportDto?> GetReportAsync(
            string adminClassId,
            int? semester = null,
            string? academicYearId = null)
        {
            if (string.IsNullOrWhiteSpace(adminClassId))
                throw new ArgumentException("Admin Class ID không được để trống");

            return await _repository.GetClassReportAsync(adminClassId, semester, academicYearId);
        }

        // ============================================================
        // 🔟 GET CLASS STATISTICS
        // ============================================================
        public async Task<AdminClassReportDto?> GetStatisticsAsync(string adminClassId)
        {
            if (string.IsNullOrWhiteSpace(adminClassId))
                throw new ArgumentException("Admin Class ID không được để trống");

            return await _repository.GetClassStatisticsAsync(adminClassId);
        }

        // ============================================================
        // PRIVATE VALIDATION HELPERS
        // ============================================================
        private void ValidateCreateDto(CreateAdminClassDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ClassCode))
                throw new ArgumentException("Mã lớp không được để trống");

            if (string.IsNullOrWhiteSpace(dto.ClassName))
                throw new ArgumentException("Tên lớp không được để trống");

            if (dto.CohortYear < 2000 || dto.CohortYear > 2100)
                throw new ArgumentException("Khóa phải từ 2000 đến 2100");

            if (dto.MaxStudents < 1 || dto.MaxStudents > 200)
                throw new ArgumentException("Sĩ số tối đa phải từ 1 đến 200");
        }

        private void ValidateUpdateDto(UpdateAdminClassDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ClassCode))
                throw new ArgumentException("Mã lớp không được để trống");

            if (string.IsNullOrWhiteSpace(dto.ClassName))
                throw new ArgumentException("Tên lớp không được để trống");

            if (dto.CohortYear < 2000 || dto.CohortYear > 2100)
                throw new ArgumentException("Khóa phải từ 2000 đến 2100");

            if (dto.MaxStudents < 1 || dto.MaxStudents > 200)
                throw new ArgumentException("Sĩ số tối đa phải từ 1 đến 200");
        }
    }
}

