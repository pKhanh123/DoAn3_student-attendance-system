using EducationManagement.BLL.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace EducationManagement.API.Admin.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api-edu/schedules")]
    public class ScheduleController : ControllerBase
    {
        private readonly ScheduleService _scheduleService;

        public ScheduleController(ScheduleService scheduleService)
        {
            _scheduleService = scheduleService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var schedules = await _scheduleService.GetAllSchedulesAsync();
                return Ok(new { data = schedules });
            }
            catch (Exception ex)
            {
                // Log chi tiết để debug
                var errorMessage = ex.Message;
                var innerException = ex.InnerException?.Message;
                var stackTrace = ex.StackTrace;
                
                return StatusCode(500, new { 
                    message = "Lỗi hệ thống", 
                    error = errorMessage,
                    innerException = innerException,
                    stackTrace = stackTrace?.Substring(0, Math.Min(500, stackTrace?.Length ?? 0))
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var schedule = await _scheduleService.GetScheduleByIdAsync(id);
                if (schedule == null)
                    return NotFound(new { message = "Không tìm thấy lịch học" });

                return Ok(new { data = schedule });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        [HttpGet("class/{classId}")]
        public async Task<IActionResult> GetByClass(string classId)
        {
            try
            {
                var schedules = await _scheduleService.GetSchedulesByClassAsync(classId);
                return Ok(new { data = schedules });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}

