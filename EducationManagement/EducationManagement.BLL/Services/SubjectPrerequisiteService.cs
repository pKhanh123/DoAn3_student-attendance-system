using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EducationManagement.Common.DTOs.SubjectPrerequisite;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class SubjectPrerequisiteService
    {
        private readonly SubjectPrerequisiteRepository _repository;

        public SubjectPrerequisiteService(SubjectPrerequisiteRepository repository)
        {
            _repository = repository;
        }

        // ============================================================
        // 1️⃣ GET BY SUBJECT
        // ============================================================
        public async Task<List<PrerequisiteDetailDto>> GetBySubjectAsync(string subjectId)
        {
            if (string.IsNullOrWhiteSpace(subjectId))
                throw new ArgumentException("Subject ID không được để trống");

            return await _repository.GetBySubjectAsync(subjectId);
        }

        // ============================================================
        // 2️⃣ CREATE (alias for AddAsync)
        // ============================================================
        public async Task<string> CreateAsync(CreatePrerequisiteDto dto, string createdBy)
        {
            return await AddAsync(new AddPrerequisiteDto
            {
                SubjectId = dto.SubjectId,
                PrerequisiteSubjectId = dto.PrerequisiteSubjectId,
                MinimumGrade = dto.MinimumGrade,
                IsRequired = dto.IsRequired,
                Description = dto.Description
            }, createdBy);
        }

        public async Task<string> AddAsync(AddPrerequisiteDto dto, string createdBy)
        {
            // Validation
            if (string.IsNullOrWhiteSpace(dto.SubjectId))
                throw new ArgumentException("Subject ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.PrerequisiteSubjectId))
                throw new ArgumentException("Prerequisite Subject ID không được để trống");

            if (dto.MinimumGrade < 0 || dto.MinimumGrade > 10)
                throw new ArgumentException("Điểm tối thiểu phải từ 0 đến 10");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            // Business logic: Prevent subject from being its own prerequisite
            if (dto.SubjectId == dto.PrerequisiteSubjectId)
                throw new ArgumentException("Môn học không thể là điều kiện tiên quyết của chính nó");

            // Convert to CreatePrerequisiteDto for repository
            var createDto = new CreatePrerequisiteDto
            {
                SubjectId = dto.SubjectId,
                PrerequisiteSubjectId = dto.PrerequisiteSubjectId,
                MinimumGrade = dto.MinimumGrade,
                IsRequired = dto.IsRequired,
                Description = dto.Description
            };

            return await _repository.CreateAsync(createDto, createdBy);
        }

        // ============================================================
        // 3️⃣ DELETE
        // ============================================================
        public async Task DeleteAsync(string prerequisiteId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(prerequisiteId))
                throw new ArgumentException("Prerequisite ID không được để trống");

            if (string.IsNullOrWhiteSpace(deletedBy))
                throw new ArgumentException("DeletedBy không được để trống");

            await _repository.DeleteAsync(prerequisiteId, deletedBy);
        }

        // ============================================================
        // 4️⃣ CHECK STUDENT HAS PREREQUISITES
        // ============================================================
        public async Task<(bool HasPrerequisites, string? MissingPrerequisite)> CheckStudentHasPrerequisitesAsync(
            string studentId,
            string subjectId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(subjectId))
                throw new ArgumentException("Subject ID không được để trống");

            return await _repository.CheckStudentPrerequisitesAsync(studentId, subjectId);
        }

        // ============================================================
        // 5️⃣ GET SUBJECTS AVAILABLE FOR STUDENT
        // ============================================================
        public async Task<List<string>> GetSubjectsAvailableForStudentAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _repository.GetSubjectsAvailableForStudentAsync(studentId);
        }

        // ============================================================
        // 6️⃣ CHECK PREREQUISITES (for Controller)
        // ============================================================
        public async Task<(bool eligible, List<MissingPrerequisiteDto> missingPrereqs)> CheckPrerequisitesAsync(
            string studentId,
            string subjectId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(subjectId))
                throw new ArgumentException("Subject ID không được để trống");

            // Get prerequisites for the subject
            var prerequisites = await _repository.GetBySubjectAsync(subjectId);
            var missingPrereqs = new List<MissingPrerequisiteDto>();

            // For now, use simple check. Later can be enhanced with grade checking
            var (hasPrereqs, missingText) = await _repository.CheckStudentPrerequisitesAsync(studentId, subjectId);

            if (!hasPrereqs && !string.IsNullOrEmpty(missingText))
            {
                // Parse missing text or create dummy DTOs
                // This is a simplified version - you may want to enhance this
                foreach (var prereq in prerequisites)
                {
                    missingPrereqs.Add(new MissingPrerequisiteDto
                    {
                        SubjectId = prereq.PrerequisiteSubjectId,
                        SubjectCode = prereq.PrerequisiteSubjectCode ?? string.Empty,
                        SubjectName = prereq.PrerequisiteSubjectName ?? string.Empty,
                        MinimumGrade = prereq.MinimumGrade,
                        IsRequired = prereq.IsRequired,
                        Reason = "Chưa học hoặc điểm chưa đạt"
                    });
                }
            }

            return (hasPrereqs, missingPrereqs);
        }

        // ============================================================
        // PRIVATE VALIDATION HELPERS
        // ============================================================
        private void ValidateCreateDto(CreatePrerequisiteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.SubjectId))
                throw new ArgumentException("Subject ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.PrerequisiteSubjectId))
                throw new ArgumentException("Prerequisite Subject ID không được để trống");

            if (dto.MinimumGrade < 0 || dto.MinimumGrade > 10)
                throw new ArgumentException("Điểm tối thiểu phải từ 0 đến 10");
        }
    }
}

