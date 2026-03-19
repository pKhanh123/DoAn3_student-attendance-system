using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Models;
using EducationManagement.BLL.Services;
using Microsoft.AspNetCore.Authorization;

namespace EducationManagement.API.Admin.Controllers
{
    /// <summary>
    /// Controller quản lý mối quan hệ giảng viên - môn học
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api-edu/lecturer-subjects")]
    public class LecturerSubjectController : BaseController
    {
        private readonly LecturerSubjectRepository _lecturerSubjectRepository;
        private readonly ClassRepository _classRepository;
        private readonly LecturerRepository _lecturerRepository;
        private readonly SubjectRepository _subjectRepository;

        public LecturerSubjectController(
            LecturerSubjectRepository lecturerSubjectRepository,
            ClassRepository classRepository,
            LecturerRepository lecturerRepository,
            SubjectRepository subjectRepository,
            AuditLogService auditLogService) : base(auditLogService)
        {
            try
            {
                _lecturerSubjectRepository = lecturerSubjectRepository ?? throw new ArgumentNullException(nameof(lecturerSubjectRepository));
                _classRepository = classRepository ?? throw new ArgumentNullException(nameof(classRepository));
                _lecturerRepository = lecturerRepository ?? throw new ArgumentNullException(nameof(lecturerRepository));
                _subjectRepository = subjectRepository ?? throw new ArgumentNullException(nameof(subjectRepository));
                
                // Log để debug
                Console.WriteLine("[LecturerSubjectController] ✅ Controller initialized successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LecturerSubjectController] ❌ Error initializing controller: {ex.Message}");
                throw;
            }
        }

        // ============================================================
        // 🔹 GET: Lấy tất cả assignments
        // ============================================================
        [HttpGet]
        [ProducesResponseType(200)]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var assignments = await _lecturerSubjectRepository.GetAllAsync();
                var allSubjects = await _subjectRepository.GetAllAsync();

                var result = assignments.Select(ls =>
                {
                    var subject = allSubjects.FirstOrDefault(s => s.SubjectId == ls.SubjectId);
                    return new
                    {
                        lecturerSubjectId = ls.LecturerSubjectId,
                        lecturerId = ls.LecturerId,
                        subjectId = ls.SubjectId,
                        subjectCode = subject?.SubjectCode ?? "",
                        subjectName = subject?.SubjectName ?? "",
                        credits = subject?.Credits ?? 0,
                        isPrimary = ls.IsPrimary,
                        experienceYears = ls.ExperienceYears,
                        notes = ls.Notes,
                        certifiedDate = ls.CertifiedDate
                    };
                }).ToList();

                return Ok(new { data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 GET: Test endpoint để kiểm tra controller hoạt động
        // ============================================================
        [HttpGet("test")]
        [AllowAnonymous] // Cho phép test không cần auth
        public IActionResult Test()
        {
            return Ok(new { message = "✅ LecturerSubjectController đang hoạt động!", timestamp = DateTime.Now });
        }

        // ============================================================
        // 🔹 GET: Lấy danh sách môn học mà giảng viên đang dạy
        // ============================================================
        [HttpGet("lecturer/{lecturerId}")]
        public async Task<IActionResult> GetSubjectsByLecturer(string lecturerId)
        {
            try
            {
                // Chỉ lấy từ lecturer_subjects table (database thực tế)
                List<LecturerSubject> assignments;
                try
                {
                    assignments = await _lecturerSubjectRepository.GetByLecturerIdAsync(lecturerId);
                }
                catch (Exception ex)
                {
                    // Nếu bảng chưa tồn tại, trả về mảng rỗng
                    Console.WriteLine($"[GetSubjectsByLecturer] Error: {ex.Message}");
                    return Ok(new { data = new List<object>() });
                }

                var allSubjects = await _subjectRepository.GetAllAsync();

                // Chỉ trả về dữ liệu từ lecturer_subjects table
                var result = assignments.Select(ls =>
                {
                    var subject = allSubjects.FirstOrDefault(s => s.SubjectId == ls.SubjectId);
                    return new
                    {
                        lecturerSubjectId = ls.LecturerSubjectId,
                        subjectId = ls.SubjectId,
                        subjectCode = subject?.SubjectCode ?? "",
                        subjectName = subject?.SubjectName ?? "",
                        credits = subject?.Credits ?? 0,
                        isPrimary = ls.IsPrimary,
                        experienceYears = ls.ExperienceYears,
                        notes = ls.Notes,
                        certifiedDate = ls.CertifiedDate
                    };
                }).ToList();

                return Ok(new { data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 GET: Lấy danh sách giảng viên đang dạy một môn học
        // ============================================================
        [HttpGet("subject/{subjectId}")]
        public async Task<IActionResult> GetLecturersBySubject(string subjectId)
        {
            try
            {
                var classes = await _classRepository.GetAllAsync();
                var subjectClasses = classes.FindAll(c => c.SubjectId == subjectId);
                
                // Get unique lecturers
                var lecturerIds = subjectClasses.Select(c => c.LecturerId).Distinct().ToList();
                var allLecturers = await _lecturerRepository.GetAllAsync();
                var lecturers = allLecturers.FindAll(l => lecturerIds.Contains(l.LecturerId));

                var result = lecturers.Select(l => new
                {
                    l.LecturerId,
                    l.UserId,
                    l.FullName,
                    l.Email,
                    l.DepartmentName,
                    l.AcademicTitle,
                    l.Degree,
                    ClassCount = subjectClasses.Count(c => c.LecturerId == l.LecturerId)
                });

                return Ok(new { data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 GET: Lấy giảng viên khả dụng cho môn học (trong cùng department)
        // ============================================================
        [HttpGet("available/{subjectId}")]
        public async Task<IActionResult> GetAvailableLecturersForSubject(string subjectId)
        {
            try
            {
                // Get subject to find its department
                var subject = await _subjectRepository.GetByIdAsync(subjectId);
                if (subject == null)
                    return NotFound(new { message = "Không tìm thấy môn học" });

                // Get all lecturers in the same department
                var allLecturers = await _lecturerRepository.GetAllAsync();
                var availableLecturers = allLecturers.FindAll(l => 
                    l.DepartmentId == subject.DepartmentId && l.IsActive);

                var result = availableLecturers.Select(l => new
                {
                    l.LecturerId,
                    l.UserId,
                    l.FullName,
                    l.Email,
                    l.DepartmentName,
                    l.AcademicTitle,
                    l.Degree,
                    l.Specialization,
                    l.Position
                });

                return Ok(new { data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 POST: Phân môn cho giảng viên
        // ============================================================
        [HttpPost]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] LecturerSubject model)
        {
            try
            {
                if (model == null)
                    return BadRequest(new { message = "❌ Dữ liệu không hợp lệ!" });

                if (string.IsNullOrEmpty(model.LecturerId))
                    return BadRequest(new { message = "❌ Vui lòng chọn giảng viên!" });

                if (string.IsNullOrEmpty(model.SubjectId))
                    return BadRequest(new { message = "❌ Vui lòng chọn môn học!" });

                // Validate lecturer exists
                var lecturer = await _lecturerRepository.GetByIdAsync(model.LecturerId);
                if (lecturer == null)
                    return BadRequest(new { message = "❌ Giảng viên không tồn tại" });

                // Validate subject exists
                var subject = await _subjectRepository.GetByIdAsync(model.SubjectId);
                if (subject == null)
                    return BadRequest(new { message = "❌ Môn học không tồn tại" });

                // Check if assignment already exists
                var exists = await _lecturerSubjectRepository.ExistsAsync(model.LecturerId, model.SubjectId);
                if (exists)
                    return BadRequest(new { message = "❌ Giảng viên đã được phân môn này rồi" });

                // Create new assignment
                model.LecturerSubjectId = Guid.NewGuid().ToString();
                model.CreatedAt = DateTime.Now;
                model.CreatedBy = GetCurrentUserId();
                model.IsActive = true;

                await _lecturerSubjectRepository.AddAsync(model);

                // ✅ Audit Log
                await LogCreateAsync("LecturerSubject", model.LecturerSubjectId, new
                {
                    lecturer_id = model.LecturerId,
                    subject_id = model.SubjectId,
                    is_primary = model.IsPrimary,
                    experience_years = model.ExperienceYears
                });

                return Ok(new { message = "✅ Phân môn thành công!", data = new { lecturerSubjectId = model.LecturerSubjectId } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 PUT: Cập nhật phân môn
        // ============================================================
        [HttpPut("{id}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Update(string id, [FromBody] LecturerSubject model)
        {
            try
            {
                if (id != model.LecturerSubjectId)
                    return BadRequest(new { message = "ID không khớp!" });

                // Check if assignment exists
                var existing = await _lecturerSubjectRepository.GetByIdAsync(id);
                if (existing == null)
                    return NotFound(new { message = "❌ Không tìm thấy phân môn" });

                // Validate lecturer exists
                var lecturer = await _lecturerRepository.GetByIdAsync(model.LecturerId);
                if (lecturer == null)
                    return BadRequest(new { message = "❌ Giảng viên không tồn tại" });

                // Validate subject exists
                var subject = await _subjectRepository.GetByIdAsync(model.SubjectId);
                if (subject == null)
                    return BadRequest(new { message = "❌ Môn học không tồn tại" });

                // Check if another assignment with same lecturer+subject exists (excluding current)
                var duplicate = await _lecturerSubjectRepository.GetByLecturerIdAsync(model.LecturerId);
                if (duplicate.Any(ls => ls.SubjectId == model.SubjectId && ls.LecturerSubjectId != id))
                    return BadRequest(new { message = "❌ Giảng viên đã được phân môn này rồi" });

                // Update assignment
                model.UpdatedBy = GetCurrentUserId();
                await _lecturerSubjectRepository.UpdateAsync(model);

                // ✅ Audit Log
                await LogUpdateAsync("LecturerSubject", id,
                    new { lecturer_id = existing.LecturerId, subject_id = existing.SubjectId, is_primary = existing.IsPrimary },
                    new { lecturer_id = model.LecturerId, subject_id = model.SubjectId, is_primary = model.IsPrimary });

                return Ok(new { message = "✅ Cập nhật phân môn thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // ============================================================
        // 🔹 DELETE: Xóa phân môn
        // ============================================================
        [HttpDelete("{id}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id) || id == "undefined")
                    return BadRequest(new { message = "❌ ID không hợp lệ!" });

                var assignment = await _lecturerSubjectRepository.GetByIdAsync(id);
                if (assignment == null)
                    return NotFound(new { message = "❌ Không tìm thấy phân môn" });

                await _lecturerSubjectRepository.DeleteAsync(id, GetCurrentUserId());

                // ✅ Audit Log
                await LogDeleteAsync("LecturerSubject", id, new
                {
                    lecturer_id = assignment.LecturerId,
                    subject_id = assignment.SubjectId
                });

                return Ok(new { message = "✅ Xóa phân môn thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}

