using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class AttendanceRepository
    {
        private readonly string _connectionString;

        public AttendanceRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        /// <summary>
        /// Lấy tất cả attendance records
        /// </summary>
        public async Task<List<Attendance>> GetAllAsync()
        {
            var attendances = new List<Attendance>();

            try
            {
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAllAttendances");

                foreach (DataRow row in dt.Rows)
                {
                    try
                    {
                        attendances.Add(MapToAttendance(row));
                    }
                    catch (Exception ex)
                    {
                        // Log mapping error but continue with other rows
                        System.Diagnostics.Debug.WriteLine($"Error mapping attendance row: {ex.Message}");
                        throw; // Re-throw to see the actual error
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error in GetAllAsync: {ex.Message}", ex);
            }

            return attendances;
        }

        /// <summary>
        /// Lấy attendance theo ID
        /// </summary>
        public async Task<Attendance?> GetByIdAsync(string attendanceId)
        {
            var param = new SqlParameter("@AttendanceId", attendanceId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAttendanceById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToAttendance(dt.Rows[0]);
        }

        /// <summary>
        /// Tạo attendance record mới
        /// </summary>
        public async Task<string> CreateAsync(string attendanceId, string studentId, string scheduleId,
            DateTime attendanceDate, string status, string? notes, string? markedBy, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AttendanceId", attendanceId),
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ScheduleId", scheduleId),
                new SqlParameter("@AttendanceDate", attendanceDate),
                new SqlParameter("@Status", status),
                new SqlParameter("@Note", (object?)notes ?? DBNull.Value),  // ✅ Fixed: @Note (singular) not @Notes
                new SqlParameter("@MarkedBy", (object?)markedBy ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CreateAttendance", parameters);
            return result?.ToString() ?? attendanceId;
        }

        /// <summary>
        /// Cập nhật attendance
        /// </summary>
        public async Task UpdateAsync(string attendanceId, string status, string? notes, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AttendanceId", attendanceId),
                new SqlParameter("@Status", status),
                new SqlParameter("@Notes", (object?)notes ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateAttendance", parameters);
        }

        /// <summary>
        /// Xóa attendance (soft delete)
        /// </summary>
        public async Task DeleteAsync(string attendanceId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AttendanceId", attendanceId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteAttendance", parameters);
        }

        /// <summary>
        /// Lấy attendances theo student ID
        /// </summary>
        public async Task<List<Attendance>> GetByStudentIdAsync(string studentId)
        {
            var attendances = new List<Attendance>();
            var param = new SqlParameter("@StudentId", studentId);

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAttendancesByStudent", param);

            foreach (DataRow row in dt.Rows)
            {
                attendances.Add(MapToAttendance(row));
            }

            return attendances;
        }

        /// <summary>
        /// Lấy attendances theo schedule ID
        /// </summary>
        public async Task<List<Attendance>> GetByScheduleIdAsync(string scheduleId)
        {
            var attendances = new List<Attendance>();
            var param = new SqlParameter("@ScheduleId", scheduleId);

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAttendancesBySchedule", param);

            foreach (DataRow row in dt.Rows)
            {
                attendances.Add(MapToAttendance(row));
            }

            return attendances;
        }

        /// <summary>
        /// Lấy attendances theo class ID
        /// </summary>
        public async Task<List<Attendance>> GetByClassIdAsync(string classId)
        {
            var attendances = new List<Attendance>();
            var param = new SqlParameter("@ClassId", classId);

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAttendancesByClass", param);

            foreach (DataRow row in dt.Rows)
            {
                attendances.Add(MapToAttendance(row));
            }

            return attendances;
        }

        /// <summary>
        /// Get classId from scheduleId (for warning check)
        /// </summary>
        public async Task<string?> GetClassIdByScheduleIdAsync(string scheduleId)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand(@"
                    SELECT TOP 1 class_id 
                    FROM dbo.timetable_sessions 
                    WHERE session_id = @ScheduleId", conn);
                cmd.Parameters.Add(new SqlParameter("@ScheduleId", scheduleId));

                var result = await cmd.ExecuteScalarAsync();
                return result?.ToString();
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Map DataRow to Attendance model
        /// </summary>
        private static Attendance MapToAttendance(DataRow row)
        {
            // Stored procedure sp_GetAttendancesByStudent trả về:
            // attendance_id, enrollment_id, class_id, attendance_date, status, note,
            // created_at, created_by, updated_at, updated_by, student_id, student_code, student_name,
            // class_code, class_name, subject_id, subject_code, subject_name,
            // marked_by, marked_by_name, lecturer_id, lecturer_name
            
            // Lấy schedule_id từ enrollment_id hoặc class_id (nếu cần)
            var scheduleId = row.Table.Columns.Contains("schedule_id") && row["schedule_id"] != DBNull.Value
                ? row["schedule_id"].ToString()!
                : row.Table.Columns.Contains("enrollment_id") && row["enrollment_id"] != DBNull.Value
                    ? row["enrollment_id"].ToString()!
                    : string.Empty;
            
            var attendance = new Attendance
            {
                AttendanceId = row["attendance_id"].ToString()!,
                StudentId = row["student_id"].ToString()!,
                ScheduleId = scheduleId,
                AttendanceDate = row.Table.Columns.Contains("attendance_date") && row["attendance_date"] != DBNull.Value 
                    ? Convert.ToDateTime(row["attendance_date"]) 
                    : DateTime.Now,
                Status = row["status"].ToString()!,
                // Stored procedure trả về "note" không phải "notes"
                Notes = row.Table.Columns.Contains("note") && row["note"] != DBNull.Value
                    ? row["note"]?.ToString()
                    : row.Table.Columns.Contains("notes") && row["notes"] != DBNull.Value
                        ? row["notes"]?.ToString()
                        : null,
                MarkedBy = row.Table.Columns.Contains("marked_by") && row["marked_by"] != DBNull.Value
                    ? row["marked_by"]?.ToString()
                    : null,
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
                    : null,
                DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["deleted_at"])
                    : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") && row["deleted_by"] != DBNull.Value
                    ? row["deleted_by"]?.ToString()
                    : null
            };
            
            // Map các field NotMapped
            attendance.StudentCode = row.Table.Columns.Contains("student_code") && row["student_code"] != DBNull.Value
                ? row["student_code"]?.ToString()
                : null;
            
            attendance.StudentName = row.Table.Columns.Contains("student_name") && row["student_name"] != DBNull.Value
                ? row["student_name"]?.ToString()
                : null;
            
            attendance.ClassName = row.Table.Columns.Contains("class_name") && row["class_name"] != DBNull.Value
                ? row["class_name"]?.ToString()
                : null;
            
            attendance.MarkedByName = row.Table.Columns.Contains("marked_by_name") && row["marked_by_name"] != DBNull.Value
                ? row["marked_by_name"]?.ToString()
                : null;
            
            attendance.SubjectName = row.Table.Columns.Contains("subject_name") && row["subject_name"] != DBNull.Value
                ? row["subject_name"]?.ToString()
                : null;
            
            attendance.LecturerName = row.Table.Columns.Contains("lecturer_name") && row["lecturer_name"] != DBNull.Value
                ? row["lecturer_name"]?.ToString()
                : null;
            
            return attendance;
        }
    }
}

