using System;
using System.Threading.Tasks;
using EducationManagement.Common.DTOs.Report;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class ReportService
    {
        private readonly ReportRepository _reportRepository;

        public ReportService(ReportRepository reportRepository)
        {
            _reportRepository = reportRepository;
        }

        /// <summary>
        /// Get admin reports
        /// </summary>
        public async Task<AdminReportDto> GetAdminReportAsync(
            string? schoolYearId = null,
            int? semester = null,
            string? facultyId = null,
            string? majorId = null)
        {
            return await _reportRepository.GetAdminReportAsync(schoolYearId, semester, facultyId, majorId);
        }

        /// <summary>
        /// Get advisor reports
        /// </summary>
        public async Task<AdvisorReportDto> GetAdvisorReportAsync(
            string? schoolYearId = null,
            int? semester = null,
            string? facultyId = null,
            string? majorId = null,
            string? classId = null,
            int? cohortYear = null)
        {
            // TODO: Implement advisor reports
            return new AdvisorReportDto();
        }

        /// <summary>
        /// Get lecturer reports
        /// </summary>
        public async Task<LecturerReportDto> GetLecturerReportAsync(
            string? schoolYearId = null,
            int? semester = null,
            string? classId = null)
        {
            // TODO: Implement lecturer reports
            return new LecturerReportDto();
        }

        /// <summary>
        /// Get student reports
        /// </summary>
        public async Task<StudentReportDto> GetStudentReportAsync(
            string studentId,
            string? schoolYearId = null,
            int? semester = null)
        {
            return await _reportRepository.GetStudentReportAsync(studentId, schoolYearId, semester);
        }
    }
}
