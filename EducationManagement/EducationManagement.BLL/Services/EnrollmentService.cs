using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Enrollment;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class EnrollmentService
    {
        private readonly EnrollmentRepository _enrollmentRepository;

        public EnrollmentService(EnrollmentRepository enrollmentRepository)
        {
            _enrollmentRepository = enrollmentRepository;
        }

        public async Task<List<Enrollment>> GetAllEnrollmentsAsync()
        {
            return await _enrollmentRepository.GetAllAsync();
        }

        public async Task<Enrollment?> GetEnrollmentByIdAsync(string enrollmentId)
        {
            if (string.IsNullOrWhiteSpace(enrollmentId))
                throw new ArgumentException("Enrollment ID không được để trống");

            return await _enrollmentRepository.GetByIdAsync(enrollmentId);
        }

        public async Task<List<Enrollment>> GetEnrollmentsByStudentAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _enrollmentRepository.GetByStudentIdAsync(studentId);
        }

        public async Task<List<Enrollment>> GetEnrollmentsByClassAsync(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _enrollmentRepository.GetByClassIdAsync(classId);
        }

        // ============================================================
        // 🔹 PHASE 2: ENROLLMENT SYSTEM - NEW METHODS
        // ============================================================

        // 1️⃣ GET AVAILABLE CLASSES FOR STUDENT
        public async Task<List<AvailableClassDto>> GetAvailableClassesAsync(
            string studentId,
            string academicYearId,
            int semester)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(academicYearId))
                throw new ArgumentException("Academic Year ID không được để trống");

            if (semester < 1 || semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");

            return await _enrollmentRepository.GetAvailableClassesAsync(studentId, academicYearId, semester);
        }

        // 2️⃣ CHECK ELIGIBILITY
        public async Task<EligibilityCheckResponse> CheckEligibilityAsync(string studentId, string classId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _enrollmentRepository.CheckEligibilityAsync(studentId, classId);
        }

        // 3️⃣ ENROLL IN CLASS
        public async Task<string> EnrollAsync(string studentId, string classId, string? notes, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            // Check eligibility first
            var eligibility = await _enrollmentRepository.CheckEligibilityAsync(studentId, classId);
            if (!eligibility.IsEligible)
            {
                throw new Exception($"Không thể đăng ký: {eligibility.ErrorMessage}");
            }

            // Create enrollment
            var enrollmentId = await _enrollmentRepository.CreateEnrollmentAsync(studentId, classId, notes, createdBy);

            // TODO: Send notification to student (optional)
            // await _notificationService.SendAsync(studentId, "Đăng ký thành công", ...);

            return enrollmentId;
        }

        // 4️⃣ DROP ENROLLMENT
        public async Task DropEnrollmentAsync(string enrollmentId, string reason, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(enrollmentId))
                throw new ArgumentException("Enrollment ID không được để trống");

            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Lý do hủy đăng ký không được để trống");

            if (string.IsNullOrWhiteSpace(deletedBy))
                throw new ArgumentException("DeletedBy không được để trống");

            // Get enrollment to check drop deadline
            var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId);
            if (enrollment == null)
                throw new Exception($"Không tìm thấy enrollment với ID: {enrollmentId}");

            // The SP will check drop deadline, but we can add extra validation here
            if (enrollment.DropDeadline.HasValue && DateTime.Now > enrollment.DropDeadline.Value)
                throw new Exception($"Đã quá hạn hủy đăng ký. Deadline: {enrollment.DropDeadline.Value:dd/MM/yyyy}");

            await _enrollmentRepository.DropEnrollmentAsync(enrollmentId, reason, deletedBy);

            // TODO: Send notification
        }

        // 5️⃣ BULK ENROLLMENT
        public async Task<(int SuccessCount, int ErrorCount, string ErrorDetails)> BulkEnrollAsync(
            string studentId,
            List<string> classIds,
            string createdBy)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (classIds == null || classIds.Count == 0)
                throw new ArgumentException("Danh sách lớp không được rỗng");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            return await _enrollmentRepository.BulkEnrollmentAsync(studentId, classIds, createdBy);
        }

        // 6️⃣ GET STUDENT SCHEDULE
        public async Task<List<StudentScheduleDto>> GetStudentScheduleAsync(
            string studentId,
            int semester,
            string academicYearId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (semester < 1 || semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");

            if (string.IsNullOrWhiteSpace(academicYearId))
                throw new ArgumentException("Academic Year ID không được để trống");

            return await _enrollmentRepository.GetStudentScheduleAsync(studentId, semester, academicYearId);
        }

        // 7️⃣ GET MY ENROLLMENTS (For Student View)
        public async Task<List<EnrollmentDetailDto>> GetMyEnrollmentsAsync(
            string studentId,
            string? academicYearId = null,
            int? semester = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _enrollmentRepository.GetEnrollmentsByStudentDetailedAsync(studentId, academicYearId, semester);
        }

        // 8️⃣ CHECK SCHEDULE CONFLICT
        public async Task<(bool HasConflict, string? ConflictDetails)> CheckScheduleConflictAsync(
            string studentId,
            string classId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _enrollmentRepository.CheckScheduleConflictAsync(studentId, classId);
        }

        // 9️⃣ GET CLASS ROSTER (For Lecturer)
        public async Task<List<Student>> GetClassRosterAsync(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _enrollmentRepository.GetClassRosterAsync(classId);
        }

        // 🔟 GET ENROLLMENT STATISTICS
        public async Task<Dictionary<string, int>> GetEnrollmentStatisticsAsync(
            string academicYearId,
            int semester)
        {
            if (string.IsNullOrWhiteSpace(academicYearId))
                throw new ArgumentException("Academic Year ID không được để trống");

            if (semester < 1 || semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");

            return await _enrollmentRepository.GetEnrollmentStatisticsAsync(academicYearId, semester);
        }

        // 1️⃣1️⃣ UPDATE ENROLLMENT STATUS (Admin Only)
        public async Task UpdateEnrollmentStatusAsync(string enrollmentId, string newStatus, string updatedBy)
        {
            if (string.IsNullOrWhiteSpace(enrollmentId))
                throw new ArgumentException("Enrollment ID không được để trống");

            if (string.IsNullOrWhiteSpace(newStatus))
                throw new ArgumentException("Status không được để trống");

            if (string.IsNullOrWhiteSpace(updatedBy))
                throw new ArgumentException("UpdatedBy không được để trống");

            // Validate status
            var validStatuses = new[] { "PENDING", "APPROVED", "DROPPED", "WITHDRAWN" };
            if (!Array.Exists(validStatuses, s => s == newStatus))
                throw new ArgumentException($"Status không hợp lệ. Phải là: {string.Join(", ", validStatuses)}");

            await _enrollmentRepository.UpdateEnrollmentStatusAsync(enrollmentId, newStatus, updatedBy);
        }

        // ============================================================
        // 🔹 PHASE 6: API CONTROLLER HELPERS
        // ============================================================

        // REGISTER (alias for EnrollAsync)
        public async Task<string> RegisterAsync(string studentId, string classId, string createdBy)
        {
            return await EnrollAsync(studentId, classId, null, createdBy);
        }

        // APPROVE
        public async Task ApproveAsync(string enrollmentId, string approvedBy)
        {
            await UpdateEnrollmentStatusAsync(enrollmentId, "APPROVED", approvedBy);
        }

        // GET PENDING ENROLLMENTS (For Advisor Approval)
        public async Task<(List<EnrollmentDetailDto> Enrollments, int TotalCount)> GetPendingEnrollmentsAsync(
            string? studentId = null,
            string? classId = null,
            string? subjectId = null,
            string? schoolYearId = null,
            int? semester = null,
            int page = 1,
            int pageSize = 50)
        {
            if (page < 1)
                throw new ArgumentException("Page phải lớn hơn 0");

            if (pageSize < 1 || pageSize > 100)
                throw new ArgumentException("PageSize phải từ 1 đến 100");

            return await _enrollmentRepository.GetPendingEnrollmentsAsync(
                studentId, classId, subjectId, schoolYearId, semester, page, pageSize);
        }

        // DROP (with deadline check)
        public async Task DropAsync(string enrollmentId, string reason, string deletedBy)
        {
            await DropEnrollmentAsync(enrollmentId, reason, deletedBy);
        }

        // WITHDRAW (Admin only, no deadline check)
        public async Task WithdrawAsync(string enrollmentId, string reason, string updatedBy)
        {
            // Similar to drop but bypasses deadline check (Admin privilege)
            if (string.IsNullOrWhiteSpace(enrollmentId))
                throw new ArgumentException("Enrollment ID không được để trống");

            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Lý do rút học phần không được để trống");

            if (string.IsNullOrWhiteSpace(updatedBy))
                throw new ArgumentException("UpdatedBy không được để trống");

            // Get enrollment
            var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId);
            if (enrollment == null)
                throw new Exception($"Không tìm thấy enrollment với ID: {enrollmentId}");

            // Update status to WITHDRAWN (no deadline check for admin)
            await UpdateEnrollmentStatusAsync(enrollmentId, "WITHDRAWN", updatedBy);

            // TODO: Send notification
        }

        // GET SUMMARY
        public async Task<EnrollmentSummaryDto> GetSummaryAsync(
            string studentId,
            int? semester = null,
            string? academicYearId = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            // Get enrollments for the student (filtered by semester/year if provided)
            var enrollments = await _enrollmentRepository.GetEnrollmentsByStudentDetailedAsync(
                studentId, academicYearId, semester);

            // Calculate summary statistics
            var summary = new EnrollmentSummaryDto
            {
                StudentId = studentId,
                StudentName = enrollments.FirstOrDefault()?.StudentName ?? "",
                AcademicYearId = academicYearId,
                Semester = semester,
                TotalEnrolled = enrollments.Count,
                TotalApproved = enrollments.Count(e => e.EnrollmentStatus == "APPROVED"),
                TotalPending = enrollments.Count(e => e.EnrollmentStatus == "PENDING"),
                TotalDropped = enrollments.Count(e => e.EnrollmentStatus == "DROPPED"),
                TotalWithdrawn = enrollments.Count(e => e.EnrollmentStatus == "WITHDRAWN"),
                TotalCredits = enrollments
                    .Where(e => e.EnrollmentStatus == "APPROVED")
                    .Sum(e => e.Credits ?? 0)
            };

            return summary;
        }

        // GET AVAILABLE CLASSES (with optional filters)
        public async Task<List<AvailableClassDto>> GetAvailableClassesAsync(
            string studentId,
            int? semester = null,
            string? academicYearId = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            // If no filters provided, return empty list or throw error
            if (!semester.HasValue || string.IsNullOrWhiteSpace(academicYearId))
            {
                // Return empty list if no filters (to prevent huge result sets)
                return new List<AvailableClassDto>();
            }

            return await _enrollmentRepository.GetAvailableClassesAsync(
                studentId, academicYearId, semester.Value);
        }
    }
}

