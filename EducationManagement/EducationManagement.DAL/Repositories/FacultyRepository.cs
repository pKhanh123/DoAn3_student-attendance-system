using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Organization;
using EducationManagement.DAL;

namespace EducationManagement.DAL.Repositories
{
    public class FacultyRepository
    {
        private readonly string _connectionString;

        public FacultyRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH KHOA (ACTIVE) - KHÔNG PAGINATION
        // ============================================================
        public async Task<List<Faculty>> GetAllAsync()
        {
            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllFaculties");
            var list = new List<Faculty>();

            // Table[0] = TotalCount, Table[1] = Data
            if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                    list.Add(MapToFaculty(row));
            }

            return list;
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH KHOA VỚI PAGINATION
        // ============================================================
        public async Task<(List<Faculty> items, int totalCount)> GetAllPagedAsync(
            int page = 1,
            int pageSize = 10,
            string? search = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Search", (object?)search ?? DBNull.Value)
            };

            var dataSet = await DatabaseHelper.ExecuteQueryMultipleAsync(
                _connectionString, "sp_GetAllFaculties", parameters);

            // Table[0] = TotalCount
            int totalCount = 0;
            if (dataSet.Tables[0].Rows.Count > 0)
            {
                totalCount = Convert.ToInt32(dataSet.Tables[0].Rows[0]["TotalCount"]);
            }

            // Table[1] = Data
            var items = new List<Faculty>();
            if (dataSet.Tables.Count > 1)
            {
                foreach (DataRow row in dataSet.Tables[1].Rows)
                {
                    items.Add(MapToFaculty(row));
                }
            }

            return (items, totalCount);
        }

        // ============================================================
        // 🔹 LẤY KHOA THEO ID
        // ============================================================
        public async Task<Faculty?> GetByIdAsync(string facultyId)
        {
            var param = new SqlParameter("@FacultyId", facultyId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetFacultyById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToFaculty(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 THÊM MỚI KHOA
        // ============================================================
        public async Task AddAsync(Faculty faculty)
        {
            var parameters = new[]
            {
                new SqlParameter("@FacultyId", faculty.FacultyId),
                new SqlParameter("@FacultyCode", (object?)faculty.FacultyCode ?? DBNull.Value),
                new SqlParameter("@FacultyName", faculty.FacultyName),
                new SqlParameter("@Description", (object?)faculty.Description ?? DBNull.Value),
                new SqlParameter("@IsActive", faculty.IsActive),
                new SqlParameter("@CreatedBy", (object?)faculty.CreatedBy ?? DBNull.Value)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateFaculty", parameters);
        }

        // ============================================================
        // 🔹 CẬP NHẬT KHOA
        // ============================================================
        public async Task<int> UpdateAsync(Faculty faculty)
        {
            var parameters = new[]
            {
                new SqlParameter("@FacultyId", faculty.FacultyId),
                new SqlParameter("@FacultyCode", (object?)faculty.FacultyCode ?? DBNull.Value),
                new SqlParameter("@FacultyName", faculty.FacultyName),
                new SqlParameter("@Description", (object?)faculty.Description ?? DBNull.Value),
                new SqlParameter("@IsActive", faculty.IsActive),
                new SqlParameter("@UpdatedBy", (object?)faculty.UpdatedBy ?? DBNull.Value)
            };

            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateFaculty", parameters);
        }

        // ============================================================
        // 🔹 XOÁ MỀM (SOFT DELETE)
        // ============================================================
        public async Task DeleteAsync(string facultyId)
        {
            var parameters = new[]
            {
                new SqlParameter("@FacultyId", facultyId),
                new SqlParameter("@DeletedBy", "System") // TODO: Lấy từ context user
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteFaculty", parameters);
        }

        // ============================================================
        // 🔹 MAP DỮ LIỆU DataRow → Faculty
        // ============================================================
        private static Faculty MapToFaculty(DataRow row)
        {
            var faculty = new Faculty
            {
                FacultyId = row["faculty_id"].ToString()!,
                FacultyCode = row.Table.Columns.Contains("faculty_code") 
                    ? row["faculty_code"]?.ToString() ?? ""
                    : "",
                FacultyName = row["faculty_name"].ToString()!,
                Description = row.Table.Columns.Contains("description") ? row["description"]?.ToString() : null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") ? row["deleted_by"]?.ToString() : null
            };

            // ✅ Gán giá trị DateTime an toàn, không lỗi kiểu
            faculty.CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                ? Convert.ToDateTime(row["created_at"])
                : DateTime.Now;

            faculty.UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                ? Convert.ToDateTime(row["updated_at"])
                : (DateTime?)null;

            faculty.DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                ? Convert.ToDateTime(row["deleted_at"])
                : null;

            // ✅ Map counts from stored procedure
            faculty.DepartmentCount = row.Table.Columns.Contains("department_count") && row["department_count"] != DBNull.Value
                ? Convert.ToInt32(row["department_count"])
                : 0;

            faculty.MajorCount = row.Table.Columns.Contains("major_count") && row["major_count"] != DBNull.Value
                ? Convert.ToInt32(row["major_count"])
                : 0;

            return faculty;
        }

        // ============================================================
        // 🔹 KIỂM TRA RÀNG BUỘC TRƯỚC KHI XÓA
        // ============================================================
        public async Task<FacultyConstraintDto> CheckConstraintsAsync(string facultyId)
        {
            var param = new SqlParameter("@FacultyId", facultyId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckFacultyConstraints", param);

            if (dt.Rows.Count == 0)
            {
                return new FacultyConstraintDto();
            }

            var row = dt.Rows[0];
            return new FacultyConstraintDto
            {
                DepartmentCount = Convert.ToInt32(row["department_count"]),
                ActiveDepartmentCount = Convert.ToInt32(row["active_department_count"]),
                MajorCount = Convert.ToInt32(row["major_count"]),
                ActiveMajorCount = Convert.ToInt32(row["active_major_count"])
            };
        }

    }
}
