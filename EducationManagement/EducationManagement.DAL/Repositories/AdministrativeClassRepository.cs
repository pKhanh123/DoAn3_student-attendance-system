using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.AdministrativeClass;

namespace EducationManagement.DAL.Repositories
{
    public class AdministrativeClassRepository
    {
        private readonly string _connectionString;

        public AdministrativeClassRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 1️⃣ GET ALL with Pagination & Filters
        // ============================================================
        public async Task<(List<AdminClassListDto> data, int totalCount)> GetAllAsync(
            int page, 
            int pageSize, 
            string? search = null, 
            string? majorId = null, 
            int? cohortYear = null, 
            string? advisorId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Search", (object?)search ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)majorId ?? DBNull.Value),
                new SqlParameter("@CohortYear", (object?)cohortYear ?? DBNull.Value),
                new SqlParameter("@AdvisorId", (object?)advisorId ?? DBNull.Value)
            };

            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(
                _connectionString, "sp_GetAllAdministrativeClasses", parameters);

            int totalCount = 0;
            if (ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0)
            {
                totalCount = Convert.ToInt32(ds.Tables[0].Rows[0]["TotalCount"]);
            }

            var data = new List<AdminClassListDto>();
            if (ds.Tables.Count > 1)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                {
                    data.Add(MapToListDto(row));
                }
            }

            return (data, totalCount);
        }

        // ============================================================
        // 2️⃣ GET BY ID
        // ============================================================
        public async Task<AdminClassDetailDto?> GetByIdAsync(string adminClassId)
        {
            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", adminClassId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetAdministrativeClassById", parameters);

            if (dt.Rows.Count == 0)
                return null;

            return MapToDetailDto(dt.Rows[0]);
        }

        // ============================================================
        // 3️⃣ CREATE
        // ============================================================
        public async Task<string> CreateAsync(CreateAdminClassDto dto, string createdBy)
        {
            string adminClassId = $"AC-{Guid.NewGuid()}";

            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", adminClassId),
                new SqlParameter("@ClassCode", dto.ClassCode),
                new SqlParameter("@ClassName", dto.ClassName),
                new SqlParameter("@MajorId", (object?)dto.MajorId ?? DBNull.Value),
                new SqlParameter("@AdvisorId", (object?)dto.AdvisorId ?? DBNull.Value),
                new SqlParameter("@AcademicYearId", (object?)dto.AcademicYearId ?? DBNull.Value),
                new SqlParameter("@CohortYear", dto.CohortYear),
                new SqlParameter("@MaxStudents", dto.MaxStudents),
                new SqlParameter("@Description", (object?)dto.Description ?? DBNull.Value),
                new SqlParameter("@CreatedBy", createdBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_CreateAdministrativeClass", parameters);

            return adminClassId;
        }

        // ============================================================
        // 4️⃣ UPDATE
        // ============================================================
        public async Task UpdateAsync(string adminClassId, UpdateAdminClassDto dto, string updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", adminClassId),
                new SqlParameter("@ClassCode", dto.ClassCode),
                new SqlParameter("@ClassName", dto.ClassName),
                new SqlParameter("@MajorId", (object?)dto.MajorId ?? DBNull.Value),
                new SqlParameter("@AdvisorId", (object?)dto.AdvisorId ?? DBNull.Value),
                new SqlParameter("@AcademicYearId", (object?)dto.AcademicYearId ?? DBNull.Value),
                new SqlParameter("@CohortYear", dto.CohortYear),
                new SqlParameter("@MaxStudents", dto.MaxStudents),
                new SqlParameter("@Description", (object?)dto.Description ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_UpdateAdministrativeClass", parameters);
        }

        // ============================================================
        // 5️⃣ DELETE (Soft Delete)
        // ============================================================
        public async Task DeleteAsync(string adminClassId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", adminClassId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_DeleteAdministrativeClass", parameters);
        }

        // ============================================================
        // 6️⃣ GET STUDENTS BY CLASS
        // ============================================================
        public async Task<List<Student>> GetStudentsByClassAsync(string adminClassId)
        {
            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", adminClassId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetStudentsByAdminClass", parameters);

            var students = new List<Student>();
            foreach (DataRow row in dt.Rows)
            {
                students.Add(MapToStudent(row));
            }

            return students;
        }

        // ============================================================
        // 7️⃣ ASSIGN STUDENT TO CLASS
        // ============================================================
        public async Task AssignStudentToClassAsync(string studentId, string adminClassId, string assignedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@AdminClassId", adminClassId),
                new SqlParameter("@AssignedBy", assignedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_AssignStudentToAdminClass", parameters);
        }

        // ============================================================
        // 8️⃣ REMOVE STUDENT FROM CLASS
        // ============================================================
        public async Task RemoveStudentFromClassAsync(string studentId, string removedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@RemovedBy", removedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_RemoveStudentFromAdminClass", parameters);
        }

        // ============================================================
        // 🔟 TRANSFER STUDENT TO CLASS
        // ============================================================
        public async Task TransferStudentToClassAsync(string studentId, string toAdminClassId, string? transferReason, string transferredBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@ToAdminClassId", toAdminClassId),
                new SqlParameter("@TransferReason", (object?)transferReason ?? DBNull.Value),
                new SqlParameter("@TransferredBy", transferredBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_TransferStudentToClass", parameters);
        }

        // ============================================================
        // 1️⃣1️⃣ RECALCULATE STUDENT COUNT
        // ============================================================
        public async Task RecalculateStudentCountAsync(string? adminClassId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", (object?)adminClassId ?? DBNull.Value)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(
                _connectionString, "sp_RecalculateAdminClassStudentCount", parameters);
        }

        // ============================================================
        // 9️⃣ GET CLASS REPORT
        // ============================================================
        public async Task<AdminClassReportDto?> GetClassReportAsync(
            string adminClassId, 
            int? semester = null, 
            string? academicYearId = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", adminClassId),
                new SqlParameter("@Semester", (object?)semester ?? DBNull.Value),
                new SqlParameter("@AcademicYearId", (object?)academicYearId ?? DBNull.Value)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetAdminClassReport", parameters);

            if (dt.Rows.Count == 0)
                return null;

            return MapToReportDto(dt.Rows[0]);
        }

        // ============================================================
        // 🔟 GET CLASS STATISTICS
        // ============================================================
        public async Task<AdminClassReportDto?> GetClassStatisticsAsync(string adminClassId)
        {
            var parameters = new[]
            {
                new SqlParameter("@AdminClassId", adminClassId)
            };

            var dt = await DatabaseHelper.ExecuteQueryAsync(
                _connectionString, "sp_GetAdminClassStatistics", parameters);

            if (dt.Rows.Count == 0)
                return null;

            return MapToReportDto(dt.Rows[0]);
        }

        // ============================================================
        // MAPPING HELPERS
        // ============================================================
        private static AdminClassListDto MapToListDto(DataRow row)
        {
            return new AdminClassListDto
            {
                AdminClassId = row["admin_class_id"].ToString()!,
                ClassCode = row["class_code"].ToString()!,
                ClassName = row["class_name"].ToString()!,
                MajorName = row["major_name"]?.ToString(),
                MajorCode = row["major_code"]?.ToString(),
                AdvisorName = row["advisor_name"]?.ToString(),
                FacultyName = row["faculty_name"]?.ToString(),
                AcademicYearId = row.Table.Columns.Contains("academic_year_id") ? row["academic_year_id"]?.ToString() : null,
                AcademicYearName = row.Table.Columns.Contains("academic_year_name") ? row["academic_year_name"]?.ToString() : null,
                CohortYear = Convert.ToInt32(row["cohort_year"]),
                MaxStudents = Convert.ToInt32(row["max_students"]),
                CurrentStudents = Convert.ToInt32(row["current_students"]),
                IsActive = Convert.ToBoolean(row["is_active"])
            };
        }

        private static AdminClassDetailDto MapToDetailDto(DataRow row)
        {
            return new AdminClassDetailDto
            {
                AdminClassId = row["admin_class_id"].ToString()!,
                ClassCode = row["class_code"].ToString()!,
                ClassName = row["class_name"].ToString()!,
                MajorId = row.Table.Columns.Contains("major_id") ? row["major_id"]?.ToString() : null,
                MajorName = row.Table.Columns.Contains("major_name") ? row["major_name"]?.ToString() : null,
                MajorCode = row.Table.Columns.Contains("major_code") ? row["major_code"]?.ToString() : null,
                AdvisorId = row.Table.Columns.Contains("advisor_id") ? row["advisor_id"]?.ToString() : null,
                AdvisorName = row.Table.Columns.Contains("advisor_name") ? row["advisor_name"]?.ToString() : null,
                AdvisorEmail = row.Table.Columns.Contains("advisor_email") ? row["advisor_email"]?.ToString() : null,
                AdvisorPhone = row.Table.Columns.Contains("advisor_phone") ? row["advisor_phone"]?.ToString() : null,
                AcademicYearId = row.Table.Columns.Contains("academic_year_id") ? row["academic_year_id"]?.ToString() : null,
                AcademicYearName = row.Table.Columns.Contains("academic_year_name") ? row["academic_year_name"]?.ToString() : null,
                CohortYear = Convert.ToInt32(row["cohort_year"]),
                MaxStudents = Convert.ToInt32(row["max_students"]),
                CurrentStudents = Convert.ToInt32(row["current_students"]),
                Description = row.Table.Columns.Contains("description") ? row["description"]?.ToString() : null,
                FacultyName = row.Table.Columns.Contains("faculty_name") ? row["faculty_name"]?.ToString() : null,
                DepartmentName = row.Table.Columns.Contains("department_name") ? row["department_name"]?.ToString() : null,
                IsActive = Convert.ToBoolean(row["is_active"]),
                CreatedAt = Convert.ToDateTime(row["created_at"]),
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value ? Convert.ToDateTime(row["updated_at"]) : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null
            };
        }

        private static AdminClassReportDto MapToReportDto(DataRow row)
        {
            return new AdminClassReportDto
            {
                AdminClassId = row["admin_class_id"].ToString()!,
                ClassCode = row["class_code"].ToString()!,
                ClassName = row["class_name"].ToString()!,
                TotalStudents = row.Table.Columns.Contains("total_students") ? Convert.ToInt32(row["total_students"]) : 0,
                MaleStudents = row.Table.Columns.Contains("male_students") ? Convert.ToInt32(row["male_students"]) : 0,
                FemaleStudents = row.Table.Columns.Contains("female_students") ? Convert.ToInt32(row["female_students"]) : 0,
                AverageGPA = row.Table.Columns.Contains("average_gpa") && row["average_gpa"] != DBNull.Value 
                    ? Convert.ToDouble(row["average_gpa"]) : 0,
                AttendanceRate = row.Table.Columns.Contains("attendance_rate") && row["attendance_rate"] != DBNull.Value 
                    ? Convert.ToDouble(row["attendance_rate"]) : 0,
                AdvisorName = row["advisor_name"]?.ToString(),
                MajorName = row["major_name"]?.ToString(),
                CohortYear = Convert.ToInt32(row["cohort_year"])
            };
        }

        private static Student MapToStudent(DataRow row)
        {
            return new Student
            {
                StudentId = row["student_id"].ToString()!,
                StudentCode = row["student_code"].ToString()!,
                FullName = row["full_name"].ToString()!,
                Email = row.Table.Columns.Contains("email") ? row["email"]?.ToString() : null,
                Phone = row.Table.Columns.Contains("phone") ? row["phone"]?.ToString() : null,
                Gender = row.Table.Columns.Contains("gender") ? row["gender"]?.ToString() : null,
                Dob = row.Table.Columns.Contains("dob") && row["dob"] != DBNull.Value ? Convert.ToDateTime(row["dob"]) : null,
                MajorId = row.Table.Columns.Contains("major_id") ? row["major_id"]?.ToString() : null,
                MajorName = row.Table.Columns.Contains("major_name") ? row["major_name"]?.ToString() : null,
                AdminClassId = row.Table.Columns.Contains("admin_class_id") ? row["admin_class_id"]?.ToString() : null,
                AdminClassName = row.Table.Columns.Contains("admin_class_name") ? row["admin_class_name"]?.ToString() : null,
                AdminClassCode = row.Table.Columns.Contains("admin_class_code") ? row["admin_class_code"]?.ToString() : null,
                IsActive = row.Table.Columns.Contains("is_active") ? Convert.ToBoolean(row["is_active"]) : true
            };
        }
    }
}

