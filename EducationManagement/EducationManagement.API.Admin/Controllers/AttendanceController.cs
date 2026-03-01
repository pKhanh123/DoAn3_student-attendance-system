using EducationManagement.BLL.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using EducationManagement.Common.Helpers;
using System.Threading.Tasks;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/attendances")]
    public class AttendanceController : BaseController
    {
        private readonly AttendanceService _attendanceService;

        public AttendanceController(AttendanceService attendanceService, AuditLogService auditLogService) 
            : base(auditLogService)
        {
            _attendanceService = attendanceService;
        }

        /// <summary>
        /// Lấy tất cả attendance records
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var attendances = await _attendanceService.GetAllAttendancesAsync();
                return Ok(new { data = attendances });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy attendance theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var attendance = await _attendanceService.GetAttendanceByIdAsync(id);
                if (attendance == null)
                    return NotFound(new { message = "Không tìm thấy bản ghi điểm danh" });

                return Ok(new { data = attendance });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Tạo attendance record mới
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAttendanceRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var attendanceId = IdGenerator.Generate("att");
                var newId = await _attendanceService.CreateAttendanceAsync(
                    attendanceId,
                    request.StudentId,
                    request.ScheduleId,
                    request.AttendanceDate ?? DateTime.Now,
                    request.Status,
                    request.Notes,
                    request.MarkedBy ?? GetCurrentUserId(),
                    request.CreatedBy ?? GetCurrentUserId() ?? "system"
                );

                // ✅ Audit log: Tạo bản ghi điểm danh
                await LogCreateAsync("Attendance", newId, new
                {
                    student_id = request.StudentId,
                    schedule_id = request.ScheduleId,
                    attendance_date = request.AttendanceDate ?? DateTime.Now,
                    status = request.Status,
                    marked_by = request.MarkedBy ?? GetCurrentUserId(),
                    action_description = $"Điểm danh sinh viên: Status={request.Status}, Ngày={request.AttendanceDate:dd/MM/yyyy}"
                });

                return Ok(new { message = "Tạo bản ghi điểm danh thành công", attendanceId = newId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật attendance
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateAttendanceRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Lấy thông tin cũ trước khi update
                var oldAttendance = await _attendanceService.GetAttendanceByIdAsync(id);
                
                await _attendanceService.UpdateAttendanceAsync(
                    id,
                    request.Status,
                    request.Notes,
                    request.UpdatedBy ?? GetCurrentUserId() ?? "system"
                );

                // ✅ Audit log: Cập nhật điểm danh
                await LogUpdateAsync("Attendance", id,
                    oldAttendance != null ? new
                    {
                        status = oldAttendance.Status,
                        notes = oldAttendance.Notes
                    } : null,
                    new
                    {
                        status = request.Status,
                        notes = request.Notes,
                        updated_by = request.UpdatedBy ?? GetCurrentUserId() ?? "system",
                        action_description = $"Cập nhật điểm danh: Status từ {oldAttendance?.Status} → {request.Status}"
                    });

                return Ok(new { message = "Cập nhật điểm danh thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Xóa attendance (soft delete)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id, [FromBody] DeleteAttendanceRequest request)
        {
            try
            {
                // Lấy thông tin attendance trước khi xóa
                var attendance = await _attendanceService.GetAttendanceByIdAsync(id);
                var deletedBy = request.DeletedBy ?? GetCurrentUserId() ?? "system";
                
                await _attendanceService.DeleteAttendanceAsync(id, deletedBy);
                
                // ✅ Audit log: Xóa bản ghi điểm danh
                await LogDeleteAsync("Attendance", id, new
                {
                    student_id = attendance?.StudentId,
                    attendance_date = attendance?.AttendanceDate,
                    status = attendance?.Status,
                    deleted_by = deletedBy,
                    action_description = $"Xóa bản ghi điểm danh: AttendanceId={id}, Ngày={attendance?.AttendanceDate:dd/MM/yyyy}"
                });
                
                return Ok(new { message = "Xóa bản ghi điểm danh thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy attendances theo student ID
        /// </summary>
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetByStudent(string studentId)
        {
            try
            {
                var attendances = await _attendanceService.GetAttendancesByStudentAsync(studentId);
                return Ok(new { data = attendances });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy attendances theo schedule ID
        /// </summary>
        [HttpGet("schedule/{scheduleId}")]
        public async Task<IActionResult> GetBySchedule(string scheduleId)
        {
            try
            {
                var attendances = await _attendanceService.GetAttendancesByScheduleAsync(scheduleId);
                return Ok(new { data = attendances });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy attendances theo class ID
        /// </summary>
        [HttpGet("class/{classId}")]
        public async Task<IActionResult> GetByClass(string classId)
        {
            try
            {
                var attendances = await _attendanceService.GetAttendancesByClassAsync(classId);
                return Ok(new { data = attendances });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }

    // DTOs for Attendance
    public class CreateAttendanceRequest
    {
        public string StudentId { get; set; } = string.Empty;
        public string ScheduleId { get; set; } = string.Empty;
        public DateTime? AttendanceDate { get; set; }
        public string Status { get; set; } = "Present"; // Present, Absent, Late, Excused
        public string? Notes { get; set; }
        public string? MarkedBy { get; set; }
        public string? CreatedBy { get; set; }
    }

    public class UpdateAttendanceRequest
    {
        public string Status { get; set; } = "Present";
        public string? Notes { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class DeleteAttendanceRequest
    {
        public string? DeletedBy { get; set; }
    }
}

