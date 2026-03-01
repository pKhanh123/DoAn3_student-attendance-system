using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class AcademicYearRepository
    {
        private readonly string _connectionString;

        public AcademicYearRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH NIÊN KHÓA (ACTIVE)
        // ============================================================
        public async Task<List<AcademicYear>> GetAllAsync()
        {
            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllAcademicYears");
            var list = new List<AcademicYear>();

            // Table[0] = TotalCount, Table[1] = Data
            if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                    list.Add(MapToAcademicYear(row));
            }

            return list;
        }

        // ============================================================
        // 🔹 LẤY NIÊN KHÓA THEO ID
        // ============================================================
        public async Task<AcademicYear?> GetByIdAsync(string academicYearId)
        {
            var param = new SqlParameter("@AcademicYearId", academicYearId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAcademicYearById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToAcademicYear(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 THÊM MỚI NIÊN KHÓA
        // ============================================================
        public async Task AddAsync(AcademicYear academicYear)
        {
            var parameters = new[]
            {
                new SqlParameter("@AcademicYearId", academicYear.AcademicYearId),
                new SqlParameter("@YearName", academicYear.YearName),
                new SqlParameter("@StartYear", academicYear.StartYear),
                new SqlParameter("@EndYear", academicYear.EndYear),
                new SqlParameter("@Description", (object?)academicYear.Description ?? DBNull.Value),
                new SqlParameter("@CreatedBy", academicYear.CreatedBy ?? "System")
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateAcademicYear", parameters);
        }

        // ============================================================
        // 🔹 CẬP NHẬT NIÊN KHÓA
        // ============================================================
        public async Task<int> UpdateAsync(AcademicYear academicYear)
        {
            var parameters = new[]
            {
                new SqlParameter("@AcademicYearId", academicYear.AcademicYearId),
                new SqlParameter("@YearName", academicYear.YearName ?? string.Empty),
                new SqlParameter("@StartYear", academicYear.StartYear),
                new SqlParameter("@EndYear", academicYear.EndYear),
                new SqlParameter("@IsActive", academicYear.IsActive),
                new SqlParameter("@UpdatedBy", academicYear.UpdatedBy ?? "System")
            };

            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateAcademicYear", parameters);
        }

        // ============================================================
        // 🔹 XOÁ MỀM (SOFT DELETE)
        // ============================================================
        public async Task DeleteAsync(string academicYearId)
        {
            var parameters = new[]
            {
                new SqlParameter("@AcademicYearId", academicYearId),
                new SqlParameter("@DeletedBy", "System") // TODO: Lấy từ context user khi có auth
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteAcademicYear", parameters);
        }

        // ============================================================
        // 🔹 KIỂM TRA MÃ NIÊN KHÓA ĐÃ TỒN TẠI
        // ============================================================
        public async Task<bool> ExistsCodeAsync(string yearName)
        {
            var parameters = new[]
            {
                new SqlParameter("@YearName", yearName)
            };

            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CheckAcademicYearCodeExists", parameters);
            return Convert.ToBoolean(result);
        }

        // ============================================================
        // 🔹 MAP DỮ LIỆU DataRow → AcademicYear
        // ============================================================
        private static AcademicYear MapToAcademicYear(DataRow row)
        {
            var academicYear = new AcademicYear
            {
                AcademicYearId = row["academic_year_id"].ToString()!,
                
                // ✅ UPDATED: year_name (not year_code)
                YearName = row.Table.Columns.Contains("year_name") 
                    ? row["year_name"]?.ToString() ?? ""
                    : "",
                
                // ✅ NEW: Cohort fields
                CohortCode = row.Table.Columns.Contains("cohort_code") 
                    ? row["cohort_code"]?.ToString() 
                    : null,
                
                StartYear = row.Table.Columns.Contains("start_year") && row["start_year"] != DBNull.Value
                    ? Convert.ToInt32(row["start_year"])
                    : 0,
                
                EndYear = row.Table.Columns.Contains("end_year") && row["end_year"] != DBNull.Value
                    ? Convert.ToInt32(row["end_year"])
                    : 0,
                
                DurationYears = row.Table.Columns.Contains("duration_years") && row["duration_years"] != DBNull.Value
                    ? Convert.ToInt32(row["duration_years"])
                    : 4,
                
                Description = row.Table.Columns.Contains("description") 
                    ? row["description"]?.ToString() 
                    : null,
                
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : false,
                
                CreatedBy = row.Table.Columns.Contains("created_by") 
                    ? row["created_by"]?.ToString() 
                    : null,
                
                UpdatedBy = row.Table.Columns.Contains("updated_by") 
                    ? row["updated_by"]?.ToString() 
                    : null
            };

            // Xử lý kiểu DateTime và nullable an toàn
            academicYear.CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                ? Convert.ToDateTime(row["created_at"])
                : DateTime.Now;

            academicYear.UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                ? Convert.ToDateTime(row["updated_at"])
                : (DateTime?)null;

            academicYear.DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                ? Convert.ToDateTime(row["deleted_at"])
                : null;

            academicYear.DeletedBy = row.Table.Columns.Contains("deleted_by")
                ? row["deleted_by"]?.ToString()
                : null;

            return academicYear;
        }
    }
}
