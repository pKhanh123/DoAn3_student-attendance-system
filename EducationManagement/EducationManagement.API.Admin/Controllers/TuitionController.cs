using EducationManagement.BLL.Services;
using EducationManagement.API.Admin.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/tuition")]
    public class TuitionController : BaseController
    {
        private readonly TuitionService _service;

        public TuitionController(TuitionService service, AuditLogService auditLogService)
            : base(auditLogService)
        {
            _service = service;
        }

        [HttpPost("fee-configs")]
        [RequirePermission("ADMIN_TUITION")]
        public async Task<IActionResult> CreateFeeConfig([FromBody] CreateFeeConfigRequest request)
        {
            try
            {
                var createdBy = GetCurrentUserId() ?? "system";
                var configId = await _service.CreateFeeConfigAsync(
                    request.AcademicYearId, request.FeePerCredit, request.EffectiveFrom, request.EffectiveTo, createdBy);

                await LogCreateAsync("TuitionFeeConfig", configId, new { request.AcademicYearId, request.FeePerCredit });

                return Ok(new { success = true, message = "Tạo cấu hình học phí thành công", configId });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("fee-configs/{academicYearId}")]
        [RequireAnyPermission("ADMIN_TUITION", "STUDENT_TUITION")]
        public async Task<IActionResult> GetFeeConfig(string academicYearId)
        {
            try
            {
                var dt = await _service.GetFeeConfigAsync(academicYearId);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("calculate/{studentId}")]
        [RequireAnyPermission("ADMIN_TUITION", "STUDENT_TUITION")]
        public async Task<IActionResult> CalculateTuition(string studentId, [FromQuery] string schoolYearId, [FromQuery] int semester)
        {
            try
            {
                var dt = await _service.CalculateTuitionAsync(studentId, schoolYearId, semester);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data = data.Count > 0 ? data[0] : null });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPost("invoices")]
        [RequirePermission("ADMIN_TUITION")]
        public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
        {
            try
            {
                var createdBy = GetCurrentUserId() ?? "system";
                var invoiceId = await _service.CreateInvoiceAsync(
                    request.StudentId, request.SchoolYearId, request.Semester, request.DueDate, createdBy);

                await LogCreateAsync("Invoice", invoiceId, new { request.StudentId, request.SchoolYearId, request.Semester });

                return Ok(new { success = true, message = "Tạo hóa đơn thành công", invoiceId });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("invoices/student/{studentId}")]
        [RequireAnyPermission("ADMIN_TUITION", "STUDENT_TUITION")]
        public async Task<IActionResult> GetInvoicesByStudent(string studentId, [FromQuery] string? status = null)
        {
            try
            {
                var dt = await _service.GetInvoicesByStudentAsync(studentId, status);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data, totalCount = data.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpPost("payments")]
        [RequireAnyPermission("ADMIN_TUITION", "STUDENT_TUITION")]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
        {
            try
            {
                var createdBy = GetCurrentUserId() ?? "system";
                var paymentId = await _service.CreatePaymentAsync(
                    request.InvoiceId, request.StudentId, request.Amount, request.PaymentMethod,
                    request.TransactionRef, request.Note, createdBy);

                await LogCreateAsync("Payment", paymentId, new { request.InvoiceId, request.Amount, request.PaymentMethod });

                return Ok(new { success = true, message = "Ghi nhận thanh toán thành công", paymentId });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("payments/student/{studentId}")]
        [RequireAnyPermission("ADMIN_TUITION", "STUDENT_TUITION")]
        public async Task<IActionResult> GetPaymentHistory(string studentId)
        {
            try
            {
                var dt = await _service.GetPaymentHistoryAsync(studentId);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("unpaid-invoices")]
        [RequirePermission("ADMIN_TUITION")]
        public async Task<IActionResult> GetUnpaidInvoices()
        {
            try
            {
                var dt = await _service.GetUnpaidInvoicesAsync();
                var data = DataTableToList(dt);
                return Ok(new { success = true, data, totalCount = data.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("check-debt/{studentId}")]
        [RequireAnyPermission("ADMIN_TUITION", "ADMIN_ENROLLMENTS", "STUDENT_TUITION")]
        public async Task<IActionResult> CheckDebt(string studentId)
        {
            try
            {
                var dt = await _service.CheckStudentDebtAsync(studentId);
                var data = DataTableToList(dt);
                return Ok(new { success = true, data = data.Count > 0 ? data[0] : null });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        private static System.Collections.Generic.List<System.Collections.Generic.Dictionary<string, object?>> DataTableToList(DataTable dt)
        {
            var list = new System.Collections.Generic.List<System.Collections.Generic.Dictionary<string, object?>>();
            foreach (DataRow row in dt.Rows)
            {
                var dict = new System.Collections.Generic.Dictionary<string, object?>();
                foreach (DataColumn col in dt.Columns)
                {
                    dict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                }
                list.Add(dict);
            }
            return list;
        }
    }

    public class CreateFeeConfigRequest
    {
        public string AcademicYearId { get; set; } = string.Empty;
        public decimal FeePerCredit { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class CreateInvoiceRequest
    {
        public string StudentId { get; set; } = string.Empty;
        public string SchoolYearId { get; set; } = string.Empty;
        public int Semester { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class CreatePaymentRequest
    {
        public string InvoiceId { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? TransactionRef { get; set; }
        public string? Note { get; set; }
    }
}
