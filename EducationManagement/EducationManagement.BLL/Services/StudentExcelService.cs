using EducationManagement.Common.DTOs.Student;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Service để xử lý import/export Excel cho sinh viên
    /// </summary>
    public class StudentExcelService
    {
        private readonly StudentService _studentService;
        private readonly MajorService _majorService;
        private readonly AcademicYearService _academicYearService;

        public StudentExcelService(StudentService studentService, MajorService majorService, AcademicYearService academicYearService)
        {
            _studentService = studentService;
            _majorService = majorService;
            _academicYearService = academicYearService;
        }

        /// <summary>
        /// Tạo file Excel mẫu để import sinh viên
        /// </summary>
        public async Task<byte[]> GenerateImportTemplateAsync()
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("Mẫu Import Sinh Viên");

            // Tiêu đề
            worksheet.Cells[1, 1].Value = "MẪU IMPORT SINH VIÊN";
            worksheet.Cells[1, 1, 1, 8].Merge = true;
            worksheet.Cells[1, 1].Style.Font.Size = 16;
            worksheet.Cells[1, 1].Style.Font.Bold = true;
            worksheet.Cells[1, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
            worksheet.Cells[1, 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
            worksheet.Cells[1, 1].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(68, 114, 196));
            worksheet.Cells[1, 1].Style.Font.Color.SetColor(System.Drawing.Color.White);

            // Ghi chú quan trọng
            worksheet.Cells[2, 1].Value = "LƯU Ý KHI IMPORT:";
            worksheet.Cells[2, 1, 2, 8].Merge = true;
            worksheet.Cells[2, 1].Style.Font.Bold = true;
            worksheet.Cells[2, 1].Style.Font.Color.SetColor(System.Drawing.Color.Red);
            worksheet.Cells[2, 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
            worksheet.Cells[2, 1].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(255, 242, 204));

            worksheet.Cells[3, 1].Value = "1. Mã sinh viên (StudentCode): Bắt buộc, không được trùng, tối đa 20 ký tự";
            worksheet.Cells[3, 1, 3, 8].Merge = true;
            worksheet.Cells[4, 1].Value = "2. Họ và tên (FullName): Bắt buộc, tối đa 150 ký tự";
            worksheet.Cells[4, 1, 4, 8].Merge = true;
            worksheet.Cells[5, 1].Value = "3. Email: Định dạng email hợp lệ, tối đa 150 ký tự";
            worksheet.Cells[5, 1, 5, 8].Merge = true;
            worksheet.Cells[6, 1].Value = "4. Số điện thoại (Phone): Tối đa 20 ký tự, chỉ chứa số";
            worksheet.Cells[6, 1, 6, 8].Merge = true;
            worksheet.Cells[7, 1].Value = "5. Ngày sinh (DateOfBirth): Định dạng dd/MM/yyyy hoặc yyyy-MM-dd";
            worksheet.Cells[7, 1, 7, 8].Merge = true;
            worksheet.Cells[8, 1].Value = "6. Giới tính (Gender): Nam, Nữ hoặc để trống";
            worksheet.Cells[8, 1, 8, 8].Merge = true;
            worksheet.Cells[9, 1].Value = "7. Địa chỉ (Address): Tùy chọn";
            worksheet.Cells[9, 1, 9, 8].Merge = true;
            worksheet.Cells[10, 1].Value = "8. Mã ngành (MajorId): Bắt buộc, phải tồn tại trong hệ thống";
            worksheet.Cells[10, 1, 10, 8].Merge = true;
            worksheet.Cells[11, 1].Value = "9. Mã năm học (AcademicYearId): Tùy chọn, phải tồn tại trong hệ thống nếu có";
            worksheet.Cells[11, 1, 11, 8].Merge = true;

            // Header row
            int headerRow = 13;
            var headers = new[]
            {
                "Mã sinh viên*",
                "Họ và tên*",
                "Email*",
                "Số điện thoại",
                "Ngày sinh",
                "Giới tính",
                "Địa chỉ",
                "Mã ngành*",
                "Mã năm học"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                worksheet.Cells[headerRow, i + 1].Value = headers[i];
                worksheet.Cells[headerRow, i + 1].Style.Font.Bold = true;
                worksheet.Cells[headerRow, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
                worksheet.Cells[headerRow, i + 1].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(217, 225, 242));
                worksheet.Cells[headerRow, i + 1].Style.Border.BorderAround(ExcelBorderStyle.Thin);
                worksheet.Cells[headerRow, i + 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
            }

            // Lấy dữ liệu thực tế từ database để tạo mẫu hợp lệ
            var majors = await _majorService.GetAllAsync();
            var academicYears = await _academicYearService.GetAllAsync();
            
            // Lấy major đầu tiên (hoặc mặc định)
            var sampleMajor = majors.FirstOrDefault()?.MajorId ?? "MAJ_SE";
            var sampleMajorCode = majors.FirstOrDefault()?.MajorCode ?? "SE";
            
            // Lấy academic year đầu tiên (hoặc mặc định)
            var sampleAcademicYear = academicYears.FirstOrDefault()?.AcademicYearId ?? "AY2024";
            var sampleAcademicYearName = academicYears.FirstOrDefault()?.YearName ?? "2024-2025";

            // Tạo nhiều dòng dữ liệu mẫu (5 dòng) với dữ liệu hợp lệ
            var sampleData = new List<object[]>
            {
                new object[] { "K24SE001", "Nguyễn Văn An", "k24se001@student.edu.vn", "0912345678", "15/03/2006", "Nam", "123 Đường Lê Lợi, Quận 1, TP.HCM", sampleMajor, sampleAcademicYear },
                new object[] { "K24SE002", "Trần Thị Bình", "k24se002@student.edu.vn", "0912345679", "20/05/2006", "Nữ", "456 Đường Nguyễn Huệ, Quận 1, TP.HCM", sampleMajor, sampleAcademicYear },
                new object[] { "K24SE003", "Lê Minh Cường", "k24se003@student.edu.vn", "0912345680", "10/08/2006", "Nam", "789 Đường Pasteur, Quận 3, TP.HCM", sampleMajor, sampleAcademicYear },
                new object[] { "K24SE004", "Phạm Thị Dung", "k24se004@student.edu.vn", "0912345681", "25/11/2006", "Nữ", "321 Đường Võ Văn Tần, Quận 3, TP.HCM", sampleMajor, sampleAcademicYear },
                new object[] { "K24SE005", "Hoàng Văn Em", "k24se005@student.edu.vn", "0912345682", "05/01/2006", "Nam", "654 Đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM", sampleMajor, sampleAcademicYear }
            };

            // Ghi dữ liệu mẫu vào Excel
            int startDataRow = headerRow + 1;
            for (int rowIndex = 0; rowIndex < sampleData.Count; rowIndex++)
            {
                int currentRow = startDataRow + rowIndex;
                var rowData = sampleData[rowIndex];
                
                for (int colIndex = 0; colIndex < rowData.Length && colIndex < headers.Length; colIndex++)
                {
                    worksheet.Cells[currentRow, colIndex + 1].Value = rowData[colIndex];
                    worksheet.Cells[currentRow, colIndex + 1].Style.Border.BorderAround(ExcelBorderStyle.Thin);
                }
                
                // Format dòng dữ liệu mẫu
                for (int i = 1; i <= headers.Length; i++)
                {
                    worksheet.Cells[currentRow, i].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    worksheet.Cells[currentRow, i].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(242, 242, 242));
                }
            }
            
            // Thêm ghi chú về dữ liệu mẫu
            int noteRow = startDataRow + sampleData.Count + 1;
            worksheet.Cells[noteRow, 1].Value = $"LƯU Ý: Dữ liệu mẫu trên đã được điền sẵn với MajorId ({sampleMajor}) và AcademicYearId ({sampleAcademicYear}) hợp lệ từ hệ thống. Bạn có thể sửa đổi hoặc xóa các dòng này và thêm dữ liệu của riêng bạn.";
            worksheet.Cells[noteRow, 1, noteRow, headers.Length].Merge = true;
            worksheet.Cells[noteRow, 1].Style.Font.Italic = true;
            worksheet.Cells[noteRow, 1].Style.Font.Color.SetColor(System.Drawing.Color.FromArgb(0, 102, 204));
            worksheet.Cells[noteRow, 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
            worksheet.Cells[noteRow, 1].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(217, 225, 242));

            // Auto-fit columns
            for (int i = 1; i <= headers.Length; i++)
            {
                worksheet.Column(i).AutoFit();
                if (worksheet.Column(i).Width > 30)
                    worksheet.Column(i).Width = 30;
            }

            // Set row heights
            worksheet.Row(1).Height = 25;
            worksheet.Row(headerRow).Height = 20;

            return package.GetAsByteArray();
        }

        /// <summary>
        /// Import sinh viên từ file Excel
        /// </summary>
        public async Task<ImportExcelResultDto> ImportFromExcelAsync(Stream fileStream, string createdBy)
        {
            Console.WriteLine("[StudentExcelService] 🔄 ImportFromExcelAsync() - Bắt đầu import");
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            
            var result = new ImportExcelResultDto
            {
                Errors = new List<ImportErrorDto>(),
                SuccessCount = 0,
                ErrorCount = 0
            };

            try
            {
                // Đảm bảo stream ở vị trí đầu
                if (fileStream.CanSeek)
                    fileStream.Position = 0;

                Console.WriteLine("[StudentExcelService] 📄 Đang đọc Excel package...");
                using var package = new ExcelPackage(fileStream);
                
                Console.WriteLine($"[StudentExcelService] 📊 Workbook có {package.Workbook.Worksheets.Count} worksheet(s)");
                
                if (package.Workbook.Worksheets.Count == 0)
                {
                    result.Errors.Add(new ImportErrorDto
                    {
                        RowNumber = 0,
                        StudentCode = "",
                        ErrorMessage = "File Excel không có worksheet nào"
                    });
                    result.ErrorCount++;
                    return result;
                }

                var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                Console.WriteLine($"[StudentExcelService] 📋 Worksheet: {worksheet?.Name ?? "NULL"}");

                if (worksheet == null)
                {
                    Console.WriteLine("[StudentExcelService] ❌ Worksheet không tồn tại");
                    result.Errors.Add(new ImportErrorDto
                    {
                        RowNumber = 0,
                        StudentCode = "",
                        ErrorMessage = "File Excel không có worksheet nào"
                    });
                    result.ErrorCount++;
                    return result;
                }

                // Kiểm tra worksheet có dữ liệu không
                if (worksheet.Dimension == null)
                {
                    Console.WriteLine("[StudentExcelService] ❌ Worksheet không có dữ liệu (Dimension = null)");
                    result.Errors.Add(new ImportErrorDto
                    {
                        RowNumber = 0,
                        StudentCode = "",
                        ErrorMessage = "File Excel không có dữ liệu"
                    });
                    result.ErrorCount++;
                    return result;
                }

                Console.WriteLine($"[StudentExcelService] 📊 Worksheet dimension: {worksheet.Dimension.Address} (Rows: {worksheet.Dimension.End.Row}, Cols: {worksheet.Dimension.End.Column})");

                // Tìm dòng header (có thể ở dòng 13 hoặc dòng đầu tiên có "Mã sinh viên")
                int headerRow = 1;
                int maxSearchRow = Math.Min(20, worksheet.Dimension.End.Row);
                Console.WriteLine($"[StudentExcelService] 🔍 Tìm header từ dòng 1 đến {maxSearchRow}");
                
                for (int row = 1; row <= maxSearchRow; row++)
                {
                    var cellValue = worksheet.Cells[row, 1].Text?.Trim() ?? "";
                    Console.WriteLine($"[StudentExcelService] 🔍 Dòng {row}, cột 1: '{cellValue}'");
                    if (cellValue.Contains("Mã sinh viên") || cellValue.Contains("StudentCode") || 
                        cellValue.Contains("Mã sinh viên*") || cellValue.Contains("Mã SV"))
                    {
                        headerRow = row;
                        Console.WriteLine($"[StudentExcelService] ✅ Tìm thấy header ở dòng {headerRow}");
                        break;
                    }
                }

                // Đọc header để xác định cột
                var columnMap = new Dictionary<string, int>();
                int maxColumn = worksheet.Dimension?.End.Column ?? 9;
                Console.WriteLine($"[StudentExcelService] 🔍 Đọc header ở dòng {headerRow}, tối đa {maxColumn} cột");
                
                for (int col = 1; col <= maxColumn; col++)
                {
                    var headerValue = worksheet.Cells[headerRow, col].Text?.Trim() ?? "";
                    Console.WriteLine($"[StudentExcelService] 🔍 Cột {col}: '{headerValue}'");
                    
                    if (headerValue.Contains("Mã sinh viên") || headerValue.Contains("StudentCode") || headerValue.Contains("Mã SV"))
                    {
                        columnMap["StudentCode"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map StudentCode -> cột {col}");
                    }
                    else if (headerValue.Contains("Họ và tên") || headerValue.Contains("FullName") || headerValue.Contains("Họ tên"))
                    {
                        columnMap["FullName"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map FullName -> cột {col}");
                    }
                    else if (headerValue.Contains("Email"))
                    {
                        columnMap["Email"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map Email -> cột {col}");
                    }
                    else if (headerValue.Contains("Số điện thoại") || headerValue.Contains("Phone"))
                    {
                        columnMap["Phone"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map Phone -> cột {col}");
                    }
                    else if (headerValue.Contains("Ngày sinh") || headerValue.Contains("DateOfBirth"))
                    {
                        columnMap["DateOfBirth"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map DateOfBirth -> cột {col}");
                    }
                    else if (headerValue.Contains("Giới tính") || headerValue.Contains("Gender"))
                    {
                        columnMap["Gender"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map Gender -> cột {col}");
                    }
                    else if (headerValue.Contains("Địa chỉ") || headerValue.Contains("Address"))
                    {
                        columnMap["Address"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map Address -> cột {col}");
                    }
                    else if (headerValue.Contains("Mã ngành") || headerValue.Contains("MajorId") || headerValue.Contains("Mã Ngành"))
                    {
                        columnMap["MajorId"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map MajorId -> cột {col}");
                    }
                    else if (headerValue.Contains("Mã năm học") || headerValue.Contains("AcademicYearId") || headerValue.Contains("Niên khóa"))
                    {
                        columnMap["AcademicYearId"] = col;
                        Console.WriteLine($"[StudentExcelService] ✅ Map AcademicYearId -> cột {col}");
                    }
                }
                
                Console.WriteLine($"[StudentExcelService] 📊 Column mapping: {System.Text.Json.JsonSerializer.Serialize(columnMap)}");

                // Kiểm tra các cột bắt buộc
                var missingColumns = new List<string>();
                if (!columnMap.ContainsKey("StudentCode")) missingColumns.Add("Mã sinh viên");
                if (!columnMap.ContainsKey("FullName")) missingColumns.Add("Họ và tên");
                if (!columnMap.ContainsKey("Email")) missingColumns.Add("Email");
                if (!columnMap.ContainsKey("MajorId")) missingColumns.Add("Mã ngành");
                
                if (missingColumns.Any())
                {
                    var errorMsg = $"File Excel thiếu các cột bắt buộc: {string.Join(", ", missingColumns)}";
                    Console.WriteLine($"[StudentExcelService] ❌ {errorMsg}");
                    Console.WriteLine($"[StudentExcelService] ❌ Các cột tìm thấy: {string.Join(", ", columnMap.Keys)}");
                    result.Errors.Add(new ImportErrorDto
                    {
                        RowNumber = 0,
                        StudentCode = "",
                        ErrorMessage = errorMsg
                    });
                    result.ErrorCount++;
                    return result;
                }
                
                Console.WriteLine("[StudentExcelService] ✅ Tất cả cột bắt buộc đã được tìm thấy");

                // Đọc dữ liệu từ dòng sau header
                var students = new List<StudentImportDto>();
                int dataStartRow = headerRow + 1;
                int endRow = worksheet.Dimension.End.Row;
                
                Console.WriteLine($"[StudentExcelService] 📖 Đọc dữ liệu từ dòng {dataStartRow} đến {endRow}");

                for (int row = dataStartRow; row <= endRow; row++)
                {
                    // Kiểm tra xem dòng có dữ liệu không
                    var studentCodeCell = worksheet.Cells[row, columnMap["StudentCode"]];
                    var studentCode = studentCodeCell?.Text?.Trim() ?? "";
                    
                    // Bỏ qua dòng trống hoặc dòng chỉ có khoảng trắng
                    if (string.IsNullOrWhiteSpace(studentCode))
                    {
                        if (row <= dataStartRow + 5) // Log first few empty rows
                            Console.WriteLine($"[StudentExcelService] ⏭️ Bỏ qua dòng {row} (trống)");
                        continue;
                    }

                    Console.WriteLine($"[StudentExcelService] 📝 Đọc dòng {row}: StudentCode = '{studentCode}'");
                    
                    var fullName = worksheet.Cells[row, columnMap["FullName"]].Text?.Trim() ?? "";
                    var email = worksheet.Cells[row, columnMap["Email"]].Text?.Trim() ?? "";
                    var majorId = worksheet.Cells[row, columnMap["MajorId"]].Text?.Trim() ?? "";
                    
                    Console.WriteLine($"[StudentExcelService] 📝 Dòng {row} - FullName: '{fullName}', Email: '{email}', MajorId: '{majorId}'");

                    var student = new StudentImportDto
                    {
                        StudentCode = studentCode,
                        FullName = fullName,
                        Email = email,
                        Phone = columnMap.ContainsKey("Phone") ? worksheet.Cells[row, columnMap["Phone"]].Text?.Trim() : null,
                        Gender = columnMap.ContainsKey("Gender") ? worksheet.Cells[row, columnMap["Gender"]].Text?.Trim() : null,
                        Address = columnMap.ContainsKey("Address") ? worksheet.Cells[row, columnMap["Address"]].Text?.Trim() : null,
                        MajorId = majorId,
                        AcademicYearId = columnMap.ContainsKey("AcademicYearId") ? worksheet.Cells[row, columnMap["AcademicYearId"]].Text?.Trim() : null
                    };

                    // Parse ngày sinh
                    if (columnMap.ContainsKey("DateOfBirth"))
                    {
                        var dobText = worksheet.Cells[row, columnMap["DateOfBirth"]].Text?.Trim() ?? "";
                        if (!string.IsNullOrWhiteSpace(dobText))
                        {
                            if (DateTime.TryParse(dobText, out var dob))
                            {
                                student.DateOfBirth = dob;
                            }
                            else
                            {
                                result.Errors.Add(new ImportErrorDto
                                {
                                    RowNumber = row,
                                    StudentCode = student.StudentCode,
                                    ErrorMessage = $"Ngày sinh không hợp lệ: {dobText}. Vui lòng sử dụng định dạng dd/MM/yyyy"
                                });
                                result.ErrorCount++;
                                continue;
                            }
                        }
                    }

                    // Validate dữ liệu
                    var validationErrors = ValidateStudentImport(student, row);
                    if (validationErrors.Any())
                    {
                        Console.WriteLine($"[StudentExcelService] ❌ Dòng {row} có {validationErrors.Count} lỗi validation:");
                        foreach (var err in validationErrors)
                        {
                            Console.WriteLine($"[StudentExcelService]    - {err.ErrorMessage}");
                        }
                        result.Errors.AddRange(validationErrors);
                        result.ErrorCount += validationErrors.Count;
                        continue;
                    }

                    Console.WriteLine($"[StudentExcelService] ✅ Dòng {row} hợp lệ, thêm vào danh sách");
                    students.Add(student);
                }

                Console.WriteLine($"[StudentExcelService] 📊 Tổng kết: {students.Count} sinh viên hợp lệ, {result.ErrorCount} lỗi");

                if (students.Count == 0)
                {
                    result.Errors.Add(new ImportErrorDto
                    {
                        RowNumber = 0,
                        StudentCode = "",
                        ErrorMessage = "Không có dữ liệu hợp lệ để import"
                    });
                    result.ErrorCount++;
                    return result;
                }

                // Import vào database
                var importResult = await _studentService.ImportStudentsBatchAsync(students, createdBy);
                
                result.SuccessCount = importResult.SuccessCount;
                result.ErrorCount += importResult.ErrorCount;
                result.Errors.AddRange(importResult.Errors);

                return result;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new ImportErrorDto
                {
                    RowNumber = 0,
                    StudentCode = "",
                    ErrorMessage = $"Lỗi khi đọc file Excel: {ex.Message}"
                });
                result.ErrorCount++;
                return result;
            }
        }

        /// <summary>
        /// Validate dữ liệu sinh viên trước khi import
        /// </summary>
        private List<ImportErrorDto> ValidateStudentImport(StudentImportDto student, int rowNumber)
        {
            Console.WriteLine($"[StudentExcelService] 🔍 ValidateStudentImport() - Dòng {rowNumber}");
            Console.WriteLine($"[StudentExcelService] 📝 Student data: StudentCode='{student.StudentCode}', FullName='{student.FullName}', Email='{student.Email}', MajorId='{student.MajorId}'");
            
            var errors = new List<ImportErrorDto>();

            // Validate StudentCode
            if (string.IsNullOrWhiteSpace(student.StudentCode))
            {
                Console.WriteLine($"[StudentExcelService] ❌ Dòng {rowNumber}: StudentCode trống");
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = "",
                    ErrorMessage = "Mã SV là bắt buộc"
                });
            }
            else if (student.StudentCode.Length > 20)
            {
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = student.StudentCode,
                    ErrorMessage = "Mã sinh viên không được vượt quá 20 ký tự"
                });
            }

            // Validate FullName
            if (string.IsNullOrWhiteSpace(student.FullName))
            {
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = student.StudentCode,
                    ErrorMessage = "Họ và tên không được để trống"
                });
            }
            else if (student.FullName.Length > 150)
            {
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = student.StudentCode,
                    ErrorMessage = "Họ và tên không được vượt quá 150 ký tự"
                });
            }

            // Validate Email
            if (string.IsNullOrWhiteSpace(student.Email))
            {
                Console.WriteLine($"[StudentExcelService] ❌ Dòng {rowNumber}: Email trống");
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = student.StudentCode,
                    ErrorMessage = "Email là bắt buộc"
                });
            }
            else if (student.Email.Length > 150)
            {
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = student.StudentCode,
                    ErrorMessage = "Email không được vượt quá 150 ký tự"
                });
            }
            else if (!IsValidEmail(student.Email))
            {
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = student.StudentCode,
                    ErrorMessage = "Email không đúng định dạng"
                });
            }

            // Validate Phone
            if (!string.IsNullOrWhiteSpace(student.Phone))
            {
                if (student.Phone.Length > 20)
                {
                    errors.Add(new ImportErrorDto
                    {
                        RowNumber = rowNumber,
                        StudentCode = student.StudentCode,
                        ErrorMessage = "Số điện thoại không được vượt quá 20 ký tự"
                    });
                }
                else if (!Regex.IsMatch(student.Phone, @"^[0-9\s\-\+\(\)]+$"))
                {
                    errors.Add(new ImportErrorDto
                    {
                        RowNumber = rowNumber,
                        StudentCode = student.StudentCode,
                        ErrorMessage = "Số điện thoại chỉ được chứa số và các ký tự: +, -, (, ), khoảng trắng"
                    });
                }
            }

            // Validate Gender
            if (!string.IsNullOrWhiteSpace(student.Gender))
            {
                var gender = student.Gender.Trim().ToLower();
                if (gender != "nam" && gender != "nữ" && gender != "nu" && gender != "male" && gender != "female")
                {
                    errors.Add(new ImportErrorDto
                    {
                        RowNumber = rowNumber,
                        StudentCode = student.StudentCode,
                        ErrorMessage = "Giới tính phải là: Nam, Nữ, Male, Female hoặc để trống"
                    });
                }
            }

            // Validate MajorId
            if (string.IsNullOrWhiteSpace(student.MajorId))
            {
                Console.WriteLine($"[StudentExcelService] ❌ Dòng {rowNumber}: MajorId trống");
                errors.Add(new ImportErrorDto
                {
                    RowNumber = rowNumber,
                    StudentCode = student.StudentCode,
                    ErrorMessage = "Mã Ngành là bắt buộc"
                });
            }

            Console.WriteLine($"[StudentExcelService] ✅ Validation hoàn tất cho dòng {rowNumber}: {errors.Count} lỗi");
            if (errors.Count > 0)
            {
                foreach (var err in errors)
                {
                    Console.WriteLine($"[StudentExcelService]    - {err.ErrorMessage}");
                }
            }

            return errors;
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var regex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
                return regex.IsMatch(email);
            }
            catch
            {
                return false;
            }
        }
    }

    /// <summary>
    /// DTO cho kết quả import Excel
    /// </summary>
    public class ImportExcelResultDto
    {
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<ImportErrorDto> Errors { get; set; } = new();
    }
}

