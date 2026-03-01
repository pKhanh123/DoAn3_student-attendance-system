using System;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.DAL;
using Microsoft.Extensions.Configuration;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Database-backed refresh token store (SCALABLE & PERSISTENT!)
    /// Replaces InMemoryRefreshTokenStore for production use
    /// </summary>
    public class DatabaseRefreshTokenStore : IRefreshTokenStore
    {
        private readonly string _connectionString;

        public DatabaseRefreshTokenStore(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        }

        public async Task SaveAsync(string userId, RefreshToken refreshToken)
        {
            refreshToken.UserId = userId;
            
            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString,
                "sp_SaveRefreshToken",
                new SqlParameter("@Id", refreshToken.Id),
                new SqlParameter("@UserId", userId),
                new SqlParameter("@Token", refreshToken.Token),
                new SqlParameter("@ExpiresAt", refreshToken.ExpiresAt),
                new SqlParameter("@CreatedAt", refreshToken.CreatedAt)
            );
        }

        public async Task<RefreshToken?> GetByTokenAsync(string token)
        {
            var table = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString,
                "sp_GetRefreshTokenByToken",
                new SqlParameter("@Token", token)
            );

            if (table.Rows.Count == 0)
                return null;

            var row = table.Rows[0];
            return new RefreshToken
            {
                Id = (Guid)row["id"],
                UserId = row["user_id"].ToString()!,
                Token = row["token"].ToString()!,
                ExpiresAt = (DateTime)row["expires_at"],
                CreatedAt = (DateTime)row["created_at"],
                RevokedAt = row["revoked_at"] == DBNull.Value ? null : (DateTime?)row["revoked_at"]
            };
        }

        public async Task RevokeAsync(Guid id)
        {
            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString,
                "sp_RevokeRefreshToken",
                new SqlParameter("@Id", id)
            );
        }
    }
}

