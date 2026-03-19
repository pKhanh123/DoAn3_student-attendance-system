using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class GradeRepository
    {
        private readonly string _connectionString;

        public GradeRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        public async Task<List<Grade>> GetAllAsync()
        {
            var grades = new List<Grade>();
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetAllGrades");

            foreach (DataRow row in dt.Rows)
                grades.Add(MapToGradeWithDetails(row));

            return grades;
        }

        public async Task<Grade?> GetByIdAsync(string gradeId)
        {
            var param = new SqlParameter("@GradeId", gradeId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGradeById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToGradeWithDetails(dt.Rows[0]);
        }

        public async Task<string> CreateAsync(string gradeId, string studentId, string classId,
            string gradeType, decimal score, decimal maxScore, decimal weight, string? notes,
            string? gradedBy, string createdBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@GradeId", gradeId),
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ClassId", classId),
                new SqlParameter("@GradeType", gradeType),
                new SqlParameter("@Score", score),
                new SqlParameter("@MaxScore", maxScore),
                new SqlParameter("@Weight", weight),
                new SqlParameter("@Notes", (object?)notes ?? DBNull.Value),
                new SqlParameter("@GradedBy", (object?)gradedBy ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            var result = await DatabaseHelper.ExecuteScalarAsync(_connectionString, "sp_CreateGrade", parameters);
            return result?.ToString() ?? gradeId;
        }

        public async Task UpdateAsync(string gradeId, string gradeType, decimal score,
            decimal maxScore, decimal weight, string? notes, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@GradeId", gradeId),
                new SqlParameter("@GradeType", gradeType),
                new SqlParameter("@Score", score),
                new SqlParameter("@MaxScore", maxScore),
                new SqlParameter("@Weight", weight),
                new SqlParameter("@Notes", (object?)notes ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateGrade", parameters);
        }

        public async Task DeleteAsync(string gradeId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@GradeId", gradeId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteGrade", parameters);
        }

        public async Task<List<Grade>> GetByStudentIdAsync(string studentId)
        {
            var grades = new List<Grade>();
            var param = new SqlParameter("@StudentId", studentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGradesByStudent", param);

            foreach (DataRow row in dt.Rows)
                grades.Add(MapToGradeWithDetails(row));

            return grades;
        }

        public async Task<List<Grade>> GetByClassIdAsync(string classId)
        {
            var grades = new List<Grade>();
            var param = new SqlParameter("@ClassId", classId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGradesByClass", param);

            foreach (DataRow row in dt.Rows)
            {
                var grade = MapToGrade(row);
                
                // Add details from SP
                grade.StudentId = row.Table.Columns.Contains("student_id") ? row["student_id"]?.ToString() : null;
                grade.StudentCode = row.Table.Columns.Contains("student_code") ? row["student_code"]?.ToString() : null;
                grade.StudentName = row.Table.Columns.Contains("student_name") ? row["student_name"]?.ToString() : null;
                grade.ClassId = row.Table.Columns.Contains("class_id") ? row["class_id"]?.ToString() : null;
                
                grades.Add(grade);
            }

            return grades;
        }

        public async Task<List<Grade>> GetByStudentSchoolYearAsync(string studentId, string? schoolYearId = null, string? semester = null)
        {
            var grades = new List<Grade>();
            var parameters = new List<SqlParameter>
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value)
            };
            
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetGradesByStudentSchoolYear", parameters.ToArray());
            
            foreach (DataRow row in dt.Rows)
                grades.Add(MapToGradeWithDetails(row));
            
            return grades;
        }

        public async Task<EducationManagement.Common.DTOs.Grade.CumulativeGPADto?> GetCumulativeGPAAsync(string studentId)
        {
            var param = new SqlParameter("@StudentId", studentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetCumulativeGPA", param);

            if (dt.Rows.Count == 0)
                return null;

            var row = dt.Rows[0];
            return new EducationManagement.Common.DTOs.Grade.CumulativeGPADto
            {
                StudentId = row["student_id"]?.ToString() ?? string.Empty,
                StudentCode = row["student_code"]?.ToString() ?? string.Empty,
                StudentName = row["student_name"]?.ToString() ?? string.Empty,
                CumulativeGpa10 = row.Table.Columns.Contains("cumulative_gpa10") && row["cumulative_gpa10"] != DBNull.Value
                    ? Convert.ToDecimal(row["cumulative_gpa10"]) : null,
                CumulativeGpa4 = row.Table.Columns.Contains("cumulative_gpa4") && row["cumulative_gpa4"] != DBNull.Value
                    ? Convert.ToDecimal(row["cumulative_gpa4"]) : null,
                TotalCreditsEarned = row.Table.Columns.Contains("total_credits_earned") && row["total_credits_earned"] != DBNull.Value
                    ? Convert.ToInt32(row["total_credits_earned"]) : 0,
                AccumulatedCredits = row.Table.Columns.Contains("accumulated_credits") && row["accumulated_credits"] != DBNull.Value
                    ? Convert.ToInt32(row["accumulated_credits"]) : 0,
                TotalSubjects = row.Table.Columns.Contains("total_subjects") && row["total_subjects"] != DBNull.Value
                    ? Convert.ToInt32(row["total_subjects"]) : 0,
                PassedSubjects = row.Table.Columns.Contains("passed_subjects") && row["passed_subjects"] != DBNull.Value
                    ? Convert.ToInt32(row["passed_subjects"]) : 0,
                FailedSubjects = row.Table.Columns.Contains("failed_subjects") && row["failed_subjects"] != DBNull.Value
                    ? Convert.ToInt32(row["failed_subjects"]) : 0,
                OverallRank = row.Table.Columns.Contains("overall_rank") ? row["overall_rank"]?.ToString() : null
            };
        }

        public async Task<List<EducationManagement.Common.DTOs.Grade.TranscriptDto>> GetStudentTranscriptAsync(string studentId)
        {
            var transcripts = new List<EducationManagement.Common.DTOs.Grade.TranscriptDto>();
            var param = new SqlParameter("@StudentId", studentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetStudentTranscript", param);

            foreach (DataRow row in dt.Rows)
            {
                transcripts.Add(new EducationManagement.Common.DTOs.Grade.TranscriptDto
                {
                    GpaId = row["gpa_id"]?.ToString() ?? string.Empty,
                    StudentId = row["student_id"]?.ToString() ?? string.Empty,
                    StudentCode = row["student_code"]?.ToString() ?? string.Empty,
                    StudentName = row["student_name"]?.ToString() ?? string.Empty,
                    AcademicYearId = row.Table.Columns.Contains("academic_year_id") ? row["academic_year_id"]?.ToString() : null,
                    AcademicYearName = row.Table.Columns.Contains("academic_year_name") ? row["academic_year_name"]?.ToString() : null,
                    CohortCode = row.Table.Columns.Contains("cohort_code") ? row["cohort_code"]?.ToString() : null,
                    SchoolYearId = row.Table.Columns.Contains("school_year_id") ? row["school_year_id"]?.ToString() : null,
                    SchoolYearCode = row.Table.Columns.Contains("school_year_code") ? row["school_year_code"]?.ToString() : null,
                    SchoolYearName = row.Table.Columns.Contains("school_year_name") ? row["school_year_name"]?.ToString() : null,
                    Semester = row.Table.Columns.Contains("semester") && row["semester"] != DBNull.Value
                        ? Convert.ToInt32(row["semester"]) : null,
                    SemesterText = row.Table.Columns.Contains("semester_text") ? row["semester_text"]?.ToString() : null,
                    Gpa10 = row.Table.Columns.Contains("gpa10") && row["gpa10"] != DBNull.Value
                        ? Convert.ToDecimal(row["gpa10"]) : null,
                    Gpa4 = row.Table.Columns.Contains("gpa4") && row["gpa4"] != DBNull.Value
                        ? Convert.ToDecimal(row["gpa4"]) : null,
                    TotalCredits = row.Table.Columns.Contains("total_credits") && row["total_credits"] != DBNull.Value
                        ? Convert.ToInt32(row["total_credits"]) : null,
                    AccumulatedCredits = row.Table.Columns.Contains("accumulated_credits") && row["accumulated_credits"] != DBNull.Value
                        ? Convert.ToInt32(row["accumulated_credits"]) : null,
                    RankText = row.Table.Columns.Contains("rank_text") ? row["rank_text"]?.ToString() : null,
                    CalculatedAt = row.Table.Columns.Contains("calculated_at") && row["calculated_at"] != DBNull.Value
                        ? Convert.ToDateTime(row["calculated_at"]) : null
                });
            }

            return transcripts;
        }

        public async Task CalculateGPABySchoolYearAsync(string studentId, string schoolYearId, string? semester = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", schoolYearId),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CalculateGPABySchoolYear", parameters);
        }

        private static Grade MapToGrade(DataRow row)
        {
            return new Grade
            {
                GradeId = row["grade_id"].ToString()!,
                EnrollmentId = row.Table.Columns.Contains("enrollment_id") ? row["enrollment_id"].ToString()! : string.Empty,
                MidtermScore = row.Table.Columns.Contains("midterm_score") && row["midterm_score"] != DBNull.Value 
                    ? Convert.ToDecimal(row["midterm_score"]) : null,
                FinalScore = row.Table.Columns.Contains("final_score") && row["final_score"] != DBNull.Value 
                    ? Convert.ToDecimal(row["final_score"]) : null,
                TotalScore = row.Table.Columns.Contains("total_score") && row["total_score"] != DBNull.Value 
                    ? Convert.ToDecimal(row["total_score"]) : null,
                LetterGrade = row.Table.Columns.Contains("letter_grade") ? row["letter_grade"]?.ToString() : null,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["created_at"]) 
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value 
                    ? Convert.ToDateTime(row["updated_at"]) 
                    : (DateTime?)null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null
            };
        }

        private static Grade MapToGradeWithDetails(DataRow row)
        {
            var grade = MapToGrade(row);
            
            // Map additional NotMapped properties from SP
            grade.StudentId = row.Table.Columns.Contains("student_id") ? row["student_id"]?.ToString() : null;
            grade.StudentCode = row.Table.Columns.Contains("student_code") ? row["student_code"]?.ToString() : null;
            grade.StudentName = row.Table.Columns.Contains("student_name") ? row["student_name"]?.ToString() : null;
            grade.ClassId = row.Table.Columns.Contains("class_id") ? row["class_id"]?.ToString() : null;
            grade.ClassName = row.Table.Columns.Contains("class_name") ? row["class_name"]?.ToString() : null;
            grade.ClassCode = row.Table.Columns.Contains("class_code") ? row["class_code"]?.ToString() : null;
            grade.SchoolYearId = row.Table.Columns.Contains("school_year_id") ? row["school_year_id"]?.ToString() : null;
            grade.SchoolYearCode = row.Table.Columns.Contains("school_year_code") ? row["school_year_code"]?.ToString() : null;
            grade.Semester = row.Table.Columns.Contains("semester") ? row["semester"]?.ToString() : null;
            grade.SubjectName = row.Table.Columns.Contains("subject_name") ? row["subject_name"]?.ToString() : null;
            grade.Credits = row.Table.Columns.Contains("credits") && row["credits"] != DBNull.Value 
                ? Convert.ToInt32(row["credits"]) : null;
            
            return grade;
        }
    }
}

