using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.SubjectPrerequisite;

namespace EducationManagement.DAL.Repositories
{
    public class SubjectPrerequisiteRepository
    {
        private readonly string _connectionString;

        public SubjectPrerequisiteRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 1️⃣ GET BY SUBJECT
        // ============================================================
        public async Task<List<PrerequisiteDetailDto>> GetBySubjectAsync(string subjectId)
        {
            var parameters = new[]
            {
                new SqlParameter("@SubjectId", subjectId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetPrerequisitesBySubject", parameters);

            var prerequisites = new List<PrerequisiteDetailDto>();
            foreach (DataRow row in dt.Rows)
            {
                prerequisites.Add(MapToPrerequisiteDetailDto(row));
            }

            return prerequisites;
        }

        // ============================================================
        // 2️⃣ CREATE
        // ============================================================
        public async Task<string> CreateAsync(CreatePrerequisiteDto dto, string createdBy)
        {
            string prerequisiteId = $"PRQ-{Guid.NewGuid()}";

            var parameters = new[]
            {
                new SqlParameter("@PrerequisiteId", prerequisiteId),
                new SqlParameter("@SubjectId", dto.SubjectId),
                new SqlParameter("@PrerequisiteSubjectId", dto.PrerequisiteSubjectId),
                new SqlParameter("@MinimumGrade", dto.MinimumGrade),
                new SqlParameter("@IsRequired", dto.IsRequired),
                new SqlParameter("@Description", (object?)dto.Description ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_CreatePrerequisite", parameters);

            return prerequisiteId;
        }

        // ============================================================
        // 3️⃣ DELETE
        // ============================================================
        public async Task DeleteAsync(string prerequisiteId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@PrerequisiteId", prerequisiteId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_DeletePrerequisite", parameters);
        }

        // ============================================================
        // 4️⃣ CHECK STUDENT PREREQUISITES
        // ============================================================
        public async Task<(bool HasPrerequisites, string? MissingPrerequisite)> CheckStudentPrerequisitesAsync(
            string studentId, 
            string subjectId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SubjectId", subjectId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_CheckStudentPrerequisites", parameters);

            if (dt.Rows.Count == 0)
                return (true, null);

            var row = dt.Rows[0];
            bool hasPrerequisites = Convert.ToBoolean(row["has_prerequisites"]);
            string? missingPrerequisite = row["missing_prerequisite"]?.ToString();

            return (hasPrerequisites, missingPrerequisite);
        }

        // ============================================================
        // 5️⃣ GET SUBJECTS AVAILABLE FOR STUDENT
        // ============================================================
        public async Task<List<string>> GetSubjectsAvailableForStudentAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetSubjectsAvailableForStudent", parameters);

            var subjectIds = new List<string>();
            foreach (DataRow row in dt.Rows)
            {
                subjectIds.Add(row["subject_id"].ToString()!);
            }

            return subjectIds;
        }

        // ============================================================
        // MAPPING HELPER
        // ============================================================
        private static PrerequisiteDetailDto MapToPrerequisiteDetailDto(DataRow row)
        {
            return new PrerequisiteDetailDto
            {
                PrerequisiteId = row["prerequisite_id"].ToString()!,
                SubjectId = row["subject_id"].ToString()!,
                SubjectCode = row["subject_code"]?.ToString(),
                SubjectName = row["subject_name"]?.ToString(),
                SubjectCredits = row.Table.Columns.Contains("subject_credits") && row["subject_credits"] != DBNull.Value
                    ? Convert.ToInt32(row["subject_credits"]) : null,
                PrerequisiteSubjectId = row["prerequisite_subject_id"].ToString()!,
                // Stored procedure returns "prerequisite_code" and "prerequisite_name", not "prerequisite_subject_code" and "prerequisite_subject_name"
                PrerequisiteSubjectCode = row["prerequisite_code"]?.ToString(),
                PrerequisiteSubjectName = row["prerequisite_name"]?.ToString(),
                PrerequisiteCredits = row.Table.Columns.Contains("prerequisite_credits") && row["prerequisite_credits"] != DBNull.Value
                    ? Convert.ToInt32(row["prerequisite_credits"]) : null,
                MinimumGrade = Convert.ToDecimal(row["minimum_grade"]),
                IsRequired = Convert.ToBoolean(row["is_required"]),
                Description = row["description"]?.ToString(),
                // Stored procedure doesn't return is_active, but we know it's active if it's in the result (filtered by is_active = 1)
                IsActive = true,
                CreatedAt = Convert.ToDateTime(row["created_at"]),
                CreatedBy = row["created_by"]?.ToString()
            };
        }
    }
}

