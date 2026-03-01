using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class RoleRepository
    {
        private readonly string _connectionString;

        public RoleRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 1️⃣ LẤY TẤT CẢ ROLES
        // ============================================================
        public async Task<List<Role>> GetAllAsync()
        {
            var roles = new List<Role>();
            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllRoles");

            // Table[0] = TotalCount, Table[1] = Data
            if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                    roles.Add(MapToRole(row));
            }

            return roles;
        }

        // ============================================================
        // 🔹 2️⃣ LẤY ROLE THEO ID
        // ============================================================
        public async Task<Role?> GetByIdAsync(string roleId)
        {
            var param = new SqlParameter("@RoleId", roleId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetRoleById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToRole(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 3️⃣ KIỂM TRA TÊN ROLE CÓ TỒN TẠI KHÔNG
        // ============================================================
        public async Task<bool> ExistsByNameAsync(string roleName, string? excludeRoleId = null)
        {
            // Vì không có SP sẵn, ta dùng query trực tiếp
            var query = excludeRoleId == null
                ? "SELECT COUNT(*) FROM dbo.roles WHERE role_name = @RoleName AND deleted_at IS NULL"
                : "SELECT COUNT(*) FROM dbo.roles WHERE role_name = @RoleName AND role_id != @ExcludeId AND deleted_at IS NULL";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoleName", roleName);
            if (excludeRoleId != null)
                cmd.Parameters.AddWithValue("@ExcludeId", excludeRoleId);

            await conn.OpenAsync();
            var count = (int)(await cmd.ExecuteScalarAsync() ?? 0);
            return count > 0;
        }

        // ============================================================
        // 🔹 4️⃣ TẠO ROLE MỚI
        // ============================================================
        public async Task CreateAsync(Role role)
        {
            var query = @"
                INSERT INTO dbo.roles (role_id, role_name, description, is_active, created_at, created_by)
                VALUES (@RoleId, @RoleName, @Description, @IsActive, @CreatedAt, @CreatedBy)";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoleId", role.RoleId);
            cmd.Parameters.AddWithValue("@RoleName", role.RoleName);
            cmd.Parameters.AddWithValue("@Description", (object?)role.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@IsActive", role.IsActive);
            cmd.Parameters.AddWithValue("@CreatedAt", role.CreatedAt);
            cmd.Parameters.AddWithValue("@CreatedBy", (object?)role.CreatedBy ?? DBNull.Value);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        // ============================================================
        // 🔹 5️⃣ CẬP NHẬT ROLE
        // ============================================================
        public async Task UpdateAsync(Role role)
        {
            var query = @"
                UPDATE dbo.roles
                SET role_name = @RoleName,
                    description = @Description,
                    updated_at = @UpdatedAt,
                    updated_by = @UpdatedBy
                WHERE role_id = @RoleId AND deleted_at IS NULL";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoleId", role.RoleId);
            cmd.Parameters.AddWithValue("@RoleName", role.RoleName);
            cmd.Parameters.AddWithValue("@Description", (object?)role.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@UpdatedAt", role.UpdatedAt ?? DateTime.UtcNow);
            cmd.Parameters.AddWithValue("@UpdatedBy", (object?)role.UpdatedBy ?? DBNull.Value);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        // ============================================================
        // 🔹 6️⃣ XOÁ MỀM ROLE
        // ============================================================
        public async Task SoftDeleteAsync(string roleId, string deletedBy)
        {
            var query = @"
                UPDATE dbo.roles
                SET deleted_at = @DeletedAt,
                    deleted_by = @DeletedBy,
                    is_active = 0
                WHERE role_id = @RoleId";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoleId", roleId);
            cmd.Parameters.AddWithValue("@DeletedAt", DateTime.UtcNow);
            cmd.Parameters.AddWithValue("@DeletedBy", deletedBy);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        // ============================================================
        // 🔹 7️⃣ TOGGLE STATUS
        // ============================================================
        public async Task ToggleStatusAsync(string roleId, string updatedBy)
        {
            var query = @"
                UPDATE dbo.roles
                SET is_active = ~is_active,
                    updated_at = @UpdatedAt,
                    updated_by = @UpdatedBy
                WHERE role_id = @RoleId AND deleted_at IS NULL";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoleId", roleId);
            cmd.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow);
            cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        // ============================================================
        // 🔹 MAP DataRow → Role MODEL
        // ============================================================
        private static Role MapToRole(DataRow row)
        {
            return new Role
            {
                RoleId = row["role_id"].ToString()!,
                RoleName = row["role_name"].ToString()!,
                Description = row.Table.Columns.Contains("description") ? row["description"]?.ToString() : null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["created_at"]) 
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["updated_at"]) 
                    : (DateTime?)null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null,
                DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["deleted_at"])
                    : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") ? row["deleted_by"]?.ToString() : null
            };
        }
    }
}











