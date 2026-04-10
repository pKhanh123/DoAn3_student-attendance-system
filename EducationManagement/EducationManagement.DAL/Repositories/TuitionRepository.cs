using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace EducationManagement.DAL.Repositories
{
    public class TuitionRepository
    {
        private readonly string _connectionString;

        public TuitionRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<string> CreateFeeConfigAsync(string academicYearId, decimal feePerCredit, DateTime effectiveFrom, DateTime? effectiveTo, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@ConfigId", SqlDbType.VarChar, 50) { Direction = ParameterDirection.Output },
                new SqlParameter("@AcademicYearId", academicYearId),
                new SqlParameter("@FeePerCredit", feePerCredit),
                new SqlParameter("@EffectiveFrom", effectiveFrom),
                new SqlParameter("@EffectiveTo", (object?)effectiveTo ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateTuitionFeeConfig", parameters);
            return parameters[0].Value?.ToString() ?? string.Empty;
        }

        public async Task<DataTable> GetFeeConfigAsync(string academicYearId, DateTime? effectiveDate = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@AcademicYearId", academicYearId),
                new SqlParameter("@EffectiveDate", (object?)effectiveDate ?? DBNull.Value)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetTuitionFeeConfig", parameters);
        }

        public async Task<DataTable> CalculateTuitionAsync(string studentId, string schoolYearId, int semester)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", schoolYearId),
                new SqlParameter("@Semester", semester),
                new SqlParameter("@TotalCredits", SqlDbType.Int) { Direction = ParameterDirection.Output },
                new SqlParameter("@FeePerCredit", SqlDbType.Decimal) { Direction = ParameterDirection.Output },
                new SqlParameter("@TotalAmount", SqlDbType.Decimal) { Direction = ParameterDirection.Output }
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CalculateStudentTuition", parameters);
        }

        public async Task<string> CreateInvoiceAsync(string studentId, string schoolYearId, int semester, DateTime dueDate, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@InvoiceId", SqlDbType.VarChar, 50) { Direction = ParameterDirection.Output },
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", schoolYearId),
                new SqlParameter("@Semester", semester),
                new SqlParameter("@DueDate", dueDate),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateInvoice", parameters);
            return parameters[0].Value?.ToString() ?? string.Empty;
        }

        public async Task<DataTable> GetInvoicesByStudentAsync(string studentId, string? status = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@Status", (object?)status ?? DBNull.Value)
            };

            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetInvoicesByStudent", parameters);
        }

        public async Task<string> CreatePaymentAsync(string invoiceId, string studentId, decimal amount, string paymentMethod, string? transactionRef, string? note, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@PaymentId", SqlDbType.VarChar, 50) { Direction = ParameterDirection.Output },
                new SqlParameter("@InvoiceId", invoiceId),
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@Amount", amount),
                new SqlParameter("@PaymentMethod", paymentMethod),
                new SqlParameter("@TransactionRef", (object?)transactionRef ?? DBNull.Value),
                new SqlParameter("@Note", (object?)note ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreatePayment", parameters);
            return parameters[0].Value?.ToString() ?? string.Empty;
        }

        public async Task<DataTable> GetPaymentHistoryAsync(string studentId)
        {
            var parameters = new[] { new SqlParameter("@StudentId", studentId) };
            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetPaymentHistoryByStudent", parameters);
        }

        public async Task<DataTable> GetUnpaidInvoicesAsync()
        {
            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetUnpaidInvoices", Array.Empty<SqlParameter>());
        }

        public async Task<DataTable> CheckStudentDebtAsync(string studentId)
        {
            var parameters = new[] { new SqlParameter("@StudentId", studentId) };
            return await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckStudentDebt", parameters);
        }
    }
}
