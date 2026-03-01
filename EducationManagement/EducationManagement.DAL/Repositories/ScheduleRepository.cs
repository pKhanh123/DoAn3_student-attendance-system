using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class ScheduleRepository
    {
        private readonly string _connectionString;

        public ScheduleRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<List<Schedule>> GetAllAsync()
        {
            var schedules = new List<Schedule>();
            
            try
            {
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAllSchedules");

                foreach (DataRow row in dt.Rows)
                {
                    try
                    {
                        schedules.Add(MapToSchedule(row));
                    }
                    catch (Exception ex)
                    {
                        // Log available columns for debugging
                        var columns = string.Join(", ", row.Table.Columns.Cast<DataColumn>().Select(c => c.ColumnName));
                        throw new Exception($"Error mapping schedule row. Available columns: {columns}. Error: {ex.Message}", ex);
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error in GetAllAsync: {ex.Message}", ex);
            }

            return schedules;
        }

        public async Task<Schedule?> GetByIdAsync(string scheduleId)
        {
            var param = new SqlParameter("@ScheduleId", scheduleId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetScheduleById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToSchedule(dt.Rows[0]);
        }

        public async Task<List<Schedule>> GetByClassIdAsync(string classId)
        {
            var schedules = new List<Schedule>();
            var param = new SqlParameter("@ClassId", classId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetSchedulesByClass", param);

            foreach (DataRow row in dt.Rows)
                schedules.Add(MapToSchedule(row));

            return schedules;
        }

        private static Schedule MapToSchedule(DataRow row)
        {
            // Stored procedure sp_GetAllSchedules trả về:
            // schedule_id (từ session_id), class_id, subject_id, lecturer_id, room_id (không phải room),
            // school_year_id, week_no, weekday (không phải day_of_week), start_time, end_time,
            // period_from, period_to, recurrence, status (không phải schedule_type), notes,
            // created_at, created_by, updated_at, updated_by, class_code, class_name, subject_code, subject_name, lecturer_name, room_code
            // KHÔNG có: is_active
            
            // Lấy room từ room_code hoặc room_id
            var room = row.Table.Columns.Contains("room_code") && row["room_code"] != DBNull.Value
                ? row["room_code"]?.ToString()
                : row.Table.Columns.Contains("room_id") && row["room_id"] != DBNull.Value
                    ? row["room_id"]?.ToString()
                    : row.Table.Columns.Contains("room") && row["room"] != DBNull.Value
                        ? row["room"]?.ToString()
                        : null;
            
            return new Schedule
            {
                ScheduleId = row["schedule_id"].ToString()!,
                ClassId = row["class_id"].ToString()!,
                Room = room,
                // Stored procedure trả về "weekday" là INT (1-7), không phải "day_of_week" string
                DayOfWeek = row.Table.Columns.Contains("weekday") && row["weekday"] != DBNull.Value
                    ? row["weekday"].ToString() // Convert INT to string
                    : row.Table.Columns.Contains("day_of_week") && row["day_of_week"] != DBNull.Value
                        ? row["day_of_week"]?.ToString()
                        : null,
                // start_time và end_time là TIME type trong SQL, sẽ được map thành TimeSpan trong C#
                StartTime = row.Table.Columns.Contains("start_time") && row["start_time"] != DBNull.Value
                    ? (row["start_time"] is TimeSpan timeSpan 
                        ? DateTime.Today.Add(timeSpan) 
                        : row["start_time"] is DateTime dateTime
                            ? dateTime
                            : Convert.ToDateTime(row["start_time"]))
                    : DateTime.Now,
                EndTime = row.Table.Columns.Contains("end_time") && row["end_time"] != DBNull.Value
                    ? (row["end_time"] is TimeSpan timeSpan2 
                        ? DateTime.Today.Add(timeSpan2) 
                        : row["end_time"] is DateTime dateTime2
                            ? dateTime2
                            : Convert.ToDateTime(row["end_time"]))
                    : DateTime.Now,
                // Stored procedure trả về "status" không phải "schedule_type"
                ScheduleType = row.Table.Columns.Contains("status") && row["status"] != DBNull.Value
                    ? (row["status"]?.ToString() ?? "Lecture")
                    : row.Table.Columns.Contains("schedule_type") && row["schedule_type"] != DBNull.Value
                        ? (row["schedule_type"]?.ToString() ?? "Lecture")
                        : "Lecture",
                // Stored procedure không trả về is_active, default true
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["created_at"]) 
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") && row["created_by"] != DBNull.Value
                    ? row["created_by"]?.ToString()
                    : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["updated_at"]) 
                    : (DateTime?)null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") && row["updated_by"] != DBNull.Value
                    ? row["updated_by"]?.ToString()
                    : null
            };
        }
    }
}

