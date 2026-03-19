using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Exam;

namespace EducationManagement.DAL.Repositories
{
    public class ExamScheduleRepository
    {
        private readonly string _connectionString;

        public ExamScheduleRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH LỊCH THI VỚI FILTER
        // ============================================================
        public async Task<List<ExamSchedule>> GetAllAsync(
            string? schoolYearId = null,
            int? semester = null,
            string? examType = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            string? classId = null,
            string? subjectId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value),
                new SqlParameter("@ExamType", (object?)examType ?? DBNull.Value),
                new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value),
                new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value),
                new SqlParameter("@ClassId", (object?)classId ?? DBNull.Value),
                new SqlParameter("@SubjectId", (object?)subjectId ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetExamSchedules", parameters);
            
            var schedules = new List<ExamSchedule>();
            foreach (DataRow row in dt.Rows)
            {
                schedules.Add(MapToExamSchedule(row));
            }
            
            return schedules;
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI THEO ID
        // ============================================================
        public async Task<ExamSchedule?> GetByIdAsync(string examId)
        {
            var param = new SqlParameter("@ExamId", examId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetExamScheduleById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToExamSchedule(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI THEO NĂM HỌC VÀ HỌC KỲ
        // ============================================================
        public async Task<List<ExamSchedule>> GetBySchoolYearAsync(string schoolYearId, int? semester = null)
        {
            return await GetAllAsync(schoolYearId: schoolYearId, semester: semester);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI THEO LỚP HỌC PHẦN
        // ============================================================
        public async Task<List<ExamSchedule>> GetByClassAsync(string classId)
        {
            return await GetAllAsync(classId: classId);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI CỦA SINH VIÊN
        // ============================================================
        public async Task<List<ExamSchedule>> GetByStudentAsync(string studentId, string? schoolYearId = null, int? semester = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@SchoolYearId", (object?)schoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetStudentExams", parameters);
            
            var schedules = new List<ExamSchedule>();
            foreach (DataRow row in dt.Rows)
            {
                // Map từ sp_GetStudentExams có cấu trúc khác một chút
                var examId = row["exam_id"]?.ToString() ?? string.Empty;
                var examSchedule = await GetByIdAsync(examId);
                if (examSchedule != null)
                {
                    schedules.Add(examSchedule);
                }
            }
            
            return schedules;
        }

        // ============================================================
        // 🔹 TẠO LỊCH THI MỚI
        // ============================================================
        public async Task<string> CreateAsync(ExamSchedule exam)
        {
            var examId = exam.ExamId;
            if (string.IsNullOrWhiteSpace(examId))
            {
                examId = $"EXAM-{Guid.NewGuid()}";
            }

            var parameters = new[]
            {
                new SqlParameter("@ExamId", examId),
                new SqlParameter("@ClassId", exam.ClassId),
                new SqlParameter("@SubjectId", exam.SubjectId),
                new SqlParameter("@ExamDate", exam.ExamDate),
                new SqlParameter("@ExamTime", exam.ExamTime),
                new SqlParameter("@EndTime", exam.EndTime),
                new SqlParameter("@RoomId", (object?)exam.RoomId ?? DBNull.Value),
                new SqlParameter("@ExamType", exam.ExamType),
                new SqlParameter("@SessionNo", (object?)exam.SessionNo ?? DBNull.Value),
                new SqlParameter("@ProctorLecturerId", (object?)exam.ProctorLecturerId ?? DBNull.Value),
                new SqlParameter("@Duration", exam.Duration),
                new SqlParameter("@MaxStudents", (object?)exam.MaxStudents ?? DBNull.Value),
                new SqlParameter("@Notes", (object?)exam.Notes ?? DBNull.Value),
                new SqlParameter("@Status", exam.Status),
                new SqlParameter("@SchoolYearId", (object?)exam.SchoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)exam.Semester ?? DBNull.Value),
                new SqlParameter("@CreatedBy", (object?)exam.CreatedBy ?? "system")
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateExamSchedule", parameters);

            return examId;
        }

        // ============================================================
        // 🔹 CẬP NHẬT LỊCH THI
        // ============================================================
        public async Task UpdateAsync(ExamSchedule exam)
        {
            var parameters = new[]
            {
                new SqlParameter("@ExamId", exam.ExamId),
                new SqlParameter("@ExamDate", (object?)exam.ExamDate ?? DBNull.Value),
                new SqlParameter("@ExamTime", (object?)exam.ExamTime ?? DBNull.Value),
                new SqlParameter("@EndTime", (object?)exam.EndTime ?? DBNull.Value),
                new SqlParameter("@RoomId", (object?)exam.RoomId ?? DBNull.Value),
                new SqlParameter("@SessionNo", (object?)exam.SessionNo ?? DBNull.Value),
                new SqlParameter("@ProctorLecturerId", (object?)exam.ProctorLecturerId ?? DBNull.Value),
                new SqlParameter("@Duration", (object?)exam.Duration ?? DBNull.Value),
                new SqlParameter("@MaxStudents", (object?)exam.MaxStudents ?? DBNull.Value),
                new SqlParameter("@Notes", (object?)exam.Notes ?? DBNull.Value),
                new SqlParameter("@Status", (object?)exam.Status ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", (object?)exam.UpdatedBy ?? "system")
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateExamSchedule", parameters);
        }

        // ============================================================
        // 🔹 XÓA LỊCH THI (SOFT DELETE)
        // ============================================================
        public async Task DeleteAsync(string examId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@ExamId", examId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteExamSchedule", parameters);
        }

        // ============================================================
        // 🔹 KIỂM TRA XUNG ĐỘT PHÒNG THI
        // ============================================================
        public async Task<bool> CheckRoomConflictAsync(
            string roomId,
            DateTime examDate,
            TimeSpan startTime,
            TimeSpan endTime,
            string? excludeExamId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@RoomId", roomId),
                new SqlParameter("@ExamDate", examDate.Date),
                new SqlParameter("@StartTime", startTime),
                new SqlParameter("@EndTime", endTime),
                new SqlParameter("@ExcludeExamId", (object?)excludeExamId ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckRoomConflict", parameters);

            if (dt.Rows.Count > 0 && dt.Rows[0]["has_conflict"] != DBNull.Value)
            {
                return Convert.ToBoolean(dt.Rows[0]["has_conflict"]);
            }

            return false;
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH SINH VIÊN TRONG LỚP HỌC PHẦN
        // ============================================================
        public async Task<List<ClassStudentDto>> GetStudentsByClassAsync(string classId)
        {
            var param = new SqlParameter("@ClassId", classId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetStudentsByClass", param);

            var students = new List<ClassStudentDto>();
            foreach (DataRow row in dt.Rows)
            {
                students.Add(new ClassStudentDto
                {
                    StudentId = row["student_id"]?.ToString() ?? string.Empty,
                    StudentCode = row["student_code"]?.ToString() ?? string.Empty,
                    FullName = row["full_name"]?.ToString() ?? string.Empty,
                    EnrollmentId = row["enrollment_id"]?.ToString() ?? string.Empty,
                    EnrollmentDate = row["enrollment_date"] != DBNull.Value
                        ? Convert.ToDateTime(row["enrollment_date"])
                        : DateTime.Now,
                    EnrollmentStatus = row["enrollment_status"]?.ToString()
                });
            }

            return students;
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI CỦA LỚP TRONG TUẦN CỤ THỂ (ĐỂ TÍCH HỢP TIMETABLE)
        // ============================================================
        public async Task<List<ExamSchedule>> GetExamsByClassAndWeekAsync(string classId, int year, int week)
        {
            // Tính ngày bắt đầu và kết thúc của tuần ISO
            var (startDate, endDate) = GetIsoWeekDateRange(year, week);

            var parameters = new[]
            {
                new SqlParameter("@ClassId", classId),
                new SqlParameter("@StartDate", startDate),
                new SqlParameter("@EndDate", endDate)
            };

            // Sử dụng sp_GetExamSchedules với filter classId và date range
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetExamSchedules", 
                new SqlParameter("@SchoolYearId", DBNull.Value),
                new SqlParameter("@Semester", DBNull.Value),
                new SqlParameter("@ExamType", DBNull.Value),
                new SqlParameter("@StartDate", startDate),
                new SqlParameter("@EndDate", endDate),
                new SqlParameter("@ClassId", classId),
                new SqlParameter("@SubjectId", DBNull.Value));

            var schedules = new List<ExamSchedule>();
            foreach (DataRow row in dt.Rows)
            {
                schedules.Add(MapToExamSchedule(row));
            }

            return schedules;
        }

        // ============================================================
        // 🔹 HELPER: TÍNH TUẦN ISO TỪ DATE
        // ============================================================
        private int GetIsoWeekNumber(DateTime date)
        {
            // ISO 8601: Tuần 1 là tuần có ngày 4/1
            var day = (int)System.Globalization.CultureInfo.CurrentCulture.Calendar.GetDayOfWeek(date);
            if (day >= (int)DayOfWeek.Monday && day <= (int)DayOfWeek.Wednesday)
            {
                date = date.AddDays(3);
            }
            return System.Globalization.CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(
                date, 
                System.Globalization.CalendarWeekRule.FirstFourDayWeek, 
                DayOfWeek.Monday);
        }

        // ============================================================
        // 🔹 HELPER: TÍNH DATE RANGE CỦA TUẦN ISO
        // ============================================================
        private (DateTime startDate, DateTime endDate) GetIsoWeekDateRange(int year, int week)
        {
            // Tính ngày 4/1 của năm (luôn nằm trong tuần 1 ISO)
            var jan4 = new DateTime(year, 1, 4);
            var jan4Day = ((int)jan4.DayOfWeek == 0 ? 7 : (int)jan4.DayOfWeek); // Convert Sunday to 7

            // Tính thứ 2 của tuần 1
            var mondayOfWeek1 = jan4.AddDays(-(jan4Day - 1));

            // Tính thứ 2 của tuần được yêu cầu
            var mondayOfTargetWeek = mondayOfWeek1.AddDays((week - 1) * 7);

            // Tuần ISO từ thứ 2 đến chủ nhật
            var startDate = mondayOfTargetWeek;
            var endDate = mondayOfTargetWeek.AddDays(6);

            return (startDate, endDate);
        }

        // ============================================================
        // 🔹 TẠO LỊCH THI CHO LỚP HỌC PHẦN (TỰ ĐỘNG PHÂN SINH VIÊN)
        // ============================================================
        public async Task<List<ExamSchedule>> CreateExamScheduleForClassAsync(ExamSchedule exam, string roomId)
        {
            var parameters = new[]
            {
                new SqlParameter("@ClassId", exam.ClassId),
                new SqlParameter("@SubjectId", exam.SubjectId),
                new SqlParameter("@ExamDate", exam.ExamDate),
                new SqlParameter("@ExamTime", exam.ExamTime),
                new SqlParameter("@EndTime", exam.EndTime),
                new SqlParameter("@RoomId", roomId),
                new SqlParameter("@ExamType", exam.ExamType),
                new SqlParameter("@ProctorLecturerId", (object?)exam.ProctorLecturerId ?? DBNull.Value),
                new SqlParameter("@Duration", exam.Duration),
                new SqlParameter("@Notes", (object?)exam.Notes ?? DBNull.Value),
                new SqlParameter("@SchoolYearId", (object?)exam.SchoolYearId ?? DBNull.Value),
                new SqlParameter("@Semester", (object?)exam.Semester ?? DBNull.Value),
                new SqlParameter("@CreatedBy", (object?)exam.CreatedBy ?? "system")
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CreateExamScheduleForClass", parameters);

            var createdExams = new List<ExamSchedule>();
            foreach (DataRow row in dt.Rows)
            {
                var examId = row["exam_id"]?.ToString() ?? string.Empty;
                var createdExam = await GetByIdAsync(examId);
                if (createdExam != null)
                {
                    createdExams.Add(createdExam);
                }
            }

            return createdExams;
        }

        // ============================================================
        // 🔹 MAP DATA ROW TO EXAMSCHEDULE MODEL
        // ============================================================
        private static ExamSchedule MapToExamSchedule(DataRow row)
        {
            var exam = new ExamSchedule
            {
                ExamId = row["exam_id"]?.ToString() ?? string.Empty,
                ClassId = row["class_id"]?.ToString() ?? string.Empty,
                SubjectId = row["subject_id"]?.ToString() ?? string.Empty,
                ExamDate = row["exam_date"] != DBNull.Value
                    ? Convert.ToDateTime(row["exam_date"])
                    : DateTime.Now,
                ExamTime = row["exam_time"] != DBNull.Value
                    ? (row["exam_time"] is TimeSpan ts ? ts : TimeSpan.Parse(row["exam_time"].ToString()!))
                    : TimeSpan.Zero,
                EndTime = row["end_time"] != DBNull.Value
                    ? (row["end_time"] is TimeSpan ts2 ? ts2 : TimeSpan.Parse(row["end_time"].ToString()!))
                    : TimeSpan.Zero,
                RoomId = row.Table.Columns.Contains("room_id") && row["room_id"] != DBNull.Value
                    ? row["room_id"]?.ToString()
                    : null,
                ExamType = row["exam_type"]?.ToString() ?? string.Empty,
                SessionNo = row.Table.Columns.Contains("session_no") && row["session_no"] != DBNull.Value
                    ? Convert.ToInt32(row["session_no"])
                    : null,
                ProctorLecturerId = row.Table.Columns.Contains("proctor_lecturer_id") && row["proctor_lecturer_id"] != DBNull.Value
                    ? row["proctor_lecturer_id"]?.ToString()
                    : null,
                Duration = row["duration"] != DBNull.Value
                    ? Convert.ToInt32(row["duration"])
                    : 0,
                MaxStudents = row.Table.Columns.Contains("max_students") && row["max_students"] != DBNull.Value
                    ? Convert.ToInt32(row["max_students"])
                    : null,
                Notes = row.Table.Columns.Contains("notes") && row["notes"] != DBNull.Value
                    ? row["notes"]?.ToString()
                    : null,
                Status = row["status"]?.ToString() ?? "PLANNED",
                SchoolYearId = row.Table.Columns.Contains("school_year_id") && row["school_year_id"] != DBNull.Value
                    ? row["school_year_id"]?.ToString()
                    : null,
                Semester = row.Table.Columns.Contains("semester") && row["semester"] != DBNull.Value
                    ? Convert.ToInt32(row["semester"])
                    : null,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["created_at"])
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") && row["created_by"] != DBNull.Value
                    ? row["created_by"]?.ToString()
                    : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["updated_at"])
                    : (DateTime?)null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") && row["updated_by"] != DBNull.Value
                    ? row["updated_by"]?.ToString()
                    : null
            };

            // Map NotMapped properties
            exam.ClassCode = row.Table.Columns.Contains("class_code") && row["class_code"] != DBNull.Value
                ? row["class_code"]?.ToString()
                : null;
            exam.ClassName = row.Table.Columns.Contains("class_name") && row["class_name"] != DBNull.Value
                ? row["class_name"]?.ToString()
                : null;
            exam.SubjectCode = row.Table.Columns.Contains("subject_code") && row["subject_code"] != DBNull.Value
                ? row["subject_code"]?.ToString()
                : null;
            exam.SubjectName = row.Table.Columns.Contains("subject_name") && row["subject_name"] != DBNull.Value
                ? row["subject_name"]?.ToString()
                : null;
            exam.RoomCode = row.Table.Columns.Contains("room_code") && row["room_code"] != DBNull.Value
                ? row["room_code"]?.ToString()
                : null;
            exam.Building = row.Table.Columns.Contains("building") && row["building"] != DBNull.Value
                ? row["building"]?.ToString()
                : null;
            exam.RoomCapacity = row.Table.Columns.Contains("room_capacity") && row["room_capacity"] != DBNull.Value
                ? Convert.ToInt32(row["room_capacity"])
                : null;
            exam.ProctorName = row.Table.Columns.Contains("proctor_name") && row["proctor_name"] != DBNull.Value
                ? row["proctor_name"]?.ToString()
                : null;
            exam.SchoolYearCode = row.Table.Columns.Contains("year_code") && row["year_code"] != DBNull.Value
                ? row["year_code"]?.ToString()
                : null;
            exam.SchoolYearName = row.Table.Columns.Contains("year_name") && row["year_name"] != DBNull.Value
                ? row["year_name"]?.ToString()
                : null;
            exam.AssignedStudents = row.Table.Columns.Contains("assigned_students") && row["assigned_students"] != DBNull.Value
                ? Convert.ToInt32(row["assigned_students"])
                : null;

            return exam;
        }
    }
}

