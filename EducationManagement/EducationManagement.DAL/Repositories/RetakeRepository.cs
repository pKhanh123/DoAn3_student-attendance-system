using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Retake;

namespace EducationManagement.DAL.Repositories
{
    public class RetakeRepository
    {
        private readonly string _connectionString;

        public RetakeRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        /// <summary>
        /// Create retake record
        /// </summary>
        public async Task<string> CreateAsync(string retakeId, string enrollmentId, string studentId,
            string classId, string subjectId, string reason, decimal? thresholdValue, 
            decimal? currentValue, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@RetakeId", retakeId),
                new SqlParameter("@EnrollmentId", enrollmentId),
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ClassId", classId),
                new SqlParameter("@SubjectId", subjectId),
                new SqlParameter("@Reason", reason),
                new SqlParameter("@ThresholdValue", (object?)thresholdValue ?? DBNull.Value),
                new SqlParameter("@CurrentValue", (object?)currentValue ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CreateRetakeRecord", parameters);
            return result?.ToString() ?? retakeId;
        }

        /// <summary>
        /// Get retake record by ID
        /// </summary>
        public async Task<RetakeRecord?> GetByIdAsync(string retakeId)
        {
            var param = new SqlParameter("@RetakeId", retakeId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetRetakeRecordById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToRetakeRecordWithDetails(dt.Rows[0]);
        }

        /// <summary>
        /// Get retake records by student ID
        /// </summary>
        public async Task<(List<RetakeRecord> Records, int TotalCount)> GetByStudentIdAsync(
            string studentId, string? status = null, int page = 1, int pageSize = 50)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@Status", (object?)status ?? DBNull.Value),
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize)
            };

            var records = new List<RetakeRecord>();
            int totalCount = 0;

            // Use SqlDataReader to handle multiple result sets
            using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            using var cmd = new SqlCommand("sp_GetRetakeRecordsByStudent", conn)
            {
                CommandType = System.Data.CommandType.StoredProcedure
            };
            cmd.Parameters.AddRange(parameters);

            using var reader = await cmd.ExecuteReaderAsync();

            // Read first result set (records)
            while (await reader.ReadAsync())
            {
                records.Add(MapToRetakeRecordFromReader(reader));
            }

            // Read second result set (total count) if exists
            if (await reader.NextResultAsync())
            {
                if (await reader.ReadAsync())
                {
                    // Check if column exists before reading
                    if (reader.HasRows && reader.FieldCount > 0)
                    {
                        var columnIndex = reader.GetOrdinal("total_count");
                        if (columnIndex >= 0)
                        {
                            totalCount = reader["total_count"] != DBNull.Value 
                                ? Convert.ToInt32(reader["total_count"]) 
                                : 0;
                        }
                    }
                }
            }
            else
            {
                // If no second result set, use records count as total
                totalCount = records.Count;
            }

            return (records, totalCount);
        }

        /// <summary>
        /// Get retake records by class ID
        /// </summary>
        public async Task<(List<RetakeRecord> Records, int TotalCount)> GetByClassIdAsync(
            string classId, string? status = null, int page = 1, int pageSize = 50)
        {
            var parameters = new[]
            {
                new SqlParameter("@ClassId", classId),
                new SqlParameter("@Status", (object?)status ?? DBNull.Value),
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize)
            };

            using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            using var cmd = new SqlCommand("sp_GetRetakeRecordsByClass", conn)
            {
                CommandType = System.Data.CommandType.StoredProcedure
            };
            cmd.Parameters.AddRange(parameters);

            var records = new List<RetakeRecord>();
            int totalCount = 0;

            using var reader = await cmd.ExecuteReaderAsync();

            // Read records
            while (await reader.ReadAsync())
            {
                records.Add(MapToRetakeRecordFromReader(reader));
            }

            // Read total count
            if (await reader.NextResultAsync() && await reader.ReadAsync())
            {
                totalCount = reader["total_count"] != DBNull.Value 
                    ? Convert.ToInt32(reader["total_count"]) 
                    : 0;
            }

            return (records, totalCount);
        }

        /// <summary>
        /// Get all retake records (for admin/advisor)
        /// </summary>
        public async Task<(List<RetakeRecord> Records, int TotalCount)> GetAllAsync(
            string? status = null, int page = 1, int pageSize = 50)
        {
            var parameters = new[]
            {
                new SqlParameter("@Status", (object?)status ?? DBNull.Value),
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize)
            };

            using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            using var cmd = new SqlCommand("sp_GetAllRetakeRecords", conn)
            {
                CommandType = System.Data.CommandType.StoredProcedure
            };
            cmd.Parameters.AddRange(parameters);

            var records = new List<RetakeRecord>();
            int totalCount = 0;

            using var reader = await cmd.ExecuteReaderAsync();

            // Read records
            while (await reader.ReadAsync())
            {
                records.Add(MapToRetakeRecordFromReader(reader));
            }

            // Read total count
            if (await reader.NextResultAsync() && await reader.ReadAsync())
            {
                totalCount = reader["total_count"] != DBNull.Value 
                    ? Convert.ToInt32(reader["total_count"]) 
                    : 0;
            }

            return (records, totalCount);
        }

        /// <summary>
        /// Get retake record by enrollment ID
        /// </summary>
        public async Task<RetakeRecord?> GetByEnrollmentIdAsync(string enrollmentId)
        {
            var param = new SqlParameter("@EnrollmentId", enrollmentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetRetakeRecordByEnrollment", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToRetakeRecord(dt.Rows[0]);
        }

        /// <summary>
        /// Update retake status
        /// </summary>
        public async Task UpdateStatusAsync(string retakeId, string status, string? advisorNotes, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@RetakeId", retakeId),
                new SqlParameter("@Status", status),
                new SqlParameter("@AdvisorNotes", (object?)advisorNotes ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateRetakeStatus", parameters);
        }

        /// <summary>
        /// Check if retake is required for an enrollment
        /// </summary>
        public async Task<(bool IsRequired, string? Reason, decimal? CurrentValue, string? StudentId, string? ClassId, string? SubjectId, decimal? ThresholdValue)> CheckRetakeRequiredAsync(
            string enrollmentId, decimal attendanceThreshold = 20.0m, decimal gradeThreshold = 4.0m)
        {
            var parameters = new[]
            {
                new SqlParameter("@EnrollmentId", enrollmentId),
                new SqlParameter("@AttendanceThreshold", attendanceThreshold),
                new SqlParameter("@GradeThreshold", gradeThreshold)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckRetakeRequired", parameters);

            if (dt.Rows.Count == 0)
                return (false, null, null, null, null, null, null);

            var row = dt.Rows[0];
            var result = row["result"]?.ToString() ?? "NOT_REQUIRED";

            if (result == "REQUIRED")
            {
                return (
                    true,
                    row["reason"]?.ToString(),
                    row["current_value"] != DBNull.Value ? Convert.ToDecimal(row["current_value"]) : null,
                    row["student_id"]?.ToString(),
                    row["class_id"]?.ToString(),
                    row["subject_id"]?.ToString(),
                    row["threshold_value"] != DBNull.Value ? Convert.ToDecimal(row["threshold_value"]) : null
                );
            }
            else if (result == "EXISTS")
            {
                return (false, "EXISTS", null, null, null, null, null);
            }

            return (false, null, null, null, null, null, null);
        }

        /// <summary>
        /// Get failed subjects by student
        /// </summary>
        public async Task<List<FailedSubjectDto>> GetFailedSubjectsByStudentAsync(
            string studentId, string? schoolYearId = null, int? semester = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetFailedSubjectsByStudent", parameters);

            var subjects = new List<FailedSubjectDto>();
            foreach (DataRow row in dt.Rows)
            {
                subjects.Add(MapToFailedSubjectDto(row));
            }

            return subjects;
        }

        /// <summary>
        /// Get retake classes for a subject
        /// </summary>
        public async Task<List<RetakeClassDto>> GetRetakeClassesForSubjectAsync(
            string subjectId, string? studentId = null, string? periodId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@SubjectId", subjectId),
                new SqlParameter("@StudentId", (object?)studentId ?? DBNull.Value),
                new SqlParameter("@PeriodId", (object?)periodId ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetRetakeClassesForSubject", parameters);

            var classes = new List<RetakeClassDto>();
            foreach (DataRow row in dt.Rows)
            {
                classes.Add(MapToRetakeClassDto(row));
            }

            return classes;
        }

        /// <summary>
        /// Map DataRow to FailedSubjectDto
        /// </summary>
        private static FailedSubjectDto MapToFailedSubjectDto(DataRow row)
        {
            return new FailedSubjectDto
            {
                RetakeId = row["retake_id"].ToString() ?? string.Empty,
                SubjectId = row["subject_id"].ToString() ?? string.Empty,
                SubjectCode = row["subject_code"].ToString() ?? string.Empty,
                SubjectName = row["subject_name"].ToString() ?? string.Empty,
                Credits = row["credits"] != DBNull.Value ? Convert.ToInt32(row["credits"]) : 0,
                FailedClassId = row["failed_class_id"].ToString() ?? string.Empty,
                FailedClassCode = row["failed_class_code"]?.ToString() ?? string.Empty,
                FailedClassName = row["failed_class_name"]?.ToString() ?? string.Empty,
                Reason = row["reason"].ToString() ?? string.Empty,
                CurrentValue = row["current_value"] != DBNull.Value ? Convert.ToDecimal(row["current_value"]) : null,
                ThresholdValue = row["threshold_value"] != DBNull.Value ? Convert.ToDecimal(row["threshold_value"]) : null,
                RetakeStatus = row["retake_status"].ToString() ?? string.Empty,
                SchoolYearId = row["school_year_id"].ToString() ?? string.Empty,
                SchoolYearCode = row["school_year_code"]?.ToString() ?? string.Empty,
                Semester = row["semester"] != DBNull.Value ? Convert.ToInt32(row["semester"]) : 0,
                RetakeCreatedAt = row["retake_created_at"] != DBNull.Value ? Convert.ToDateTime(row["retake_created_at"]) : DateTime.Now
            };
        }

        /// <summary>
        /// Map DataRow to RetakeClassDto
        /// </summary>
        private static RetakeClassDto MapToRetakeClassDto(DataRow row)
        {
            var maxStudents = row["max_students"] != DBNull.Value ? Convert.ToInt32(row["max_students"]) : (int?)null;
            var currentEnrollment = row["current_enrollment"] != DBNull.Value ? Convert.ToInt32(row["current_enrollment"]) : 0;
            
            return new RetakeClassDto
            {
                ClassId = row["class_id"].ToString() ?? string.Empty,
                ClassCode = row["class_code"].ToString() ?? string.Empty,
                ClassName = row["class_name"].ToString() ?? string.Empty,
                SubjectId = row["subject_id"].ToString() ?? string.Empty,
                SubjectCode = row["subject_code"].ToString() ?? string.Empty,
                SubjectName = row["subject_name"].ToString() ?? string.Empty,
                Credits = row["credits"] != DBNull.Value ? Convert.ToInt32(row["credits"]) : 0,
                LecturerId = row["lecturer_id"]?.ToString(),
                LecturerName = row["lecturer_name"]?.ToString(),
                RoomId = row["room_id"]?.ToString(),
                RoomCode = row["room_code"]?.ToString(),
                Building = row["building"]?.ToString(),
                MaxStudents = maxStudents,
                CurrentEnrollment = currentEnrollment,
                AvailableSeats = maxStudents.HasValue ? maxStudents.Value - currentEnrollment : 0,
                IsRegistered = row["is_registered"] != DBNull.Value && Convert.ToBoolean(row["is_registered"]),
                SchoolYearCode = row["school_year_code"]?.ToString() ?? string.Empty,
                Semester = row["semester"] != DBNull.Value ? Convert.ToInt32(row["semester"]) : 0,
                ScheduleInfo = row["schedule_info"]?.ToString()
            };
        }

        /// <summary>
        /// Map DataRow to RetakeRecord (basic)
        /// </summary>
        private static RetakeRecord MapToRetakeRecord(DataRow row)
        {
            return new RetakeRecord
            {
                RetakeId = row["retake_id"].ToString() ?? string.Empty,
                EnrollmentId = row["enrollment_id"].ToString() ?? string.Empty,
                StudentId = row["student_id"].ToString() ?? string.Empty,
                ClassId = row["class_id"].ToString() ?? string.Empty,
                SubjectId = row["subject_id"].ToString() ?? string.Empty,
                Reason = row["reason"].ToString() ?? string.Empty,
                ThresholdValue = row["threshold_value"] != DBNull.Value ? Convert.ToDecimal(row["threshold_value"]) : null,
                CurrentValue = row["current_value"] != DBNull.Value ? Convert.ToDecimal(row["current_value"]) : null,
                Status = row["status"].ToString() ?? "PENDING",
                AdvisorNotes = row.Table.Columns.Contains("advisor_notes") ? row["advisor_notes"]?.ToString() : null,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["created_at"])
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["updated_at"])
                    : (DateTime?)null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null,
                ResolvedAt = row.Table.Columns.Contains("resolved_at") && row["resolved_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["resolved_at"])
                    : (DateTime?)null,
                ResolvedBy = row.Table.Columns.Contains("resolved_by") ? row["resolved_by"]?.ToString() : null
            };
        }

        /// <summary>
        /// Map DataRow to RetakeRecord with details (from SP with JOINs)
        /// </summary>
        private static RetakeRecord MapToRetakeRecordWithDetails(DataRow row)
        {
            var record = MapToRetakeRecord(row);

            // Additional fields from JOINs
            record.StudentCode = row.Table.Columns.Contains("student_code") ? row["student_code"]?.ToString() : null;
            record.StudentName = row.Table.Columns.Contains("student_name") ? row["student_name"]?.ToString() : null;
            record.ClassCode = row.Table.Columns.Contains("class_code") ? row["class_code"]?.ToString() : null;
            record.ClassName = row.Table.Columns.Contains("class_name") ? row["class_name"]?.ToString() : null;
            record.SubjectCode = row.Table.Columns.Contains("subject_code") ? row["subject_code"]?.ToString() : null;
            record.SubjectName = row.Table.Columns.Contains("subject_name") ? row["subject_name"]?.ToString() : null;
            record.SchoolYearCode = row.Table.Columns.Contains("school_year_code") ? row["school_year_code"]?.ToString() : null;
            record.Semester = row.Table.Columns.Contains("semester") && row["semester"] != DBNull.Value
                ? Convert.ToInt32(row["semester"])
                : (int?)null;
            record.EnrollmentDate = row.Table.Columns.Contains("enrollment_date") && row["enrollment_date"] != DBNull.Value
                ? Convert.ToDateTime(row["enrollment_date"])
                : (DateTime?)null;

            return record;
        }

        /// <summary>
        /// Map SqlDataReader to RetakeRecord
        /// </summary>
        private static RetakeRecord MapToRetakeRecordFromReader(System.Data.Common.DbDataReader reader)
        {
            return new RetakeRecord
            {
                RetakeId = reader["retake_id"].ToString() ?? string.Empty,
                EnrollmentId = reader["enrollment_id"].ToString() ?? string.Empty,
                StudentId = reader["student_id"].ToString() ?? string.Empty,
                StudentCode = reader["student_code"]?.ToString(),
                StudentName = reader["student_name"]?.ToString(),
                ClassId = reader["class_id"].ToString() ?? string.Empty,
                ClassCode = reader["class_code"]?.ToString(),
                ClassName = reader["class_name"]?.ToString(),
                SubjectId = reader["subject_id"].ToString() ?? string.Empty,
                SubjectCode = reader["subject_code"]?.ToString(),
                SubjectName = reader["subject_name"]?.ToString(),
                Reason = reader["reason"].ToString() ?? string.Empty,
                ThresholdValue = reader["threshold_value"] != DBNull.Value ? Convert.ToDecimal(reader["threshold_value"]) : null,
                CurrentValue = reader["current_value"] != DBNull.Value ? Convert.ToDecimal(reader["current_value"]) : null,
                Status = reader["status"].ToString() ?? "PENDING",
                AdvisorNotes = reader["advisor_notes"]?.ToString(),
                CreatedAt = reader["created_at"] != DBNull.Value ? Convert.ToDateTime(reader["created_at"]) : DateTime.Now,
                UpdatedAt = reader["updated_at"] != DBNull.Value ? Convert.ToDateTime(reader["updated_at"]) : (DateTime?)null,
                ResolvedAt = reader["resolved_at"] != DBNull.Value ? Convert.ToDateTime(reader["resolved_at"]) : (DateTime?)null,
                ResolvedBy = reader["resolved_by"]?.ToString(),
                SchoolYearCode = reader["school_year_code"]?.ToString(),
                Semester = reader["semester"] != DBNull.Value ? Convert.ToInt32(reader["semester"]) : (int?)null
            };
        }
    }
}

