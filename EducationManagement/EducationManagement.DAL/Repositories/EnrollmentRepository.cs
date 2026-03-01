using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Enrollment;

namespace EducationManagement.DAL.Repositories
{
    public class EnrollmentRepository
    {
        private readonly string _connectionString;

        public EnrollmentRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<List<Enrollment>> GetAllAsync()
        {
            // Fallback: nếu SP tổng hợp toàn bộ chưa có, trả về danh sách rỗng thay vì 500
            try
            {
                var enrollments = new List<Enrollment>();
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAllEnrollments");
                foreach (DataRow row in dt.Rows)
                    enrollments.Add(MapToEnrollment(row));
                return enrollments;
            }
            catch
            {
                // TODO: thêm SP sp_GetAllEnrollments hoặc chuyển sang paged API
                return new List<Enrollment>();
            }
        }

        public async Task<Enrollment?> GetByIdAsync(string enrollmentId)
        {
            var param = new SqlParameter("@EnrollmentId", enrollmentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetEnrollmentById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToEnrollment(dt.Rows[0]);
        }

        public async Task<List<Enrollment>> GetByStudentIdAsync(string studentId)
        {
            var enrollments = new List<Enrollment>();
            var param = new SqlParameter("@StudentId", studentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetEnrollmentsByStudent", param);

            foreach (DataRow row in dt.Rows)
                enrollments.Add(MapToEnrollment(row));

            return enrollments;
        }

        public async Task<List<Enrollment>> GetByClassIdAsync(string classId)
        {
            var enrollments = new List<Enrollment>();
            var param = new SqlParameter("@ClassId", classId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetEnrollmentsByClass", param);

            foreach (DataRow row in dt.Rows)
                enrollments.Add(MapToEnrollment(row));

            return enrollments;
        }

        // ============================================================
        // 🔹 PHASE 2: ENROLLMENT SYSTEM - NEW METHODS
        // ============================================================

        // 1️⃣ GET AVAILABLE CLASSES FOR STUDENT
        public async Task<List<AvailableClassDto>> GetAvailableClassesAsync(
            string studentId, 
            string academicYearId, 
            int semester)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@AcademicYearId", academicYearId),
                new SqlParameter("@Semester", semester)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetAvailableClassesForStudent", parameters);

            var classes = new List<AvailableClassDto>();
            foreach (DataRow row in dt.Rows)
            {
                classes.Add(MapToAvailableClassDto(row));
            }

            return classes;
        }

        // 2️⃣ CHECK ENROLLMENT ELIGIBILITY
        public async Task<EligibilityCheckResponse> CheckEligibilityAsync(string studentId, string classId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ClassId", classId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_CheckEnrollmentEligibility", parameters);

            if (dt.Rows.Count == 0)
                return new EligibilityCheckResponse { IsEligible = false, ErrorMessage = "Không thể kiểm tra điều kiện" };

            var row = dt.Rows[0];
            return new EligibilityCheckResponse
            {
                IsEligible = Convert.ToBoolean(row["is_eligible"]),
                ErrorMessage = row["error_message"]?.ToString(),
                IsInRegistrationPeriod = row.Table.Columns.Contains("is_in_period") && Convert.ToBoolean(row["is_in_period"]),
                HasAvailableSlots = row.Table.Columns.Contains("has_slots") && Convert.ToBoolean(row["has_slots"]),
                IsNotAlreadyEnrolled = row.Table.Columns.Contains("not_enrolled") && Convert.ToBoolean(row["not_enrolled"]),
                NoScheduleConflict = row.Table.Columns.Contains("no_conflict") && Convert.ToBoolean(row["no_conflict"]),
                HasPrerequisites = row.Table.Columns.Contains("has_prereq") && Convert.ToBoolean(row["has_prereq"]),
                ConflictingClass = row.Table.Columns.Contains("conflicting_class") ? row["conflicting_class"]?.ToString() : null,
                MissingPrerequisite = row.Table.Columns.Contains("missing_prereq") ? row["missing_prereq"]?.ToString() : null
            };
        }

        // 3️⃣ CREATE ENROLLMENT
        public async Task<string> CreateEnrollmentAsync(
            string studentId, 
            string classId, 
            string? notes, 
            string createdBy)
        {
            string enrollmentId = $"ENR-{Guid.NewGuid()}";

            var parameters = new[]
            {
                new SqlParameter("@EnrollmentId", enrollmentId),
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ClassId", classId),
                new SqlParameter("@Notes", (object?)notes ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_CreateEnrollment", parameters);

            return enrollmentId;
        }

        // 4️⃣ DROP ENROLLMENT
        public async Task DropEnrollmentAsync(string enrollmentId, string reason, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@EnrollmentId", enrollmentId),
                new SqlParameter("@Reason", reason),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_DropEnrollment", parameters);
        }

        // 5️⃣ WITHDRAW ENROLLMENT
        public async Task WithdrawEnrollmentAsync(string enrollmentId, string reason, string withdrawnBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@EnrollmentId", enrollmentId),
                new SqlParameter("@Reason", reason),
                new SqlParameter("@WithdrawnBy", withdrawnBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_WithdrawEnrollment", parameters);
        }

        // 6️⃣ BULK ENROLLMENT
        public async Task<(int SuccessCount, int ErrorCount, string ErrorDetails)> BulkEnrollmentAsync(
            string studentId, 
            List<string> classIds, 
            string createdBy)
        {
            // Call SP for each classId and aggregate results
            int successCount = 0;
            int errorCount = 0;
            var errorDetails = new List<string>();

            foreach (var classId in classIds)
            {
                try
                {
                    await CreateEnrollmentAsync(studentId, classId, null, createdBy);
                    successCount++;
                }
                catch (Exception ex)
                {
                    errorCount++;
                    errorDetails.Add($"{classId}: {ex.Message}");
                }
            }

            return (successCount, errorCount, string.Join("; ", errorDetails));
        }

        // 7️⃣ GET STUDENT SCHEDULE
        public async Task<List<StudentScheduleDto>> GetStudentScheduleAsync(
            string studentId, 
            int semester, 
            string academicYearId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@Semester", semester),
                new SqlParameter("@AcademicYearId", academicYearId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetStudentSchedule", parameters);

            var schedule = new List<StudentScheduleDto>();
            foreach (DataRow row in dt.Rows)
            {
                schedule.Add(MapToStudentScheduleDto(row));
            }

            return schedule;
        }

        // 8️⃣ CHECK SCHEDULE CONFLICT
        public async Task<(bool HasConflict, string? ConflictDetails)> CheckScheduleConflictAsync(
            string studentId, 
            string classId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@NewClassId", classId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_CheckScheduleConflict", parameters);

            if (dt.Rows.Count == 0)
                return (false, null);

            var row = dt.Rows[0];
            bool hasConflict = Convert.ToBoolean(row["has_conflict"]);
            string? conflictDetails = row["conflict_details"]?.ToString();

            return (hasConflict, conflictDetails);
        }

        // 9️⃣ GET CLASS ROSTER
        public async Task<List<Student>> GetClassRosterAsync(string classId)
        {
            var parameters = new[]
            {
                new SqlParameter("@ClassId", classId)
            };

            // Stored procedure returns 2 result sets:
            // - Result set 1: Class info (1 row)
            // - Result set 2: Student roster (multiple rows)
            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(
                _connectionString, "sp_GetClassRoster", parameters);

            var students = new List<Student>();
            
            // Read result set 2 (student roster) - index 1
            if (ds.Tables.Count > 1 && ds.Tables[1] != null)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                {
                    students.Add(MapToStudentRoster(row));
                }
            }

            return students;
        }

        // 🔟 UPDATE ENROLLMENT STATUS
        public async Task UpdateEnrollmentStatusAsync(string enrollmentId, string newStatus, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@EnrollmentId", enrollmentId),
                new SqlParameter("@NewStatus", newStatus),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_UpdateEnrollmentStatus", parameters);
        }

        // 1️⃣1️⃣ GET ENROLLMENT STATISTICS
        public async Task<Dictionary<string, int>> GetEnrollmentStatisticsAsync(
            string academicYearId, 
            int semester)
        {
            var parameters = new[]
            {
                new SqlParameter("@AcademicYearId", academicYearId),
                new SqlParameter("@Semester", semester)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetEnrollmentStatistics", parameters);

            var stats = new Dictionary<string, int>();
            if (dt.Rows.Count > 0)
            {
                var row = dt.Rows[0];
                foreach (DataColumn col in dt.Columns)
                {
                    stats[col.ColumnName] = Convert.ToInt32(row[col]);
                }
            }

            return stats;
        }

        // 1️⃣2️⃣ GET ENROLLMENTS BY STUDENT (with details)
        public async Task<List<EnrollmentDetailDto>> GetEnrollmentsByStudentDetailedAsync(
            string studentId, 
            string? academicYearId = null, 
            int? semester = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@AcademicYearId", (object?)academicYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetEnrollmentsByStudent", parameters);

            var enrollments = new List<EnrollmentDetailDto>();
            foreach (DataRow row in dt.Rows)
            {
                enrollments.Add(MapToEnrollmentDetailDto(row));
            }

            return enrollments;
        }

        // 1️⃣3️⃣ GET PENDING ENROLLMENTS (For Advisor Approval)
        public async Task<(List<EnrollmentDetailDto> Enrollments, int TotalCount)> GetPendingEnrollmentsAsync(
            string? studentId = null,
            string? classId = null,
            string? subjectId = null,
            string? schoolYearId = null,
            int? semester = null,
            int page = 1,
            int pageSize = 50)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", (object?)studentId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                new SqlParameter("@SubjectId", (object?)subjectId ?? DBNull.Value),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value),
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetPendingEnrollments", parameters);

            var enrollments = new List<EnrollmentDetailDto>();
            int totalCount = 0;

            foreach (DataRow row in dt.Rows)
            {
                enrollments.Add(MapToEnrollmentDetailDto(row));
                // Get total count from first row
                if (totalCount == 0 && row.Table.Columns.Contains("total_count"))
                {
                    totalCount = Convert.ToInt32(row["total_count"]);
                }
            }

            return (enrollments, totalCount);
        }

        // ============================================================
        // MAPPING HELPERS
        // ============================================================
        
        private static Enrollment MapToEnrollment(DataRow row)
        {
            return new Enrollment
            {
                EnrollmentId = row["enrollment_id"].ToString()!,
                StudentId = row["student_id"].ToString()!,
                ClassId = row["class_id"].ToString()!,
                EnrollmentDate = Convert.ToDateTime(row["enrollment_date"]),
                Status = row["status"]?.ToString() ?? "Active",
                DroppedDate = row["dropped_date"] == DBNull.Value ? null : Convert.ToDateTime(row["dropped_date"]),
                DroppedReason = row["dropped_reason"]?.ToString(),
                EnrollmentStatus = row.Table.Columns.Contains("enrollment_status") ? row["enrollment_status"]?.ToString() ?? "APPROVED" : "APPROVED",
                DropDeadline = row.Table.Columns.Contains("drop_deadline") && row["drop_deadline"] != DBNull.Value 
                    ? Convert.ToDateTime(row["drop_deadline"]) : null,
                Notes = row.Table.Columns.Contains("notes") ? row["notes"]?.ToString() : null,
                CreatedAt = row["created_at"] == DBNull.Value ? DateTime.Now : Convert.ToDateTime(row["created_at"]),
                CreatedBy = row["created_by"]?.ToString(),
                UpdatedAt = row["updated_at"] == DBNull.Value ? null : Convert.ToDateTime(row["updated_at"]),
                UpdatedBy = row["updated_by"]?.ToString()
            };
        }

        private static AvailableClassDto MapToAvailableClassDto(DataRow row)
        {
            return new AvailableClassDto
            {
                ClassId = row["class_id"].ToString()!,
                ClassCode = row["class_code"].ToString()!,
                ClassName = row["class_name"].ToString()!,
                SubjectId = row["subject_id"].ToString()!,
                SubjectCode = row["subject_code"].ToString()!,
                SubjectName = row["subject_name"].ToString()!,
                Credits = Convert.ToInt32(row["credits"]),
                LecturerId = row["lecturer_id"]?.ToString(),
                LecturerName = row["lecturer_name"]?.ToString(),
                Schedule = row["schedule"]?.ToString(),
                Room = row["room"]?.ToString(),
                MaxStudents = Convert.ToInt32(row["max_students"]),
                CurrentEnrollment = Convert.ToInt32(row["current_enrollment"]),
                IsEligible = row.Table.Columns.Contains("is_eligible") && Convert.ToBoolean(row["is_eligible"]),
                IneligibleReason = row.Table.Columns.Contains("ineligible_reason") ? row["ineligible_reason"]?.ToString() : null,
                IsAlreadyEnrolled = row.Table.Columns.Contains("is_already_enrolled") && Convert.ToBoolean(row["is_already_enrolled"]),
                HasScheduleConflict = row.Table.Columns.Contains("has_schedule_conflict") && Convert.ToBoolean(row["has_schedule_conflict"]),
                MissingPrerequisites = row.Table.Columns.Contains("missing_prerequisites") && Convert.ToBoolean(row["missing_prerequisites"]),
                ConflictingClassName = row.Table.Columns.Contains("conflicting_class_name") ? row["conflicting_class_name"]?.ToString() : null
            };
        }

        private static StudentScheduleDto MapToStudentScheduleDto(DataRow row)
        {
            return new StudentScheduleDto
            {
                ClassId = row["class_id"].ToString()!,
                ClassCode = row["class_code"].ToString()!,
                ClassName = row["class_name"].ToString()!,
                SubjectCode = row["subject_code"].ToString()!,
                SubjectName = row["subject_name"].ToString()!,
                Credits = Convert.ToInt32(row["credits"]),
                LecturerName = row["lecturer_name"]?.ToString(),
                DayOfWeek = Convert.ToInt32(row["day_of_week"]),
                StartTime = TimeSpan.Parse(row["start_time"].ToString()!),
                EndTime = TimeSpan.Parse(row["end_time"].ToString()!),
                Room = row["room"]?.ToString(),
                Building = row.Table.Columns.Contains("building") ? row["building"]?.ToString() : null,
                Color = row.Table.Columns.Contains("color") ? row["color"]?.ToString() : null
            };
        }

        private static EnrollmentDetailDto MapToEnrollmentDetailDto(DataRow row)
        {
            return new EnrollmentDetailDto
            {
                EnrollmentId = row["enrollment_id"].ToString()!,
                StudentId = row["student_id"].ToString()!,
                StudentCode = row.Table.Columns.Contains("student_code") ? row["student_code"]?.ToString() : null,
                StudentName = row.Table.Columns.Contains("student_name") ? row["student_name"]?.ToString() : null,
                ClassId = row["class_id"].ToString()!,
                ClassCode = row.Table.Columns.Contains("class_code") ? row["class_code"]?.ToString() : null,
                ClassName = row.Table.Columns.Contains("class_name") ? row["class_name"]?.ToString() : null,
                SubjectId = row.Table.Columns.Contains("subject_id") ? row["subject_id"]?.ToString() : null,
                SubjectCode = row.Table.Columns.Contains("subject_code") ? row["subject_code"]?.ToString() : null,
                SubjectName = row.Table.Columns.Contains("subject_name") ? row["subject_name"]?.ToString() : null,
                Credits = row.Table.Columns.Contains("credits") && row["credits"] != DBNull.Value ? Convert.ToInt32(row["credits"]) : null,
                LecturerName = row.Table.Columns.Contains("lecturer_name") ? row["lecturer_name"]?.ToString() : null,
                Schedule = row.Table.Columns.Contains("schedule") ? row["schedule"]?.ToString() : null,
                Room = row.Table.Columns.Contains("room") ? row["room"]?.ToString() : null,
                EnrollmentDate = Convert.ToDateTime(row["enrollment_date"]),
                EnrollmentStatus = row.Table.Columns.Contains("enrollment_status") ? (row["enrollment_status"]?.ToString() ?? "APPROVED") : "APPROVED",
                DropDeadline = row.Table.Columns.Contains("drop_deadline") && row["drop_deadline"] != DBNull.Value ? Convert.ToDateTime(row["drop_deadline"]) : null,
                Notes = row.Table.Columns.Contains("notes") ? row["notes"]?.ToString() : null,
                DropReason = row.Table.Columns.Contains("drop_reason") ? row["drop_reason"]?.ToString() : null
            };
        }

        private static Student MapToStudentRoster(DataRow row)
        {
            return new Student
            {
                StudentId = row["student_id"].ToString()!,
                StudentCode = row["student_code"].ToString()!,
                FullName = row["full_name"].ToString()!,
                Email = row["email"]?.ToString(),
                Phone = row.Table.Columns.Contains("phone_number") ? row["phone_number"]?.ToString() : 
                        (row.Table.Columns.Contains("phone") ? row["phone"]?.ToString() : null),
                Gender = row.Table.Columns.Contains("gender") ? row["gender"]?.ToString() : null,
                AdminClassName = row.Table.Columns.Contains("admin_class_name") ? row["admin_class_name"]?.ToString() : null,
                AdminClassCode = row.Table.Columns.Contains("admin_class_code") ? row["admin_class_code"]?.ToString() : null
            };
        }
    }
}

