using Microsoft.Data.SqlClient;
using System;
using System.Data;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace EducationManagement.DAL
{
    /// <summary>
    /// Lớp tiện ích hỗ trợ thao tác với Stored Procedure, thay thế cho EF Core.
    /// </summary>
    public static class DatabaseHelper
    {
        /// <summary>
        /// Thực thi Stored Procedure dạng truy vấn (SELECT) và trả về DataTable.
        /// </summary>
        public static async Task<DataTable> ExecuteQueryAsync(
            string connectionString,
            string storedProc,
            params SqlParameter[] parameters)
        {
            var dt = new DataTable();

            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(storedProc, conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                using var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false);
                dt.Load(reader);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi Stored Procedure [{storedProc}]: {ex.Message}", ex);
            }

            return dt;
        }

        /// <summary>
        /// Thực thi Raw SQL Query (SELECT) và trả về DataTable.
        /// </summary>
        public static async Task<DataTable> ExecuteRawQueryAsync(
            string connectionString,
            string sqlQuery,
            params SqlParameter[] parameters)
        {
            var dt = new DataTable();

            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(sqlQuery, conn)
                {
                    CommandType = CommandType.Text
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                using var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false);
                dt.Load(reader);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi SQL Query [{sqlQuery.Substring(0, Math.Min(100, sqlQuery.Length))}...]: {ex.Message}", ex);
            }

            return dt;
        }

        /// <summary>
        /// Thực thi Stored Procedure trả về multiple result sets và trả về DataSet.
        /// </summary>
        public static async Task<DataSet> ExecuteQueryMultipleAsync(
            string connectionString,
            string storedProc,
            params SqlParameter[] parameters)
        {
            var ds = new DataSet();

            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(storedProc, conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                using var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false);
                
                int tableIndex = 0;
                do
                {
                    var dt = new DataTable($"Table{tableIndex}");
                    
                    // Load schema first
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        dt.Columns.Add(reader.GetName(i), reader.GetFieldType(i));
                    }
                    
                    // Load rows from current result set only
                    while (await reader.ReadAsync())
                    {
                        var row = dt.NewRow();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            row[i] = reader.IsDBNull(i) ? DBNull.Value : reader.GetValue(i);
                        }
                        dt.Rows.Add(row);
                    }
                    
                    ds.Tables.Add(dt);
                    // Console.WriteLine($"🔍 Loaded Table[{tableIndex}]: {dt.Rows.Count} rows, {dt.Columns.Count} columns"); // Tắt log để tránh spam
                    tableIndex++;
                } while (await reader.NextResultAsync());
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi Stored Procedure [{storedProc}]: {ex.Message}", ex);
            }

            return ds;
        }

        /// <summary>
        /// Thực thi Stored Procedure không trả dữ liệu (INSERT, UPDATE, DELETE).
        /// </summary>
        public static async Task<int> ExecuteNonQueryAsync(
            string connectionString,
            string storedProc,
            params SqlParameter[] parameters)
        {
            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(storedProc, conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                return await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi Stored Procedure [{storedProc}]: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Thực thi Raw SQL Query không trả dữ liệu (INSERT, UPDATE, DELETE).
        /// </summary>
        public static async Task<int> ExecuteRawNonQueryAsync(
            string connectionString,
            string sqlQuery,
            params SqlParameter[] parameters)
        {
            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(sqlQuery, conn)
                {
                    CommandType = CommandType.Text
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                return await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi SQL Query [{sqlQuery.Substring(0, Math.Min(100, sqlQuery.Length))}...]: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Thực thi Raw SQL Query trả về giá trị đơn (COUNT, ID, ...).
        /// </summary>
        public static async Task<object?> ExecuteRawScalarAsync(
            string connectionString,
            string sqlQuery,
            params SqlParameter[] parameters)
        {
            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(sqlQuery, conn)
                {
                    CommandType = CommandType.Text
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                return await cmd.ExecuteScalarAsync().ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi SQL Query [{sqlQuery.Substring(0, Math.Min(100, sqlQuery.Length))}...]: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Thực thi Stored Procedure trả về giá trị đơn (COUNT, ID, ...).
        /// </summary>
        public static async Task<object?> ExecuteScalarAsync(
            string connectionString,
            string storedProc,
            params SqlParameter[] parameters)
        {
            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(storedProc, conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                return await cmd.ExecuteScalarAsync().ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi Stored Procedure [{storedProc}]: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Thực thi Stored Procedure và mapping từng dòng dữ liệu sang đối tượng T (nếu muốn dùng model thay vì DataTable).
        /// </summary>
        public static async Task<List<T>> ExecuteReaderAsync<T>(
            string connectionString,
            string storedProc,
            Func<IDataReader, T> mapFunc,
            params SqlParameter[] parameters)
        {
            var result = new List<T>();

            try
            {
                using var conn = new SqlConnection(connectionString);
                using var cmd = new SqlCommand(storedProc, conn)
                {
                    CommandType = CommandType.StoredProcedure
                };

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(PrepareParameters(parameters));

                await conn.OpenAsync().ConfigureAwait(false);
                using var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false);

                while (await reader.ReadAsync().ConfigureAwait(false))
                {
                    result.Add(mapFunc(reader));
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi đọc dữ liệu từ Stored Procedure [{storedProc}]: {ex.Message}", ex);
            }

            return result;
        }

        /// <summary>
        /// Thực thi Stored Procedure bằng SqlCommand đã khởi tạo sẵn (trường hợp đặc biệt).
        /// </summary>
        public static async Task<int> ExecuteCommandAsync(
            SqlCommand cmd,
            string connectionString)
        {
            try
            {
                using var conn = new SqlConnection(connectionString);
                cmd.Connection = conn;
                cmd.CommandType = CommandType.StoredProcedure;

                await conn.OpenAsync().ConfigureAwait(false);
                return await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thực thi command [{cmd.CommandText}]: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Chuẩn hóa parameter (nếu giá trị null thì gán DBNull.Value).
        /// </summary>
        private static SqlParameter[] PrepareParameters(SqlParameter[] parameters)
        {
            foreach (var p in parameters)
            {
                if (p.Value == null)
                    p.Value = DBNull.Value;
            }
            return parameters;
        }
    }
}
