using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class GradeAppealRepository
    {
        private readonly string _connectionString;

        public GradeAppealRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<string> CreateAsync(string appealId, string gradeId, string enrollmentId, 
            string studentId, string classId, string appealReason, decimal? currentScore, 
            decimal? expectedScore, string? componentType, string createdBy)
        {
            try
            {
                Console.WriteLine($"[GradeAppealRepository] CreateAsync - Starting with appealId: {appealId}");
                Console.WriteLine($"[GradeAppealRepository] Parameters: gradeId={gradeId}, enrollmentId={enrollmentId}, studentId={studentId}, classId={classId}, componentType={componentType}");
                
                var parameters = new[]
                {
                    new SqlParameter("@AppealId", appealId),
                    new SqlParameter("@GradeId", gradeId),
                    new SqlParameter("@EnrollmentId", enrollmentId),
                    new SqlParameter("@StudentId", studentId),
                    new SqlParameter("@ClassId", classId),
                    new SqlParameter("@AppealReason", appealReason),
                    new SqlParameter("@CurrentScore", (object?)currentScore ?? DBNull.Value),
                    new SqlParameter("@ExpectedScore", (object?)expectedScore ?? DBNull.Value),
                    new SqlParameter("@ComponentType", (object?)componentType ?? DBNull.Value),
                    new SqlParameter("@CreatedBy", createdBy)
                };

                Console.WriteLine($"[GradeAppealRepository] Calling sp_CreateGradeAppeal...");
                var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CreateGradeAppeal", parameters);
                Console.WriteLine($"[GradeAppealRepository] sp_CreateGradeAppeal completed successfully. Result: {result}");
                return result?.ToString() ?? appealId;
            }
            catch (Microsoft.Data.SqlClient.SqlException sqlEx)
            {
                Console.WriteLine($"[GradeAppealRepository] ❌ SQL Exception in CreateAsync:");
                Console.WriteLine($"   Error Number: {sqlEx.Number}");
                Console.WriteLine($"   Error Message: {sqlEx.Message}");
                Console.WriteLine($"   Error Source: {sqlEx.Source}");
                Console.WriteLine($"   Procedure: {sqlEx.Procedure}");
                Console.WriteLine($"   Line Number: {sqlEx.LineNumber}");
                Console.WriteLine($"   Stack Trace: {sqlEx.StackTrace}");
                if (sqlEx.InnerException != null)
                {
                    Console.WriteLine($"   Inner Exception: {sqlEx.InnerException.Message}");
                }
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GradeAppealRepository] ❌ General Exception in CreateAsync:");
                Console.WriteLine($"   Error Message: {ex.Message}");
                Console.WriteLine($"   Error Source: {ex.Source}");
                Console.WriteLine($"   Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"   Inner Exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        public async Task<GradeAppeal?> GetByIdAsync(string appealId)
        {
            var param = new SqlParameter("@AppealId", appealId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGradeAppealById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToGradeAppealWithDetails(dt.Rows[0]);
        }

        public async Task<(List<GradeAppeal> Appeals, int TotalCount)> GetAllAsync(int page = 1, int pageSize = 20,
            string? status = null, string? studentId = null, string? lecturerId = null, 
            string? advisorId = null, string? classId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Status", (object?)status ?? DBNull.Value),
                new SqlParameter("@StudentId", (object?)studentId ?? DBNull.Value),
                new SqlParameter("@LecturerId", (object?)lecturerId ?? DBNull.Value),
                new SqlParameter("@AdvisorId", (object?)advisorId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAllGradeAppeals", parameters);

            var appeals = new List<GradeAppeal>();
            int totalCount = 0;

            // First result set is total count
            if (dt.Rows.Count > 0 && dt.Rows[0].Table.Columns.Contains("total_count"))
            {
                totalCount = Convert.ToInt32(dt.Rows[0]["total_count"]);
            }

            // Second result set is the data (if exists, otherwise use same DataTable)
            DataTable dataTable = dt;
            if (dt.DataSet != null && dt.DataSet.Tables.Count > 1)
            {
                dataTable = dt.DataSet.Tables[1];
            }

            foreach (DataRow row in dataTable.Rows)
            {
                if (row.Table.Columns.Contains("appeal_id"))
                {
                    appeals.Add(MapToGradeAppealWithDetails(row));
                }
            }

            return (appeals, totalCount);
        }

        public async Task UpdateLecturerResponseAsync(string appealId, string lecturerId, 
            string? lecturerResponse, string lecturerDecision, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AppealId", appealId),
                new SqlParameter("@LecturerId", lecturerId),
                new SqlParameter("@LecturerResponse", (object?)lecturerResponse ?? DBNull.Value),
                new SqlParameter("@LecturerDecision", lecturerDecision),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateGradeAppealLecturer", parameters);
        }

        public async Task UpdateAdvisorDecisionAsync(string appealId, string advisorId, 
            string? advisorResponse, string advisorDecision, decimal? finalScore, 
            string? resolutionNotes, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AppealId", appealId),
                new SqlParameter("@AdvisorId", advisorId),
                new SqlParameter("@AdvisorResponse", (object?)advisorResponse ?? DBNull.Value),
                new SqlParameter("@AdvisorDecision", advisorDecision),
                new SqlParameter("@FinalScore", (object?)finalScore ?? DBNull.Value),
                new SqlParameter("@ResolutionNotes", (object?)resolutionNotes ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateGradeAppealAdvisor", parameters);
        }

        public async Task CancelAsync(string appealId, string cancelledBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AppealId", appealId),
                new SqlParameter("@CancelledBy", cancelledBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CancelGradeAppeal", parameters);
        }

        private GradeAppeal MapToGradeAppealWithDetails(DataRow row)
        {
            var appeal = new GradeAppeal
            {
                AppealId = row["appeal_id"]?.ToString() ?? string.Empty,
                GradeId = row["grade_id"]?.ToString() ?? string.Empty,
                EnrollmentId = row["enrollment_id"]?.ToString() ?? string.Empty,
                StudentId = row["student_id"]?.ToString() ?? string.Empty,
                ClassId = row["class_id"]?.ToString() ?? string.Empty,
                AppealReason = row["appeal_reason"]?.ToString() ?? string.Empty,
                CurrentScore = row.Table.Columns.Contains("current_score") && row["current_score"] != DBNull.Value
                    ? Convert.ToDecimal(row["current_score"]) : null,
                ExpectedScore = row.Table.Columns.Contains("expected_score") && row["expected_score"] != DBNull.Value
                    ? Convert.ToDecimal(row["expected_score"]) : null,
                ComponentType = row.Table.Columns.Contains("component_type") ? row["component_type"]?.ToString() : null,
                Status = row["status"]?.ToString() ?? "PENDING",
                LecturerResponse = row["lecturer_response"]?.ToString(),
                LecturerId = row["lecturer_id"]?.ToString(),
                LecturerDecision = row["lecturer_decision"]?.ToString(),
                AdvisorId = row["advisor_id"]?.ToString(),
                AdvisorResponse = row["advisor_response"]?.ToString(),
                AdvisorDecision = row["advisor_decision"]?.ToString(),
                FinalScore = row.Table.Columns.Contains("final_score") && row["final_score"] != DBNull.Value
                    ? Convert.ToDecimal(row["final_score"]) : null,
                ResolutionNotes = row["resolution_notes"]?.ToString(),
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["created_at"]) : DateTime.Now,
                CreatedBy = row["created_by"]?.ToString(),
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["updated_at"]) : null,
                UpdatedBy = row["updated_by"]?.ToString(),
                ResolvedAt = row.Table.Columns.Contains("resolved_at") && row["resolved_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["resolved_at"]) : null,
                ResolvedBy = row["resolved_by"]?.ToString(),
                DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["deleted_at"]) : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") ? row["deleted_by"]?.ToString() : null
            };

            // Additional info from joins
            if (row.Table.Columns.Contains("student_code"))
                appeal.StudentCode = row["student_code"]?.ToString();
            if (row.Table.Columns.Contains("student_name"))
                appeal.StudentName = row["student_name"]?.ToString();
            if (row.Table.Columns.Contains("student_email"))
                appeal.StudentEmail = row["student_email"]?.ToString();
            if (row.Table.Columns.Contains("student_user_id"))
                appeal.StudentUserId = row["student_user_id"]?.ToString();
            if (row.Table.Columns.Contains("class_code"))
                appeal.ClassCode = row["class_code"]?.ToString();
            if (row.Table.Columns.Contains("class_name"))
                appeal.ClassName = row["class_name"]?.ToString();
            if (row.Table.Columns.Contains("subject_name"))
                appeal.SubjectName = row["subject_name"]?.ToString();
            if (row.Table.Columns.Contains("subject_code"))
                appeal.SubjectCode = row["subject_code"]?.ToString();
            if (row.Table.Columns.Contains("midterm_score") && row["midterm_score"] != DBNull.Value)
                appeal.MidtermScore = Convert.ToDecimal(row["midterm_score"]);
            if (row.Table.Columns.Contains("grade_final_score") && row["grade_final_score"] != DBNull.Value)
                appeal.GradeFinalScore = Convert.ToDecimal(row["grade_final_score"]);
            if (row.Table.Columns.Contains("total_score") && row["total_score"] != DBNull.Value)
                appeal.TotalScore = Convert.ToDecimal(row["total_score"]);
            if (row.Table.Columns.Contains("letter_grade"))
                appeal.LetterGrade = row["letter_grade"]?.ToString();
            if (row.Table.Columns.Contains("lecturer_code"))
                appeal.LecturerCode = row["lecturer_code"]?.ToString();
            if (row.Table.Columns.Contains("lecturer_name"))
                appeal.LecturerName = row["lecturer_name"]?.ToString();
            if (row.Table.Columns.Contains("lecturer_email"))
                appeal.LecturerEmail = row["lecturer_email"]?.ToString();
            if (row.Table.Columns.Contains("advisor_code"))
                appeal.AdvisorCode = row["advisor_code"]?.ToString();
            if (row.Table.Columns.Contains("advisor_name"))
                appeal.AdvisorName = row["advisor_name"]?.ToString();
            if (row.Table.Columns.Contains("advisor_email"))
                appeal.AdvisorEmail = row["advisor_email"]?.ToString();
            if (row.Table.Columns.Contains("student_user_id"))
                appeal.StudentUserId = row["student_user_id"]?.ToString();
            if (row.Table.Columns.Contains("lecturer_user_id"))
                appeal.LecturerUserId = row["lecturer_user_id"]?.ToString();
            if (row.Table.Columns.Contains("advisor_user_id"))
                appeal.AdvisorUserId = row["advisor_user_id"]?.ToString();

            return appeal;
        }
    }
}

