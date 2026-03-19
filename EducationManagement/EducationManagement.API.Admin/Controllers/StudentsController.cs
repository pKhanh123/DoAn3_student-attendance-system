using EducationManagement.BLL.Services;
using EducationManagement.Common.DTOs.Student;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/students")]
    public class StudentsController : BaseController
    {
        private readonly IWebHostEnvironment _env;
        private readonly StudentService _studentService;
        private readonly StudentExcelService _excelService;

        public StudentsController(StudentService studentService, StudentExcelService excelService, IWebHostEnvironment env, AuditLogService auditLogService) 
            : base(auditLogService)
        {
            _studentService = studentService;
            _excelService = excelService;
            _env = env;
        }

        // ============================================================
        // 🔹 1️⃣ THÊM SINH VIÊN
        // ============================================================
        [HttpPost("addstudent")]
        public async Task<IActionResult> AddStudent([FromBody] StudentCreateDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _studentService.AddStudentAsync(model);
                
                // Lấy studentId sau khi tạo (từ StudentCode hoặc UserId)
                // Vì AddStudentAsync không trả về studentId, ta dùng StudentCode làm identifier
                var studentId = model.StudentCode;
                
                // ✅ Audit log: Tạo sinh viên mới
                await LogCreateAsync("Student", studentId, new
                {
                    student_code = model.StudentCode,
                    full_name = model.FullName,
                    email = model.Email,
                    major_id = model.MajorId,
                    academic_year_id = model.AcademicYearId,
                    action_description = $"Thêm sinh viên mới: {model.FullName} ({model.StudentCode})"
                });
                
                return Ok(new { success = true, message = "Thêm sinh viên thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        // ============================================================
        // 🔹 2️⃣ CẬP NHẬT SINH VIÊN
        // ============================================================
        [HttpPut("update")]
        public async Task<IActionResult> UpdateStudentFull([FromBody] UpdateStudentFullDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin cũ trước khi update
                var oldStudent = await _studentService.GetStudentByIdAsync(request.StudentId);
                
                await _studentService.UpdateStudentAsync(request);
                
                // ✅ Audit log: Cập nhật sinh viên
                await LogUpdateAsync("Student", request.StudentId, 
                    oldStudent != null ? new
                    {
                        full_name = oldStudent.FullName,
                        email = oldStudent.Email,
                        phone = oldStudent.Phone
                    } : null,
                    new
                    {
                        full_name = request.FullName,
                        email = request.Email,
                        phone = request.Phone,
                        action_description = $"Cập nhật thông tin sinh viên: {request.FullName} ({request.StudentId})"
                    });
                
                return Ok(new { message = "Cập nhật sinh viên (sp_UpdateStudentFull) thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 3️⃣ XOÁ SINH VIÊN (SOFT DELETE)
        // ============================================================
        [HttpDelete("delete")]
        public async Task<IActionResult> DeleteStudentFull([FromBody] DeleteStudentFullDto dto)
        {
            try
            {
                // Lấy thông tin sinh viên trước khi xóa
                var student = await _studentService.GetStudentByIdAsync(dto.StudentId);
                
                await _studentService.DeleteStudentAsync(dto.StudentId, dto.DeletedBy ?? GetCurrentUserId() ?? "system");
                
                // ✅ Audit log: Xóa sinh viên
                await LogDeleteAsync("Student", dto.StudentId, new
                {
                    student_code = student?.StudentCode,
                    full_name = student?.FullName,
                    deleted_by = dto.DeletedBy ?? GetCurrentUserId() ?? "system",
                    action_description = $"Xóa sinh viên: {student?.FullName} ({student?.StudentCode})"
                });
                
                return Ok(new { message = "Xóa sinh viên (sp_DeleteStudentFull) thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 4️⃣ LẤY DANH SÁCH SINH VIÊN (PHÂN TRANG + LỌC)
        // ============================================================
        [HttpGet]
        public async Task<IActionResult> GetAllStudents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? facultyId = null,
            [FromQuery] string? majorId = null,
            [FromQuery] string? academicYearId = null)
        {
            try
            {
                var (students, totalCount) = await _studentService.GetAllStudentsAsync(
                    page, pageSize, search, facultyId, majorId, academicYearId);

                return Ok(new
                {
                    data = students,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 5️⃣ LẤY SINH VIÊN THEO ID
        // ============================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetStudentById(string id)
        {
            try
            {
                var student = await _studentService.GetStudentByIdAsync(id);
                if (student == null)
                    return NotFound(new { message = "Không tìm thấy sinh viên" });

                return Ok(new { data = student });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 7️⃣ LẤY SINH VIÊN THEO USER ID
        // ============================================================
        [HttpGet("by-user-id/{userId}")]
        public async Task<IActionResult> GetStudentByUserId(string userId)
        {
            try
            {
                var student = await _studentService.GetStudentByUserIdAsync(userId);
                if (student == null)
                    return NotFound(new { message = "Không tìm thấy sinh viên" });

                return Ok(new { data = student });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 6️⃣ BATCH IMPORT STUDENTS (JSON)
        // ============================================================
        [HttpPost("import/batch")]
        public async Task<IActionResult> ImportStudentsBatch([FromBody] List<StudentImportDto> students)
        {
            Console.WriteLine($"[StudentsController] 📥 ImportStudentsBatch() - Nhận {students?.Count ?? 0} sinh viên để import");
            
            if (students == null || students.Count == 0)
            {
                Console.WriteLine("[StudentsController] ❌ Danh sách sinh viên rỗng");
                return BadRequest(new { success = false, message = "Không có dữ liệu để import" });
            }
            
            Console.WriteLine($"[StudentsController] 📊 Sample data (first 2):");
            foreach (var s in students.Take(2))
            {
                Console.WriteLine($"[StudentsController]    - StudentCode: '{s.StudentCode}', FullName: '{s.FullName}', Email: '{s.Email}', MajorId: '{s.MajorId}'");
            }

            try
            {
                Console.WriteLine($"[StudentsController] 🔄 Gọi _studentService.ImportStudentsBatchAsync()...");
                var result = await _studentService.ImportStudentsBatchAsync(students, User.Identity?.Name ?? "system");
                
                Console.WriteLine($"[StudentsController] ✅ Import hoàn tất: Success={result.SuccessCount}, Errors={result.ErrorCount}");
                if (result.Errors.Any())
                {
                    Console.WriteLine($"[StudentsController] ❌ Chi tiết lỗi ({result.Errors.Count} lỗi):");
                    foreach (var err in result.Errors.Take(10))
                    {
                        Console.WriteLine($"[StudentsController]    - Dòng {err.RowNumber} ({err.StudentCode}): {err.ErrorMessage}");
                    }
                }
                
                // ✅ Audit log: Import sinh viên
                await LogImportAsync("Student", new
                {
                    total_count = students.Count,
                    success_count = result.SuccessCount,
                    error_count = result.ErrorCount,
                    imported_by = User.Identity?.Name ?? GetCurrentUserId() ?? "system",
                    action_description = $"Nhập dữ liệu sinh viên: {result.SuccessCount}/{students.Count} thành công"
                });
                
                return Ok(new { 
                    success = true,
                    message = $"Import thành công {result.SuccessCount}/{students.Count} sinh viên",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = "Lỗi khi import: " + ex.Message 
                });
            }
        }

        // ============================================================
        // 🔹 7️⃣ TẢI MẪU IMPORT EXCEL
        // ============================================================
        [HttpGet("download-template")]
        public async Task<IActionResult> DownloadImportTemplate()
        {
            try
            {
                var fileBytes = await _excelService.GenerateImportTemplateAsync();
                var fileName = $"Mau_Import_Sinh_Vien_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                
                return File(fileBytes, 
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                    fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = "Lỗi khi tạo file mẫu: " + ex.Message 
                });
            }
        }

        // ============================================================
        // 🔹 8️⃣ IMPORT SINH VIÊN TỪ EXCEL
        // ============================================================
        [HttpPost("import/excel")]
        [RequestFormLimits(MultipartBodyLengthLimit = 10485760)] // 10MB
        [DisableRequestSizeLimit]
        public async Task<IActionResult> ImportFromExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { 
                    success = false, 
                    message = "Vui lòng chọn file Excel để import" 
                });

            // Kiểm tra định dạng file
            var allowedExtensions = new[] { ".xlsx", ".xls" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            if (string.IsNullOrEmpty(fileExtension) || !allowedExtensions.Contains(fileExtension))
                return BadRequest(new { 
                    success = false, 
                    message = "File phải có định dạng .xlsx hoặc .xls" 
                });

            // Giới hạn kích thước file (10MB)
            if (file.Length > 10 * 1024 * 1024)
                return BadRequest(new { 
                    success = false, 
                    message = "File không được vượt quá 10MB" 
                });

            try
            {
                Console.WriteLine($"[StudentsController] 📥 ImportFromExcel() - Nhận file: {file.FileName}, Size: {file.Length} bytes");
                System.Diagnostics.Debug.WriteLine($"📥 Nhận file import: {file.FileName}, Size: {file.Length} bytes");
                
                using var stream = file.OpenReadStream();
                Console.WriteLine($"[StudentsController] 🔄 Gọi _excelService.ImportFromExcelAsync()...");
                var result = await _excelService.ImportFromExcelAsync(stream, User.Identity?.Name ?? GetCurrentUserId() ?? "system");

                Console.WriteLine($"[StudentsController] ✅ Import hoàn tất: Success={result.SuccessCount}, Errors={result.ErrorCount}");
                if (result.Errors.Any())
                {
                    Console.WriteLine($"[StudentsController] ❌ Chi tiết lỗi ({result.Errors.Count} lỗi):");
                    foreach (var err in result.Errors.Take(10)) // Log first 10 errors
                    {
                        Console.WriteLine($"[StudentsController]    - Dòng {err.RowNumber} ({err.StudentCode}): {err.ErrorMessage}");
                    }
                }
                System.Diagnostics.Debug.WriteLine($"✅ Import hoàn tất: Success={result.SuccessCount}, Errors={result.ErrorCount}");

                // ✅ Audit log: Import từ Excel
                await LogImportAsync("Student", new
                {
                    file_name = file.FileName,
                    file_size = file.Length,
                    total_count = result.SuccessCount + result.ErrorCount,
                    success_count = result.SuccessCount,
                    error_count = result.ErrorCount,
                    imported_by = User.Identity?.Name ?? GetCurrentUserId() ?? "system",
                    action_description = $"Nhập dữ liệu sinh viên từ Excel: {result.SuccessCount} thành công, {result.ErrorCount} lỗi"
                });

                if (result.ErrorCount > 0 && result.SuccessCount == 0)
                {
                    // Tất cả đều lỗi
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Import thất bại. Có {result.ErrorCount} lỗi",
                        data = result,
                        errors = result.Errors
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = $"Import thành công {result.SuccessCount} sinh viên" + 
                              (result.ErrorCount > 0 ? $", có {result.ErrorCount} lỗi" : ""),
                    data = result,
                    errors = result.ErrorCount > 0 ? result.Errors : null
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"❌ Lỗi import Excel: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                
                return StatusCode(500, new { 
                    success = false, 
                    message = "Lỗi khi import file Excel: " + ex.Message,
                    detail = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }
    }
}
