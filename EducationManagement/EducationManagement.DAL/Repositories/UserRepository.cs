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
    public class UserRepository
    {
        private readonly string _connectionString;

        public UserRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH NGƯỜI DÙNG (CÓ PHÂN TRANG)
        // ============================================================
        public async Task<(List<User> Users, int TotalCount)> GetAllAsync(
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? roleId = null,
            bool? isActive = null)
        {
            var users = new List<User>();
            int totalCount = 0;

            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Search", (object?)search ?? DBNull.Value),
                new SqlParameter("@RoleId", (object?)roleId ?? DBNull.Value),
                new SqlParameter("@IsActive", (object?)isActive ?? DBNull.Value)
            };

            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllUsers", parameters);

            // DEBUG logs đã tắt để tránh spam console
            // Console.WriteLine($"🔍 DataSet info: Tables count = {ds.Tables.Count}");
            
            // First result set: TotalCount
            if (ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0)
            {
                totalCount = Convert.ToInt32(ds.Tables[0].Rows[0]["TotalCount"]);
                // Console.WriteLine($"✅ TotalCount extracted: {totalCount}");
            }

            // Second result set: Data
            if (ds.Tables.Count > 1)
            {
                // Console.WriteLine($"🔍 Processing Table[1] with {ds.Tables[1].Rows.Count} rows...");
                foreach (DataRow row in ds.Tables[1].Rows)
                {
                    users.Add(MapToUser(row));
                }
                // Console.WriteLine($"✅ Users mapped: {users.Count}");
            }
            else
            {
                // Console.WriteLine($"❌ No second result set! Tables.Count = {ds.Tables.Count}");
            }

            return (users, totalCount);
        }

        // ============================================================
        // 🔹 LẤY NGƯỜI DÙNG THEO ID
        // ============================================================
        public async Task<User?> GetByIdAsync(string userId)
        {
            var param = new SqlParameter("@UserId", userId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetUserById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToUser(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 LẤY NGƯỜI DÙNG THEO USERNAME (CHO AUTH)
        // ============================================================
        public async Task<User?> GetByUsernameAsync(string username)
        {
            var param = new SqlParameter("@Username", username);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetUserByUsername", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToUser(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 LẤY NGƯỜI DÙNG THEO EMAIL (CHO FORGOT PASSWORD)
        // ============================================================
        public async Task<User?> GetByEmailAsync(string email)
        {
            var query = @"
                SELECT u.*, r.role_name
                FROM dbo.users u
                LEFT JOIN dbo.roles r ON u.role_id = r.role_id
                WHERE LOWER(LTRIM(RTRIM(u.email))) = LOWER(LTRIM(RTRIM(@Email)))
                    AND u.deleted_at IS NULL
                    AND u.is_active = 1";

            try
            {
                using var conn = new SqlConnection(_connectionString);
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Email", email.Trim().ToLower());
                
                await conn.OpenAsync();
                using var reader = await cmd.ExecuteReaderAsync();
                
                if (await reader.ReadAsync())
                {
                    return MapToUserFromReader(reader);
                }
                
                return null;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        // Helper method để map từ DataReader
        private User MapToUserFromReader(System.Data.Common.DbDataReader reader)
        {
            return new User
            {
                UserId = reader["user_id"]?.ToString() ?? string.Empty,
                Username = reader["username"]?.ToString() ?? string.Empty,
                PasswordHash = reader["password_hash"]?.ToString() ?? string.Empty,
                Email = reader["email"]?.ToString() ?? string.Empty,
                Phone = reader["phone"]?.ToString(),
                FullName = reader["full_name"]?.ToString() ?? string.Empty,
                AvatarUrl = reader["avatar_url"]?.ToString(),
                RoleId = reader["role_id"]?.ToString() ?? string.Empty,
                RoleName = reader["role_name"]?.ToString(),
                IsActive = Convert.ToBoolean(reader["is_active"]),
                LastLoginAt = reader["last_login_at"] != DBNull.Value ? (DateTime?)reader["last_login_at"] : null,
                CreatedAt = reader["created_at"] != DBNull.Value ? Convert.ToDateTime(reader["created_at"]) : DateTime.UtcNow,
                CreatedBy = reader["created_by"]?.ToString(),
                UpdatedAt = reader["updated_at"] != DBNull.Value ? (DateTime?)reader["updated_at"] : null,
                UpdatedBy = reader["updated_by"]?.ToString()
            };
        }

        // ============================================================
        // 🔹 TẠO MỚI NGƯỜI DÙNG
        // ============================================================
        public async Task<string?> CreateAsync(User user)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", user.UserId),
                new SqlParameter("@Username", user.Username),
                new SqlParameter("@PasswordHash", user.PasswordHash),
                new SqlParameter("@Email", user.Email),
                new SqlParameter("@Phone", (object?)user.Phone ?? DBNull.Value),
                new SqlParameter("@FullName", user.FullName),
                new SqlParameter("@RoleId", user.RoleId),
                new SqlParameter("@IsActive", user.IsActive),
                new SqlParameter("@AvatarUrl", (object?)user.AvatarUrl ?? "/avatars/default.png"),
                new SqlParameter("@CreatedBy", user.CreatedBy ?? "System")
            };

            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CreateUser", parameters);
            return result?.ToString();
        }

        // ============================================================
        // 🔹 CẬP NHẬT NGƯỜI DÙNG
        // ============================================================
        public async Task<int> UpdateAsync(User user)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", user.UserId),
                new SqlParameter("@FullName", user.FullName),
                new SqlParameter("@Email", user.Email),
                new SqlParameter("@Phone", (object?)user.Phone ?? DBNull.Value),
                new SqlParameter("@RoleId", user.RoleId),
                new SqlParameter("@IsActive", user.IsActive),
                new SqlParameter("@AvatarUrl", (object?)user.AvatarUrl ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", user.UpdatedBy ?? "System")
            };

            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateUser", parameters);
        }

        // ============================================================
        // 🔹 CẬP NHẬT MẬT KHẨU (CHO FORGOT PASSWORD)
        // ============================================================
        public async Task<bool> UpdatePasswordAsync(string userId, string newPasswordHash)
        {
            var query = @"
                UPDATE dbo.users 
                SET password_hash = @PasswordHash, 
                    updated_at = GETUTCDATE()
                WHERE user_id = @UserId 
                    AND deleted_at IS NULL
                    AND is_active = 1";

            try
            {
                using var conn = new SqlConnection(_connectionString);
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@UserId", userId);
                cmd.Parameters.AddWithValue("@PasswordHash", newPasswordHash);
                
                await conn.OpenAsync();
                var rowsAffected = await cmd.ExecuteNonQueryAsync();
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        // ============================================================
        // 🔹 XOÁ NGƯỜI DÙNG (SOFT DELETE)
        // ============================================================
        public async Task<int> DeleteAsync(string userId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", userId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteUser", parameters);
        }

        // ============================================================
        // 🔹 CHUYỂN TRẠNG THÁI KÍCH HOẠT / VÔ HIỆU
        // ============================================================
        public async Task<bool> ToggleStatusAsync(string userId, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", userId),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            var result = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_ToggleUserStatus", parameters);

            if (result.Rows.Count == 0)
                return false;

            return Convert.ToBoolean(result.Rows[0]["is_active"]);
        }

        // ============================================================
        // 🔹 KIỂM TRA USERNAME ĐÃ TỒN TẠI
        // ============================================================
        public async Task<bool> ExistsByUsernameAsync(string username)
        {
            var query = "SELECT COUNT(*) FROM dbo.users WHERE username = @Username AND deleted_at IS NULL";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@Username", username);

            await conn.OpenAsync();
            var count = (int)(await cmd.ExecuteScalarAsync() ?? 0);
            return count > 0;
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH USER IDS THEO ROLE
        // ============================================================
        public async Task<List<string>> GetUserIdsByRoleNameAsync(string roleName)
        {
            var userIds = new List<string>();
            var query = @"
                SELECT DISTINCT u.user_id
                FROM dbo.users u
                INNER JOIN dbo.roles r ON u.role_id = r.role_id
                WHERE r.role_name = @RoleName
                    AND u.is_active = 1
                    AND u.deleted_at IS NULL
                    AND r.deleted_at IS NULL";

            try
            {
                using var conn = new SqlConnection(_connectionString);
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@RoleName", roleName);
                
                await conn.OpenAsync();
                using var reader = await cmd.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                    var userId = reader["user_id"]?.ToString();
                    if (!string.IsNullOrEmpty(userId))
                        userIds.Add(userId);
                }
            }
            catch (Exception ex)
            {
            }

            return userIds;
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH USER IDS VÀ EMAILS THEO ROLE
        // ============================================================
        public async Task<List<(string UserId, string Email, string FullName)>> GetUsersByRoleNameAsync(string roleName)
        {
            var users = new List<(string UserId, string Email, string FullName)>();
            var query = @"
                SELECT DISTINCT u.user_id, u.email, u.full_name
                FROM dbo.users u
                INNER JOIN dbo.roles r ON u.role_id = r.role_id
                WHERE r.role_name = @RoleName
                    AND u.is_active = 1
                    AND u.deleted_at IS NULL
                    AND r.deleted_at IS NULL";

            try
            {
                using var conn = new SqlConnection(_connectionString);
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@RoleName", roleName);
                
                await conn.OpenAsync();
                using var reader = await cmd.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                    var userId = reader["user_id"]?.ToString() ?? "";
                    var email = reader["email"]?.ToString() ?? "";
                    var fullName = reader["full_name"]?.ToString() ?? "";
                    if (!string.IsNullOrEmpty(userId))
                        users.Add((userId, email, fullName));
                }
            }
            catch (Exception ex)
            {
            }

            return users;
        }

        // ============================================================
        // 🔹 KIỂM TRA EMAIL ĐÃ TỒN TẠI
        // ============================================================
        public async Task<bool> ExistsByEmailAsync(string email, string? excludeUserId = null)
        {
            var query = excludeUserId == null
                ? "SELECT COUNT(*) FROM dbo.users WHERE email = @Email AND deleted_at IS NULL"
                : "SELECT COUNT(*) FROM dbo.users WHERE email = @Email AND user_id != @ExcludeId AND deleted_at IS NULL";

            using var conn = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@Email", email);
            if (excludeUserId != null)
                cmd.Parameters.AddWithValue("@ExcludeId", excludeUserId);

            await conn.OpenAsync();
            var count = (int)(await cmd.ExecuteScalarAsync() ?? 0);
            return count > 0;
        }

        // ============================================================
        // 🔹 XOÁ MỀM USER
        // ============================================================
        public async Task SoftDeleteAsync(string userId, string deletedBy)
        {
            await DeleteAsync(userId, deletedBy);
        }

        // ============================================================
        // 🔹 MAP DỮ LIỆU DataRow → User
        // ============================================================
        private static User MapToUser(DataRow row)
        {
            var user = new User
            {
                UserId = row["user_id"].ToString()!,
                Username = row["username"].ToString()!,
                // ✅ Thêm map PasswordHash
                PasswordHash = row.Table.Columns.Contains("password_hash") ? row["password_hash"]?.ToString() ?? string.Empty : string.Empty,
                FullName = row["full_name"].ToString()!,
                Email = row["email"].ToString()!,
                Phone = row["phone"]?.ToString(),
                RoleId = row["role_id"].ToString()!,
                RoleName = row.Table.Columns.Contains("role_name") ? row["role_name"]?.ToString() : null,
                AvatarUrl = row["avatar_url"]?.ToString(),
                IsActive = Convert.ToBoolean(row["is_active"]),
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") ? row["deleted_by"]?.ToString() : null
            };

            // Xử lý kiểu DateTime nullable an toàn
            user.LastLoginAt = row.Table.Columns.Contains("last_login_at") && row["last_login_at"] != DBNull.Value
                ? Convert.ToDateTime(row["last_login_at"])
                : null;
            user.CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                ? Convert.ToDateTime(row["created_at"])
                : DateTime.Now;
            user.UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                ? Convert.ToDateTime(row["updated_at"])
                : null;
            user.DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                ? Convert.ToDateTime(row["deleted_at"])
                : null;

            return user;
        }
    }
}
