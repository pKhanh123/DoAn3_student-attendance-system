using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;

namespace EducationManagement.DAL.Repositories
{
    public class SchoolYearRepository
    {
        private readonly string _connectionString;

        public SchoolYearRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 GET ALL SCHOOL YEARS
        // ============================================================
        public async Task<List<SchoolYear>> GetAllAsync()
        {
            try
            {
                var list = new List<SchoolYear>();
                var query = @"
                    SELECT sy.*, ay.cohort_code, ay.year_name AS cohort_name
                    FROM school_years sy
                    LEFT JOIN academic_years ay ON sy.academic_year_id = ay.academic_year_id
                    WHERE sy.deleted_at IS NULL
                    ORDER BY ISNULL(sy.start_date, '1900-01-01') DESC";

                var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, query);

                foreach (DataRow row in dt.Rows)
                    list.Add(MapToSchoolYear(row));

                return list;
            }
            catch (Exception ex)
            {
                throw new Exception($"❌ Lỗi khi lấy danh sách năm học: {ex.Message}", ex);
            }
        }

        // ============================================================
        // 🔹 GET BY ID
        // ============================================================
        public async Task<SchoolYear?> GetByIdAsync(string schoolYearId)
        {
            var query = @"
                SELECT sy.*, ay.cohort_code, ay.year_name AS cohort_name
                FROM school_years sy
                LEFT JOIN academic_years ay ON sy.academic_year_id = ay.academic_year_id
                WHERE sy.school_year_id = @SchoolYearId AND sy.deleted_at IS NULL";

            var param = new SqlParameter("@SchoolYearId", schoolYearId);
            var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, query, param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToSchoolYear(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 GET CURRENT SCHOOL YEAR & SEMESTER
        // ============================================================
        public async Task<SchoolYear?> GetCurrentAsync()
        {
            try
            {
                var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetCurrentSchoolYearAndSemester");

                if (dt.Rows.Count == 0)
                    return null;

                return MapToSchoolYear(dt.Rows[0]);
            }
            catch (Exception ex)
            {
                // If stored procedure doesn't exist or fails, try alternative query
                try
                {
                    var today = DateTime.Now.Date;
                    var query = @"
                        SELECT TOP 1 sy.*, ay.cohort_code, ay.year_name AS cohort_name
                        FROM school_years sy
                        LEFT JOIN academic_years ay ON sy.academic_year_id = ay.academic_year_id
                        WHERE @Today BETWEEN sy.start_date AND sy.end_date
                            AND sy.deleted_at IS NULL
                        ORDER BY sy.is_active DESC, sy.created_at DESC";

                    var param = new SqlParameter("@Today", today);
                    var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, query, param);

                    if (dt.Rows.Count == 0)
                        return null;

                    var schoolYear = MapToSchoolYear(dt.Rows[0]);
                    
                    // Auto-detect current semester based on dates
                    if (schoolYear.Semester1Start.HasValue && schoolYear.Semester1End.HasValue &&
                        today >= schoolYear.Semester1Start.Value && today <= schoolYear.Semester1End.Value)
                        schoolYear.CurrentSemester = 1;
                    else if (schoolYear.Semester2Start.HasValue && schoolYear.Semester2End.HasValue &&
                             today >= schoolYear.Semester2Start.Value && today <= schoolYear.Semester2End.Value)
                        schoolYear.CurrentSemester = 2;
                    else
                        schoolYear.CurrentSemester = null;

                    return schoolYear;
                }
                catch (Exception innerEx)
                {
                    throw new Exception($"❌ Lỗi khi lấy năm học hiện tại: {ex.Message}", innerEx);
                }
            }
        }

        // ============================================================
        // 🔹 GET ACTIVE SCHOOL YEAR
        // ============================================================
        public async Task<SchoolYear?> GetActiveAsync()
        {
            var query = @"
                SELECT TOP 1 sy.*, ay.cohort_code, ay.year_name AS cohort_name
                FROM school_years sy
                LEFT JOIN academic_years ay ON sy.academic_year_id = ay.academic_year_id
                WHERE sy.is_active = 1 AND sy.deleted_at IS NULL
                ORDER BY sy.created_at DESC";

            var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, query);

            if (dt.Rows.Count == 0)
                return null;

            return MapToSchoolYear(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 CREATE
        // ============================================================
        public async Task AddAsync(SchoolYear schoolYear)
        {
            var parameters = new[]
            {
                new SqlParameter("@SchoolYearId", schoolYear.SchoolYearId),
                new SqlParameter("@YearCode", schoolYear.YearCode),
                new SqlParameter("@YearName", schoolYear.YearName),
                new SqlParameter("@AcademicYearId", (object?)schoolYear.AcademicYearId ?? DBNull.Value),
                new SqlParameter("@StartDate", schoolYear.StartDate),
                new SqlParameter("@EndDate", schoolYear.EndDate),
                new SqlParameter("@Semester1Start", (object?)schoolYear.Semester1Start ?? DBNull.Value),
                new SqlParameter("@Semester1End", (object?)schoolYear.Semester1End ?? DBNull.Value),
                new SqlParameter("@Semester2Start", (object?)schoolYear.Semester2Start ?? DBNull.Value),
                new SqlParameter("@Semester2End", (object?)schoolYear.Semester2End ?? DBNull.Value),
                new SqlParameter("@IsActive", schoolYear.IsActive),
                new SqlParameter("@CurrentSemester", (object?)schoolYear.CurrentSemester ?? DBNull.Value),
                new SqlParameter("@CreatedBy", schoolYear.CreatedBy ?? "System")
            };

            var query = @"
                INSERT INTO school_years (
                    school_year_id, year_code, year_name, academic_year_id,
                    start_date, end_date,
                    semester1_start, semester1_end, semester2_start, semester2_end,
                    is_active, current_semester, created_at, created_by
                )
                VALUES (
                    @SchoolYearId, @YearCode, @YearName, @AcademicYearId,
                    @StartDate, @EndDate,
                    @Semester1Start, @Semester1End, @Semester2Start, @Semester2End,
                    @IsActive, @CurrentSemester, GETDATE(), @CreatedBy
                )";

            await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, query, parameters);
        }

        // ============================================================
        // 🔹 UPDATE
        // ============================================================
        public async Task<int> UpdateAsync(SchoolYear schoolYear)
        {
            var parameters = new[]
            {
                new SqlParameter("@SchoolYearId", schoolYear.SchoolYearId),
                new SqlParameter("@YearCode", schoolYear.YearCode),
                new SqlParameter("@YearName", schoolYear.YearName),
                new SqlParameter("@AcademicYearId", (object?)schoolYear.AcademicYearId ?? DBNull.Value),
                new SqlParameter("@StartDate", schoolYear.StartDate),
                new SqlParameter("@EndDate", schoolYear.EndDate),
                new SqlParameter("@Semester1Start", (object?)schoolYear.Semester1Start ?? DBNull.Value),
                new SqlParameter("@Semester1End", (object?)schoolYear.Semester1End ?? DBNull.Value),
                new SqlParameter("@Semester2Start", (object?)schoolYear.Semester2Start ?? DBNull.Value),
                new SqlParameter("@Semester2End", (object?)schoolYear.Semester2End ?? DBNull.Value),
                new SqlParameter("@IsActive", schoolYear.IsActive),
                new SqlParameter("@CurrentSemester", (object?)schoolYear.CurrentSemester ?? DBNull.Value),
                new SqlParameter("@UpdatedBy", schoolYear.UpdatedBy ?? "System")
            };

            var query = @"
                UPDATE school_years SET
                    year_code = @YearCode,
                    year_name = @YearName,
                    academic_year_id = @AcademicYearId,
                    start_date = @StartDate,
                    end_date = @EndDate,
                    semester1_start = @Semester1Start,
                    semester1_end = @Semester1End,
                    semester2_start = @Semester2Start,
                    semester2_end = @Semester2End,
                    is_active = @IsActive,
                    current_semester = @CurrentSemester,
                    updated_at = GETDATE(),
                    updated_by = @UpdatedBy
                WHERE school_year_id = @SchoolYearId";

            return await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, query, parameters);
        }

        // ============================================================
        // 🔹 SOFT DELETE
        // ============================================================
        public async Task DeleteAsync(string schoolYearId, string deletedBy = "System")
        {
            var parameters = new[]
            {
                new SqlParameter("@SchoolYearId", schoolYearId),
                new SqlParameter("@DeletedBy", deletedBy)
            };

            var query = @"
                UPDATE school_years SET
                    deleted_at = GETDATE(),
                    deleted_by = @DeletedBy
                WHERE school_year_id = @SchoolYearId";

            await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, query, parameters);
        }

        // ============================================================
        // 🔹 AUTO TRANSITION SEMESTER
        // ============================================================
        public async Task AutoTransitionSemesterAsync(string executedBy = "system")
        {
            var param = new SqlParameter("@ExecutedBy", executedBy);
            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_AutoTransitionSemester", param);
        }

        // ============================================================
        // 🔹 AUTO TRANSITION TO NEW SCHOOL YEAR
        // ============================================================
        public async Task AutoTransitionToNewSchoolYearAsync(string newSchoolYearId, string executedBy = "system")
        {
            var parameters = new[]
            {
                new SqlParameter("@NewSchoolYearId", newSchoolYearId),
                new SqlParameter("@ExecutedBy", executedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_AutoTransitionToNewSchoolYear", parameters);
        }

        // ============================================================
        // 🔹 CALCULATE GPA FOR SEMESTER
        // ============================================================
        public async Task CalculateGPAForSemesterAsync(string academicYearId, int semester, string executedBy = "system")
        {
            var parameters = new[]
            {
                new SqlParameter("@AcademicYearId", academicYearId),
                new SqlParameter("@Semester", semester),
                new SqlParameter("@CreatedBy", executedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CalculateAllStudentGPA", parameters);
        }
        
        // ============================================================
        // 🔹 CALCULATE GPA FOR SEMESTER BY SCHOOL YEAR
        // ============================================================
        public async Task CalculateGPAForSemesterBySchoolYearAsync(string schoolYearId, int semester, string executedBy = "system")
        {
            // Use stored procedure instead of raw SQL to avoid CommandText length limit
            var parameters = new[]
            {
                new SqlParameter("@SchoolYearId", schoolYearId),
                new SqlParameter("@Semester", semester),
                new SqlParameter("@CreatedBy", executedBy)
            };

            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CalculateAllStudentGPABySchoolYear", parameters);
        }

        // ============================================================
        // 🔹 MAPPING
        // ============================================================
        private static SchoolYear MapToSchoolYear(DataRow row)
        {
            var schoolYear = new SchoolYear
            {
                SchoolYearId = row["school_year_id"].ToString()!,
                YearCode = row["year_code"]?.ToString() ?? "",
                YearName = row["year_name"]?.ToString() ?? "",
                AcademicYearId = row.Table.Columns.Contains("academic_year_id") && row["academic_year_id"] != DBNull.Value
                    ? row["academic_year_id"]?.ToString()
                    : null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : false,
                CurrentSemester = row.Table.Columns.Contains("current_semester") && row["current_semester"] != DBNull.Value
                    ? Convert.ToInt32(row["current_semester"])
                    : (int?)null,
                CreatedBy = row.Table.Columns.Contains("created_by") ? row["created_by"]?.ToString() : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") ? row["updated_by"]?.ToString() : null
            };

            // Dates
            if (row.Table.Columns.Contains("start_date") && row["start_date"] != DBNull.Value)
                schoolYear.StartDate = Convert.ToDateTime(row["start_date"]);

            if (row.Table.Columns.Contains("end_date") && row["end_date"] != DBNull.Value)
                schoolYear.EndDate = Convert.ToDateTime(row["end_date"]);

            if (row.Table.Columns.Contains("semester1_start") && row["semester1_start"] != DBNull.Value)
                schoolYear.Semester1Start = Convert.ToDateTime(row["semester1_start"]);

            if (row.Table.Columns.Contains("semester1_end") && row["semester1_end"] != DBNull.Value)
                schoolYear.Semester1End = Convert.ToDateTime(row["semester1_end"]);

            if (row.Table.Columns.Contains("semester2_start") && row["semester2_start"] != DBNull.Value)
                schoolYear.Semester2Start = Convert.ToDateTime(row["semester2_start"]);

            if (row.Table.Columns.Contains("semester2_end") && row["semester2_end"] != DBNull.Value)
                schoolYear.Semester2End = Convert.ToDateTime(row["semester2_end"]);

            // Audit fields
            schoolYear.CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                ? Convert.ToDateTime(row["created_at"])
                : DateTime.Now;

            schoolYear.UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                ? Convert.ToDateTime(row["updated_at"])
                : (DateTime?)null;

            schoolYear.DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                ? Convert.ToDateTime(row["deleted_at"])
                : null;

            schoolYear.DeletedBy = row.Table.Columns.Contains("deleted_by")
                ? row["deleted_by"]?.ToString()
                : null;

            // Navigation properties
            if (row.Table.Columns.Contains("cohort_code"))
                schoolYear.CohortCode = row["cohort_code"]?.ToString();

            if (row.Table.Columns.Contains("cohort_name"))
                schoolYear.CohortName = row["cohort_name"]?.ToString();

            return schoolYear;
        }
    }
}

