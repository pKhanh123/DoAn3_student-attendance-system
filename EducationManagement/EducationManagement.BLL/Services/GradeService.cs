using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Grade;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class GradeService
    {
        private readonly GradeRepository _gradeRepository;
        private readonly RetakeService? _retakeService;

        public GradeService(GradeRepository gradeRepository, RetakeService? retakeService = null)
        {
            _gradeRepository = gradeRepository;
            _retakeService = retakeService;
        }

        public async Task<List<Grade>> GetAllGradesAsync()
        {
            return await _gradeRepository.GetAllAsync();
        }

        public async Task<Grade?> GetGradeByIdAsync(string gradeId)
        {
            if (string.IsNullOrWhiteSpace(gradeId))
                throw new ArgumentException("Grade ID không được để trống");

            return await _gradeRepository.GetByIdAsync(gradeId);
        }

        public async Task<string> CreateGradeAsync(string gradeId, string studentId, string classId,
            string gradeType, decimal score, decimal maxScore, decimal weight, string? notes,
            string? gradedBy, string createdBy)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(gradeType))
                throw new ArgumentException("Grade type không được để trống");

            if (score < 0 || score > maxScore)
                throw new ArgumentException($"Điểm phải nằm trong khoảng 0 đến {maxScore}");

            return await _gradeRepository.CreateAsync(gradeId, studentId, classId,
                gradeType, score, maxScore, weight, notes, gradedBy, createdBy);
        }

        public async Task UpdateGradeAsync(string gradeId, string gradeType, decimal score,
            decimal maxScore, decimal weight, string? notes, string updatedBy)
        {
            if (string.IsNullOrWhiteSpace(gradeId))
                throw new ArgumentException("Grade ID không được để trống");

            if (score < 0 || score > maxScore)
                throw new ArgumentException($"Điểm phải nằm trong khoảng 0 đến {maxScore}");

            await _gradeRepository.UpdateAsync(gradeId, gradeType, score, maxScore, weight, notes, updatedBy);

            // ✅ Auto-create retake record if total_score < 5.0
            if (_retakeService != null)
            {
                try
                {
                    // Get grade to check total_score and get enrollment_id
                    var grade = await _gradeRepository.GetByIdAsync(gradeId);
                    if (grade != null && !string.IsNullOrWhiteSpace(grade.EnrollmentId))
                    {
                        // Check if total_score < 5.0 (grade threshold)
                        if (grade.TotalScore.HasValue && grade.TotalScore.Value < 5.0m)
                        {
                            // Trigger retake check (async, don't wait)
                            _ = Task.Run(async () =>
                            {
                                try
                                {
                                    await _retakeService.CheckAndCreateRetakeAsync(grade.EnrollmentId);
                                }
                                catch (Exception ex)
                                {
                                }
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                }
            }
        }

        public async Task DeleteGradeAsync(string gradeId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(gradeId))
                throw new ArgumentException("Grade ID không được để trống");

            await _gradeRepository.DeleteAsync(gradeId, deletedBy);
        }

        public async Task<List<Grade>> GetGradesByStudentAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _gradeRepository.GetByStudentIdAsync(studentId);
        }

        public async Task<List<Grade>> GetGradesByClassAsync(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _gradeRepository.GetByClassIdAsync(classId);
        }

        public async Task<List<Grade>> GetGradesByStudentSchoolYearAsync(string studentId, string? schoolYearId = null, string? semester = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _gradeRepository.GetByStudentSchoolYearAsync(studentId, schoolYearId, semester);
        }

        public async Task<GradeSummaryDto> GetGradeSummaryAsync(string studentId, string? schoolYearId = null, string? semester = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            var grades = await GetGradesByStudentSchoolYearAsync(studentId, schoolYearId, semester);
            
            var summary = new GradeSummaryDto
            {
                StudentId = studentId,
                SchoolYearId = schoolYearId,
                Semester = semester
            };

            if (grades.Count == 0)
            {
                return summary;
            }

            // Get student info from first grade
            var firstGrade = grades.First();
            summary.StudentCode = firstGrade.StudentCode ?? string.Empty;
            summary.StudentName = firstGrade.StudentName ?? string.Empty;
            summary.SchoolYearCode = firstGrade.SchoolYearCode;

            // Calculate GPA
            var gradesWithScore = grades.Where(g => g.TotalScore.HasValue && g.Credits.HasValue).ToList();
            
            if (gradesWithScore.Count > 0)
            {
                var totalScoreCredit = gradesWithScore.Sum(g => g.TotalScore!.Value * g.Credits!.Value);
                var totalCredits = gradesWithScore.Sum(g => g.Credits!.Value);
                
                summary.Gpa10 = totalCredits > 0 ? Math.Round(totalScoreCredit / totalCredits, 2) : 0;
                summary.TotalCredits = totalCredits;
                summary.AccumulatedCredits = gradesWithScore.Where(g => g.TotalScore!.Value >= 5.0m)
                    .Sum(g => g.Credits!.Value);

                // Convert GPA 10 to GPA 4
                summary.Gpa4 = summary.Gpa10 switch
                {
                    >= 9.0m => 4.0m,
                    >= 8.5m => 3.7m,
                    >= 8.0m => 3.5m,
                    >= 7.0m => 3.0m,
                    >= 6.5m => 2.5m,
                    >= 6.0m => 2.0m,
                    >= 5.5m => 1.5m,
                    >= 5.0m => 1.0m,
                    _ => 0.0m
                };

                // Determine rank (Tiếng Việt có dấu - encoding UTF-8)
                summary.RankText = summary.Gpa10 switch
                {
                    >= 9.0m => "Xuất sắc",
                    >= 8.0m => "Giỏi",
                    >= 7.0m => "Khá",
                    >= 5.5m => "Trung bình",
                    _ => "Yếu"
                };

                // Statistics
                summary.TotalSubjects = grades.Count;
                summary.PassedSubjects = gradesWithScore.Count(g => g.TotalScore!.Value >= 5.0m);
                summary.FailedSubjects = gradesWithScore.Count(g => g.TotalScore!.Value < 5.0m);
            }

            return summary;
        }

        public async Task<Common.DTOs.Grade.CumulativeGPADto?> GetCumulativeGPAAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _gradeRepository.GetCumulativeGPAAsync(studentId);
        }

        public async Task<List<Common.DTOs.Grade.TranscriptDto>> GetStudentTranscriptAsync(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _gradeRepository.GetStudentTranscriptAsync(studentId);
        }

        public async Task CalculateGPABySchoolYearAsync(string studentId, string schoolYearId, string? semester = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(schoolYearId))
                throw new ArgumentException("School Year ID không được để trống");

            await _gradeRepository.CalculateGPABySchoolYearAsync(studentId, schoolYearId, semester);
        }
    }
}

