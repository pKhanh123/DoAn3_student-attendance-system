using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EducationManagement.Common.DTOs.Exam;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class ExamScoreService
    {
        private readonly ExamScoreRepository _examScoreRepository;
        private readonly ExamScheduleRepository _examScheduleRepository;
        private readonly ExamAssignmentRepository _examAssignmentRepository;

        public ExamScoreService(
            ExamScoreRepository examScoreRepository,
            ExamScheduleRepository examScheduleRepository,
            ExamAssignmentRepository examAssignmentRepository)
        {
            _examScoreRepository = examScoreRepository;
            _examScheduleRepository = examScheduleRepository;
            _examAssignmentRepository = examAssignmentRepository;
        }

        // ============================================================
        // 🔹 NHẬP ĐIỂM CHO KỲ THI
        // ============================================================
        public async Task EnterExamScoresAsync(string examId, List<ExamScoreDto> scores, string enteredBy)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            if (scores == null || scores.Count == 0)
                throw new ArgumentException("Danh sách điểm không được để trống");

            // Validate exam exists
            var exam = await _examScheduleRepository.GetByIdAsync(examId);
            if (exam == null)
                throw new ArgumentException("Không tìm thấy lịch thi");

            // Validate scores
            foreach (var score in scores)
            {
                if (score.Score < 0 || score.Score > 10)
                    throw new ArgumentException($"Điểm phải nằm trong khoảng 0-10 (Sinh viên: {score.StudentId})");

                // Validate assignment exists
                var assignments = await _examAssignmentRepository.GetByExamAsync(examId);
                if (!assignments.Any(a => a.AssignmentId == score.AssignmentId))
                    throw new ArgumentException($"Không tìm thấy phân công cho Assignment ID: {score.AssignmentId}");
            }

            // Enter scores (stored procedure sẽ tự động gán vào grades)
            await _examScoreRepository.EnterExamScoresAsync(examId, scores, enteredBy);
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH ĐIỂM ĐÃ NHẬP CHO KỲ THI
        // ============================================================
        public async Task<List<ExamScoreDto>> GetExamScoresAsync(string examId)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            return await _examScoreRepository.GetExamScoresAsync(examId);
        }
    }
}

