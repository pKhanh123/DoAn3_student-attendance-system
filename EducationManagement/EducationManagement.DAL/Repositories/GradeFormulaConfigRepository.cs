using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class GradeFormulaConfigRepository
    {
        private readonly string _connectionString;

        public GradeFormulaConfigRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string ''DefaultConnection'' not found.");
        }

        public async Task<string> CreateAsync(string configId, string? subjectId, string? classId, 
            string? schoolYearId, decimal midtermWeight, decimal finalWeight, decimal? assignmentWeight,
            decimal? quizWeight, decimal? projectWeight, string? customFormula, string? roundingMethod,
            int? decimalPlaces, string? description, bool isDefault, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@ConfigId", configId),
                new SqlParameter("@SubjectId", (object?)subjectId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@MidtermWeight", midtermWeight),
                new SqlParameter("@FinalWeight", finalWeight),
                new SqlParameter("@AssignmentWeight", (object?)assignmentWeight ?? DBNull.Value),
                new SqlParameter("@QuizWeight", (object?)quizWeight ?? DBNull.Value),
                new SqlParameter("@ProjectWeight", (object?)projectWeight ?? DBNull.Value),
                new SqlParameter("@CustomFormula", (object?)customFormula ?? DBNull.Value),
                new SqlParameter("@RoundingMethod", (object?)roundingMethod ?? "STANDARD"),
                new SqlParameter("@DecimalPlaces", (object?)decimalPlaces ?? 2),
                new SqlParameter("@Description", (object?)description ?? DBNull.Value),
                new SqlParameter("@IsDefault", isDefault),
                new SqlParameter("@CreatedBy", createdBy)
            };

            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CreateGradeFormulaConfig", parameters);
            return result?.ToString() ?? configId;
        }

        public async Task<GradeFormulaConfig?> GetByIdAsync(string configId)
        {
            var param = new SqlParameter("@ConfigId", configId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGradeFormulaConfigById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToGradeFormulaConfigWithDetails(dt.Rows[0]);
        }

        public async Task<GradeFormulaConfig?> GetByScopeAsync(string? classId = null, 
            string? subjectId = null, string? schoolYearId = null)
        {
            try
            {
                var parameters = new[]
                {
                    new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                    new SqlParameter("@SubjectId", (object?)subjectId ?? DBNull.Value),
                    new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value)
                };

                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGradeFormulaConfig", parameters);

                if (dt.Rows.Count == 0)
                    return null;

                return MapToGradeFormulaConfigWithDetails(dt.Rows[0]);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in GetByScopeAsync: {ex.Message}");
                return null;
            }
        }

        public async Task<(List<GradeFormulaConfig> Configs, int TotalCount)> GetAllAsync(int page = 1, 
            int pageSize = 20, string? subjectId = null, string? classId = null, 
            string? schoolYearId = null, bool? isDefault = null)
        {
            try
            {
                var parameters = new[]
                {
                    new SqlParameter("@Page", page),
                    new SqlParameter("@PageSize", pageSize),
                    new SqlParameter("@SubjectId", (object?)subjectId ?? DBNull.Value),
                    new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                    new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                    new SqlParameter("@IsDefault", (object?)isDefault ?? DBNull.Value)
                };

                var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllGradeFormulaConfigs", parameters);

                var configs = new List<GradeFormulaConfig>();
                int totalCount = 0;

                if (ds != null && ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0 && ds.Tables[0].Columns.Contains("total_count"))
                {
                    totalCount = Convert.ToInt32(ds.Tables[0].Rows[0]["total_count"]);
                }

                if (ds != null && ds.Tables.Count > 1)
                {
                    var dataTable = ds.Tables[1];
                    foreach (DataRow row in dataTable.Rows)
                    {
                        if (row.Table.Columns.Contains("config_id"))
                        {
                            configs.Add(MapToGradeFormulaConfigWithDetails(row));
                        }
                    }
                }

                return (configs, totalCount);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in GetAllAsync: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                
                throw new Exception($"Lá»—i khi láº¥y danh sÃ¡ch cáº¥u hÃ¬nh cÃ´ng thá»©c: {ex.Message}. " +
                    $"Chi tiáº¿t: {(ex.InnerException?.Message ?? "KhÃ´ng cÃ³ thÃ´ng tin chi tiáº¿t")}", ex);
            }
        }

        public async Task UpdateAsync(string configId, decimal? midtermWeight, decimal? finalWeight,
            decimal? assignmentWeight, decimal? quizWeight, decimal? projectWeight, string? customFormula,
            string? roundingMethod, int? decimalPlaces, string? description, bool? isDefault, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@ConfigId", configId),
                new SqlParameter("@MidtermWeight", (object?)midtermWeight ?? DBNull.Value),
                new SqlParameter("@FinalWeight", (object?)finalWeight ?? DBNull.Value),
                new SqlParameter("@AssignmentWeight", (object?)assignmentWeight ?? DBNull.Value),
                new SqlParameter("@QuizWeight", (object?)quizWeight ?? DBNull.Value),
                new SqlParameter("@ProjectWeight", (object?)projectWeight ?? DBNull.Value),
                new SqlParameter("@CustomFormula", (object?)customFormula ?? DBNull.Value),
                new SqlParameter("@RoundingMethod", (object?)roundingMethod ?? DBNull.Value),
                new SqlParameter("@DecimalPlaces", (object?)decimalPlaces ?? DBNull.Value),
                new SqlParameter("@Description", (object?)description ?? DBNull.Value),
                new SqlParameter("@IsDefault", (object?)isDefault ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateGradeFormulaConfig", parameters);
        }

        public async Task DeleteAsync(string configId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@ConfigId", configId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteGradeFormulaConfig", parameters);
        }

        private GradeFormulaConfig MapToGradeFormulaConfigWithDetails(DataRow row)
        {
            var config = new GradeFormulaConfig
            {
                ConfigId = row["config_id"]?.ToString() ?? string.Empty,
                SubjectId = row["subject_id"]?.ToString(),
                ClassId = row["class_id"]?.ToString(),
                SchoolYearId = row["school_year_id"]?.ToString(),
                MidtermWeight = row.Table.Columns.Contains("midterm_weight") && row["midterm_weight"] != DBNull.Value
                    ? Convert.ToDecimal(row["midterm_weight"]) : 0.30m,
                FinalWeight = row.Table.Columns.Contains("final_weight") && row["final_weight"] != DBNull.Value
                    ? Convert.ToDecimal(row["final_weight"]) : 0.70m,
                AssignmentWeight = row.Table.Columns.Contains("assignment_weight") && row["assignment_weight"] != DBNull.Value
                    ? Convert.ToDecimal(row["assignment_weight"]) : null,
                QuizWeight = row.Table.Columns.Contains("quiz_weight") && row["quiz_weight"] != DBNull.Value
                    ? Convert.ToDecimal(row["quiz_weight"]) : null,
                ProjectWeight = row.Table.Columns.Contains("project_weight") && row["project_weight"] != DBNull.Value
                    ? Convert.ToDecimal(row["project_weight"]) : null,
                CustomFormula = row["custom_formula"]?.ToString(),
                RoundingMethod = row["rounding_method"]?.ToString() ?? "STANDARD",
                DecimalPlaces = row.Table.Columns.Contains("decimal_places") && row["decimal_places"] != DBNull.Value
                    ? Convert.ToInt32(row["decimal_places"]) : 2,
                Description = row["description"]?.ToString(),
                IsDefault = row.Table.Columns.Contains("is_default") && row["is_default"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_default"]) : false,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["created_at"]) : DateTime.Now,
                CreatedBy = row["created_by"]?.ToString(),
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["updated_at"]) : null,
                UpdatedBy = row["updated_by"]?.ToString(),
                DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["deleted_at"]) : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") ? row["deleted_by"]?.ToString() : null
            };

            if (row.Table.Columns.Contains("subject_code"))
                config.SubjectCode = row["subject_code"]?.ToString();
            if (row.Table.Columns.Contains("subject_name"))
                config.SubjectName = row["subject_name"]?.ToString();
            if (row.Table.Columns.Contains("class_code"))
                config.ClassCode = row["class_code"]?.ToString();
            if (row.Table.Columns.Contains("class_name"))
                config.ClassName = row["class_name"]?.ToString();
            if (row.Table.Columns.Contains("year_code"))
                config.SchoolYearCode = row["year_code"]?.ToString();
            if (row.Table.Columns.Contains("year_name"))
                config.SchoolYearName = row["year_name"]?.ToString();

            return config;
        }
    }
}