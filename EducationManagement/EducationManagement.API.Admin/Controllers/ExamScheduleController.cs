using Microsoft.AspNetCore.Mvc;
using EducationManagement.BLL.Services;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Exam;
using Microsoft.AspNetCore.Authorization;
using EducationManagement.API.Admin.Authorization;
using System;

namespace EducationManagement.API.Admin.Controllers
{
    [ApiController]
    [Authorize] // ✅ Yêu cầu authentication
    [Route("api-edu/exam-schedules")]
    public class ExamScheduleController : BaseController
    {
        private readonly ExamScheduleService _service;
        private readonly ExamScoreService? _examScoreService;

        public ExamScheduleController(
            ExamScheduleService service, 
            AuditLogService auditLogService,
            ExamScoreService? examScoreService = null) : base(auditLogService)
        {
            _service = service;
            _examScoreService = examScoreService;
        }

        // ============================================================
        // 🔹 GET ALL - Lấy danh sách lịch thi (có filter)
        // ============================================================
        [HttpGet]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> GetAll(
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] string? examType = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? classId = null,
            [FromQuery] string? subjectId = null)
        {
            try
            {
                var schedules = await _service.GetAllAsync(
                    schoolYearId, semester, examType, startDate, endDate, classId, subjectId);

                return Ok(new
                {
                    success = true,
                    data = schedules,
                    totalCount = schedules.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 GET BY ID - Lấy chi tiết lịch thi
        // ============================================================
        [HttpGet("{id}")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Cố vấn hoặc sinh viên xem lịch thi của mình
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var exam = await _service.GetByIdAsync(id);
                if (exam == null)
                    return NotFound(new { success = false, message = "Không tìm thấy lịch thi" });

                return Ok(new { success = true, data = exam });
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

        // ============================================================
        // 🔹 GET BY STUDENT - Lấy lịch thi của sinh viên
        // ============================================================
        [HttpGet("student/{studentId}")]
        [RequirePermission("STUDENT_EXAM_SCHEDULES")] // ✅ Sinh viên xem lịch thi của mình
        public async Task<IActionResult> GetByStudent(
            string studentId,
            [FromQuery] string? schoolYearId = null,
            [FromQuery] int? semester = null)
        {
            try
            {
                var schedules = await _service.GetByStudentAsync(studentId, schoolYearId, semester);
                return Ok(new { success = true, data = schedules, totalCount = schedules.Count });
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

        // ============================================================
        // 🔹 GET BY CLASS - Lấy lịch thi của lớp học phần
        // ============================================================
        [HttpGet("class/{classId}")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Cố vấn xem lịch thi của lớp
        public async Task<IActionResult> GetByClass(string classId)
        {
            try
            {
                var schedules = await _service.GetByClassAsync(classId);
                return Ok(new { success = true, data = schedules, totalCount = schedules.Count });
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

        // ============================================================
        // 🔹 GET EXAMS BY CLASS AND WEEK - Lấy lịch thi của lớp trong tuần (để tích hợp timetable)
        // ============================================================
        [HttpGet("class/{classId}/week/{year}/{week}")]
        [RequireAnyPermission("ADVISOR_EXAM_SCHEDULES", "ADMIN_STUDENTS", "TCH_CLASSES")] // ✅ Admin, Cố vấn, hoặc Giảng viên xem lịch thi trong tuần
        public async Task<IActionResult> GetExamsByClassAndWeek(string classId, int year, int week)
        {
            try
            {
                var timetableItems = await _service.GetExamsByClassAndWeekAsync(classId, year, week);
                return Ok(new { success = true, data = timetableItems, totalCount = timetableItems.Count });
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

        // ============================================================
        // 🔹 GET CLASS STUDENTS - Lấy danh sách sinh viên trong lớp học phần
        // ============================================================
        [HttpGet("class/{classId}/students")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Cố vấn xem danh sách sinh viên
        public async Task<IActionResult> GetClassStudents(string classId)
        {
            try
            {
                var students = await _service.GetStudentsByClassAsync(classId);
                return Ok(new { success = true, data = students, totalCount = students.Count });
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

        // ============================================================
        // 🔹 CHECK ROOM CONFLICT - Kiểm tra xung đột phòng thi
        // ============================================================
        [HttpGet("check-room")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Cố vấn kiểm tra xung đột
        public async Task<IActionResult> CheckRoomConflict(
            [FromQuery] string roomId,
            [FromQuery] DateTime examDate,
            [FromQuery] TimeSpan startTime,
            [FromQuery] TimeSpan endTime,
            [FromQuery] string? excludeExamId = null)
        {
            try
            {
                var hasConflict = await _service.CheckRoomConflictAsync(
                    roomId, examDate, startTime, endTime, excludeExamId);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        roomId,
                        examDate,
                        startTime,
                        endTime,
                        hasConflict,
                        isAvailable = !hasConflict
                    }
                });
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

        // ============================================================
        // 🔹 CALCULATE REQUIRED SESSIONS - Tính số ca thi cần thiết
        // ============================================================
        [HttpGet("calculate-sessions")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Cố vấn tính số ca thi
        public async Task<IActionResult> CalculateRequiredSessions(
            [FromQuery] string classId,
            [FromQuery] string roomId)
        {
            try
            {
                var requiredSessions = await _service.CalculateRequiredSessionsAsync(classId, roomId);
                return Ok(new { success = true, data = new { classId, roomId, requiredSessions } });
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

        // ============================================================
        // 🔹 CREATE - Tạo lịch thi mới
        // ============================================================
        [HttpPost]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> Create([FromBody] CreateExamScheduleDto dto)
        {
            try
            {
                var actor = GetCurrentUserId() ?? "System";
                var exam = MapToExamSchedule(dto);
                exam.CreatedBy = actor;

                var examId = await _service.CreateAsync(exam);

                // ✅ Audit Log
                try
                {
                    await LogCreateAsync("ExamSchedule", examId, new
                    {
                        class_id = exam.ClassId,
                        subject_id = exam.SubjectId,
                        exam_date = exam.ExamDate,
                        exam_type = exam.ExamType,
                        room_id = exam.RoomId
                    });
                }
                catch { }

                return Ok(new { success = true, message = "✅ Tạo lịch thi thành công!", data = new { examId } });
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

        // ============================================================
        // 🔹 CREATE FOR CLASS - Tạo lịch thi cho lớp học phần (tự động phân sinh viên)
        // ============================================================
        [HttpPost("create-for-class")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> CreateForClass([FromBody] CreateExamScheduleForClassDto dto)
        {
            try
            {
                var actor = GetCurrentUserId() ?? "System";
                dto.CreatedBy = actor;

                var createdExams = await _service.CreateExamScheduleForClassAsync(dto);

                // ✅ Audit Log
                try
                {
                    foreach (var exam in createdExams)
                    {
                        await LogCreateAsync("ExamSchedule", exam.ExamId, new
                        {
                            class_id = exam.ClassId,
                            subject_id = exam.SubjectId,
                            exam_date = exam.ExamDate,
                            exam_type = exam.ExamType,
                            room_id = exam.RoomId,
                            session_no = exam.SessionNo,
                            auto_assigned = true
                        });
                    }
                }
                catch { }

                return Ok(new
                {
                    success = true,
                    message = $"✅ Tạo lịch thi thành công! Đã tạo {createdExams.Count} ca thi.",
                    data = createdExams
                });
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

        // ============================================================
        // 🔹 UPDATE - Cập nhật lịch thi
        // ============================================================
        [HttpPut("{id}")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> Update(string id, [FromBody] UpdateExamScheduleDto dto)
        {
            try
            {
                if (id != dto.ExamId)
                    return BadRequest(new { success = false, message = "ID không khớp!" });

                // Lấy exam hiện tại trước khi update
                var oldExam = await _service.GetByIdAsync(id);
                if (oldExam == null)
                    return NotFound(new { success = false, message = "Không tìm thấy lịch thi" });

                var actor = GetCurrentUserId() ?? "System";
                var exam = MapToExamSchedule(dto, oldExam);
                exam.UpdatedBy = actor;
                exam.UpdatedAt = DateTime.Now;

                await _service.UpdateAsync(exam);

                // ✅ Audit Log
                try
                {
                    await LogUpdateAsync("ExamSchedule", id, 
                        new { old_exam_date = oldExam.ExamDate, old_room_id = oldExam.RoomId },
                        new { new_exam_date = exam.ExamDate, new_room_id = exam.RoomId });
                }
                catch { }

                return Ok(new { success = true, message = "✅ Cập nhật lịch thi thành công!" });
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

        // ============================================================
        // 🔹 DELETE - Xóa lịch thi (soft delete)
        // ============================================================
        [HttpDelete("{id}")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var actor = GetCurrentUserId() ?? "System";

                // Lấy exam trước khi delete
                var exam = await _service.GetByIdAsync(id);
                if (exam == null)
                    return NotFound(new { success = false, message = "Không tìm thấy lịch thi" });

                await _service.DeleteAsync(id, actor);

                // ✅ Audit Log
                try
                {
                    await LogDeleteAsync("ExamSchedule", id, new
                    {
                        class_id = exam.ClassId,
                        subject_id = exam.SubjectId,
                        exam_date = exam.ExamDate
                    });
                }
                catch { }

                return Ok(new { success = true, message = "✅ Xóa lịch thi thành công!" });
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

        // ============================================================
        // 🔹 CANCEL - Hủy lịch thi
        // ============================================================
        [HttpPost("{id}/cancel")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> Cancel(string id)
        {
            try
            {
                var actor = GetCurrentUserId() ?? "System";
                await _service.CancelExamScheduleAsync(id, actor);

                return Ok(new { success = true, message = "✅ Hủy lịch thi thành công!" });
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

        // ============================================================
        // 🔹 GET EXAM ASSIGNMENTS - Lấy danh sách sinh viên trong ca thi (để nhập điểm)
        // ============================================================
        [HttpGet("{examId}/assignments")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Cố vấn xem danh sách sinh viên
        public async Task<IActionResult> GetExamAssignments(string examId)
        {
            try
            {
                var assignments = await _service.GetExamAssignmentsAsync(examId);
                return Ok(new { success = true, data = assignments, totalCount = assignments.Count });
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

        // ============================================================
        // 🔹 TRANSFER STUDENT - Chuyển sinh viên giữa các ca thi
        // ============================================================
        [HttpPost("{examId}/transfer-student")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> TransferStudent(
            string examId,
            [FromBody] TransferStudentDto dto)
        {
            try
            {
                var actor = GetCurrentUserId() ?? "System";
                await _service.TransferStudentBetweenSessionsAsync(dto.AssignmentId, dto.TargetExamId, actor);

                return Ok(new { success = true, message = "✅ Chuyển sinh viên thành công!" });
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

        // ============================================================
        // 🔹 ENTER EXAM SCORES - Nhập điểm cho kỳ thi
        // ============================================================
        [HttpPost("{examId}/scores")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> EnterExamScores(
            string examId,
            [FromBody] EnterExamScoresDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (dto.ExamId != examId)
                    return BadRequest(new { success = false, message = "Exam ID không khớp" });

                var enteredBy = GetCurrentUserId() ?? "System";
                dto.EnteredBy = enteredBy;

                if (_examScoreService == null)
                    return StatusCode(500, new { success = false, message = "ExamScoreService chưa được đăng ký" });

                await _examScoreService.EnterExamScoresAsync(examId, dto.Scores, dto.EnteredBy);

                // Audit log
                try
                {
                    await LogCreateAsync("ExamScores", examId, new
                    {
                        exam_id = examId,
                        scores_count = dto.Scores.Count,
                        entered_by = enteredBy
                    });
                }
                catch { }

                return Ok(new { success = true, message = "✅ Nhập điểm thành công!" });
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

        // ============================================================
        // 🔹 GET EXAM SCORES - Lấy danh sách điểm đã nhập cho kỳ thi
        // ============================================================
        [HttpGet("{examId}/scores")]
        [RequirePermission("ADVISOR_EXAM_SCHEDULES")] // ✅ Chỉ cố vấn mới có quyền
        public async Task<IActionResult> GetExamScores(string examId)
        {
            try
            {
                if (_examScoreService == null)
                    return StatusCode(500, new { success = false, message = "ExamScoreService chưa được đăng ký" });

                var scores = await _examScoreService.GetExamScoresAsync(examId);
                return Ok(new { success = true, data = scores, totalCount = scores.Count });
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

        // ============================================================
        // 🔹 HELPER METHODS - Mapping DTOs to Models
        // ============================================================
        private ExamSchedule MapToExamSchedule(CreateExamScheduleDto dto)
        {
            return new ExamSchedule
            {
                ExamId = string.Empty, // Will be generated by stored procedure
                ClassId = dto.ClassId,
                SubjectId = dto.SubjectId,
                ExamDate = dto.ExamDate,
                ExamTime = dto.ExamTime,
                EndTime = dto.EndTime,
                RoomId = dto.RoomId,
                ExamType = dto.ExamType,
                SessionNo = dto.SessionNo,
                ProctorLecturerId = dto.ProctorLecturerId,
                Duration = dto.Duration,
                MaxStudents = dto.MaxStudents,
                Notes = dto.Notes,
                Status = dto.Status ?? "PLANNED",
                SchoolYearId = dto.SchoolYearId,
                Semester = dto.Semester
            };
        }

        private ExamSchedule MapToExamSchedule(UpdateExamScheduleDto dto, ExamSchedule existingExam)
        {
            // Update only provided fields, keep existing values for null fields
            return new ExamSchedule
            {
                ExamId = dto.ExamId,
                ClassId = existingExam.ClassId, // Don't allow changing class/subject
                SubjectId = existingExam.SubjectId,
                ExamDate = dto.ExamDate ?? existingExam.ExamDate,
                ExamTime = dto.ExamTime ?? existingExam.ExamTime,
                EndTime = dto.EndTime ?? existingExam.EndTime,
                RoomId = dto.RoomId ?? existingExam.RoomId,
                SessionNo = dto.SessionNo ?? existingExam.SessionNo,
                ProctorLecturerId = dto.ProctorLecturerId ?? existingExam.ProctorLecturerId,
                Duration = dto.Duration ?? existingExam.Duration,
                MaxStudents = dto.MaxStudents ?? existingExam.MaxStudents,
                Notes = dto.Notes ?? existingExam.Notes,
                Status = dto.Status ?? existingExam.Status,
                SchoolYearId = existingExam.SchoolYearId, // Don't allow changing
                Semester = existingExam.Semester // Don't allow changing
            };
        }
    }

    // ============================================================
    // 🔹 DTO FOR TRANSFER STUDENT
    // ============================================================
    public class TransferStudentDto
    {
        public string AssignmentId { get; set; } = string.Empty;
        public string TargetExamId { get; set; } = string.Empty;
    }
}

