using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Exam;

namespace EducationManagement.DAL.Repositories
{
    public class ExamAssignmentRepository
    {
        private readonly string _connectionString;

        public ExamAssignmentRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH SINH VIÊN TRONG CA THI
        // ============================================================
        public async Task<List<ExamAssignment>> GetByExamAsync(string examId)
        {
            var param = new SqlParameter("@ExamId", examId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetExamAssignmentsByExam", param);

            var assignments = new List<ExamAssignment>();
            foreach (DataRow row in dt.Rows)
            {
                assignments.Add(MapToExamAssignment(row));
            }

            return assignments;
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH LỊCH THI CỦA SINH VIÊN
        // ============================================================
        public async Task<List<ExamAssignment>> GetByStudentAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", DBNull.Value),
                new SqlParameter("@Semester", DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetStudentExams", parameters);

            var assignments = new List<ExamAssignment>();
            foreach (DataRow row in dt.Rows)
            {
                // sp_GetStudentExams trả về thông tin exam + assignment
                var assignment = new ExamAssignment
                {
                    AssignmentId = row.Table.Columns.Contains("assignment_id") && row["assignment_id"] != DBNull.Value
                        ? row["assignment_id"]?.ToString() ?? string.Empty
                        : string.Empty,
                    ExamId = row["exam_id"]?.ToString() ?? string.Empty,
                    StudentId = studentId,
                    SeatNumber = row.Table.Columns.Contains("seat_number") && row["seat_number"] != DBNull.Value
                        ? Convert.ToInt32(row["seat_number"])
                        : null,
                    Status = row.Table.Columns.Contains("assignment_status") && row["assignment_status"] != DBNull.Value
                        ? row["assignment_status"]?.ToString() ?? "ASSIGNED"
                        : "ASSIGNED",
                    StudentCode = row.Table.Columns.Contains("student_code") && row["student_code"] != DBNull.Value
                        ? row["student_code"]?.ToString()
                        : null,
                    StudentName = row.Table.Columns.Contains("student_name") && row["student_name"] != DBNull.Value
                        ? row["student_name"]?.ToString()
                        : null
                };

                assignments.Add(assignment);
            }

            return assignments;
        }

        // ============================================================
        // 🔹 TẠO PHÂN SINH VIÊN VÀO CA THI
        // ============================================================
        public async Task<string> CreateAsync(ExamAssignment assignment)
        {
            var assignmentId = assignment.AssignmentId;
            if (string.IsNullOrWhiteSpace(assignmentId))
            {
                assignmentId = $"EA-{Guid.NewGuid()}";
            }

            var parameters = new[]
            {
                new SqlParameter("@AssignmentId", assignmentId),
                new SqlParameter("@ExamId", assignment.ExamId),
                new SqlParameter("@EnrollmentId", assignment.EnrollmentId),
                new SqlParameter("@StudentId", assignment.StudentId),
                new SqlParameter("@SeatNumber", (object?)assignment.SeatNumber ?? DBNull.Value),
                new SqlParameter("@Status", assignment.Status),
                new SqlParameter("@Notes", (object?)assignment.Notes ?? DBNull.Value),
                new SqlParameter("@CreatedBy", (object?)assignment.CreatedBy ?? "system")
            };

            // Note: Cần tạo stored procedure sp_CreateExamAssignment
            // Tạm thời dùng raw SQL hoặc tạo SP sau
            var sql = @"
                INSERT INTO dbo.exam_assignments 
                (assignment_id, exam_id, enrollment_id, student_id, seat_number, status, notes, created_at, created_by)
                VALUES 
                (@AssignmentId, @ExamId, @EnrollmentId, @StudentId, @SeatNumber, @Status, @Notes, GETDATE(), @CreatedBy)";

            await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, sql, parameters);

            return assignmentId;
        }

        // ============================================================
        // 🔹 XÓA PHÂN SINH VIÊN KHỎI CA THI (SOFT DELETE)
        // ============================================================
        public async Task DeleteAsync(string assignmentId, string deletedBy)
        {
            var sql = @"
                UPDATE dbo.exam_assignments
                SET deleted_at = GETDATE(), deleted_by = @DeletedBy
                WHERE assignment_id = @AssignmentId AND deleted_at IS NULL";

            var parameters = new[]
            {
                new SqlParameter("@AssignmentId", assignmentId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, sql, parameters);
        }

        // ============================================================
        // 🔹 KIỂM TRA ĐIỀU KIỆN DỰ THI CỦA SINH VIÊN
        // ============================================================
        public async Task<bool> CheckStudentQualificationAsync(string studentId, string classId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ClassId", classId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckStudentQualification", parameters);

            if (dt.Rows.Count > 0 && dt.Rows[0]["is_qualified"] != DBNull.Value)
            {
                return Convert.ToBoolean(dt.Rows[0]["is_qualified"]);
            }

            return true; // Default: qualified
        }

        // ============================================================
        // 🔹 MAP DATA ROW TO EXAMASSIGNMENT MODEL
        // ============================================================
        private static ExamAssignment MapToExamAssignment(DataRow row)
        {
            return new ExamAssignment
            {
                AssignmentId = row["assignment_id"]?.ToString() ?? string.Empty,
                ExamId = row["exam_id"]?.ToString() ?? string.Empty,
                EnrollmentId = row["enrollment_id"]?.ToString() ?? string.Empty,
                StudentId = row["student_id"]?.ToString() ?? string.Empty,
                SeatNumber = row.Table.Columns.Contains("seat_number") && row["seat_number"] != DBNull.Value
                    ? Convert.ToInt32(row["seat_number"])
                    : null,
                Status = row.Table.Columns.Contains("status") && row["status"] != DBNull.Value
                    ? row["status"]?.ToString() ?? "ASSIGNED"
                    : "ASSIGNED",
                Notes = row.Table.Columns.Contains("notes") && row["notes"] != DBNull.Value
                    ? row["notes"]?.ToString()
                    : null,
                StudentCode = row.Table.Columns.Contains("student_code") && row["student_code"] != DBNull.Value
                    ? row["student_code"]?.ToString()
                    : null,
                StudentName = row.Table.Columns.Contains("student_name") && row["student_name"] != DBNull.Value
                    ? row["student_name"]?.ToString()
                    : null,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["created_at"])
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") && row["created_by"] != DBNull.Value
                    ? row["created_by"]?.ToString()
                    : null
            };
        }
    }
}

