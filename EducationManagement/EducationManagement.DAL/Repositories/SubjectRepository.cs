using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.DAL;

namespace EducationManagement.DAL.Repositories
{
    public class SubjectRepository
    {
        private readonly string _connectionString;

        public SubjectRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ==========================================================
        // 🔹 LẤY DANH SÁCH MÔN HỌC (ACTIVE) - KHÔNG PAGINATION
        // ==========================================================
        public async Task<List<Subject>> GetAllAsync()
        {
            // sp_GetAllSubjects yêu cầu parameters và trả về multiple result sets
            var parameters = new[]
            {
                new SqlParameter("@Page", 1),
                new SqlParameter("@PageSize", 9999), // Get all
                new SqlParameter("@Search", DBNull.Value),
                new SqlParameter("@DepartmentId", DBNull.Value)
            };

            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllSubjects", parameters);
            var list = new List<Subject>();

            // Table[0] = TotalCount, Table[1] = Data
            if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                    list.Add(MapToSubject(row));
            }

            return list;
        }

        // ==========================================================
        // 🔹 LẤY DANH SÁCH MÔN HỌC VỚI PAGINATION
        // ==========================================================
        public async Task<(List<Subject> items, int totalCount)> GetAllPagedAsync(
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? departmentId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Search", (object?)search ?? DBNull.Value),
                new SqlParameter("@DepartmentId", (object?)departmentId ?? DBNull.Value)
            };

            var dataSet = await DatabaseHelper.ExecuteQueryMultipleAsync(
                _connectionString, "sp_GetAllSubjects", parameters);

            // Table[0] = TotalCount
            int totalCount = 0;
            if (dataSet.Tables[0].Rows.Count > 0)
            {
                totalCount = Convert.ToInt32(dataSet.Tables[0].Rows[0]["TotalCount"]);
            }

            // Table[1] = Data
            var items = new List<Subject>();
            if (dataSet.Tables.Count > 1)
            {
                foreach (DataRow row in dataSet.Tables[1].Rows)
                {
                    items.Add(MapToSubject(row));
                }
            }

            return (items, totalCount);
        }

        // ==========================================================
        // 🔹 LẤY MÔN HỌC THEO ID
        // ==========================================================
        public async Task<Subject?> GetByIdAsync(string subjectId)
        {
            var param = new SqlParameter("@SubjectId", subjectId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetSubjectById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToSubject(dt.Rows[0]);
        }

        // ==========================================================
        // 🔹 THÊM MỚI MÔN HỌC
        // ==========================================================
        public async Task AddAsync(Subject subject)
        {
            var parameters = new[]
            {
                new SqlParameter("@SubjectId", subject.SubjectId),
                new SqlParameter("@SubjectCode", subject.SubjectCode),
                new SqlParameter("@SubjectName", subject.SubjectName),
                new SqlParameter("@Credits", subject.Credits),
                new SqlParameter("@Description", (object?)subject.Description ?? DBNull.Value),
                new SqlParameter("@DepartmentId", (object?)subject.DepartmentId ?? DBNull.Value),
                new SqlParameter("@CreatedBy", subject.CreatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateSubject", parameters);
        }

        // ==========================================================
        // 🔹 CẬP NHẬT MÔN HỌC
        // ==========================================================
        public async Task<int> UpdateAsync(Subject subject)
        {
            var parameters = new[]
            {
                new SqlParameter("@SubjectId", subject.SubjectId),
                new SqlParameter("@SubjectCode", subject.SubjectCode),
                new SqlParameter("@SubjectName", subject.SubjectName),
                new SqlParameter("@Credits", subject.Credits),
                new SqlParameter("@Description", (object?)subject.Description ?? DBNull.Value),
                new SqlParameter("@DepartmentId", (object?)subject.DepartmentId ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", subject.UpdatedBy)
            };

            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateSubject", parameters);
        }

        // ==========================================================
        // 🔹 XOÁ MỀM (SOFT DELETE)
        // ==========================================================
        public async Task DeleteAsync(string subjectId)
        {
            var parameters = new[]
            {
                new SqlParameter("@SubjectId", subjectId),
                new SqlParameter("@DeletedBy", "System") // TODO: Lấy từ context user
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteSubject", parameters);
        }

        // ==========================================================
        // 🔹 LẤY MÔN HỌC THEO BỘ MÔN
        // ==========================================================
        public async Task<List<Subject>> GetByDepartmentAsync(string departmentId)
        {
            var param = new SqlParameter("@DepartmentId", departmentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetSubjectsByDepartment", param);
            var list = new List<Subject>();

            foreach (DataRow row in dt.Rows)
                list.Add(MapToSubject(row));

            return list;
        }

        // ==========================================================
        // 🔹 KIỂM TRA MÃ MÔN HỌC ĐÃ TỒN TẠI
        // ==========================================================
        public async Task<bool> ExistsCodeAsync(string subjectCode)
        {
            var param = new SqlParameter("@SubjectCode", subjectCode);
            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CheckSubjectCodeExists", param);
            return Convert.ToBoolean(result);
        }

        // ==========================================================
        // 🔹 MAP DỮ LIỆU DataRow → Subject
        // ==========================================================
        private static Subject MapToSubject(DataRow row)
        {
            return new Subject
            {
                SubjectId = row["subject_id"].ToString()!,
                SubjectCode = row["subject_code"].ToString()!,
                SubjectName = row["subject_name"].ToString()!,
                Credits = Convert.ToInt32(row["credits"]),
                Description = row["description"]?.ToString(),
                DepartmentId = row["department_id"]?.ToString(),
                DepartmentName = row.Table.Columns.Contains("department_name")
                                    ? row["department_name"]?.ToString()
                                    : null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["created_at"]) 
                    : (DateTime?)null,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["updated_at"]) 
                    : (DateTime?)null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null
            };
        }
    }
}
