using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using EducationManagement.Common.Models;
using EducationManagement.DAL;

namespace EducationManagement.DAL.Repositories
{
    public class RoomRepository
    {
        private readonly string _connectionString;

        public RoomRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string 'DefaultConnection' not found.");
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH PHÒNG HỌC
        // ============================================================
        public async Task<List<Room>> GetAllAsync()
        {
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetRooms", 
                new SqlParameter("@Search", DBNull.Value),
                new SqlParameter("@IsActive", DBNull.Value),
                new SqlParameter("@Page", 1),
                new SqlParameter("@PageSize", 9999));
            
            var list = new List<Room>();
            foreach (DataRow row in dt.Rows)
            {
                list.Add(MapToRoom(row));
            }
            return list;
        }

        // ============================================================
        // 🔹 LẤY PHÒNG HỌC THEO ID
        // ============================================================
        public async Task<Room?> GetByIdAsync(string roomId)
        {
            var parameters = new[]
            {
                new SqlParameter("@RoomId", roomId)
            };
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetRoomById", parameters);
            
            if (dt.Rows.Count == 0)
                return null;

            return MapToRoom(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 LẤY PHÒNG HỌC THEO CODE
        // ============================================================
        public async Task<Room?> GetByCodeAsync(string roomCode)
        {
            var parameters = new[]
            {
                new SqlParameter("@RoomCode", roomCode)
            };
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_GetRoomByCode", parameters);
            
            if (dt.Rows.Count == 0)
                return null;

            return MapToRoom(dt.Rows[0]);
        }

        // ============================================================
        // 🔹 TÌM KIẾM PHÒNG HỌC
        // ============================================================
        public async Task<List<Room>> SearchAsync(string? search = null, bool? isActive = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@Search", (object?)search ?? DBNull.Value),
                new SqlParameter("@IsActive", (object?)isActive ?? DBNull.Value)
            };
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_SearchRooms", parameters);
            
            var list = new List<Room>();
            foreach (DataRow row in dt.Rows)
            {
                list.Add(MapToRoom(row));
            }
            return list;
        }

        // ============================================================
        // 🔹 KIỂM TRA PHÒNG HỌC CÓ TỒN TẠI
        // ============================================================
        public async Task<bool> ExistsAsync(string roomId)
        {
            var room = await GetByIdAsync(roomId);
            return room != null;
        }

        // ============================================================
        // 🔹 KIỂM TRA ROOM CODE ĐÃ TỒN TẠI CHƯA
        // ============================================================
        public async Task<bool> ExistsByCodeAsync(string roomCode, string? excludeRoomId = null)
        {
            var room = await GetByCodeAsync(roomCode);
            if (room == null)
                return false;
            
            // Nếu có excludeRoomId, kiểm tra xem room tìm được có phải chính nó không
            if (!string.IsNullOrEmpty(excludeRoomId))
            {
                return room.RoomId != excludeRoomId;
            }
            
            return true;
        }

        // ============================================================
        // 🔹 LẤY PHÒNG HỌC CÓ PAGINATION
        // ============================================================
        public async Task<(List<Room> items, int totalCount)> GetPagedAsync(int page, int pageSize, string? search = null, bool? isActive = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@Search", (object?)search ?? DBNull.Value),
                new SqlParameter("@IsActive", (object?)isActive ?? DBNull.Value),
                new SqlParameter("@Page", page),
                new SqlParameter("@PageSize", pageSize)
            };
            
            var ds = await DatabaseHelper.ExecuteQueryMultipleAsync(_connectionString, "sp_GetRooms", parameters);
            
            var items = new List<Room>();
            int totalCount = 0;

            // Table[0] = TotalCount, Table[1] = Data
            if (ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0)
            {
                totalCount = Convert.ToInt32(ds.Tables[0].Rows[0]["TotalCount"]);
            }

            if (ds.Tables.Count > 1 && ds.Tables[1].Rows.Count > 0)
            {
                foreach (DataRow row in ds.Tables[1].Rows)
                {
                    items.Add(MapToRoom(row));
                }
            }

            return (items, totalCount);
        }

        // ============================================================
        // 🔹 THÊM PHÒNG HỌC MỚI
        // ============================================================
        public async Task AddAsync(Room room)
        {
            var parameters = new[]
            {
                new SqlParameter("@RoomId", room.RoomId),
                new SqlParameter("@RoomCode", room.RoomCode),
                new SqlParameter("@Building", (object?)room.Building ?? DBNull.Value),
                new SqlParameter("@Capacity", (object?)room.Capacity ?? DBNull.Value),
                new SqlParameter("@CreatedBy", (object?)room.CreatedBy ?? DBNull.Value)
            };
            
            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_CreateRoom", parameters);
        }

        // ============================================================
        // 🔹 CẬP NHẬT PHÒNG HỌC
        // ============================================================
        public async Task UpdateAsync(Room room)
        {
            var parameters = new[]
            {
                new SqlParameter("@RoomId", room.RoomId),
                new SqlParameter("@RoomCode", room.RoomCode),
                new SqlParameter("@Building", (object?)room.Building ?? DBNull.Value),
                new SqlParameter("@Capacity", (object?)room.Capacity ?? DBNull.Value),
                new SqlParameter("@IsActive", room.IsActive),
                new SqlParameter("@UpdatedBy", (object?)room.UpdatedBy ?? DBNull.Value)
            };
            
            await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_UpdateRoom", parameters);
        }

        // ============================================================
        // 🔹 SOFT DELETE PHÒNG HỌC
        // ============================================================
        public async Task<int> SoftDeleteAsync(string roomId, string? deletedBy = null)
        {
            var parameters = new[]
            {
                new SqlParameter("@RoomId", roomId),
                new SqlParameter("@DeletedBy", (object?)deletedBy ?? DBNull.Value)
            };
            
            return await DatabaseHelper.ExecuteNonQueryAsync(_connectionString, "sp_DeleteRoom", parameters);
        }

        // ============================================================
        // 🔹 KIỂM TRA PHÒNG HỌC CÓ ĐANG ĐƯỢC SỬ DỤNG
        // ============================================================
        public async Task<bool> IsRoomInUseAsync(string roomId)
        {
            var parameters = new[]
            {
                new SqlParameter("@RoomId", roomId)
            };
            
            var dt = await DatabaseHelper.ExecuteQueryAsync(_connectionString, "sp_CheckRoomInUse", parameters);
            
            if (dt.Rows.Count > 0 && dt.Rows[0]["IsInUse"] != DBNull.Value)
            {
                return Convert.ToBoolean(dt.Rows[0]["IsInUse"]);
            }
            
            return false;
        }

        // ============================================================
        // 🔹 MAP DATA ROW TO ROOM MODEL
        // ============================================================
        private static Room MapToRoom(DataRow row)
        {
            return new Room
            {
                RoomId = row["room_id"].ToString()!,
                RoomCode = row["room_code"].ToString()!,
                Building = row["building"] == DBNull.Value ? null : row["building"].ToString(),
                Capacity = row["capacity"] == DBNull.Value ? null : Convert.ToInt32(row["capacity"]),
                IsActive = Convert.ToBoolean(row["is_active"]),
                CreatedAt = Convert.ToDateTime(row["created_at"]),
                CreatedBy = row["created_by"] == DBNull.Value ? null : row["created_by"].ToString(),
                UpdatedAt = row["updated_at"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(row["updated_at"]),
                UpdatedBy = row["updated_by"] == DBNull.Value ? null : row["updated_by"].ToString(),
                DeletedAt = row["deleted_at"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(row["deleted_at"]),
                DeletedBy = row["deleted_by"] == DBNull.Value ? null : row["deleted_by"].ToString()
            };
        }
    }
}

