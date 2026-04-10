using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class TuitionService
    {
        private readonly TuitionRepository _repository;

        public TuitionService(TuitionRepository repository)
        {
            _repository = repository;
        }

        public async Task<string> CreateFeeConfigAsync(string academicYearId, decimal feePerCredit, DateTime effectiveFrom, DateTime? effectiveTo, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(academicYearId))
                throw new ArgumentException("Academic Year ID không được để trống");

            if (feePerCredit <= 0)
                throw new ArgumentException("Đơn giá tín chỉ phải lớn hơn 0");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            return await _repository.CreateFeeConfigAsync(academicYearId, feePerCredit, effectiveFrom, effectiveTo, createdBy);
        }

        public async Task<DataTable> GetFeeConfigAsync(string academicYearId, DateTime? effectiveDate = null)
        {
            if (string.IsNullOrWhiteSpace(academicYearId))
                throw new ArgumentException("Academic Year ID không được để trống");

            return await _repository.GetFeeConfigAsync(academicYearId, effectiveDate);
        }

        public async Task<DataTable> CalculateTuitionAsync(string studentId, string schoolYearId, int semester)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(schoolYearId))
                throw new ArgumentException("School Year ID không được để trống");

            if (semester < 1 || semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");

            return await _repository.CalculateTuitionAsync(studentId, schoolYearId, semester);
        }

        public async Task<string> CreateInvoiceAsync(string studentId, string schoolYearId, int semester, DateTime dueDate, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(schoolYearId))
                throw new ArgumentException("School Year ID không được để trống");

            if (semester < 1 || semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            return await _repository.CreateInvoiceAsync(studentId, schoolYearId, semester, dueDate, createdBy);
        }

        public async Task<DataTable> GetInvoicesByStudentAsync(string studentId, string? status = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _repository.GetInvoicesByStudentAsync(studentId, status);
        }

        public async Task<string> CreatePaymentAsync(string invoiceId, string studentId, decimal amount, string paymentMethod, string? transactionRef, string? note, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(invoiceId))
                throw new ArgumentException("Invoice ID không được để trống");

            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (amount <= 0)
                throw new ArgumentException("Số tiền thanh toán phải lớn hơn 0");

            if (string.IsNullOrWhiteSpace(paymentMethod))
                throw new ArgumentException("Phương thức thanh toán không được để trống");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            return await _repository.CreatePaymentAsync(invoiceId, studentId, amount, paymentMethod, transactionRef, note, createdBy);
        }

        public async Task<DataTable> GetPaymentHistoryAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _repository.GetPaymentHistoryAsync(studentId);
        }

        public async Task<DataTable> GetUnpaidInvoicesAsync()
        {
            return await _repository.GetUnpaidInvoicesAsync();
        }

        public async Task<DataTable> CheckStudentDebtAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _repository.CheckStudentDebtAsync(studentId);
        }
    }
}
