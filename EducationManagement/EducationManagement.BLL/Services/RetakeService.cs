using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Retake;
using EducationManagement.Common.Helpers;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class RetakeService
    {
        private readonly RetakeRepository _retakeRepository;
        private readonly EnrollmentRepository _enrollmentRepository;

        public RetakeService(RetakeRepository retakeRepository, EnrollmentRepository enrollmentRepository)
        {
            _retakeRepository = retakeRepository;
            _enrollmentRepository = enrollmentRepository;
        }

        /// <summary>
        /// Create retake record manually
        /// </summary>
        public async Task<string> CreateRetakeRecordAsync(RetakeRecordCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.EnrollmentId))
                throw new ArgumentException("Enrollment ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.StudentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.ClassId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.SubjectId))
                throw new ArgumentException("Subject ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new ArgumentException("Reason không được để trống");

            // Validate reason
            if (dto.Reason != "ATTENDANCE" && dto.Reason != "GRADE" && dto.Reason != "BOTH")
                throw new ArgumentException("Reason phải là ATTENDANCE, GRADE, hoặc BOTH");

            var retakeId = IdGenerator.Generate("retake");
            var result = await _retakeRepository.CreateAsync(
                retakeId,
                dto.EnrollmentId,
                dto.StudentId,
                dto.ClassId,
                dto.SubjectId,
                dto.Reason,
                dto.ThresholdValue,
                dto.CurrentValue,
                dto.CreatedBy ?? "system"
            );

            return result;
        }

        /// <summary>
        /// Get retake record by ID
        /// </summary>
        public async Task<RetakeRecord?> GetRetakeRecordByIdAsync(string retakeId)
        {
            if (string.IsNullOrWhiteSpace(retakeId))
                throw new ArgumentException("Retake ID không được để trống");

            return await _retakeRepository.GetByIdAsync(retakeId);
        }

        /// <summary>
        /// Get retake records by student ID
        /// </summary>
        public async Task<(List<RetakeRecord> Records, int TotalCount)> GetRetakeRecordsByStudentAsync(
            string studentId, string? status = null, int page = 1, int pageSize = 50)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 100) pageSize = 100;

            return await _retakeRepository.GetByStudentIdAsync(studentId, status, page, pageSize);
        }

        /// <summary>
        /// Get retake records by class ID
        /// </summary>
        public async Task<(List<RetakeRecord> Records, int TotalCount)> GetRetakeRecordsByClassAsync(
            string classId, string? status = null, int page = 1, int pageSize = 50)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 100) pageSize = 100;

            return await _retakeRepository.GetByClassIdAsync(classId, status, page, pageSize);
        }

        /// <summary>
        /// Get all retake records (for admin/advisor)
        /// </summary>
        public async Task<(List<RetakeRecord> Records, int TotalCount)> GetAllRetakeRecordsAsync(
            string? status = null, int page = 1, int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 100) pageSize = 100;

            return await _retakeRepository.GetAllAsync(status, page, pageSize);
        }

        /// <summary>
        /// Update retake status (approve/reject)
        /// </summary>
        public async Task UpdateRetakeStatusAsync(string retakeId, RetakeRecordUpdateDto dto)
        {
            if (string.IsNullOrWhiteSpace(retakeId))
                throw new ArgumentException("Retake ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.Status))
                throw new ArgumentException("Status không được để trống");

            // Validate status
            if (dto.Status != "PENDING" && dto.Status != "APPROVED" && 
                dto.Status != "REJECTED" && dto.Status != "COMPLETED")
                throw new ArgumentException("Status phải là PENDING, APPROVED, REJECTED, hoặc COMPLETED");

            await _retakeRepository.UpdateStatusAsync(
                retakeId,
                dto.Status,
                dto.AdvisorNotes,
                dto.UpdatedBy ?? "system"
            );
        }

        /// <summary>
        /// Check and create retake record automatically
        /// Called from GradeService or AdvisorService
        /// </summary>
        public async Task CheckAndCreateRetakeAsync(string enrollmentId, 
            decimal attendanceThreshold = 20.0m, decimal gradeThreshold = 5.0m)
        {
            if (string.IsNullOrWhiteSpace(enrollmentId))
                return;

            try
            {
                // Check if retake is required
                var (isRequired, reason, currentValue, studentId, classId, subjectId, thresholdValue) =
                    await _retakeRepository.CheckRetakeRequiredAsync(enrollmentId, attendanceThreshold, gradeThreshold);

                if (!isRequired)
                    return; // No retake needed or already exists

                if (string.IsNullOrWhiteSpace(studentId) || string.IsNullOrWhiteSpace(classId) || 
                    string.IsNullOrWhiteSpace(subjectId))
                    return; // Missing required data

                // Create retake record
                var retakeId = IdGenerator.Generate("retake");
                await _retakeRepository.CreateAsync(
                    retakeId,
                    enrollmentId,
                    studentId,
                    classId,
                    subjectId,
                    reason ?? "BOTH",
                    thresholdValue,
                    currentValue,
                    "system" // Auto-created by system
                );
            }
            catch (Exception ex)
            {
                // Log error silently
            }
        }

        /// <summary>
        /// Get retake record by enrollment ID (to check if exists)
        /// </summary>
        public async Task<RetakeRecord?> GetRetakeRecordByEnrollmentAsync(string enrollmentId)
        {
            if (string.IsNullOrWhiteSpace(enrollmentId))
                return null;

            return await _retakeRepository.GetByEnrollmentIdAsync(enrollmentId);
        }

        /// <summary>
        /// Get failed subjects by student
        /// </summary>
        public async Task<List<FailedSubjectDto>> GetFailedSubjectsByStudentAsync(
            string studentId, string? schoolYearId = null, int? semester = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _retakeRepository.GetFailedSubjectsByStudentAsync(studentId, schoolYearId, semester);
        }

        /// <summary>
        /// Get retake classes for a subject
        /// </summary>
        public async Task<List<RetakeClassDto>> GetRetakeClassesForSubjectAsync(
            string subjectId, string? studentId = null, string? periodId = null)
        {
            if (string.IsNullOrWhiteSpace(subjectId))
                throw new ArgumentException("Subject ID không được để trống");

            return await _retakeRepository.GetRetakeClassesForSubjectAsync(subjectId, studentId, periodId);
        }

        /// <summary>
        /// Register for retake class
        /// </summary>
        public async Task<string> RegisterForRetakeClassAsync(
            RegisterRetakeClassDto dto, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(dto.StudentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.ClassId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            // Use existing enrollment repository to register (it already handles retake eligibility check via SP)
            var enrollmentId = await _enrollmentRepository.CreateEnrollmentAsync(
                dto.StudentId,
                dto.ClassId,
                dto.Notes,
                createdBy
            );

            return enrollmentId;
        }
    }
}

