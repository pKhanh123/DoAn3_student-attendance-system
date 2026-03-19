using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.Helpers;

namespace EducationManagement.DAL.Repositories
{
    public class NotificationRepository
    {
        private readonly string _connectionString;

        public NotificationRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<string> CreateAsync(string recipientId, string title, string content, string type, string? createdBy = null, DateTime? sentDate = null)
        {
            var notificationId = IdGenerator.Generate("notif");
            var parameters = new[]
            {
                new SqlParameter("@NotificationId", notificationId),
                new SqlParameter("@RecipientId", recipientId),
                new SqlParameter("@Title", title),
                new SqlParameter("@Content", content),
                new SqlParameter("@Type", type),
                new SqlParameter("@CreatedBy", (object?)createdBy ?? DBNull.Value),
                new SqlParameter("@SentDate", (object?)sentDate ?? DBNull.Value)
            };

            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CreateNotification", parameters);
            return result?.ToString() ?? notificationId;
        }

        public async Task<(List<Notification> Notifications, int TotalCount)> GetByUserIdAsync(string userId, int page = 1, int pageSize = 50, string? type = null, bool? isRead = null)
        {
            var notifications = new List<Notification>();
            var parameters = new[]
            {
                new SqlParameter("@UserId", userId),
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Type", (object?)type ?? DBNull.Value),
                new SqlParameter("@IsRead", (object?)isRead ?? DBNull.Value)
            };
            
            try
            {
                // Use ExecuteQueryMultipleAsync to get both result sets
                var dataSet = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetNotificationsByUser", parameters);
                
                // First result set: notifications
                if (dataSet.Tables.Count > 0)
                {
                    foreach (DataRow row in dataSet.Tables[0].Rows)
                    {
                        if (row.Table.Columns.Contains("notification_id"))
                            notifications.Add(MapToNotification(row));
                    }
                }
                
                // Second result set: total_count
                int totalCount = 0;
                if (dataSet.Tables.Count > 1 && dataSet.Tables[1].Rows.Count > 0)
                {
                    var countRow = dataSet.Tables[1].Rows[0];
                    if (countRow.Table.Columns.Contains("total_count"))
                    {
                        totalCount = Convert.ToInt32(countRow["total_count"]);
                    }
                }
                else if (dataSet.Tables.Count == 1)
                {
                    // Fallback: If stored procedure only returns 1 result set (old version),
                    // use the count of notifications as totalCount
                    // This handles backward compatibility but indicates a problem
                    totalCount = notifications.Count;
                }
                
                return (notifications, totalCount);
            }
            catch (Exception ex)
            {
                return (notifications, 0);
            }
        }

        public async Task<List<Notification>> GetUnreadByUserIdAsync(string userId, int limit = 10)
        {
            var notifications = new List<Notification>();
            var parameters = new[]
            {
                new SqlParameter("@UserId", userId),
                new SqlParameter("@Limit", limit)
            };
            
            try
            {
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetUnreadNotificationsByUser", parameters);
                foreach (DataRow row in dt.Rows)
                    notifications.Add(MapToNotification(row));
            }
            catch (Exception ex)
            {
            }

            return notifications;
        }

        public async Task<int> GetUnreadCountAsync(string userId)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", userId),
                new SqlParameter("@IsRead", false)
            };
            
            try
            {
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetNotificationCount", parameters);
                if (dt.Rows.Count > 0 && dt.Rows[0].Table.Columns.Contains("count"))
                {
                    return Convert.ToInt32(dt.Rows[0]["count"]);
                }
            }
            catch (Exception ex)
            {
            }

            return 0;
        }

        public async Task<Notification?> GetByIdAsync(string notificationId)
        {
            var param = new SqlParameter("@NotificationId", notificationId);
            
            try
            {
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetNotificationById", param);
                if (dt.Rows.Count > 0)
                    return MapToNotification(dt.Rows[0]);
            }
            catch (Exception ex)
            {
            }

            return null;
        }

        public async Task MarkAsReadAsync(string notificationId, string? userId = null)
        {
            if (string.IsNullOrWhiteSpace(notificationId))
            {
                throw new ArgumentException("Notification ID không được để trống");
            }

            // Create parameters with explicit direction and size
            var notificationIdParam = new SqlParameter("@NotificationId", SqlDbType.VarChar, 50)
            {
                Value = notificationId,
                Direction = ParameterDirection.Input
            };
            
            var userIdParam = new SqlParameter("@UserId", SqlDbType.VarChar, 50)
            {
                Value = (object?)userId ?? DBNull.Value,
                Direction = ParameterDirection.Input
            };
            
            var parameters = new[] { notificationIdParam, userIdParam };
            
            try
            {
                // Use explicit schema to avoid conflicts with other stored procedures
                var result = await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "dbo.sp_MarkNotificationAsRead", parameters);
                // If no rows affected, notification might not exist or already deleted
                // Note: Stored procedure should throw error 50001, but we check here as backup
                if (result == 0)
                {
                    throw new Exception("Không tìm thấy notification hoặc đã bị xóa");
                }
            }
            catch (SqlException sqlEx)
            {
                // Re-throw SQL exceptions (including error 50001 from stored procedure)
                throw;
            }
            catch (Exception ex)
            {
                // Check if it's a wrapped SQL exception from DatabaseHelper
                if (ex.InnerException is SqlException innerSqlEx)
                {
                    throw innerSqlEx;
                }
                // Check if error message indicates not found
                if (ex.Message.Contains("Không tìm thấy") || ex.Message.Contains("not found"))
                {
                    throw new Exception("Không tìm thấy notification hoặc đã bị xóa", ex);
                }
                // Wrap other exceptions
                throw new Exception($"Lỗi khi đánh dấu notification đã đọc: {ex.Message}", ex);
            }
        }

        public async Task<int> MarkAllAsReadAsync(string userId, string? updatedBy = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", userId),
                new SqlParameter("@UpdatedBy", (object?)updatedBy ?? DBNull.Value)
            };
            
            try
            {
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_MarkAllNotificationsAsRead", parameters);
                if (dt.Rows.Count > 0 && dt.Rows[0].Table.Columns.Contains("updated_count"))
                {
                    return Convert.ToInt32(dt.Rows[0]["updated_count"]);
                }
            }
            catch (Exception ex)
            {
                throw;
            }

            return 0;
        }

        public async Task DeleteAsync(string notificationId, string? deletedBy = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@NotificationId", notificationId),
                new SqlParameter("@DeletedBy", (object?)deletedBy ?? DBNull.Value)
            };
            
            try
            {
                await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteNotification", parameters);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        private static Notification MapToNotification(DataRow row)
        {
            return new Notification
            {
                NotificationId = row["notification_id"]?.ToString() ?? "",
                RecipientId = row.Table.Columns.Contains("recipient_id") 
                    ? (row["recipient_id"]?.ToString() ?? "") 
                    : (row.Table.Columns.Contains("user_id") ? row["user_id"]?.ToString() ?? "" : ""),
                Title = row["title"]?.ToString() ?? "",
                Content = row.Table.Columns.Contains("content") 
                    ? (row["content"]?.ToString() ?? "") 
                    : (row.Table.Columns.Contains("message") ? row["message"]?.ToString() ?? "" : ""),
                Type = row.Table.Columns.Contains("type")
                    ? (row["type"]?.ToString() ?? "System")
                    : (row.Table.Columns.Contains("notification_type") ? row["notification_type"]?.ToString() ?? "System" : "System"),
                IsRead = row.Table.Columns.Contains("is_read") && row["is_read"] != DBNull.Value 
                    ? Convert.ToBoolean(row["is_read"]) 
                    : false,
                SentDate = row.Table.Columns.Contains("sent_date") && row["sent_date"] != DBNull.Value
                    ? Convert.ToDateTime(row["sent_date"])
                    : (row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                        ? Convert.ToDateTime(row["created_at"])
                        : null),
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["created_at"])
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") && row["created_by"] != DBNull.Value
                    ? row["created_by"]?.ToString()
                    : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["updated_at"])
                    : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") && row["updated_by"] != DBNull.Value
                    ? row["updated_by"]?.ToString()
                    : null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true
            };
        }
    }
}

