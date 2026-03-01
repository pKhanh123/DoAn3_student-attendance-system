using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.DAL;

namespace EducationManagement.DAL.Repositories
{
    public class LecturerSubjectRepository
    {
        private readonly string _connectionString;

        public LecturerSubjectRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 Lấy tất cả lecturer-subject assignments
        // ============================================================
        public async Task<List<LecturerSubject>> GetAllAsync()
        {
            var sql = @"
                SELECT ls.*
                FROM dbo.lecturer_subjects ls
                WHERE ls.deleted_at IS NULL
                ORDER BY ls.created_at DESC";

            var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, sql);
            var list = new List<LecturerSubject>();

            foreach (DataRow row in dt.Rows)
            {
                list.Add(MapToLecturerSubject(row));
            }

            return list;
        }

        // ============================================================
        // 🔹 Lấy assignments theo lecturer ID
        // ============================================================
        public async Task<List<LecturerSubject>> GetByLecturerIdAsync(string lecturerId)
        {
            try
            {
                var sql = @"
                    SELECT ls.*
                    FROM dbo.lecturer_subjects ls
                    WHERE ls.lecturer_id = @LecturerId 
                    AND ls.deleted_at IS NULL
                    ORDER BY ls.created_at DESC";

                var param = new SqlParameter("@LecturerId", lecturerId);
                var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, sql, param);
                var list = new List<LecturerSubject>();

                foreach (DataRow row in dt.Rows)
                {
                    list.Add(MapToLecturerSubject(row));
                }

                return list;
            }
            catch (Exception ex)
            {
                // If table doesn't exist, return empty list
                if (ex.Message.Contains("Invalid object name") || ex.Message.Contains("does not exist"))
                {
                    return new List<LecturerSubject>();
                }
                throw;
            }
        }

        // ============================================================
        // 🔹 Lấy assignments theo subject ID
        // ============================================================
        public async Task<List<LecturerSubject>> GetBySubjectIdAsync(string subjectId)
        {
            var sql = @"
                SELECT ls.*
                FROM dbo.lecturer_subjects ls
                WHERE ls.subject_id = @SubjectId 
                AND ls.deleted_at IS NULL
                ORDER BY ls.created_at DESC";

            var param = new SqlParameter("@SubjectId", subjectId);
            var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, sql, param);
            var list = new List<LecturerSubject>();

            foreach (DataRow row in dt.Rows)
            {
                list.Add(MapToLecturerSubject(row));
            }

            return list;
        }

        // ============================================================
        // 🔹 Lấy assignment theo ID
        // ============================================================
        public async Task<LecturerSubject?> GetByIdAsync(string lecturerSubjectId)
        {
            var sql = @"
                SELECT ls.*
                FROM dbo.lecturer_subjects ls
                WHERE ls.lecturer_subject_id = @LecturerSubjectId 
                AND ls.deleted_at IS NULL";

            var param = new SqlParameter("@LecturerSubjectId", lecturerSubjectId);
            var dt = await DatabaseHelper.ExecuteRawQueryAsync(_connectionString, sql, param);

            if (dt.Rows.Count == 0)
                return null;

            return MapToLecturerSubject(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 Kiểm tra assignment đã tồn tại chưa
        // ============================================================
        public async Task<bool> ExistsAsync(string lecturerId, string subjectId)
        {
            try
            {
                var sql = @"
                    SELECT COUNT(*)
                    FROM dbo.lecturer_subjects ls
                    WHERE ls.lecturer_id = @LecturerId 
                    AND ls.subject_id = @SubjectId
                    AND ls.deleted_at IS NULL";

                var parameters = new[]
                {
                    new SqlParameter("@LecturerId", lecturerId),
                    new SqlParameter("@SubjectId", subjectId)
                };

                var result = await DatabaseHelper.ExecuteRawScalarAsync(_connectionString, sql, parameters);
                return result != null && Convert.ToInt32(result) > 0;
            }
            catch (Exception ex)
            {
                // If table doesn't exist, return false
                if (ex.Message.Contains("Invalid object name") || ex.Message.Contains("does not exist"))
                {
                    return false;
                }
                throw;
            }
        }

        // ============================================================
        // 🔹 Tạo assignment mới
        // ============================================================
        public async Task<string> AddAsync(LecturerSubject model)
        {
            var sql = @"
                INSERT INTO dbo.lecturer_subjects 
                (lecturer_subject_id, lecturer_id, subject_id, is_primary, experience_years, 
                 notes, certified_date, is_active, created_at, created_by)
                VALUES 
                (@LecturerSubjectId, @LecturerId, @SubjectId, @IsPrimary, @ExperienceYears,
                 @Notes, @CertifiedDate, @IsActive, @CreatedAt, @CreatedBy)";

            var parameters = new[]
            {
                new SqlParameter("@LecturerSubjectId", model.LecturerSubjectId),
                new SqlParameter("@LecturerId", model.LecturerId),
                new SqlParameter("@SubjectId", model.SubjectId),
                new SqlParameter("@IsPrimary", model.IsPrimary),
                new SqlParameter("@ExperienceYears", model.ExperienceYears),
                new SqlParameter("@Notes", (object?)model.Notes ?? DBNull.Value),
                new SqlParameter("@CertifiedDate", (object?)model.CertifiedDate ?? DBNull.Value),
                new SqlParameter("@IsActive", model.IsActive),
                new SqlParameter("@CreatedAt", model.CreatedAt),
                new SqlParameter("@CreatedBy", (object?)model.CreatedBy ?? DBNull.Value)
            };

            await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, sql, parameters);
            return model.LecturerSubjectId;
        }

        // ============================================================
        // 🔹 Cập nhật assignment
        // ============================================================
        public async Task UpdateAsync(LecturerSubject model)
        {
            var sql = @"
                UPDATE dbo.lecturer_subjects 
                SET lecturer_id = @LecturerId,
                    subject_id = @SubjectId,
                    is_primary = @IsPrimary,
                    experience_years = @ExperienceYears,
                    notes = @Notes,
                    certified_date = @CertifiedDate,
                    is_active = @IsActive,
                    updated_at = @UpdatedAt,
                    updated_by = @UpdatedBy
                WHERE lecturer_subject_id = @LecturerSubjectId
                AND deleted_at IS NULL";

            var parameters = new[]
            {
                new SqlParameter("@LecturerSubjectId", model.LecturerSubjectId),
                new SqlParameter("@LecturerId", model.LecturerId),
                new SqlParameter("@SubjectId", model.SubjectId),
                new SqlParameter("@IsPrimary", model.IsPrimary),
                new SqlParameter("@ExperienceYears", model.ExperienceYears),
                new SqlParameter("@Notes", (object?)model.Notes ?? DBNull.Value),
                new SqlParameter("@CertifiedDate", (object?)model.CertifiedDate ?? DBNull.Value),
                new SqlParameter("@IsActive", model.IsActive),
                new SqlParameter("@UpdatedAt", DateTime.Now),
                new SqlParameter("@UpdatedBy", (object?)model.UpdatedBy ?? DBNull.Value)
            };

            await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, sql, parameters);
        }

        // ============================================================
        // 🔹 Xóa assignment (soft delete)
        // ============================================================
        public async Task DeleteAsync(string lecturerSubjectId, string? deletedBy = null)
        {
            var sql = @"
                UPDATE dbo.lecturer_subjects 
                SET deleted_at = GETDATE(),
                    deleted_by = @DeletedBy
                WHERE lecturer_subject_id = @LecturerSubjectId
                AND deleted_at IS NULL";

            var parameters = new[]
            {
                new SqlParameter("@LecturerSubjectId", lecturerSubjectId),
                new SqlParameter("@DeletedBy", (object?)deletedBy ?? DBNull.Value)
            };

            await DatabaseHelper.ExecuteRawNonQueryAsync(_connectionString, sql, parameters);
        }

        // ============================================================
        // 🔹 Map DataRow to LecturerSubject model
        // ============================================================
        private static LecturerSubject MapToLecturerSubject(DataRow row)
        {
            return new LecturerSubject
            {
                LecturerSubjectId = row["lecturer_subject_id"].ToString()!,
                LecturerId = row["lecturer_id"].ToString()!,
                SubjectId = row["subject_id"].ToString()!,
                IsPrimary = row.Table.Columns.Contains("is_primary") && row["is_primary"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_primary"])
                    : false,
                ExperienceYears = row.Table.Columns.Contains("experience_years") && row["experience_years"] != DBNull.Value
                    ? Convert.ToInt32(row["experience_years"])
                    : 0,
                Notes = row.Table.Columns.Contains("notes") && row["notes"] != DBNull.Value
                    ? row["notes"].ToString()
                    : null,
                CertifiedDate = row.Table.Columns.Contains("certified_date") && row["certified_date"] != DBNull.Value
                    ? Convert.ToDateTime(row["certified_date"])
                    : null,
                IsActive = row.Table.Columns.Contains("is_active") && row["is_active"] != DBNull.Value
                    ? Convert.ToBoolean(row["is_active"])
                    : true,
                CreatedAt = row.Table.Columns.Contains("created_at") && row["created_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["created_at"])
                    : DateTime.Now,
                CreatedBy = row.Table.Columns.Contains("created_by") && row["created_by"] != DBNull.Value
                    ? row["created_by"].ToString()
                    : null,
                UpdatedAt = row.Table.Columns.Contains("updated_at") && row["updated_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["updated_at"])
                    : null,
                UpdatedBy = row.Table.Columns.Contains("updated_by") && row["updated_by"] != DBNull.Value
                    ? row["updated_by"].ToString()
                    : null,
                DeletedAt = row.Table.Columns.Contains("deleted_at") && row["deleted_at"] != DBNull.Value
                    ? Convert.ToDateTime(row["deleted_at"])
                    : null,
                DeletedBy = row.Table.Columns.Contains("deleted_by") && row["deleted_by"] != DBNull.Value
                    ? row["deleted_by"].ToString()
                    : null
            };
        }
    }
}

