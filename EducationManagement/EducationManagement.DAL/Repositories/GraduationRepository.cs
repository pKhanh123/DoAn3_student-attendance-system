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
            var parameters = new[]
            {
                new SqlParameter("@RequirementId", SqlDbType.VarChar, 50) { Direction = ParameterDirection.Output },
                new SqlParameter("@MajorId", majorId),
                new SqlParameter("@RequiredCredits", requiredCredits),
                new SqlParameter("@MinGpa", minGpa),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateGraduationRequirement", parameters);
            return parameters[0].Value?.ToString() ?? string.Empty;
        }

        public async Task<DataTable> GetRequirementByMajorAsync(string majorId)
        {
            var parameters = new[]
            {
                new SqlParameter("@MajorId", majorId)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGraduationRequirement", parameters);
        }

        public async Task<DataTable> CheckEligibilityAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@IsEligible", SqlDbType.Bit) { Direction = ParameterDirection.Output },
                new SqlParameter("@Reason", SqlDbType.NVarChar, 500) { Direction = ParameterDirection.Output }
            };

            var result = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckGraduationEligibility", parameters);
            return result;
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

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateGraduationApplication", parameters);
            return parameters[0].Value?.ToString() ?? string.Empty;
        }

        public async Task<DataTable> GetApplicationsByStudentAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGraduationApplicationsByStudent", parameters);
        }

        public async Task<DataTable> GetApplicationByIdAsync(string applicationId)
        {
            var parameters = new[]
            {
                new SqlParameter("@ApplicationId", applicationId)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGraduationApplicationById", parameters);
        }

        public async Task<DataTable> GetAllApplicationsAsync(string? status = null, int pageNumber = 1, int pageSize = 20)
        {
            var parameters = new[]
            {
                new SqlParameter("@Status", (object?)status ?? DBNull.Value),
                new SqlParameter("@PageNumber", pageNumber),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@TotalRecords", SqlDbType.Int) { Direction = ParameterDirection.Output }
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAllGraduationApplications", parameters);
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

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateGraduationApplicationStatus", parameters);
        }

        public async Task IssueDiplomaAsync(string applicationId, string diplomaNumber, DateTime issueDate, string issuedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@ApplicationId", applicationId),
                new SqlParameter("@DiplomaNumber", diplomaNumber),
                new SqlParameter("@IssueDate", issueDate),
                new SqlParameter("@IssuedBy", issuedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_IssueDiploma", parameters);
        }
    }
}
