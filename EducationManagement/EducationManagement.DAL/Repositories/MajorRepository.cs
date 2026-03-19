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
    public class MajorRepository
    {
        private readonly string _connectionString;

        public MajorRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH NGÀNH HỌC (ACTIVE) - KHÔNG PAGINATION
        // ============================================================
        public async Task<List<Major>> GetAllAsync()
        {
            var parameters = new[]
            {
                new SqlParameter("@Page", 1),
                new SqlParameter("@PageSize", 9999),
                new SqlParameter("@Search", DBNull.Value)
            };
            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllMajors", parameters);
            var list = new List<Major>();

            // Table[0] = TotalCount, Table[1] = Data
            if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                    list.Add(MapToMajor(row));
            }

            return list;
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH NGÀNH HỌC VỚI PAGINATION
        // ============================================================
        public async Task<(List<Major> items, int totalCount)> GetAllPagedAsync(
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
                _connectionString, "sp_GetAllMajors", parameters);

            // Table[0] = TotalCount
            int totalCount = 0;
            if (dataSet.Tables[0].Rows.Count > 0)
            {
                totalCount = Convert.ToInt32(dataSet.Tables[0].Rows[0]["TotalCount"]);
            }

            // Table[1] = Data
            var items = new List<Major>();
            if (dataSet.Tables.Count > 1)
            {
                foreach (DataRow row in dataSet.Tables[1].Rows)
                {
                    items.Add(MapToMajor(row));
                }
            }

            return (items, totalCount);
        }

        // ============================================================
        // 🔹 LẤY NGÀNH HỌC THEO ID
        // ============================================================
        public async Task<Major?> GetByIdAsync(string majorId)
        {
            var param = new SqlParameter("@MajorId", majorId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetMajorById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToMajor(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 THÊM MỚI NGÀNH HỌC
        // ============================================================
        public async Task AddAsync(Major major)
        {
            var parameters = new[]
            {
                new SqlParameter("@MajorId", major.MajorId),
                new SqlParameter("@MajorCode", major.MajorCode),
                new SqlParameter("@MajorName", major.MajorName),
                new SqlParameter("@FacultyId", major.FacultyId),
                new SqlParameter("@CreatedBy", major.CreatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateMajor", parameters);
        }

        // ============================================================
        // 🔹 CẬP NHẬT NGÀNH HỌC
        // ============================================================
        public async Task<int> UpdateAsync(Major major)
        {
            var parameters = new[]
            {
                new SqlParameter("@MajorId", major.MajorId),
                new SqlParameter("@MajorCode", major.MajorCode),
                new SqlParameter("@MajorName", major.MajorName),
                new SqlParameter("@FacultyId", major.FacultyId),
                new SqlParameter("@UpdatedBy", major.UpdatedBy)
            };

            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateMajor", parameters);
        }

        // ============================================================
        // 🔹 XOÁ MỀM (SOFT DELETE)
        // ============================================================
        public async Task DeleteAsync(string majorId)
        {
            var parameters = new[]
            {
                new SqlParameter("@MajorId", majorId),
                new SqlParameter("@DeletedBy", "System") // TODO: Lấy từ context user
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteMajor", parameters);
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH NGÀNH THEO KHOA
        // ============================================================
        public async Task<List<Major>> GetByFacultyAsync(string facultyId)
        {
            var parameters = new[]
            {
                new SqlParameter("@FacultyId", facultyId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetMajorsByFaculty", parameters);
            var list = new List<Major>();

            foreach (DataRow row in dt.Rows)
                list.Add(MapToMajor(row));

            return list;
        }

        // ============================================================
        // 🔹 MAP DỮ LIỆU DataRow → Major
        // ============================================================
        private static Major MapToMajor(DataRow row)
        {
            return new Major
            {
                MajorId = row["major_id"].ToString()!,
                MajorCode = row["major_code"].ToString()!,
                MajorName = row["major_name"].ToString()!,
                FacultyId = row["faculty_id"].ToString()!,
                FacultyName = row.Table.Columns.Contains("faculty_name") 
                    ? row["faculty_name"]?.ToString() 
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

        // ============================================================
        // 🔹 KIỂM TRA RÀNG BUỘC TRƯỚC KHI XÓA
        // ============================================================
        public async Task<MajorConstraintDto> CheckConstraintsAsync(string majorId)
        {
            var param = new SqlParameter("@MajorId", majorId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckMajorConstraints", param);

            if (dt.Rows.Count == 0)
            {
                return new MajorConstraintDto();
            }

            var row = dt.Rows[0];
            return new MajorConstraintDto
            {
                StudentCount = Convert.ToInt32(row["student_count"]),
                ActiveStudentCount = Convert.ToInt32(row["active_student_count"])
            };
        }
    }
}