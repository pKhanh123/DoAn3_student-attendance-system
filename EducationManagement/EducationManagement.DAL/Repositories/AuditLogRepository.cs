using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace EducationManagement.DAL.Repositories
{
    public class AuditLogRepository
    {
        private readonly string _connectionString;

        public AuditLogRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<(List<AuditLogDto> Logs, int TotalCount)> GetAllAsync(
            int page = 1,
            int pageSize = 25,
            string? search = null,
            string? action = null,
            string? entityType = null,
            string? userId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            var logs = new List<AuditLogDto>();
            int totalCount = 0;

            using (var connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                using (var command = new SqlCommand("sp_GetAllAuditLogs", connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.Parameters.AddWithValue("@Page", page);
                    command.Parameters.AddWithValue("@PageSize", pageSize);
                    command.Parameters.AddWithValue("@Search", (object?)search ?? DBNull.Value);
                    command.Parameters.AddWithValue("@Action", (object?)action ?? DBNull.Value);
                    command.Parameters.AddWithValue("@EntityType", (object?)entityType ?? DBNull.Value);
                    command.Parameters.AddWithValue("@UserId", (object?)userId ?? DBNull.Value);
                    command.Parameters.AddWithValue("@FromDate", (object?)fromDate ?? DBNull.Value);
                    command.Parameters.AddWithValue("@ToDate", (object?)toDate ?? DBNull.Value);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        // First result set: TotalCount
                        if (await reader.ReadAsync())
                        {
                            totalCount = reader.GetInt32(reader.GetOrdinal("TotalCount"));
                        }

                        // Second result set: Data
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                logs.Add(new AuditLogDto
                                {
                                    LogId = reader.GetInt64(reader.GetOrdinal("log_id")),
                                    UserId = reader.IsDBNull(reader.GetOrdinal("user_id")) ? null : reader.GetString(reader.GetOrdinal("user_id")),
                                    UserName = reader.IsDBNull(reader.GetOrdinal("user_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_name")),
                                    UserFullName = reader.IsDBNull(reader.GetOrdinal("user_full_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_full_name")),
                                    Action = reader.GetString(reader.GetOrdinal("action")),
                                    EntityType = reader.GetString(reader.GetOrdinal("entity_type")),
                                    EntityId = reader.IsDBNull(reader.GetOrdinal("entity_id")) ? null : reader.GetString(reader.GetOrdinal("entity_id")),
                                    OldValues = reader.IsDBNull(reader.GetOrdinal("old_values")) ? null : reader.GetString(reader.GetOrdinal("old_values")),
                                    NewValues = reader.IsDBNull(reader.GetOrdinal("new_values")) ? null : reader.GetString(reader.GetOrdinal("new_values")),
                                    IpAddress = reader.IsDBNull(reader.GetOrdinal("ip_address")) ? null : reader.GetString(reader.GetOrdinal("ip_address")),
                                    UserAgent = reader.IsDBNull(reader.GetOrdinal("user_agent")) ? null : reader.GetString(reader.GetOrdinal("user_agent")),
                                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
                                });
                            }
                        }
                    }
                }
            }

            return (logs, totalCount);
        }

        public async Task<AuditLogDto?> GetByIdAsync(long logId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                using (var command = new SqlCommand("sp_GetAuditLogById", connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.Parameters.AddWithValue("@LogId", logId);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new AuditLogDto
                            {
                                LogId = reader.GetInt64(reader.GetOrdinal("log_id")),
                                UserId = reader.IsDBNull(reader.GetOrdinal("user_id")) ? null : reader.GetString(reader.GetOrdinal("user_id")),
                                UserName = reader.IsDBNull(reader.GetOrdinal("user_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_name")),
                                UserFullName = reader.IsDBNull(reader.GetOrdinal("user_full_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_full_name")),
                                Action = reader.GetString(reader.GetOrdinal("action")),
                                EntityType = reader.GetString(reader.GetOrdinal("entity_type")),
                                EntityId = reader.IsDBNull(reader.GetOrdinal("entity_id")) ? null : reader.GetString(reader.GetOrdinal("entity_id")),
                                OldValues = reader.IsDBNull(reader.GetOrdinal("old_values")) ? null : reader.GetString(reader.GetOrdinal("old_values")),
                                NewValues = reader.IsDBNull(reader.GetOrdinal("new_values")) ? null : reader.GetString(reader.GetOrdinal("new_values")),
                                IpAddress = reader.IsDBNull(reader.GetOrdinal("ip_address")) ? null : reader.GetString(reader.GetOrdinal("ip_address")),
                                UserAgent = reader.IsDBNull(reader.GetOrdinal("user_agent")) ? null : reader.GetString(reader.GetOrdinal("user_agent")),
                                CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
                            };
                        }
                    }
                }
            }

            return null;
        }

        public async Task<(List<AuditLogDto> Logs, int TotalCount)> GetByUserAsync(
            string userId, int page = 1, int pageSize = 25)
        {
            var logs = new List<AuditLogDto>();
            int totalCount = 0;

            using (var connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                using (var command = new SqlCommand("sp_GetAuditLogsByUser", connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.Parameters.AddWithValue("@UserId", userId);
                    command.Parameters.AddWithValue("@Page", page);
                    command.Parameters.AddWithValue("@PageSize", pageSize);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            totalCount = reader.GetInt32(reader.GetOrdinal("TotalCount"));
                        }

                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                logs.Add(new AuditLogDto
                                {
                                    LogId = reader.GetInt64(reader.GetOrdinal("log_id")),
                                    UserId = reader.IsDBNull(reader.GetOrdinal("user_id")) ? null : reader.GetString(reader.GetOrdinal("user_id")),
                                    UserName = reader.IsDBNull(reader.GetOrdinal("user_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_name")),
                                    UserFullName = reader.IsDBNull(reader.GetOrdinal("user_full_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_full_name")),
                                    Action = reader.GetString(reader.GetOrdinal("action")),
                                    EntityType = reader.GetString(reader.GetOrdinal("entity_type")),
                                    EntityId = reader.IsDBNull(reader.GetOrdinal("entity_id")) ? null : reader.GetString(reader.GetOrdinal("entity_id")),
                                    OldValues = reader.IsDBNull(reader.GetOrdinal("old_values")) ? null : reader.GetString(reader.GetOrdinal("old_values")),
                                    NewValues = reader.IsDBNull(reader.GetOrdinal("new_values")) ? null : reader.GetString(reader.GetOrdinal("new_values")),
                                    IpAddress = reader.IsDBNull(reader.GetOrdinal("ip_address")) ? null : reader.GetString(reader.GetOrdinal("ip_address")),
                                    UserAgent = reader.IsDBNull(reader.GetOrdinal("user_agent")) ? null : reader.GetString(reader.GetOrdinal("user_agent")),
                                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
                                });
                            }
                        }
                    }
                }
            }

            return (logs, totalCount);
        }

        public async Task<(List<AuditLogDto> Logs, int TotalCount)> GetByEntityAsync(
            string entityType, string entityId, int page = 1, int pageSize = 25)
        {
            var logs = new List<AuditLogDto>();
            int totalCount = 0;

            using (var connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                using (var command = new SqlCommand("sp_GetAuditLogsByEntity", connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.Parameters.AddWithValue("@EntityType", entityType);
                    command.Parameters.AddWithValue("@EntityId", entityId);
                    command.Parameters.AddWithValue("@Page", page);
                    command.Parameters.AddWithValue("@PageSize", pageSize);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            totalCount = reader.GetInt32(reader.GetOrdinal("TotalCount"));
                        }

                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                logs.Add(new AuditLogDto
                                {
                                    LogId = reader.GetInt64(reader.GetOrdinal("log_id")),
                                    UserId = reader.IsDBNull(reader.GetOrdinal("user_id")) ? null : reader.GetString(reader.GetOrdinal("user_id")),
                                    UserName = reader.IsDBNull(reader.GetOrdinal("user_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_name")),
                                    UserFullName = reader.IsDBNull(reader.GetOrdinal("user_full_name")) ? "System" : reader.GetString(reader.GetOrdinal("user_full_name")),
                                    Action = reader.GetString(reader.GetOrdinal("action")),
                                    EntityType = reader.GetString(reader.GetOrdinal("entity_type")),
                                    EntityId = reader.IsDBNull(reader.GetOrdinal("entity_id")) ? null : reader.GetString(reader.GetOrdinal("entity_id")),
                                    OldValues = reader.IsDBNull(reader.GetOrdinal("old_values")) ? null : reader.GetString(reader.GetOrdinal("old_values")),
                                    NewValues = reader.IsDBNull(reader.GetOrdinal("new_values")) ? null : reader.GetString(reader.GetOrdinal("new_values")),
                                    IpAddress = reader.IsDBNull(reader.GetOrdinal("ip_address")) ? null : reader.GetString(reader.GetOrdinal("ip_address")),
                                    UserAgent = reader.IsDBNull(reader.GetOrdinal("user_agent")) ? null : reader.GetString(reader.GetOrdinal("user_agent")),
                                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
                                });
                            }
                        }
                    }
                }
            }

            return (logs, totalCount);
        }

        public async Task<long> CreateAsync(AuditLogDto auditLog)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                using (var command = new SqlCommand("sp_CreateAuditLog", connection))
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.Parameters.AddWithValue("@UserId", (object?)auditLog.UserId ?? DBNull.Value);
                    command.Parameters.AddWithValue("@Action", auditLog.Action);
                    command.Parameters.AddWithValue("@EntityType", auditLog.EntityType);
                    command.Parameters.AddWithValue("@EntityId", (object?)auditLog.EntityId ?? DBNull.Value);
                    command.Parameters.AddWithValue("@OldValues", (object?)auditLog.OldValues ?? DBNull.Value);
                    command.Parameters.AddWithValue("@NewValues", (object?)auditLog.NewValues ?? DBNull.Value);
                    command.Parameters.AddWithValue("@IpAddress", (object?)auditLog.IpAddress ?? DBNull.Value);
                    command.Parameters.AddWithValue("@UserAgent", (object?)auditLog.UserAgent ?? DBNull.Value);

                    var result = await command.ExecuteScalarAsync();
                    return Convert.ToInt64(result);
                }
            }
        }
    }

    public class AuditLogDto
    {
        public long LogId { get; set; }
        public string? UserId { get; set; }
        public string UserName { get; set; } = "System";
        public string UserFullName { get; set; } = "System";
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public string? EntityId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

