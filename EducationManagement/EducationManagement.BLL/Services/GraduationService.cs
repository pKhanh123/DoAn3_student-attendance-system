using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class GraduationService
    {
        private readonly GraduationRepository _repository;

        public GraduationService(GraduationRepository repository)
        {
            _repository = repository;
        }

        public async Task<string> CreateRequirementAsync(string majorId, int requiredCredits, decimal minGpa, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(majorId))
                throw new ArgumentException("Major ID không được để trống");

            if (requiredCredits <= 0)
                throw new ArgumentException("Số tín chỉ yêu cầu phải lớn hơn 0");

            if (minGpa < 0 || minGpa > 10)
                throw new ArgumentException("GPA tối thiểu phải từ 0 đến 10");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            return await _repository.CreateRequirementAsync(majorId, requiredCredits, minGpa, createdBy);
        }

        public async Task<DataTable> GetRequirementByMajorAsync(string majorId)
        {
            if (string.IsNullOrWhiteSpace(majorId))
                throw new ArgumentException("Major ID không được để trống");

            return await _repository.GetRequirementByMajorAsync(majorId);
        }

        public async Task<DataTable> CheckEligibilityAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _repository.CheckEligibilityAsync(studentId);
        }

        public async Task<string> CreateApplicationAsync(string studentId, string schoolYearId, int semester, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(schoolYearId))
                throw new ArgumentException("School Year ID không được để trống");

            if (semester < 1 || semester > 3)
                throw new ArgumentException("Học kỳ phải là 1, 2, hoặc 3");

            if (string.IsNullOrWhiteSpace(createdBy))
                throw new ArgumentException("CreatedBy không được để trống");

            // Check eligibility before creating application
            var eligibility = await _repository.CheckEligibilityAsync(studentId);
            if (eligibility.Rows.Count > 0)
            {
                var isEligible = eligibility.Rows[0]["IsEligible"] != DBNull.Value && Convert.ToBoolean(eligibility.Rows[0]["IsEligible"]);
                if (!isEligible)
                {
                    var reason = eligibility.Rows[0]["Reason"]?.ToString() ?? "Không đủ điều kiện tốt nghiệp";
                    throw new InvalidOperationException($"Sinh viên không đủ điều kiện tốt nghiệp: {reason}");
                }
            }

            return await _repository.CreateApplicationAsync(studentId, schoolYearId, semester, createdBy);
        }

        public async Task<DataTable> GetApplicationsByStudentAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _repository.GetApplicationsByStudentAsync(studentId);
        }

        public async Task<DataTable> GetApplicationByIdAsync(string applicationId)
        {
            if (string.IsNullOrWhiteSpace(applicationId))
                throw new ArgumentException("Application ID không được để trống");

            return await _repository.GetApplicationByIdAsync(applicationId);
        }

        public async Task<DataTable> GetAllApplicationsAsync(string? academicYearId = null, int pageNumber = 1, int pageSize = 20)
        {
            if (pageNumber < 1)
                throw new ArgumentException("Page number phải lớn hơn 0");

            if (pageSize < 1 || pageSize > 100)
                throw new ArgumentException("Page size phải từ 1 đến 100");

            return await _repository.GetAllApplicationsAsync(academicYearId, pageNumber, pageSize);
        }

        public async Task UpdateApplicationStatusAsync(string applicationId, string status, string? verifiedBy, string? approvedBy, string? note)
        {
            if (string.IsNullOrWhiteSpace(applicationId))
                throw new ArgumentException("Application ID không được để trống");

            if (string.IsNullOrWhiteSpace(status))
                throw new ArgumentException("Status không được để trống");

            var validStatuses = new[] { "PENDING", "VERIFIED", "APPROVED", "REJECTED", "DIPLOMA_ISSUED" };
            if (Array.IndexOf(validStatuses, status) == -1)
                throw new ArgumentException($"Status không hợp lệ. Phải là một trong: {string.Join(", ", validStatuses)}");

            await _repository.UpdateApplicationStatusAsync(applicationId, status, verifiedBy, approvedBy, note);
        }

        public async Task IssueDiplomaAsync(string applicationId, string diplomaNumber, DateTime issueDate, string issuedBy)
        {
            if (string.IsNullOrWhiteSpace(applicationId))
                throw new ArgumentException("Application ID không được để trống");

            if (string.IsNullOrWhiteSpace(diplomaNumber))
                throw new ArgumentException("Diploma Number không được để trống");

            if (string.IsNullOrWhiteSpace(issuedBy))
                throw new ArgumentException("IssuedBy không được để trống");

            await _repository.IssueDiplomaAsync(applicationId, diplomaNumber, issueDate, issuedBy);
        }
    }
}
