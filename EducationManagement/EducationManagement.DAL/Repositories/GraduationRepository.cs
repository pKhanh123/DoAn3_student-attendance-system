using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace EducationManagement.DAL.Repositories
{
    public class GraduationRepository
    {
        private readonly string _connectionString;

        public GraduationRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<string> CreateRequirementAsync(string majorId, int requiredCredits, decimal minGpa, string createdBy)
        {
            var requirementId = "GR_" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
            var sql = @"
                INSERT INTO graduation_requirements (requirement_id, major_id, required_credits, minimum_gpa10, minimum_gpa4, is_active, created_by)
                VALUES (@RequirementId, @MajorId, @RequiredCredits, @MinGpa10, @MinGpa4, 1, @CreatedBy);";
            var parameters = new[]
            {
                new SqlParameter("@RequirementId", requirementId),
                new SqlParameter("@MajorId", majorId),
                new SqlParameter("@RequiredCredits", requiredCredits),
                new SqlParameter("@MinGpa10", minGpa),
                new SqlParameter("@MinGpa4", minGpa / 2.5m),
                new SqlParameter("@CreatedBy", createdBy)
            };
            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, sql, parameters);
            return requirementId;
        }

        public async Task<DataTable> GetRequirementByMajorAsync(string majorId)
        {
            Console.WriteLine($"[DEBUG] GetRequirementByMajorAsync called with majorId={majorId}, calling sp_GetGraduationConfigByMajor");
            var parameters = new[]
            {
                new SqlParameter("@MajorId", majorId)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGraduationConfigByMajor", parameters);
        }

        public async Task<DataTable> CheckEligibilityAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@AcademicYearId", DBNull.Value)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckGraduationEligibility", parameters);
        }

        public async Task<string> CreateApplicationAsync(string studentId, string schoolYearId, int semester, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@ApplicationId", SqlDbType.VarChar, 50) { Direction = ParameterDirection.Output },
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", schoolYearId),
                new SqlParameter("@Semester", semester),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateGraduationRequest", parameters);
            return parameters[0].Value?.ToString() ?? string.Empty;
        }

        public async Task<DataTable> GetApplicationsByStudentAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGraduationRequestsByStudent", parameters);
        }

        public async Task<DataTable> GetApplicationByIdAsync(string applicationId)
        {
            var sql = "SELECT * FROM graduation_requests WHERE request_id = @ApplicationId AND deleted_at IS NULL";
            var parameters = new[] { new SqlParameter("@ApplicationId", applicationId) };
            return await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, sql, parameters);
        }

        public async Task<DataTable> GetAllApplicationsAsync(string? academicYearId = null, int pageNumber = 1, int pageSize = 20)
        {
            var parameters = new[]
            {
                new SqlParameter("@AcademicYearId", (object?)academicYearId ?? DBNull.Value)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGraduationCandidateList", parameters);
        }

        public async Task UpdateApplicationStatusAsync(string applicationId, string status, string? verifiedBy, string? approvedBy, string? note)
        {
            var parameters = new[]
            {
                new SqlParameter("@ApplicationId", applicationId),
                new SqlParameter("@Status", status),
                new SqlParameter("@VerifiedBy", (object?)verifiedBy ?? DBNull.Value),
                new SqlParameter("@ApprovedBy", (object?)approvedBy ?? DBNull.Value),
                new SqlParameter("@Note", (object?)note ?? DBNull.Value)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateGraduationStatus", parameters);
        }

        public async Task IssueDiplomaAsync(string applicationId, string diplomaNumber, DateTime issueDate, string issuedBy)
        {
            var sql = @"UPDATE graduation_requests
                       SET diploma_number = @DiplomaNumber,
                           issue_date = @IssueDate,
                           updated_by = @IssuedBy,
                           updated_at = GETDATE()
                       WHERE request_id = @ApplicationId";
            var parameters = new[]
            {
                new SqlParameter("@ApplicationId", applicationId),
                new SqlParameter("@DiplomaNumber", diplomaNumber),
                new SqlParameter("@IssueDate", issueDate),
                new SqlParameter("@IssuedBy", issuedBy)
            };
            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, sql, parameters);
        }
    }
}
