using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.BLL.Services;
using System.Text;

namespace EducationManagement.API.Admin.Controllers
{
    // ✅ DTO để nhận string time từ frontend
    public class TimetableConflictCheckInputDto
    {
        public string? SessionId { get; set; }
        public string ClassId { get; set; } = string.Empty;
        public string? SubjectId { get; set; }
        public string? LecturerId { get; set; }
        public string? RoomId { get; set; }
        public string? SchoolYearId { get; set; }
        public int? WeekNo { get; set; }
        public int Weekday { get; set; }
        public string StartTime { get; set; } = string.Empty; // String format: "HH:mm:ss" or "HH:mm"
        public string EndTime { get; set; } = string.Empty;   // String format: "HH:mm:ss" or "HH:mm"
        public int? PeriodFrom { get; set; }
        public int? PeriodTo { get; set; }
    }

    [ApiController]
    [Route("api-edu/timetable")]
    public class TimetableController : ControllerBase
    {
        private readonly TimetableService _timetableService;
        private readonly TimetableExportService _exportService;

        public TimetableController(TimetableService timetableService, TimetableExportService exportService)
        {
            _timetableService = timetableService;
            _exportService = exportService;
        }

        // GET: /api-edu/timetable/student?studentId=...&year=2025&week=12
        [HttpGet("student")]
        [Authorize]
        public async Task<IActionResult> GetStudent([FromQuery] string studentId, [FromQuery] int year, [FromQuery] int week)
        {
            if (string.IsNullOrWhiteSpace(studentId)) return BadRequest(new { message = "studentId required" });
            var data = await _timetableService.GetStudentTimetableByWeekAsync(studentId, year, week);
            return Ok(new { data });
        }

        // GET: /api-edu/timetable/lecturer?lecturerId=...&year=2025&week=12
        [HttpGet("lecturer")]
        [Authorize]
        public async Task<IActionResult> GetLecturer([FromQuery] string lecturerId, [FromQuery] int year, [FromQuery] int week)
        {
            if (string.IsNullOrWhiteSpace(lecturerId)) return BadRequest(new { message = "lecturerId required" });
            var data = await _timetableService.GetLecturerTimetableByWeekAsync(lecturerId, year, week);
            return Ok(new { data });
        }

        // GET: /api-edu/timetable/sessions?year=2025&week=12
        [HttpGet("sessions")]
        [Authorize]
        public async Task<IActionResult> GetAllSessions([FromQuery] int year, [FromQuery] int week)
        {
            var data = await _timetableService.GetAllSessionsByWeekAsync(year, week);
            return Ok(new { data });
        }

        // GET: /api-edu/timetable/sessions/class?classId=...&week=12
        [HttpGet("sessions/class")]
        [Authorize]
        public async Task<IActionResult> GetSessionsByClass([FromQuery] string classId, [FromQuery] int week)
        {
            if (string.IsNullOrWhiteSpace(classId))
                return BadRequest(new { message = "classId required" });
            
            var data = await _timetableService.GetSessionsByClassAndWeekAsync(classId, week);
            return Ok(new { data });
        }

        // DELETE: /api-edu/timetable/session/{id}
        [HttpDelete("session/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSession(string id)
        {
            var ok = await _timetableService.DeleteSessionAsync(id, User.Identity?.Name ?? "System");
            if (!ok) return NotFound(new { message = "sessionId không tồn tại" });
            return Ok(new { sessionId = id, deleted = true });
        }

        // GET: /api-edu/timetable/rooms?search=&isActive=true
        // ✅ Đổi route để tránh conflict với RoomController
        [HttpGet("rooms")]
        [Authorize]
        public async Task<IActionResult> GetRooms([FromQuery] string? search, [FromQuery] bool? isActive)
        {
            var data = await _timetableService.GetRoomsAsync(search, isActive);
            return Ok(new { data });
        }

        // POST: /api-edu/timetable/conflicts
        [HttpPost("conflicts")]
        [Authorize]
        public async Task<IActionResult> CheckConflicts([FromBody] TimetableConflictCheckInputDto dto)
        {
            try
            {
                // ✅ Validation: Kiểm tra input không null
                if (dto == null)
                {
                    return BadRequest(new { success = false, message = "Dữ liệu kiểm tra xung đột không được để trống" });
                }

                // ✅ Validation: Kiểm tra các trường bắt buộc
                if (string.IsNullOrWhiteSpace(dto.ClassId))
                {
                    return BadRequest(new { success = false, message = "Lớp học là bắt buộc" });
                }

                if (string.IsNullOrWhiteSpace(dto.SubjectId))
                {
                    return BadRequest(new { success = false, message = "Môn học là bắt buộc" });
                }

                if (dto.Weekday < 1 || dto.Weekday > 7)
                {
                    return BadRequest(new { success = false, message = "Thứ trong tuần không hợp lệ (1-7)" });
                }

                // ✅ Parse time từ string "HH:mm:ss" hoặc "HH:mm"
                if (string.IsNullOrWhiteSpace(dto.StartTime))
                {
                    return BadRequest(new { success = false, message = "Thời gian bắt đầu là bắt buộc" });
                }

                if (string.IsNullOrWhiteSpace(dto.EndTime))
                {
                    return BadRequest(new { success = false, message = "Thời gian kết thúc là bắt buộc" });
                }

                if (!TimeSpan.TryParse(dto.StartTime, out var startTime))
                {
                    return BadRequest(new { success = false, message = $"Định dạng thời gian bắt đầu không hợp lệ: {dto.StartTime}. Cần định dạng HH:mm:ss hoặc HH:mm" });
                }

                if (!TimeSpan.TryParse(dto.EndTime, out var endTime))
                {
                    return BadRequest(new { success = false, message = $"Định dạng thời gian kết thúc không hợp lệ: {dto.EndTime}. Cần định dạng HH:mm:ss hoặc HH:mm" });
                }

                if (startTime >= endTime)
                {
                    return BadRequest(new { success = false, message = "Thời gian kết thúc phải sau thời gian bắt đầu" });
                }

                // ✅ Log input để debug
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine($"[CheckConflicts] ClassId: {dto.ClassId}");
                Console.WriteLine($"[CheckConflicts] SubjectId: {dto.SubjectId}");
                Console.WriteLine($"[CheckConflicts] StartTime: {dto.StartTime} -> {startTime}");
                Console.WriteLine($"[CheckConflicts] EndTime: {dto.EndTime} -> {endTime}");
                Console.WriteLine($"[CheckConflicts] PeriodFrom: {dto.PeriodFrom}, PeriodTo: {dto.PeriodTo}");
                Console.ResetColor();

                // ✅ Convert DTO sang TimetableConflictCheckInput
                var input = new TimetableConflictCheckInput
                {
                    SessionId = dto.SessionId,
                    ClassId = dto.ClassId,
                    SubjectId = dto.SubjectId ?? string.Empty,
                    LecturerId = dto.LecturerId,
                    RoomId = dto.RoomId,
                    SchoolYearId = dto.SchoolYearId,
                    WeekNo = dto.WeekNo,
                    Weekday = dto.Weekday,
                    StartTime = startTime,
                    EndTime = endTime,
                    PeriodFrom = dto.PeriodFrom,
                    PeriodTo = dto.PeriodTo
                };

                var conflicts = await _timetableService.CheckConflictsAsync(input);
                return Ok(new { success = true, data = conflicts });
            }
            catch (Exception ex)
            {
                // ✅ Log chi tiết lỗi để debug
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[Timetable CheckConflicts Error] {ex.Message}");
                Console.WriteLine($"[Timetable CheckConflicts Error] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[Timetable CheckConflicts Error] InnerException: {ex.InnerException.Message}");
                }
                Console.ResetColor();

                return StatusCode(500, new 
                { 
                    success = false, 
                    message = "Lỗi hệ thống khi kiểm tra xung đột", 
                    error = ex.Message,
                    details = ex.InnerException?.Message
                });
            }
        }

        // POST: /api-edu/timetable/session
        [HttpPost("session")]
        [Authorize]
        public async Task<IActionResult> CreateSession([FromBody] TimetableCreateInput input)
        {
            try
            {
                var (has, detail) = await _timetableService.ValidateBeforeSaveAsync(input);
                if (has)
                    return StatusCode(StatusCodes.Status409Conflict, new { message = "Conflicts detected", data = detail });

                var id = await _timetableService.CreateSessionAsync(input);
                return Ok(new { sessionId = id });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: /api-edu/timetable/session/{id}
        [HttpPut("session/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateSession(string id, [FromBody] TimetableUpdateInput input)
        {
            var check = new TimetableConflictCheckInput
            {
                SessionId = id,
                ClassId = string.Empty,
                SubjectId = string.Empty,
                LecturerId = input.LecturerId,
                RoomId = input.RoomId,
                SchoolYearId = null,
                WeekNo = input.WeekNo,
                Weekday = input.Weekday,
                StartTime = input.StartTime,
                EndTime = input.EndTime
            };
            var (has, detail) = await _timetableService.ValidateBeforeSaveAsync(check);
            if (has)
                return StatusCode(StatusCodes.Status409Conflict, new { message = "Conflicts detected", data = detail });
            try
            {
                await _timetableService.UpdateSessionAsync(id, input);
                return Ok(new { sessionId = id });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ============================================
        // NEW FEATURES: Advanced Timetable Operations
        // ============================================

        // POST: /api-edu/timetable/sessions/bulk
        [HttpPost("sessions/bulk")]
        [Authorize]
        public async Task<IActionResult> BulkCreateSessions([FromBody] BulkCreateSessionsInput input)
        {
            try
            {
                input.Actor = User.Identity?.Name ?? "System";
                var result = await _timetableService.BulkCreateSessionsAsync(input);
                return Ok(new { data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: /api-edu/timetable/sessions/copy
        [HttpPost("sessions/copy")]
        [Authorize]
        public async Task<IActionResult> CopySessions([FromBody] CopySessionsInput input)
        {
            try
            {
                input.Actor = User.Identity?.Name ?? "System";
                var result = await _timetableService.CopySessionsAsync(input);
                return Ok(new { data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: /api-edu/timetable/conflicts/suggestions
        [HttpPost("conflicts/suggestions")]
        [Authorize]
        public async Task<IActionResult> GetConflictSuggestions([FromBody] TimetableConflictCheckInput input)
        {
            var suggestions = await _timetableService.GetConflictSuggestionsAsync(input);
            return Ok(new { data = suggestions });
        }

        // GET: /api-edu/timetable/semester?schoolYearId=...&semester=1&classId=...
        [HttpGet("semester")]
        [Authorize]
        public async Task<IActionResult> GetSessionsBySemester(
            [FromQuery] string schoolYearId, 
            [FromQuery] int semester,
            [FromQuery] string? classId = null)
        {
            if (string.IsNullOrWhiteSpace(schoolYearId))
                return BadRequest(new { message = "schoolYearId required" });
            
            var data = await _timetableService.GetSessionsBySemesterAsync(schoolYearId, semester, classId);
            return Ok(new { data });
        }

        // POST: /api-edu/timetable/session/recurrence
        [HttpPost("session/recurrence")]
        [Authorize]
        public async Task<IActionResult> CreateSessionWithRecurrence(
            [FromBody] TimetableCreateWithRecurrenceInput input)
        {
            try
            {
                input.Actor = User.Identity?.Name ?? "System";
                var result = await _timetableService.CreateSessionWithRecurrenceAsync(
                    input, 
                    input.StartDate, 
                    input.EndDate);
                return Ok(new { data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ============================================
        // EXPORT ENDPOINTS
        // ============================================

        // GET: /api-edu/timetable/export/student?studentId=...&year=2025&week=12&format=csv
        [HttpGet("export/student")]
        [Authorize]
        public async Task<IActionResult> ExportStudentTimetable(
            [FromQuery] string studentId,
            [FromQuery] int year,
            [FromQuery] int week,
            [FromQuery] string format = "csv")
        {
            if (string.IsNullOrWhiteSpace(studentId))
                return BadRequest(new { message = "studentId required" });

            try
            {
                if (format.ToLower() == "excel" || format.ToLower() == "xls")
                {
                    var content = await _exportService.ExportStudentTimetableToExcelAsync(studentId, year, week);
                    var bytes = Encoding.UTF8.GetBytes(content);
                    return File(bytes, "application/vnd.ms-excel", $"ThoiKhoaBieu_SV_Tuan{week}_{year}.xls");
                }
                else
                {
                    var content = await _exportService.ExportStudentTimetableToCsvAsync(studentId, year, week);
                    var bytes = Encoding.UTF8.GetBytes(content);
                    return File(bytes, "text/csv; charset=utf-8", $"ThoiKhoaBieu_SV_Tuan{week}_{year}.csv");
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: /api-edu/timetable/export/lecturer?lecturerId=...&year=2025&week=12&format=csv
        [HttpGet("export/lecturer")]
        [Authorize]
        public async Task<IActionResult> ExportLecturerTimetable(
            [FromQuery] string lecturerId,
            [FromQuery] int year,
            [FromQuery] int week,
            [FromQuery] string format = "csv")
        {
            if (string.IsNullOrWhiteSpace(lecturerId))
                return BadRequest(new { message = "lecturerId required" });

            try
            {
                var content = await _exportService.ExportLecturerTimetableToCsvAsync(lecturerId, year, week);
                var bytes = Encoding.UTF8.GetBytes(content);
                return File(bytes, "text/csv; charset=utf-8", $"ThoiKhoaBieu_GV_Tuan{week}_{year}.csv");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: /api-edu/timetable/export/semester?schoolYearId=...&semester=1&classId=...&format=csv
        [HttpGet("export/semester")]
        [Authorize]
        public async Task<IActionResult> ExportSemesterTimetable(
            [FromQuery] string schoolYearId,
            [FromQuery] int semester,
            [FromQuery] string? classId = null,
            [FromQuery] string format = "csv")
        {
            if (string.IsNullOrWhiteSpace(schoolYearId))
                return BadRequest(new { message = "schoolYearId required" });

            try
            {
                var content = await _exportService.ExportSemesterTimetableToCsvAsync(schoolYearId, semester, classId);
                var bytes = Encoding.UTF8.GetBytes(content);
                var filename = classId != null 
                    ? $"ThoiKhoaBieu_HK{semester}_{schoolYearId}_Lop{classId}.csv"
                    : $"ThoiKhoaBieu_HK{semester}_{schoolYearId}.csv";
                return File(bytes, "text/csv; charset=utf-8", filename);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}


