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
    public class LecturerRepository
    {
        private readonly string _connectionString;

        public LecturerRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH GIẢNG VIÊN (ACTIVE)
        // ============================================================
        public async Task<List<Lecturer>> GetAllAsync()
        {
            // sp_GetAllLecturers yêu cầu parameters và trả về multiple result sets
            var parameters = new[]
            {
                new SqlParameter("@Page", 1),
                new SqlParameter("@PageSize", 9999), // Get all
                new SqlParameter("@Search", DBNull.Value),
                new SqlParameter("@DepartmentId", DBNull.Value)
            };

            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllLecturers", parameters);
            var list = new List<Lecturer>();

            // Table[0] = TotalCount, Table[1] = Data
            if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                    list.Add(MapToLecturer(row));
            }

            return list;
        }

        // ============================================================
        // 🔹 LẤY GIẢNG VIÊN THEO ID
        // ============================================================
        public async Task<Lecturer?> GetByIdAsync(string lecturerId)
        {
            var param = new SqlParameter("@LecturerId", lecturerId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetLecturerById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToLecturer(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 LẤY GIẢNG VIÊN THEO USER ID
        // ============================================================
        public async Task<Lecturer?> GetByUserIdAsync(string userId)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", userId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetLecturerByUserId", parameters);

            if (dt.Rows.Count == 0)
                return null;

            return MapToLecturer(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 THÊM MỚI GIẢNG VIÊN
        // ============================================================
        public async Task AddAsync(Lecturer lecturer)
        {
            var parameters = new[]
            {
                new SqlParameter("@LecturerId", lecturer.LecturerId),
                new SqlParameter("@UserId", lecturer.UserId),
                new SqlParameter("@DepartmentId", lecturer.DepartmentId),
                new SqlParameter("@AcademicTitle", (object?)lecturer.AcademicTitle ?? DBNull.Value),
                new SqlParameter("@Degree", (object?)lecturer.Degree ?? DBNull.Value),
                new SqlParameter("@Specialization", (object?)lecturer.Specialization ?? DBNull.Value),
                new SqlParameter("@Position", (object?)lecturer.Position ?? DBNull.Value),
                new SqlParameter("@JoinDate", (object?)lecturer.JoinDate ?? DBNull.Value),
                new SqlParameter("@CreatedBy", lecturer.CreatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateLecturer", parameters);
        }

        // ============================================================
        // 🔹 CẬP NHẬT GIẢNG VIÊN
        // ============================================================
        public async Task<int> UpdateAsync(Lecturer lecturer)
        {
            var parameters = new[]
            {
                new SqlParameter("@LecturerId", lecturer.LecturerId),
                new SqlParameter("@DepartmentId", lecturer.DepartmentId),
                new SqlParameter("@AcademicTitle", (object?)lecturer.AcademicTitle ?? DBNull.Value),
                new SqlParameter("@Degree", (object?)lecturer.Degree ?? DBNull.Value),
                new SqlParameter("@Specialization", (object?)lecturer.Specialization ?? DBNull.Value),
                new SqlParameter("@Position", (object?)lecturer.Position ?? DBNull.Value),
                new SqlParameter("@JoinDate", (object?)lecturer.JoinDate ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", lecturer.UpdatedBy)
            };

            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateLecturer", parameters);
        }

        // ============================================================
        // 🔹 XOÁ MỀM (SOFT DELETE)
        // ============================================================
        public async Task DeleteAsync(string lecturerId)
        {
            var parameters = new[]
            {
                new SqlParameter("@LecturerId", lecturerId),
                new SqlParameter("@DeletedBy", "System") // TODO: Lấy từ context user
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteLecturer", parameters);
        }

        // ============================================================
        // 🔹 MAP DỮ LIỆU DataRow → Lecturer
        // ============================================================
        private static Lecturer MapToLecturer(DataRow row)
        {
            var lecturer = new Lecturer
            {
                LecturerId = row["lecturer_id"].ToString()!,
                UserId = row["user_id"].ToString()!,
                Username = row.Table.Columns.Contains("username") ? row["username"]?.ToString() : null,
                FullName = row.Table.Columns.Contains("full_name") ? row["full_name"]?.ToString() : null,
                Email = row.Table.Columns.Contains("email") ? row["email"]?.ToString() : null,
                DepartmentId = row["department_id"].ToString()!,
                DepartmentName = row.Table.Columns.Contains("department_name") ? row["department_name"]?.ToString() : null,
                AcademicTitle = row.Table.Columns.Contains("academic_title") ? row["academic_title"]?.ToString() : null,
                Degree = row.Table.Columns.Contains("degree") ? row["degree"]?.ToString() : null,
                Specialization = row.Table.Columns.Contains("specialization") ? row["specialization"]?.ToString() : null,
                Position = row.Table.Columns.Contains("position") ? row["position"]?.ToString() : null,
                JoinDate = row.Table.Columns.Contains("join_date") && row["join_date"] != DBNull.Value ? Convert.ToDateTime(row["join_date"]) : (DateTime?)null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") ? row["deleted_by"]?.ToString() : null
            };

            // ✅ Gán các trường DateTime an toàn
            lecturer.CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value 
                ? Convert.ToDateTime(row["created_at"]) 
                : DateTime.Now;
            lecturer.UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value 
                ? Convert.ToDateTime(row["updated_at"]) 
                : (DateTime?)null;
            lecturer.DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                ? Convert.ToDateTime(row["deleted_at"])
                : null;

            return lecturer;
        }

    }
}
