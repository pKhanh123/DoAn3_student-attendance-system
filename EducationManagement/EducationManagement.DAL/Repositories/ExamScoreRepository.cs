using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Exam;
using System.Text.Json;

namespace EducationManagement.DAL.Repositories
{
    public class ExamScoreRepository
    {
        private readonly string _connectionString;

        public ExamScoreRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 NHẬP ĐIỂM CHO KỲ THI (TỰ ĐỘNG GÁN VÀO GRADES)
        // ============================================================
        public async Task EnterExamScoresAsync(string examId, List<ExamScoreDto> scores, string enteredBy)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            if (scores == null || scores.Count == 0)
                throw new ArgumentException("Danh sách điểm không được để trống");

            // Serialize scores to JSON
            var scoresJson = JsonSerializer.Serialize(scores);

            var parameters = new[]
            {
                new SqlParameter("@ExamId", examId),
                new SqlParameter("@EnteredBy", enteredBy),
                new SqlParameter("@Scores", scoresJson)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_EnterExamScores", parameters);
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH ĐIỂM ĐÃ NHẬP CHO KỲ THI
        // ============================================================
        public async Task<List<ExamScoreDto>> GetExamScoresAsync(string examId)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            var parameters = new[] { new SqlParameter("@ExamId", examId) };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetExamScores", parameters);

            var scores = new List<ExamScoreDto>();
            foreach (DataRow row in dt.Rows)
            {
                scores.Add(new ExamScoreDto
                {
                    AssignmentId = row["assignment_id"]?.ToString() ?? string.Empty,
                    StudentId = row["student_id"]?.ToString() ?? string.Empty,
                    EnrollmentId = row["enrollment_id"]?.ToString() ?? string.Empty,
                    Score = row["score"] != DBNull.Value ? Convert.ToDecimal(row["score"]) : 0,
                    Status = row["status"]?.ToString() ?? "ASSIGNED",
                    Notes = row["notes"]?.ToString()
                });
            }

            return scores;
        }
    }
}

