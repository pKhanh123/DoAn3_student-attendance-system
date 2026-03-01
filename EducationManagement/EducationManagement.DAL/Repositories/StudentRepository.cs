using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Student;

namespace EducationManagement.DAL.Repositories
{
    public class StudentRepository
    {
        private readonly string _connectionString;

        public StudentRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 1️⃣ THÊM SINH VIÊN (SP: sp_AddStudentFull)
        // ============================================================
        public async Task AddAsync(StudentCreateDto model, string? passwordHash = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@UserId", model.UserId),
                new SqlParameter("@StudentCode", model.StudentCode),
                new SqlParameter("@FullName", model.FullName),
                new SqlParameter("@Gender", (object?)model.Gender ?? DBNull.Value),
                new SqlParameter("@Dob", (object?)model.Dob ?? DBNull.Value),
                new SqlParameter("@Email", (object?)model.Email ?? DBNull.Value),
                new SqlParameter("@Phone", (object?)model.Phone ?? DBNull.Value),
                new SqlParameter("@FacultyId", (object?)model.FacultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)model.MajorId ?? DBNull.Value),
                new SqlParameter("@AcademicYearId", (object?)model.AcademicYearId ?? DBNull.Value),
                new SqlParameter("@CohortYear", (object?)model.CohortYear ?? DBNull.Value),
                new SqlParameter("@PasswordHash", (object?)passwordHash ?? DBNull.Value),
                new SqlParameter("@CreatedBy", model.CreatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_AddStudentFull", parameters);
        }

        // ============================================================
        // 🔹 2️⃣ CẬP NHẬT SINH VIÊN (SP: sp_UpdateStudentFull)
        // ============================================================
        public async Task UpdateAsync(UpdateStudentFullDto model)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", model.StudentId),
                new SqlParameter("@FullName", model.FullName),
                new SqlParameter("@Gender", (object?)model.Gender ?? DBNull.Value),
                new SqlParameter("@Dob", (object?)model.Dob ?? DBNull.Value),
                new SqlParameter("@Email", (object?)model.Email ?? DBNull.Value),
                new SqlParameter("@Phone", (object?)model.Phone ?? DBNull.Value),
                new SqlParameter("@FacultyId", (object?)model.FacultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)model.MajorId ?? DBNull.Value),
                new SqlParameter("@AcademicYearId", (object?)model.AcademicYearId ?? DBNull.Value),
                new SqlParameter("@CohortYear", (object?)model.CohortYear ?? DBNull.Value),
                new SqlParameter("@Nationality", (object?)model.Nationality ?? DBNull.Value),
                new SqlParameter("@Ethnicity", (object?)model.Ethnicity ?? DBNull.Value),
                new SqlParameter("@Religion", (object?)model.Religion ?? DBNull.Value),
                new SqlParameter("@Hometown", (object?)model.Hometown ?? DBNull.Value),
                new SqlParameter("@CurrentAddress", (object?)model.CurrentAddress ?? DBNull.Value),
                new SqlParameter("@BankNo", (object?)model.BankNo ?? DBNull.Value),
                new SqlParameter("@BankName", (object?)model.BankName ?? DBNull.Value),
                new SqlParameter("@InsuranceNo", (object?)model.InsuranceNo ?? DBNull.Value),
                new SqlParameter("@IssuePlace", (object?)model.IssuePlace ?? DBNull.Value),
                new SqlParameter("@IssueDate", (object?)model.IssueDate ?? DBNull.Value),
                new SqlParameter("@Facebook", (object?)model.Facebook ?? DBNull.Value),
                new SqlParameter("@FamilyFullName", (object?)model.FamilyFullName ?? DBNull.Value),
                new SqlParameter("@RelationType", (object?)model.RelationType ?? DBNull.Value),
                new SqlParameter("@BirthYear", (object?)model.BirthYear ?? DBNull.Value),
                new SqlParameter("@PhoneFamily", (object?)model.PhoneFamily ?? DBNull.Value),
                new SqlParameter("@JobFamily", (object?)model.JobFamily ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", model.UpdatedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateStudentFull", parameters);
        }

        // ============================================================
        // 🔹 3️⃣ XOÁ SINH VIÊN (SP: sp_DeleteStudentFull)
        // ============================================================
        public async Task DeleteAsync(string studentId, string deletedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@StudentId", studentId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteStudentFull", parameters);
        }

        // ============================================================
        // 🔹 4️⃣ LẤY DANH SÁCH SINH VIÊN (SP: sp_GetAllStudents)
        // ============================================================
        public async Task<(List<Student> Students, int TotalCount)> GetAllAsync(
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? facultyId = null,
            string? majorId = null,
            string? academicYearId = null)
        {
            var students = new List<Student>();
            int totalCount = 0;

            var parameters = new[]
            {
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize),
                new SqlParameter("@Search", (object?)search ?? DBNull.Value),
                new SqlParameter("@FacultyId", (object?)facultyId ?? DBNull.Value),
                new SqlParameter("@MajorId", (object?)majorId ?? DBNull.Value),
                new SqlParameter("@AcademicYearId", (object?)academicYearId ?? DBNull.Value)
            };

            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetAllStudents", parameters);

            if (ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0)
                totalCount = Convert.ToInt32(ds.Tables[0].Rows[0]["TotalCount"]);

            if (ds.Tables.Count > 1)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                    students.Add(MapToStudent(row));
            }

            return (students, totalCount);
        }

        // ============================================================
        // 🔹 5️⃣ LẤY SINH VIÊN THEO ID (SP: sp_GetStudentById)
        // ============================================================
        public async Task<Student?> GetByIdAsync(string studentId)
        {
            var param = new SqlParameter("@StudentId", studentId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetStudentById", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToStudent(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 6️⃣ LẤY SINH VIÊN THEO USER ID (SP: sp_GetStudentByUserId)
        // ============================================================
        public async Task<Student?> GetByUserIdAsync(string userId)
        {
            var param = new SqlParameter("@UserId", userId);
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetStudentByUserId", param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToStudent(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 MAP DỮ LIỆU DataRow → Student MODEL
        // ============================================================
        private static Student MapToStudent(DataRow row)
        {
            var student = new Student
            {
                StudentId = row["student_id"].ToString()!,
                UserId = row["user_id"].ToString()!,
                StudentCode = row["student_code"].ToString()!,
                FullName = row["full_name"].ToString()!,
                Gender = row.Table.Columns.Contains("gender") ? row["gender"]?.ToString() : null,
                Dob = row.Table.Columns.Contains("dob") && row["dob"] != DBNull.Value ? Convert.ToDateTime(row["dob"]) : (DateTime?)null,
                Email = row.Table.Columns.Contains("email") ? row["email"]?.ToString() : null,
                Phone = row.Table.Columns.Contains("phone") ? row["phone"]?.ToString() : null,
                FacultyId = row.Table.Columns.Contains("faculty_id") ? row["faculty_id"]?.ToString() : null,
                FacultyName = row.Table.Columns.Contains("faculty_name") ? row["faculty_name"]?.ToString() : null,
                MajorId = row.Table.Columns.Contains("major_id") ? row["major_id"]?.ToString() : null,
                MajorName = row.Table.Columns.Contains("major_name") ? row["major_name"]?.ToString() : null,
                AcademicYearId = row.Table.Columns.Contains("academic_year_id") ? row["academic_year_id"]?.ToString() : null,
                YearCode = row.Table.Columns.Contains("year_code") ? row["year_code"]?.ToString() : null,
                CohortYear = row.Table.Columns.Contains("cohort_year") ? row["cohort_year"]?.ToString() : null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null
            };

            student.CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                ? Convert.ToDateTime(row["created_at"])
                : DateTime.Now;

            student.UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                ? Convert.ToDateTime(row["updated_at"])
                : (DateTime?)null;

            student.DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                ? Convert.ToDateTime(row["deleted_at"])
                : null;

            student.DeletedBy = row.Table.Columns.Contains("deleted_by")
                ? row["deleted_by"]?.ToString()
                : null;

            return student;
        }

        // ============================================================
        // 🔹 6️⃣ BATCH IMPORT STUDENTS
        // ============================================================
        public async Task<BatchImportResultDto> ImportBatchAsync(List<StudentImportDto> students, string createdBy)
        {
            var result = new BatchImportResultDto();

            using (var connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                // Create DataTable for Table-Valued Parameter
                var studentsTable = new DataTable();
                studentsTable.Columns.Add("StudentCode", typeof(string));
                studentsTable.Columns.Add("FullName", typeof(string));
                studentsTable.Columns.Add("Email", typeof(string));
                studentsTable.Columns.Add("Phone", typeof(string));
                studentsTable.Columns.Add("DateOfBirth", typeof(DateTime));
                studentsTable.Columns.Add("Gender", typeof(string));
                studentsTable.Columns.Add("Address", typeof(string));
                studentsTable.Columns.Add("MajorId", typeof(string));
                studentsTable.Columns.Add("AcademicYearId", typeof(string));

                // Populate DataTable
                foreach (var student in students)
                {
                    studentsTable.Rows.Add(
                        student.StudentCode,
                        student.FullName,
                        student.Email,
                        (object?)student.Phone ?? DBNull.Value,
                        (object?)student.DateOfBirth ?? DBNull.Value,
                        (object?)student.Gender ?? DBNull.Value,
                        (object?)student.Address ?? DBNull.Value,
                        student.MajorId,
                        (object?)student.AcademicYearId ?? DBNull.Value
                    );
                }

                using (var command = new SqlCommand("sp_ImportStudentsBatch", connection))
                {
                    command.CommandType = CommandType.StoredProcedure;

                    // Add table-valued parameter
                    var tvpParam = command.Parameters.AddWithValue("@Students", studentsTable);
                    tvpParam.SqlDbType = SqlDbType.Structured;
                    tvpParam.TypeName = "StudentImportType";

                    command.Parameters.AddWithValue("@CreatedBy", createdBy);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        // First result set: Summary
                        if (await reader.ReadAsync())
                        {
                            result.SuccessCount = reader.GetInt32(reader.GetOrdinal("SuccessCount"));
                            result.ErrorCount = reader.GetInt32(reader.GetOrdinal("ErrorCount"));
                        }

                        // Second result set: Errors (if any)
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                result.Errors.Add(new ImportErrorDto
                                {
                                    RowNumber = reader.GetInt32(reader.GetOrdinal("RowNumber")),
                                    StudentCode = reader.GetString(reader.GetOrdinal("StudentCode")),
                                    ErrorMessage = reader.GetString(reader.GetOrdinal("ErrorMessage"))
                                });
                            }
                        }
                    }
                }
            }

            return result;
        }
    }
}
