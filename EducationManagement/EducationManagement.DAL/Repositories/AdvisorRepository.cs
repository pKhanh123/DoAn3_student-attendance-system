using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.DTOs.Advisor;

namespace EducationManagement.DAL.Repositories
{
    public class AdvisorRepository
    {
        private readonly string _connectionString;

        public AdvisorRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        /// <summary>
        /// Get dashboard statistics for advisor
        /// </summary>
        public async Task<AdvisorDashboardStatsDto> GetDashboardStatsAsync(
            string? facultyId = null,
            string? majorId = null,
            string? classId = null)
        {
            var stats = new AdvisorDashboardStatsDto();

            var parameters = new[]
            {
                new SqlParameter("@FacultyId", (object?)facultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)majorId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorDashboardStats", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read total students
                if (await reader.ReadAsync())
                {
                    stats.TotalStudents = reader["total_students"] != DBNull.Value 
                        ? Convert.ToInt32(reader["total_students"]) 
                        : 0;
                }

                // Read warning attendance count
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    stats.WarningAttendanceStudents = reader["warning_attendance_count"] != DBNull.Value 
                        ? Convert.ToInt32(reader["warning_attendance_count"]) 
                        : 0;
                }

                // Read low GPA count
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    stats.LowGpaStudents = reader["low_gpa_count"] != DBNull.Value 
                        ? Convert.ToInt32(reader["low_gpa_count"]) 
                        : 0;
                }

                // Read excellent count
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    stats.ExcellentStudents = reader["excellent_count"] != DBNull.Value 
                        ? Convert.ToInt32(reader["excellent_count"]) 
                        : 0;
                }

                // Read average attendance rate
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    stats.AverageAttendanceRate = reader["avg_attendance_rate"] != DBNull.Value 
                        ? Convert.ToDecimal(reader["avg_attendance_rate"]) 
                        : 0;
                }

                // Read average pass rate
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    stats.AveragePassRate = reader["avg_pass_rate"] != DBNull.Value 
                        ? Convert.ToDecimal(reader["avg_pass_rate"]) 
                        : 0;
                }

                // Read average GPA
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    stats.AverageGpa = reader["avg_gpa"] != DBNull.Value 
                        ? Convert.ToDecimal(reader["avg_gpa"]) 
                        : 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting dashboard stats: {ex.Message}", ex);
            }

            return stats;
        }

        /// <summary>
        /// Get warning students (students with attendance or academic issues)
        /// </summary>
        public async Task<(List<WarningStudentDto> Students, int TotalCount)> GetWarningStudentsAsync(
            int page = 1,
            int pageSize = 20,
            string? facultyId = null,
            string? majorId = null,
            string? classId = null)
        {
            var students = new List<WarningStudentDto>();
            int totalCount = 0;

            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@FacultyId", (object?)facultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)majorId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorWarningStudents", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read students
                while (await reader.ReadAsync())
                {
                    students.Add(new WarningStudentDto
                    {
                        StudentId = reader["student_id"].ToString() ?? string.Empty,
                        StudentCode = reader["student_code"].ToString() ?? string.Empty,
                        FullName = reader["full_name"].ToString() ?? string.Empty,
                        ClassName = reader["class_name"]?.ToString(),
                        FacultyName = reader["faculty_name"]?.ToString(),
                        MajorName = reader["major_name"]?.ToString(),
                        Gpa = reader["gpa"] != DBNull.Value ? Convert.ToDecimal(reader["gpa"]) : null,
                        AttendanceRate = reader["attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["attendance_rate"]) : null,
                        WarningType = reader["warning_type"].ToString() ?? string.Empty,
                        Priority = reader["priority"] != DBNull.Value ? Convert.ToInt32(reader["priority"]) : 0
                    });
                }

                // Read total count
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    totalCount = reader["total_count"] != DBNull.Value 
                        ? Convert.ToInt32(reader["total_count"]) 
                        : 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting warning students: {ex.Message}", ex);
            }

            return (students, totalCount);
        }

        /// <summary>
        /// Get student detail with academic summary
        /// </summary>
        public async Task<AdvisorStudentDetailDto?> GetStudentDetailAsync(string studentId)
        {
            var param = new SqlParameter("@StudentId", studentId);

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudentDetail", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.Add(param);

                using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    return new AdvisorStudentDetailDto
                    {
                        StudentId = reader["student_id"].ToString() ?? string.Empty,
                        StudentCode = reader["student_code"].ToString() ?? string.Empty,
                        FullName = reader["full_name"].ToString() ?? string.Empty,
                        Gender = reader["gender"]?.ToString(),
                        Dob = reader["dob"] != DBNull.Value ? Convert.ToDateTime(reader["dob"]) : null,
                        Email = reader["email"]?.ToString(),
                        Phone = reader["phone"]?.ToString(),
                        FacultyId = reader["faculty_id"]?.ToString(),
                        FacultyName = reader["faculty_name"]?.ToString(),
                        MajorId = reader["major_id"]?.ToString(),
                        MajorName = reader["major_name"]?.ToString(),
                        AcademicYearId = reader["academic_year_id"]?.ToString(),
                        AcademicYearName = reader["academic_year_name"]?.ToString(),
                        ClassId = reader["class_id"]?.ToString(),
                        ClassName = reader["class_name"]?.ToString(),
                        CohortYear = reader["cohort_year"]?.ToString(),
                        IsActive = reader["is_active"] != DBNull.Value && Convert.ToBoolean(reader["is_active"]),
                        CumulativeGpa = reader["cumulative_gpa"] != DBNull.Value ? Convert.ToDecimal(reader["cumulative_gpa"]) : null,
                        AttendanceRate = reader["attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["attendance_rate"]) : null,
                        TotalCreditsEarned = reader["total_credits_earned"] != DBNull.Value ? Convert.ToInt32(reader["total_credits_earned"]) : null,
                        TotalCreditsRegistered = reader["total_credits_registered"] != DBNull.Value ? Convert.ToInt32(reader["total_credits_registered"]) : null,
                        TotalSubjects = reader["total_subjects"] != DBNull.Value ? Convert.ToInt32(reader["total_subjects"]) : null,
                        PassedSubjects = reader["passed_subjects"] != DBNull.Value ? Convert.ToInt32(reader["passed_subjects"]) : null,
                        FailedSubjects = reader["failed_subjects"] != DBNull.Value ? Convert.ToInt32(reader["failed_subjects"]) : null,
                        WarningType = reader["warning_type"].ToString() ?? "none",
                        Priority = reader["priority"] != DBNull.Value ? Convert.ToInt32(reader["priority"]) : 0
                    };
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student detail: {ex.Message}", ex);
            }

            return null;
        }

        /// <summary>
        /// Get student grades with filters
        /// </summary>
        public async Task<(List<AdvisorStudentGradeDto> Grades, AdvisorStudentGradesSummaryDto Summary)> GetStudentGradesAsync(
            string studentId,
            string? schoolYearId = null,
            int? semester = null,
            string? subjectId = null)
        {
            var grades = new List<AdvisorStudentGradeDto>();
            var summary = new AdvisorStudentGradesSummaryDto();

            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value),
                new SqlParameter("@SubjectId", (object?)subjectId ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudentGrades", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read grades
                while (await reader.ReadAsync())
                {
                    grades.Add(new AdvisorStudentGradeDto
                    {
                        GradeId = reader["grade_id"].ToString() ?? string.Empty,
                        EnrollmentId = reader["enrollment_id"].ToString() ?? string.Empty,
                        ClassId = reader["class_id"].ToString() ?? string.Empty,
                        ClassCode = reader["class_code"].ToString() ?? string.Empty,
                        ClassName = reader["class_name"].ToString() ?? string.Empty,
                        SubjectId = reader["subject_id"].ToString() ?? string.Empty,
                        SubjectCode = reader["subject_code"].ToString() ?? string.Empty,
                        SubjectName = reader["subject_name"].ToString() ?? string.Empty,
                        Credits = reader["credits"] != DBNull.Value ? Convert.ToInt32(reader["credits"]) : null,
                        SchoolYearId = reader["school_year_id"]?.ToString(),
                        SchoolYearCode = reader["school_year_code"]?.ToString(),
                        SchoolYearName = reader["school_year_name"]?.ToString(),
                        Semester = reader["semester"] != DBNull.Value ? Convert.ToInt32(reader["semester"]) : null,
                        MidtermScore = reader["midterm_score"] != DBNull.Value ? Convert.ToDecimal(reader["midterm_score"]) : null,
                        FinalScore = reader["final_score"] != DBNull.Value ? Convert.ToDecimal(reader["final_score"]) : null,
                        TotalScore = reader["total_score"] != DBNull.Value ? Convert.ToDecimal(reader["total_score"]) : null,
                        LetterGrade = reader["letter_grade"]?.ToString(),
                        CreatedAt = reader["created_at"] != DBNull.Value ? Convert.ToDateTime(reader["created_at"]) : null
                    });
                }

                // Read summary
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    summary.SemesterGpa = reader["semester_gpa"] != DBNull.Value ? Convert.ToDecimal(reader["semester_gpa"]) : null;
                    summary.CumulativeGpa = reader["cumulative_gpa"] != DBNull.Value ? Convert.ToDecimal(reader["cumulative_gpa"]) : null;
                    summary.TotalCredits = reader["total_credits"] != DBNull.Value ? Convert.ToInt32(reader["total_credits"]) : 0;
                    summary.PassedCredits = reader["passed_credits"] != DBNull.Value ? Convert.ToInt32(reader["passed_credits"]) : 0;
                    summary.FailedCredits = reader["failed_credits"] != DBNull.Value ? Convert.ToInt32(reader["failed_credits"]) : 0;
                    summary.TotalSubjects = reader["total_subjects"] != DBNull.Value ? Convert.ToInt32(reader["total_subjects"]) : 0;
                    summary.PassedSubjects = reader["passed_subjects"] != DBNull.Value ? Convert.ToInt32(reader["passed_subjects"]) : 0;
                    summary.FailedSubjects = reader["failed_subjects"] != DBNull.Value ? Convert.ToInt32(reader["failed_subjects"]) : 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student grades: {ex.Message}", ex);
            }

            return (grades, summary);
        }

        /// <summary>
        /// Get student attendance with filters
        /// </summary>
        public async Task<AdvisorStudentAttendanceResponseDto> GetStudentAttendanceAsync(
            string studentId,
            string? schoolYearId = null,
            int? semester = null,
            string? subjectId = null)
        {
            var response = new AdvisorStudentAttendanceResponseDto();

            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value),
                new SqlParameter("@SubjectId", (object?)subjectId ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudentAttendance", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read attendance records
                while (await reader.ReadAsync())
                {
                    response.Attendances.Add(new AdvisorStudentAttendanceDto
                    {
                        AttendanceId = reader["attendance_id"].ToString() ?? string.Empty,
                        EnrollmentId = reader["enrollment_id"].ToString() ?? string.Empty,
                        ClassId = reader["class_id"].ToString() ?? string.Empty,
                        ClassCode = reader["class_code"].ToString() ?? string.Empty,
                        ClassName = reader["class_name"].ToString() ?? string.Empty,
                        SubjectId = reader["subject_id"].ToString() ?? string.Empty,
                        SubjectCode = reader["subject_code"].ToString() ?? string.Empty,
                        SubjectName = reader["subject_name"].ToString() ?? string.Empty,
                        SchoolYearId = reader["school_year_id"]?.ToString(),
                        SchoolYearCode = reader["school_year_code"]?.ToString(),
                        Semester = reader["semester"] != DBNull.Value ? Convert.ToInt32(reader["semester"]) : null,
                        ScheduleId = reader["schedule_id"].ToString() ?? string.Empty,
                        AttendanceDate = reader["attendance_date"] != DBNull.Value ? Convert.ToDateTime(reader["attendance_date"]) : DateTime.Now,
                        ScheduleStartTime = reader["schedule_start_time"] != DBNull.Value ? Convert.ToDateTime(reader["schedule_start_time"]) : null,
                        Room = reader["room"]?.ToString(),
                        Status = reader["status"].ToString() ?? string.Empty,
                        Notes = reader["notes"]?.ToString(),
                        MarkedBy = reader["marked_by"]?.ToString(),
                        MarkedByName = reader["marked_by_name"]?.ToString()
                    });
                }

                // Read summary by subject
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        response.Summaries.Add(new AdvisorStudentAttendanceSummaryDto
                        {
                            SubjectId = reader["subject_id"].ToString() ?? string.Empty,
                            SubjectCode = reader["subject_code"].ToString() ?? string.Empty,
                            SubjectName = reader["subject_name"].ToString() ?? string.Empty,
                            ClassId = reader["class_id"].ToString() ?? string.Empty,
                            ClassName = reader["class_name"].ToString() ?? string.Empty,
                            SchoolYearId = reader["school_year_id"]?.ToString(),
                            SchoolYearCode = reader["school_year_code"]?.ToString(),
                            Semester = reader["semester"] != DBNull.Value ? Convert.ToInt32(reader["semester"]) : null,
                            TotalSessions = reader["total_sessions"] != DBNull.Value ? Convert.ToInt32(reader["total_sessions"]) : 0,
                            PresentCount = reader["present_count"] != DBNull.Value ? Convert.ToInt32(reader["present_count"]) : 0,
                            AbsentCount = reader["absent_count"] != DBNull.Value ? Convert.ToInt32(reader["absent_count"]) : 0,
                            LateCount = reader["late_count"] != DBNull.Value ? Convert.ToInt32(reader["late_count"]) : 0,
                            ExcusedCount = reader["excused_count"] != DBNull.Value ? Convert.ToInt32(reader["excused_count"]) : 0,
                            AttendanceRate = reader["attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["attendance_rate"]) : 0,
                            AbsenceRate = reader["absence_rate"] != DBNull.Value ? Convert.ToDecimal(reader["absence_rate"]) : 0
                        });
                    }
                }

                // Read overall summary
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    response.Overall = new AdvisorStudentAttendanceOverallSummaryDto
                    {
                        TotalSessions = reader["total_sessions"] != DBNull.Value ? Convert.ToInt32(reader["total_sessions"]) : 0,
                        PresentCount = reader["present_count"] != DBNull.Value ? Convert.ToInt32(reader["present_count"]) : 0,
                        AbsentCount = reader["absent_count"] != DBNull.Value ? Convert.ToInt32(reader["absent_count"]) : 0,
                        LateCount = reader["late_count"] != DBNull.Value ? Convert.ToInt32(reader["late_count"]) : 0,
                        ExcusedCount = reader["excused_count"] != DBNull.Value ? Convert.ToInt32(reader["excused_count"]) : 0,
                        AttendanceRate = reader["attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["attendance_rate"]) : 0,
                        AbsenceRate = reader["absence_rate"] != DBNull.Value ? Convert.ToDecimal(reader["absence_rate"]) : 0,
                        TotalSubjects = reader["total_subjects"] != DBNull.Value ? Convert.ToInt32(reader["total_subjects"]) : 0
                    };
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student attendance: {ex.Message}", ex);
            }

            return response;
        }

        /// <summary>
        /// Get students list with filters (mandatory filter validation in service layer)
        /// </summary>
        public async Task<(List<WarningStudentDto> Students, int TotalCount)> GetStudentsAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            string? facultyId = null,
            string? majorId = null,
            string? classId = null,
            string? cohortYear = null,
            string? warningStatus = null,
            decimal? gpaMin = null,
            decimal? gpaMax = null,
            decimal? attendanceRateMin = null,
            decimal? attendanceRateMax = null)
        {
            var students = new List<WarningStudentDto>();
            int totalCount = 0;

            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Search", (object?)search ?? DBNull.Value),
                new SqlParameter("@FacultyId", (object?)facultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)majorId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                new SqlParameter("@CohortYear", (object?)cohortYear ?? DBNull.Value),
                new SqlParameter("@WarningStatus", (object?)warningStatus ?? DBNull.Value),
                new SqlParameter("@GpaMin", (object?)gpaMin ?? DBNull.Value),
                new SqlParameter("@GpaMax", (object?)gpaMax ?? DBNull.Value),
                new SqlParameter("@AttendanceRateMin", (object?)attendanceRateMin ?? DBNull.Value),
                new SqlParameter("@AttendanceRateMax", (object?)attendanceRateMax ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudents", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read students
                while (await reader.ReadAsync())
                {
                    students.Add(new WarningStudentDto
                    {
                        StudentId = reader["student_id"].ToString() ?? string.Empty,
                        StudentCode = reader["student_code"].ToString() ?? string.Empty,
                        FullName = reader["full_name"].ToString() ?? string.Empty,
                        ClassName = reader["class_name"]?.ToString(),
                        FacultyName = reader["faculty_name"]?.ToString(),
                        MajorName = reader["major_name"]?.ToString(),
                        Gpa = reader["gpa"] != DBNull.Value ? Convert.ToDecimal(reader["gpa"]) : null,
                        AttendanceRate = reader["attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["attendance_rate"]) : null,
                        WarningType = reader["warning_type"].ToString() ?? "none",
                        Priority = reader["priority"] != DBNull.Value ? Convert.ToInt32(reader["priority"]) : 0
                    });
                }

                // Read total count
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    totalCount = reader["total_count"] != DBNull.Value 
                        ? Convert.ToInt32(reader["total_count"]) 
                        : 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting students: {ex.Message}", ex);
            }

            return (students, totalCount);
        }

        /// <summary>
        /// Get student GPA progress by semester
        /// </summary>
        public async Task<StudentGpaProgressDto?> GetStudentGpaProgressAsync(string studentId, string? schoolYearId = null)
        {
            var progress = new StudentGpaProgressDto { StudentId = studentId };
            var progressItems = new List<GpaProgressItemDto>();

            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudentGpaProgress", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read student info
                if (await reader.ReadAsync())
                {
                    progress.StudentCode = reader["student_code"].ToString() ?? string.Empty;
                    progress.FullName = reader["full_name"].ToString() ?? string.Empty;
                }

                // Read progress items
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        progressItems.Add(new GpaProgressItemDto
                        {
                            SchoolYearId = reader["school_year_id"]?.ToString(),
                            SchoolYearCode = reader["school_year_code"]?.ToString(),
                            Semester = reader["semester"] != DBNull.Value ? Convert.ToInt32(reader["semester"]) : null,
                            Gpa = reader["gpa"] != DBNull.Value ? Convert.ToDecimal(reader["gpa"]) : null,
                            ClassAverageGpa = reader["class_average_gpa"] != DBNull.Value ? Convert.ToDecimal(reader["class_average_gpa"]) : null,
                            CalculatedAt = reader["calculated_at"] != DBNull.Value ? Convert.ToDateTime(reader["calculated_at"]) : null
                        });
                    }
                }

                progress.ProgressItems = progressItems;
                progress.AverageGpa = progressItems.Where(p => p.Gpa.HasValue).Any() 
                    ? progressItems.Where(p => p.Gpa.HasValue).Average(p => p.Gpa!.Value) 
                    : null;
                progress.ClassAverageGpa = progressItems.Where(p => p.ClassAverageGpa.HasValue).Any()
                    ? progressItems.Where(p => p.ClassAverageGpa.HasValue).Average(p => p.ClassAverageGpa!.Value)
                    : null;

                // Calculate trend
                if (progressItems.Count >= 3)
                {
                    var sorted = progressItems.OrderBy(p => p.SchoolYearId).ThenBy(p => p.Semester).ToList();
                    var last3 = sorted.TakeLast(3).Where(p => p.Gpa.HasValue).ToList();
                    if (last3.Count >= 2)
                    {
                        var first = last3[0].Gpa!.Value;
                        var second = last3[last3.Count - 1].Gpa!.Value;
                        if (first < second) progress.Trend = "increasing";
                        else if (first > second) progress.Trend = "decreasing";
                        else progress.Trend = "stable";
                    }
                }
                else if (progressItems.Count >= 2)
                {
                    var sorted = progressItems.OrderBy(p => p.SchoolYearId).ThenBy(p => p.Semester).ToList();
                    var first = sorted[0].Gpa;
                    var last = sorted[sorted.Count - 1].Gpa;
                    if (first.HasValue && last.HasValue)
                    {
                        if (first.Value < last.Value) progress.Trend = "increasing";
                        else if (first.Value > last.Value) progress.Trend = "decreasing";
                        else progress.Trend = "stable";
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student GPA progress: {ex.Message}", ex);
            }

            return progress;
        }

        /// <summary>
        /// Get student attendance progress by semester
        /// </summary>
        public async Task<StudentAttendanceProgressDto?> GetStudentAttendanceProgressAsync(string studentId, string? schoolYearId = null)
        {
            var progress = new StudentAttendanceProgressDto { StudentId = studentId };
            var progressItems = new List<AttendanceProgressItemDto>();

            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudentAttendanceProgress", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read student info
                if (await reader.ReadAsync())
                {
                    progress.StudentCode = reader["student_code"].ToString() ?? string.Empty;
                    progress.FullName = reader["full_name"].ToString() ?? string.Empty;
                }

                // Read progress items
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        progressItems.Add(new AttendanceProgressItemDto
                        {
                            SchoolYearId = reader["school_year_id"]?.ToString(),
                            SchoolYearCode = reader["school_year_code"]?.ToString(),
                            Semester = reader["semester"] != DBNull.Value ? Convert.ToInt32(reader["semester"]) : null,
                            AttendanceRate = reader["attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["attendance_rate"]) : 100,
                            ClassAverageAttendanceRate = reader["class_average_attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["class_average_attendance_rate"]) : null,
                            TotalSessions = reader["total_sessions"] != DBNull.Value ? Convert.ToInt32(reader["total_sessions"]) : 0,
                            PresentCount = reader["present_count"] != DBNull.Value ? Convert.ToInt32(reader["present_count"]) : 0,
                            AbsentCount = reader["absent_count"] != DBNull.Value ? Convert.ToInt32(reader["absent_count"]) : 0
                        });
                    }
                }

                progress.ProgressItems = progressItems;
                progress.AverageAttendanceRate = progressItems.Any()
                    ? progressItems.Average(p => p.AttendanceRate)
                    : null;
                progress.ClassAverageAttendanceRate = progressItems.Where(p => p.ClassAverageAttendanceRate.HasValue).Any()
                    ? progressItems.Where(p => p.ClassAverageAttendanceRate.HasValue).Average(p => p.ClassAverageAttendanceRate!.Value)
                    : null;

                // Calculate trend
                if (progressItems.Count >= 3)
                {
                    var sorted = progressItems.OrderBy(p => p.SchoolYearId).ThenBy(p => p.Semester).ToList();
                    var last3 = sorted.TakeLast(3).ToList();
                    var first = last3[0].AttendanceRate;
                    var last = last3[last3.Count - 1].AttendanceRate;
                    if (first < last) progress.Trend = "increasing";
                    else if (first > last) progress.Trend = "decreasing";
                    else progress.Trend = "stable";
                }
                else if (progressItems.Count >= 2)
                {
                    var sorted = progressItems.OrderBy(p => p.SchoolYearId).ThenBy(p => p.Semester).ToList();
                    var first = sorted[0].AttendanceRate;
                    var last = sorted[sorted.Count - 1].AttendanceRate;
                    if (first < last) progress.Trend = "increasing";
                    else if (first > last) progress.Trend = "decreasing";
                    else progress.Trend = "stable";
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student attendance progress: {ex.Message}", ex);
            }

            return progress;
        }

        /// <summary>
        /// Get student trends and alerts
        /// </summary>
        public async Task<StudentTrendsDto?> GetStudentTrendsAsync(string studentId)
        {
            var trends = new StudentTrendsDto { StudentId = studentId };
            var alerts = new List<TrendAlertDto>();

            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudentTrends", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read student info
                if (await reader.ReadAsync())
                {
                    trends.StudentCode = reader["student_code"].ToString() ?? string.Empty;
                    trends.FullName = reader["full_name"].ToString() ?? string.Empty;
                }

                // Read GPA trends
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    trends.GpaTrend = reader["trend"]?.ToString() ?? "stable";
                    trends.HasGpaDecline = reader["has_decline"] != DBNull.Value && Convert.ToBoolean(reader["has_decline"]);
                    trends.HasImprovement = reader["has_improvement"] != DBNull.Value && Convert.ToBoolean(reader["has_improvement"]);

                    if (trends.HasGpaDecline)
                    {
                        alerts.Add(new TrendAlertDto
                        {
                            AlertType = "gpa_decline",
                            Title = "Cảnh báo: GPA giảm",
                            Message = "GPA của sinh viên đang có xu hướng giảm trong các học kỳ gần đây.",
                            Severity = "warning",
                            DetectedAt = DateTime.Now
                        });
                    }
                    if (trends.HasImprovement)
                    {
                        alerts.Add(new TrendAlertDto
                        {
                            AlertType = "gpa_improvement",
                            Title = "Cải thiện tích cực: GPA tăng",
                            Message = "GPA của sinh viên đang có xu hướng tăng, thể hiện sự cải thiện tích cực.",
                            Severity = "success",
                            DetectedAt = DateTime.Now
                        });
                    }
                }

                // Read attendance trends
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    trends.AttendanceTrend = reader["trend"]?.ToString() ?? "stable";
                    trends.HasAttendanceDecline = reader["has_decline"] != DBNull.Value && Convert.ToBoolean(reader["has_decline"]);
                    if (trends.HasImprovement && reader["has_improvement"] != DBNull.Value && Convert.ToBoolean(reader["has_improvement"]))
                    {
                        trends.HasImprovement = true;
                    }

                    if (trends.HasAttendanceDecline)
                    {
                        alerts.Add(new TrendAlertDto
                        {
                            AlertType = "attendance_decline",
                            Title = "Cảnh báo: Chuyên cần giảm",
                            Message = "Tỷ lệ chuyên cần của sinh viên đang có xu hướng giảm trong các học kỳ gần đây.",
                            Severity = "danger",
                            DetectedAt = DateTime.Now
                        });
                    }
                    if (reader["has_improvement"] != DBNull.Value && Convert.ToBoolean(reader["has_improvement"]))
                    {
                        alerts.Add(new TrendAlertDto
                        {
                            AlertType = "attendance_improvement",
                            Title = "Cải thiện tích cực: Chuyên cần tăng",
                            Message = "Tỷ lệ chuyên cần của sinh viên đang có xu hướng tăng, thể hiện sự cải thiện tích cực.",
                            Severity = "success",
                            DetectedAt = DateTime.Now
                        });
                    }
                }

                trends.Alerts = alerts;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student trends: {ex.Message}", ex);
            }

            return trends;
        }

        /// <summary>
        /// Get attendance warnings
        /// </summary>
        public async Task<(List<AttendanceWarningDto> Warnings, int TotalCount)> GetAttendanceWarningsAsync(
            int page = 1,
            int pageSize = 100,
            decimal attendanceThreshold = 20.0m,
            string? facultyId = null,
            string? majorId = null,
            string? classId = null,
            string? cohortYear = null)
        {
            var warnings = new List<AttendanceWarningDto>();
            int totalCount = 0;

            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@AttendanceThreshold", attendanceThreshold),
                new SqlParameter("@FacultyId", (object?)facultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)majorId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                new SqlParameter("@CohortYear", (object?)cohortYear ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorAttendanceWarnings", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read warnings
                while (await reader.ReadAsync())
                {
                    warnings.Add(new AttendanceWarningDto
                    {
                        StudentId = reader["student_id"].ToString() ?? string.Empty,
                        StudentCode = reader["student_code"].ToString() ?? string.Empty,
                        FullName = reader["full_name"].ToString() ?? string.Empty,
                        Email = reader["email"]?.ToString(),
                        ClassName = reader["class_name"]?.ToString(),
                        FacultyName = reader["faculty_name"]?.ToString(),
                        MajorName = reader["major_name"]?.ToString(),
                        CohortYear = reader["cohort_year"]?.ToString(),
                        AttendanceRate = reader["attendance_rate"] != DBNull.Value ? Convert.ToDecimal(reader["attendance_rate"]) : 100,
                        AbsenceRate = reader["absence_rate"] != DBNull.Value ? Convert.ToDecimal(reader["absence_rate"]) : 0,
                        TotalSessions = reader["total_sessions"] != DBNull.Value ? Convert.ToInt32(reader["total_sessions"]) : 0,
                        AbsentCount = reader["absent_count"] != DBNull.Value ? Convert.ToInt32(reader["absent_count"]) : 0
                    });
                }

                // Read total count
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    totalCount = reader["total_count"] != DBNull.Value 
                        ? Convert.ToInt32(reader["total_count"]) 
                        : 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting attendance warnings: {ex.Message}", ex);
            }

            return (warnings, totalCount);
        }

        /// <summary>
        /// Get academic warnings
        /// </summary>
        public async Task<(List<AcademicWarningDto> Warnings, int TotalCount)> GetAcademicWarningsAsync(
            int page = 1,
            int pageSize = 100,
            decimal gpaThreshold = 2.0m,
            string? facultyId = null,
            string? majorId = null,
            string? classId = null,
            string? cohortYear = null)
        {
            var warnings = new List<AcademicWarningDto>();
            int totalCount = 0;

            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@GpaThreshold", gpaThreshold),
                new SqlParameter("@FacultyId", (object?)facultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)majorId ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                new SqlParameter("@CohortYear", (object?)cohortYear ?? DBNull.Value)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorAcademicWarnings", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                // Read warnings
                while (await reader.ReadAsync())
                {
                    warnings.Add(new AcademicWarningDto
                    {
                        StudentId = reader["student_id"].ToString() ?? string.Empty,
                        StudentCode = reader["student_code"].ToString() ?? string.Empty,
                        FullName = reader["full_name"].ToString() ?? string.Empty,
                        Email = reader["email"]?.ToString(),
                        ClassName = reader["class_name"]?.ToString(),
                        FacultyName = reader["faculty_name"]?.ToString(),
                        MajorName = reader["major_name"]?.ToString(),
                        CohortYear = reader["cohort_year"]?.ToString(),
                        Gpa = reader["gpa"] != DBNull.Value ? Convert.ToDecimal(reader["gpa"]) : null
                    });
                }

                // Read total count
                if (await reader.NextResultAsync() && await reader.ReadAsync())
                {
                    totalCount = reader["total_count"] != DBNull.Value 
                        ? Convert.ToInt32(reader["total_count"]) 
                        : 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting academic warnings: {ex.Message}", ex);
            }

            return (warnings, totalCount);
        }

        /// <summary>
        /// Get student detail for email (simple version)
        /// </summary>
        public async Task<(string Email, string FullName, string? ClassName, decimal? Gpa, decimal? AbsenceRate)?> GetStudentInfoForEmailAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("sp_GetAdvisorStudentDetail", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };
                cmd.Parameters.AddRange(parameters);

                using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    var email = reader["email"]?.ToString();
                    var fullName = reader["full_name"].ToString() ?? string.Empty;
                    var className = reader["class_name"]?.ToString();
                    var gpa = reader["cumulative_gpa"] != DBNull.Value ? Convert.ToDecimal(reader["cumulative_gpa"]) : (decimal?)null;
                    
                    // Calculate absence rate
                    decimal? absenceRate = null;
                    if (reader["attendance_rate"] != DBNull.Value)
                    {
                        var attendanceRate = Convert.ToDecimal(reader["attendance_rate"]);
                        absenceRate = 100 - attendanceRate;
                    }

                    return (email ?? string.Empty, fullName, className, gpa, absenceRate);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student info for email: {ex.Message}", ex);
            }

            return null;
        }

        /// <summary>
        /// Get last warning sent date for a student
        /// </summary>
        public async Task<DateTime?> GetLastWarningSentAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand("SELECT last_warning_sent FROM dbo.students WHERE student_id = @StudentId", conn);
                cmd.Parameters.AddRange(parameters);

                var result = await cmd.ExecuteScalarAsync();
                if (result != null && result != DBNull.Value)
                {
                    return Convert.ToDateTime(result);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting last warning sent: {ex.Message}", ex);
            }

            return null;
        }

        /// <summary>
        /// Update last warning sent date for a student
        /// </summary>
        public async Task UpdateLastWarningSentAsync(string studentId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@LastWarningSent", DateTime.Now)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand(
                    "UPDATE dbo.students SET last_warning_sent = @LastWarningSent WHERE student_id = @StudentId", 
                    conn);
                cmd.Parameters.AddRange(parameters);

                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                throw new Exception($"Error updating last warning sent: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Get student attendance summary for a specific class
        /// </summary>
        public async Task<decimal?> GetStudentAbsenceRateByClassAsync(string studentId, string classId)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ClassId", classId)
            };

            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand(@"
                    SELECT 
                        CAST(ROUND((COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) * 100.0 / 
                              NULLIF(COUNT(a.attendance_id), 0)), 2) AS DECIMAL(5,2)) as absence_rate
                    FROM dbo.enrollments e
                    INNER JOIN dbo.attendances a ON e.enrollment_id = a.enrollment_id
                    WHERE e.student_id = @StudentId
                        AND e.class_id = @ClassId
                        AND a.deleted_at IS NULL
                        AND e.deleted_at IS NULL", conn);
                cmd.Parameters.AddRange(parameters);

                var result = await cmd.ExecuteScalarAsync();
                if (result != null && result != DBNull.Value)
                {
                    return Convert.ToDecimal(result);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting student absence rate: {ex.Message}", ex);
            }

            return null;
        }

        /// <summary>
        /// Get warning configuration from database
        /// Returns null if not found (will use appsettings.json as fallback)
        /// </summary>
        public async Task<WarningConfigDto?> GetWarningConfigAsync()
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                using var cmd = new SqlCommand(@"
                    SELECT TOP 1
                        attendance_threshold,
                        gpa_threshold,
                        email_template,
                        email_subject,
                        auto_send_emails
                    FROM dbo.advisor_warning_config
                    ORDER BY config_id DESC
                ", conn);

                using var reader = await cmd.ExecuteReaderAsync();
                
                if (await reader.ReadAsync())
                {
                    return new WarningConfigDto
                    {
                        AttendanceThreshold = reader.GetDecimal(0),
                        GpaThreshold = reader.GetDecimal(1),
                        EmailTemplate = reader.IsDBNull(2) ? null : reader.GetString(2),
                        EmailSubject = reader.IsDBNull(3) ? null : reader.GetString(3),
                        AutoSendEmails = reader.GetBoolean(4)
                    };
                }

                return null; // No config in database, will use appsettings.json fallback
            }
            catch (Exception ex)
            {
                // Log error but don't throw - allow fallback to appsettings.json
                throw new Exception($"Error getting warning config from database: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Update or insert warning configuration in database
        /// </summary>
        public async Task UpdateWarningConfigAsync(WarningConfigDto config, string? updatedBy = null)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Check if config exists
                using var checkCmd = new SqlCommand(@"
                    SELECT COUNT(*) FROM dbo.advisor_warning_config
                ", conn);
                var exists = (int)await checkCmd.ExecuteScalarAsync() > 0;

                if (exists)
                {
                    // Update existing config
                    using var updateCmd = new SqlCommand(@"
                        UPDATE dbo.advisor_warning_config
                        SET 
                            attendance_threshold = @AttendanceThreshold,
                            gpa_threshold = @GpaThreshold,
                            email_template = @EmailTemplate,
                            email_subject = @EmailSubject,
                            auto_send_emails = @AutoSendEmails,
                            updated_at = GETDATE(),
                            updated_by = @UpdatedBy
                        WHERE config_id = (SELECT TOP 1 config_id FROM dbo.advisor_warning_config ORDER BY config_id DESC)
                    ", conn);

                    updateCmd.Parameters.AddWithValue("@AttendanceThreshold", config.AttendanceThreshold);
                    updateCmd.Parameters.AddWithValue("@GpaThreshold", config.GpaThreshold);
                    updateCmd.Parameters.AddWithValue("@EmailTemplate", (object?)config.EmailTemplate ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@EmailSubject", (object?)config.EmailSubject ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@AutoSendEmails", config.AutoSendEmails);
                    updateCmd.Parameters.AddWithValue("@UpdatedBy", (object?)updatedBy ?? DBNull.Value);

                    await updateCmd.ExecuteNonQueryAsync();
                }
                else
                {
                    // Insert new config
                    using var insertCmd = new SqlCommand(@"
                        INSERT INTO dbo.advisor_warning_config (
                            attendance_threshold,
                            gpa_threshold,
                            email_template,
                            email_subject,
                            auto_send_emails,
                            created_by,
                            updated_by
                        ) VALUES (
                            @AttendanceThreshold,
                            @GpaThreshold,
                            @EmailTemplate,
                            @EmailSubject,
                            @AutoSendEmails,
                            @CreatedBy,
                            @UpdatedBy
                        )
                    ", conn);

                    insertCmd.Parameters.AddWithValue("@AttendanceThreshold", config.AttendanceThreshold);
                    insertCmd.Parameters.AddWithValue("@GpaThreshold", config.GpaThreshold);
                    insertCmd.Parameters.AddWithValue("@EmailTemplate", (object?)config.EmailTemplate ?? DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@EmailSubject", (object?)config.EmailSubject ?? DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@AutoSendEmails", config.AutoSendEmails);
                    insertCmd.Parameters.AddWithValue("@CreatedBy", (object?)updatedBy ?? DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@UpdatedBy", (object?)updatedBy ?? DBNull.Value);

                    await insertCmd.ExecuteNonQueryAsync();
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error updating warning config: {ex.Message}", ex);
            }
        }
    }
}

