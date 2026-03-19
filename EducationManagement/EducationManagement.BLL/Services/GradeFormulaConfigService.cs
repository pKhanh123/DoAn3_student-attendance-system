using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.GradeFormula;
using EducationManagement.Common.Helpers;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class GradeFormulaConfigService
    {
        private readonly GradeFormulaConfigRepository _formulaRepository;

        public GradeFormulaConfigService(GradeFormulaConfigRepository formulaRepository)
        {
            _formulaRepository = formulaRepository;
        }

        public async Task<string> CreateConfigAsync(GradeFormulaConfigCreateDto dto)
        {
            // Validate weight sum
            var totalWeight = dto.MidtermWeight + dto.FinalWeight +
                (dto.AssignmentWeight ?? 0) + (dto.QuizWeight ?? 0) + (dto.ProjectWeight ?? 0);

            if (totalWeight > 1.0m)
                throw new ArgumentException("Tổng trọng số không được vượt quá 1.0");

            // Validate scope (at least one must be provided)
            if (string.IsNullOrWhiteSpace(dto.SubjectId) && 
                string.IsNullOrWhiteSpace(dto.ClassId) && 
                string.IsNullOrWhiteSpace(dto.SchoolYearId) && 
                !dto.IsDefault)
                throw new ArgumentException("Phải cung cấp ít nhất một scope (Subject, Class, School Year) hoặc đánh dấu là Default");

            var configId = IdGenerator.Generate("formula");
            return await _formulaRepository.CreateAsync(
                configId, dto.SubjectId, dto.ClassId, dto.SchoolYearId,
                dto.MidtermWeight, dto.FinalWeight, dto.AssignmentWeight,
                dto.QuizWeight, dto.ProjectWeight, dto.CustomFormula,
                dto.RoundingMethod, dto.DecimalPlaces, dto.Description,
                dto.IsDefault, dto.CreatedBy
            );
        }

        public async Task<GradeFormulaConfig?> GetConfigByIdAsync(string configId)
        {
            if (string.IsNullOrWhiteSpace(configId))
                throw new ArgumentException("Config ID không được để trống");

            return await _formulaRepository.GetByIdAsync(configId);
        }

        public async Task<GradeFormulaConfig?> GetConfigByScopeAsync(string? classId = null,
            string? subjectId = null, string? schoolYearId = null)
        {
            return await _formulaRepository.GetByScopeAsync(classId, subjectId, schoolYearId);
        }

        public async Task<(List<GradeFormulaConfig> Configs, int TotalCount)> GetAllConfigsAsync(
            int page = 1, int pageSize = 20, string? subjectId = null,
            string? classId = null, string? schoolYearId = null, bool? isDefault = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            return await _formulaRepository.GetAllAsync(page, pageSize, subjectId, classId, schoolYearId, isDefault);
        }

        public async Task UpdateConfigAsync(string configId, GradeFormulaConfigUpdateDto dto)
        {
            if (string.IsNullOrWhiteSpace(configId))
                throw new ArgumentException("Config ID không được để trống");

            // If updating weights, validate sum
            if (dto.MidtermWeight.HasValue || dto.FinalWeight.HasValue || 
                dto.AssignmentWeight.HasValue || dto.QuizWeight.HasValue || dto.ProjectWeight.HasValue)
            {
                // Get current config to calculate total
                var current = await _formulaRepository.GetByIdAsync(configId);
                if (current == null)
                    throw new ArgumentException("Không tìm thấy cấu hình");

                var midterm = dto.MidtermWeight ?? current.MidtermWeight;
                var final = dto.FinalWeight ?? current.FinalWeight;
                var assignment = dto.AssignmentWeight ?? current.AssignmentWeight ?? 0;
                var quiz = dto.QuizWeight ?? current.QuizWeight ?? 0;
                var project = dto.ProjectWeight ?? current.ProjectWeight ?? 0;

                var totalWeight = midterm + final + assignment + quiz + project;
                if (totalWeight > 1.0m)
                    throw new ArgumentException("Tổng trọng số không được vượt quá 1.0");
            }

            await _formulaRepository.UpdateAsync(
                configId, dto.MidtermWeight, dto.FinalWeight, dto.AssignmentWeight,
                dto.QuizWeight, dto.ProjectWeight, dto.CustomFormula,
                dto.RoundingMethod, dto.DecimalPlaces, dto.Description,
                dto.IsDefault, dto.UpdatedBy
            );
        }

        public async Task DeleteConfigAsync(string configId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(configId))
                throw new ArgumentException("Config ID không được để trống");

            await _formulaRepository.DeleteAsync(configId, deletedBy);
        }
    }
}

