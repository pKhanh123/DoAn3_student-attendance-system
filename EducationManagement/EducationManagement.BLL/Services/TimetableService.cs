using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using EducationManagement.DAL.Repositories;
using EducationManagement.Common.Helpers;

namespace EducationManagement.BLL.Services
{
    public class TimetableService
    {
        private readonly TimetableRepository _repo;
        private readonly ClassRepository _classRepository;

        public TimetableService(TimetableRepository repo, ClassRepository classRepository)
        {
            _repo = repo;
            _classRepository = classRepository;
        }

        public async Task<List<TimetableSessionDto>> GetStudentTimetableByWeekAsync(string studentId, int year, int weekNo)
        {
            var dt = await _repo.GetStudentTimetableByWeekAsync(studentId, year, weekNo);
            return MapSessions(dt);
        }

        public async Task<List<TimetableSessionDto>> GetLecturerTimetableByWeekAsync(string lecturerId, int year, int weekNo)
        {
            var dt = await _repo.GetLecturerTimetableByWeekAsync(lecturerId, year, weekNo);
            return MapSessions(dt);
        }

        public async Task<List<TimetableSessionDto>> GetAllSessionsByWeekAsync(int year, int weekNo)
        {
            var dt = await _repo.GetAllSessionsByWeekAsync(year, weekNo);
            return MapSessions(dt);
        }

        public async Task<List<TimetableSessionDto>> GetSessionsByClassAndWeekAsync(string classId, int weekNo)
        {
            var dt = await _repo.GetSessionsByClassAndWeekAsync(classId, weekNo);
            return MapSessions(dt);
        }

        private static List<TimetableSessionDto> MapSessions(DataTable dt)
        {
            var list = new List<TimetableSessionDto>();
            foreach (DataRow r in dt.Rows)
            {
                list.Add(new TimetableSessionDto
                {
                    SessionId = r["session_id"].ToString()!,
                    WeekNo = r.Table.Columns.Contains("week_no") && r["week_no"] != DBNull.Value ? Convert.ToInt32(r["week_no"]) : (int?)null,
                    Weekday = Convert.ToInt32(r["weekday"]),
                    StartTime = TimeSpan.Parse(r["start_time"].ToString()!),
                    EndTime = TimeSpan.Parse(r["end_time"].ToString()!),
                    PeriodFrom = r["period_from"] == DBNull.Value ? null : Convert.ToInt32(r["period_from"]).ToString(),
                    PeriodTo = r["period_to"] == DBNull.Value ? null : Convert.ToInt32(r["period_to"]).ToString(),
                    Status = r.Table.Columns.Contains("status") ? r["status"]?.ToString() : null,
                    Recurrence = r.Table.Columns.Contains("recurrence") ? r["recurrence"]?.ToString() : null,
                    ClassId = r["class_id"].ToString()!,
                    ClassCode = r["class_code"].ToString()!,
                    ClassName = r["class_name"].ToString()!,
                    SubjectId = r["subject_id"].ToString()!,
                    SubjectName = r["subject_name"].ToString()!,
                    LecturerId = r.Table.Columns.Contains("lecturer_id") ? r["lecturer_id"]?.ToString() : null,
                    LecturerName = r.Table.Columns.Contains("lecturer_name") ? r["lecturer_name"]?.ToString() : null,
                    RoomId = r.Table.Columns.Contains("room_id") ? r["room_id"]?.ToString() : null,
                    RoomCode = r.Table.Columns.Contains("room_code") ? r["room_code"]?.ToString() : null,
                    SchoolYearId = r.Table.Columns.Contains("school_year_id") ? r["school_year_id"]?.ToString() : null,
                    SchoolYearCode = r.Table.Columns.Contains("year_code") ? r["year_code"]?.ToString() : null
                });
            }
            return list;
        }

        public async Task<TimetableConflicts> CheckConflictsAsync(TimetableConflictCheckInput input)
        {
            try
            {
                var ds = await _repo.CheckConflictsAsync(
                    input.SessionId,
                    input.ClassId,
                    input.SubjectId,
                    input.LecturerId,
                    input.RoomId,
                    input.SchoolYearId,
                    input.WeekNo,
                    input.Weekday,
                    input.StartTime,
                    input.EndTime,
                    input.PeriodFrom,  // ✅ THÊM
                    input.PeriodTo);   // ✅ THÊM

                var result = new TimetableConflicts();
                
                // ✅ Xử lý tất cả tables dựa vào cấu trúc, không dựa vào index
                foreach (DataTable table in ds.Tables)
                {
                    // Kiểm tra xem table này có column conflict_type không
                    if (table.Columns.Contains("conflict_type"))
                    {
                        // Đây là conflict table - kiểm tra loại conflict
                        if (table.Rows.Count > 0)
                        {
                            var firstRow = table.Rows[0];
                            var conflictType = firstRow["conflict_type"]?.ToString() ?? "";
                            
                            if (conflictType == "LECTURER" && table.Columns.Contains("start_time"))
                            {
                                // LECTURER time-based conflicts
                                result.LecturerConflicts = MapConflictRows(table);
                            }
                            else if (conflictType == "ROOM" && table.Columns.Contains("start_time"))
                            {
                                // ROOM time-based conflicts
                                result.RoomConflicts = MapConflictRows(table);
                            }
                            else if (conflictType == "STUDENT")
                            {
                                // STUDENT conflicts
                                result.StudentConflicts = MapStudentConflictRows(table);
                            }
                            else if (conflictType == "LECTURER_PERIOD" || conflictType == "ROOM_PERIOD")
                            {
                                // Period-based conflicts
                                if (table.Columns.Contains("period_from") && table.Columns.Contains("period_to"))
                                {
                                    var periodConflicts = MapPeriodConflictRows(table);
                                    result.PeriodConflicts.AddRange(periodConflicts);
                                }
                            }
                        }
                    }
                    // Kiểm tra xem table này có phải là capacity table không
                    else if (table.Columns.Contains("room_capacity") && table.Rows.Count > 0)
                    {
                        var r = table.Rows[0];
                        result.RoomCapacity = r["room_capacity"] == DBNull.Value ? null : Convert.ToInt32(r["room_capacity"]);
                        result.Enrolled = r["enrolled"] == DBNull.Value ? 0 : Convert.ToInt32(r["enrolled"]);
                        result.IsOverCapacity = r["is_over_capacity"] != DBNull.Value && Convert.ToInt32(r["is_over_capacity"]) == 1;
                    }
                }
                
                return result;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[TimetableService CheckConflictsAsync Error] {ex.Message}");
                Console.WriteLine($"[TimetableService CheckConflictsAsync Error] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[TimetableService CheckConflictsAsync Error] InnerException: {ex.InnerException.Message}");
                }
                Console.ResetColor();
                throw; // Re-throw để controller catch
            }
        }

        public async Task<(bool HasConflict, TimetableConflicts Conflicts)> ValidateBeforeSaveAsync(TimetableConflictCheckInput input)
        {
            var conflicts = await CheckConflictsAsync(input);
            
            // ✅ THÊM: Kiểm tra xung đột period nếu có periodFrom/periodTo
            if (input is TimetableCreateInput createInput && 
                createInput.PeriodFrom.HasValue && createInput.PeriodTo.HasValue)
            {
                // Validate consecutive periods
                if (!PeriodCalculator.ValidateConsecutivePeriods(
                    createInput.PeriodFrom.Value, 
                    createInput.PeriodTo.Value))
                {
                    conflicts.Errors.Add("Các tiết học phải liên tiếp nhau (VD: Tiết 1-3, không được 1,3,5)");
                }

                // Kiểm tra xung đột period với các session khác
                // Period conflicts đã được xử lý trong CheckConflictsAsync và map vào conflicts.PeriodConflicts
                // Không cần gọi CheckPeriodConflictsAsync riêng
            }
            
            var has = (conflicts.LecturerConflicts.Any() || 
                       conflicts.RoomConflicts.Any() || 
                       conflicts.StudentConflicts.Any() || 
                       conflicts.IsOverCapacity ||
                       conflicts.PeriodConflicts.Any() ||
                       conflicts.Errors.Any());
            
            return (has, conflicts);
        }

        public async Task<string> CreateSessionAsync(TimetableCreateInput input)
        {
            var fkErrors = await ValidateForeignKeysAsync(new TimetableForeignKeys
            {
                ClassId = input.ClassId,
                SubjectId = input.SubjectId,
                LecturerId = input.LecturerId,
                RoomId = input.RoomId,
                SchoolYearId = input.SchoolYearId
            });
            if (fkErrors.Any())
                throw new InvalidOperationException(string.Join("; ", fkErrors));

            // Check class is active
            var classItem = await _classRepository.GetByIdAsync(input.ClassId);
            if (classItem == null)
                throw new InvalidOperationException("Lớp học không tồn tại");
            
            // Check is_active (computed hoặc manual)
            // Note: is_active_computed được tính từ stored procedure
            // Nếu class không active, throw exception
            if (!classItem.IsActive)
            {
                throw new InvalidOperationException("Không thể tạo phiên học cho lớp đã bị vô hiệu hóa");
            }

            // ✅ THÊM: Nếu có periodFrom/periodTo, tự động tính startTime và endTime
            TimeSpan startTime = input.StartTime;
            TimeSpan endTime = input.EndTime;

            if (input.PeriodFrom.HasValue && input.PeriodTo.HasValue)
            {
                var (calculatedStart, calculatedEnd) = PeriodCalculator.CalculateSessionTime(
                    input.PeriodFrom.Value, 
                    input.PeriodTo.Value);
                
                startTime = calculatedStart;
                endTime = calculatedEnd;
                
                // Override nếu user nhập thủ công (nhưng cảnh báo nếu khác)
                if (input.StartTime != TimeSpan.Zero && input.StartTime != calculatedStart)
                {
                    // Log warning nhưng vẫn dùng period time
                    // Có thể log vào LoggerService nếu cần
                }
            }

            var id = Guid.NewGuid().ToString("N");
            await _repo.InsertSessionAsync(id, input.ClassId, input.SubjectId, input.LecturerId, input.RoomId,
                input.SchoolYearId, input.WeekNo, input.Weekday, startTime, endTime,
                input.PeriodFrom, input.PeriodTo, input.Recurrence, input.Status, input.Actor);
            return id;
        }

        public async Task UpdateSessionAsync(string sessionId, TimetableUpdateInput input)
        {
            // ✅ NGHIỆP VỤ: Kiểm tra xem session có được phép sửa không
            // Không được sửa lịch của quá khứ, hôm nay, và 2 ngày tiếp theo
            var existingSession = await _repo.GetSessionByIdAsync(sessionId);
            if (existingSession != null)
            {
                var sessionDate = CalculateSessionDate(existingSession.WeekNo, existingSession.Weekday, DateTime.Now.Year);
                if (sessionDate.HasValue && !CanEditSession(sessionDate.Value))
                {
                    throw new InvalidOperationException("Không thể sửa lịch giảng dạy của quá khứ, hôm nay, và 2 ngày tiếp theo");
                }
            }

            var fkErrors = await ValidateForeignKeysAsync(new TimetableForeignKeys
            {
                LecturerId = input.LecturerId,
                RoomId = input.RoomId
            }, updateMode: true);
            if (fkErrors.Any())
                throw new InvalidOperationException(string.Join("; ", fkErrors));

            // ✅ THÊM: Nếu có periodFrom/periodTo, tự động tính startTime và endTime
            TimeSpan startTime = input.StartTime;
            TimeSpan endTime = input.EndTime;

            if (input.PeriodFrom.HasValue && input.PeriodTo.HasValue)
            {
                var (calculatedStart, calculatedEnd) = PeriodCalculator.CalculateSessionTime(
                    input.PeriodFrom.Value, 
                    input.PeriodTo.Value);
                
                startTime = calculatedStart;
                endTime = calculatedEnd;
            }

            await _repo.UpdateSessionAsync(sessionId, input.LecturerId, input.RoomId, input.WeekNo, input.Weekday,
                startTime, endTime, input.PeriodFrom, input.PeriodTo, input.Recurrence, input.Status, input.Actor);
        }

        // NEW: Soft delete session (validate existence)
        public async Task<bool> DeleteSessionAsync(string sessionId, string? actor)
        {
            if (!await _repo.ExistsSessionAsync(sessionId)) return false;
            
            // ✅ NGHIỆP VỤ: Kiểm tra xem session có được phép xóa không
            // Không được xóa lịch của quá khứ, hôm nay, và 2 ngày tiếp theo
            var existingSession = await _repo.GetSessionByIdAsync(sessionId);
            if (existingSession != null)
            {
                var sessionDate = CalculateSessionDate(existingSession.WeekNo, existingSession.Weekday, DateTime.Now.Year);
                if (sessionDate.HasValue && !CanEditSession(sessionDate.Value))
                {
                    throw new InvalidOperationException("Không thể xóa lịch giảng dạy của quá khứ, hôm nay, và 2 ngày tiếp theo");
                }
            }
            
            var n = await _repo.SoftDeleteSessionAsync(sessionId, actor);
            return n > 0;
        }
        
        // ✅ Helper: Tính ngày của session từ weekNo và weekday
        private DateTime? CalculateSessionDate(int? weekNo, int weekday, int year)
        {
            if (!weekNo.HasValue) return null;
            
            try
            {
                // ISO week: Thứ 2 là ngày đầu tuần
                // Get January 4th of the year (always in week 1 of ISO week)
                var jan4 = new DateTime(year, 1, 4);
                var jan4Day = (int)jan4.DayOfWeek;
                if (jan4Day == 0) jan4Day = 7; // Convert Sunday (0) to 7
                
                // Calculate the Monday of week 1
                var mondayOfWeek1 = jan4.AddDays(-(jan4Day - 1));
                
                // Calculate the date for the given week and weekday
                // weekday: 1=Sunday, 2=Monday, ..., 7=Saturday (database format)
                // Convert to ISO format: 2=Monday, 3=Tuesday, ..., 8=Sunday
                var dayForCalc = weekday;
                if (weekday == 1) dayForCalc = 8; // Sunday
                else if (weekday >= 2 && weekday <= 7) dayForCalc = weekday; // Monday-Saturday
                
                var targetDate = mondayOfWeek1.AddDays((weekNo.Value - 1) * 7 + (dayForCalc - 2));
                return targetDate;
            }
            catch
            {
                return null;
            }
        }
        
        // ✅ Helper: Kiểm tra xem session có được phép sửa/xóa không
        // Quy tắc: Không được sửa lịch của quá khứ, hôm nay, và 2 ngày tiếp theo
        private bool CanEditSession(DateTime sessionDate)
        {
            var today = DateTime.Now.Date;
            var limitDate = today.AddDays(2); // Hôm nay + 2 ngày
            
            return sessionDate > limitDate;
        }

        private static List<TimetableConflictItem> MapConflictRows(DataTable dt)
        {
            var list = new List<TimetableConflictItem>();
            foreach (DataRow r in dt.Rows)
            {
                var conflictType = r.Table.Columns.Contains("conflict_type") ? r["conflict_type"]?.ToString() : "";
                var classCode = r.Table.Columns.Contains("class_code") ? r["class_code"]?.ToString() : null;
                var roomCode = r.Table.Columns.Contains("room_code") ? r["room_code"]?.ToString() : null;
                var weekNo = r.Table.Columns.Contains("week_no") && r["week_no"] != DBNull.Value ? Convert.ToInt32(r["week_no"]) : (int?)null;
                var startTime = TimeSpan.Parse(r["start_time"].ToString()!);
                var endTime = TimeSpan.Parse(r["end_time"].ToString()!);
                
                // Tạo message mô tả xung đột
                var message = "";
                if (conflictType == "LECTURER")
                {
                    message = $"Giảng viên đã có lịch vào {GetWeekdayName(Convert.ToInt32(r["weekday"]))}";
                    if (weekNo.HasValue) message += $" (Tuần {weekNo})";
                    message += $" từ {startTime:hh\\:mm} đến {endTime:hh\\:mm}";
                    if (!string.IsNullOrEmpty(classCode)) message += $" - Lớp: {classCode}";
                    if (!string.IsNullOrEmpty(roomCode)) message += $" - Phòng: {roomCode}";
                }
                else if (conflictType == "ROOM")
                {
                    message = $"Phòng {roomCode} đã được sử dụng vào {GetWeekdayName(Convert.ToInt32(r["weekday"]))}";
                    if (weekNo.HasValue) message += $" (Tuần {weekNo})";
                    message += $" từ {startTime:hh\\:mm} đến {endTime:hh\\:mm}";
                    if (!string.IsNullOrEmpty(classCode)) message += $" - Lớp: {classCode}";
                }
                
                list.Add(new TimetableConflictItem
                {
                    ExistingSessionId = r["existing_session_id"].ToString()!,
                    WeekNo = weekNo,
                    Weekday = Convert.ToInt32(r["weekday"]),
                    StartTime = startTime,
                    EndTime = endTime,
                    ClassCode = classCode,
                    RoomCode = roomCode,
                    Message = message // ✅ THÊM message
                });
            }
            return list;
        }
        
        private static string GetWeekdayName(int weekday)
        {
            return weekday switch
            {
                1 => "Chủ nhật",
                2 => "Thứ 2",
                3 => "Thứ 3",
                4 => "Thứ 4",
                5 => "Thứ 5",
                6 => "Thứ 6",
                7 => "Thứ 7",
                _ => $"Thứ {weekday}"
            };
        }

        // ✅ THÊM: Map period conflict rows
        private static List<TimetablePeriodConflictItem> MapPeriodConflictRows(DataTable dt)
        {
            var list = new List<TimetablePeriodConflictItem>();
            foreach (DataRow r in dt.Rows)
            {
                list.Add(new TimetablePeriodConflictItem
                {
                    Type = r["conflict_type"]?.ToString() ?? "",
                    ExistingSessionId = r["existing_session_id"].ToString()!,
                    PeriodFrom = r["period_from"] != DBNull.Value ? Convert.ToInt32(r["period_from"]) : 0,
                    PeriodTo = r["period_to"] != DBNull.Value ? Convert.ToInt32(r["period_to"]) : 0,
                    LecturerId = null, // Stored procedure không trả về lecturer_id cho period conflicts
                    RoomId = null, // Stored procedure không trả về room_id cho period conflicts
                    ClassCode = r.Table.Columns.Contains("class_code") ? r["class_code"]?.ToString() : null
                });
            }
            return list;
        }

        private static List<TimetableStudentConflictItem> MapStudentConflictRows(DataTable dt)
        {
            var list = new List<TimetableStudentConflictItem>();
            foreach (DataRow r in dt.Rows)
            {
                var studentCode = r["student_code"].ToString()!;
                var studentName = r["student_name"].ToString()!;
                var weekNo = r.Table.Columns.Contains("week_no") && r["week_no"] != DBNull.Value ? Convert.ToInt32(r["week_no"]) : (int?)null;
                var weekday = Convert.ToInt32(r["weekday"]);
                var startTime = TimeSpan.Parse(r["start_time"].ToString()!);
                var endTime = TimeSpan.Parse(r["end_time"].ToString()!);
                var classCode = r.Table.Columns.Contains("class_code") ? r["class_code"]?.ToString() : null;
                
                // Tạo message mô tả xung đột sinh viên
                var message = $"Sinh viên {studentCode} - {studentName} đã có lịch học vào {GetWeekdayName(weekday)}";
                if (weekNo.HasValue) message += $" (Tuần {weekNo})";
                message += $" từ {startTime:hh\\:mm} đến {endTime:hh\\:mm}";
                if (!string.IsNullOrEmpty(classCode)) message += $" - Lớp: {classCode}";
                
                list.Add(new TimetableStudentConflictItem
                {
                    ExistingSessionId = r["existing_session_id"].ToString()!,
                    StudentId = r["student_id"].ToString()!,
                    StudentCode = studentCode,
                    StudentName = studentName,
                    WeekNo = weekNo,
                    Weekday = weekday,
                    StartTime = startTime,
                    EndTime = endTime,
                    ClassCode = classCode,
                    Message = message // ✅ THÊM message
                });
            }
            return list;
        }

        // NEW: List rooms for FE to pick
        public async Task<List<RoomDto>> GetRoomsAsync(string? search, bool? isActive)
        {
            var dt = await _repo.GetRoomsAsync(search, isActive);
            var list = new List<RoomDto>();
            foreach (DataRow r in dt.Rows)
            {
                list.Add(new RoomDto
                {
                    RoomId = r["room_id"].ToString()!,
                    RoomCode = r["room_code"].ToString()!,
                    Building = r["building"]?.ToString(),
                    Capacity = r["capacity"] == DBNull.Value ? null : Convert.ToInt32(r["capacity"]),
                    IsActive = Convert.ToBoolean(r["is_active"])
                });
            }
            return list;
        }

        private async Task<List<string>> ValidateForeignKeysAsync(TimetableForeignKeys keys, bool updateMode = false)
        {
            var errors = new List<string>();
            if (!updateMode)
            {
                if (string.IsNullOrWhiteSpace(keys.ClassId) || !await _repo.ExistsClassAsync(keys.ClassId!))
                    errors.Add("classId không tồn tại");
                if (string.IsNullOrWhiteSpace(keys.SubjectId) || !await _repo.ExistsSubjectAsync(keys.SubjectId!))
                    errors.Add("subjectId không tồn tại");
                if (!string.IsNullOrWhiteSpace(keys.SchoolYearId) && !await _repo.ExistsSchoolYearAsync(keys.SchoolYearId!))
                    errors.Add("schoolYearId không tồn tại");
            }
            if (!string.IsNullOrWhiteSpace(keys.LecturerId) && !await _repo.ExistsLecturerAsync(keys.LecturerId!))
                errors.Add("lecturerId không tồn tại");
            if (!string.IsNullOrWhiteSpace(keys.RoomId) && !await _repo.ExistsRoomAsync(keys.RoomId!))
                errors.Add("roomId không tồn tại");
            return errors;
        }

        // ============================================
        // NEW FEATURES: Bulk operations & Advanced
        // ============================================

        /// <summary>
        /// Bulk create sessions for multiple weeks
        /// </summary>
        public async Task<BulkCreateSessionsResult> BulkCreateSessionsAsync(BulkCreateSessionsInput input)
        {
            var result = new BulkCreateSessionsResult
            {
                TotalRequested = 0,
                Created = 0,
                Skipped = 0,
                Errors = new List<string>()
            };

            // Validate input
            var fkErrors = await ValidateForeignKeysAsync(new TimetableForeignKeys
            {
                ClassId = input.ClassId,
                SubjectId = input.SubjectId,
                LecturerId = input.LecturerId,
                RoomId = input.RoomId,
                SchoolYearId = input.SchoolYearId
            });
            if (fkErrors.Any())
                throw new InvalidOperationException(string.Join("; ", fkErrors));

            // Calculate weeks based on semester or week range
            var weeks = await CalculateWeeksAsync(input);
            result.TotalRequested = weeks.Count;

            foreach (var weekNo in weeks)
            {
                try
                {
                    var checkInput = new TimetableConflictCheckInput
                    {
                        ClassId = input.ClassId,
                        SubjectId = input.SubjectId,
                        LecturerId = input.LecturerId,
                        RoomId = input.RoomId,
                        SchoolYearId = input.SchoolYearId,
                        WeekNo = weekNo,
                        Weekday = input.Weekday,
                        StartTime = input.StartTime,
                        EndTime = input.EndTime
                    };

                    var (hasConflict, _) = await ValidateBeforeSaveAsync(checkInput);
                    if (hasConflict && input.SkipConflicts)
                    {
                        result.Skipped++;
                        continue;
                    }
                    if (hasConflict)
                    {
                        result.Errors.Add($"Week {weekNo}: Conflicts detected");
                        continue;
                    }

                    var createInput = new TimetableCreateInput
                    {
                        ClassId = input.ClassId,
                        SubjectId = input.SubjectId,
                        LecturerId = input.LecturerId,
                        RoomId = input.RoomId,
                        SchoolYearId = input.SchoolYearId,
                        WeekNo = weekNo,
                        Weekday = input.Weekday,
                        StartTime = input.StartTime,
                        EndTime = input.EndTime,
                        PeriodFrom = input.PeriodFrom,
                        PeriodTo = input.PeriodTo,
                        Recurrence = input.Recurrence ?? "weekly",
                        Status = input.Status ?? "active",
                        Actor = input.Actor
                    };

                    await CreateSessionAsync(createInput);
                    result.Created++;
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Week {weekNo}: {ex.Message}");
                }
            }

            return result;
        }

        /// <summary>
        /// Copy sessions from one school year/semester to another
        /// </summary>
        public async Task<CopySessionsResult> CopySessionsAsync(CopySessionsInput input)
        {
            var result = new CopySessionsResult
            {
                TotalFound = 0,
                Copied = 0,
                Skipped = 0,
                Errors = new List<string>()
            };

            // Get source sessions
            var sourceSessionsDt = await _repo.GetSessionsBySemesterAsync(
                input.SourceSchoolYearId,
                input.SourceSemester,
                input.SourceClassId);
            var sourceSessions = MapSessions(sourceSessionsDt);

            result.TotalFound = sourceSessions.Count;

            foreach (var session in sourceSessions)
            {
                try
                {
                    // Check if target class exists
                    if (!string.IsNullOrEmpty(input.TargetClassId) &&
                        !await _repo.ExistsClassAsync(input.TargetClassId))
                    {
                        result.Errors.Add($"Session {session.SessionId}: Target class not found");
                        result.Skipped++;
                        continue;
                    }

                    var classId = input.TargetClassId ?? session.ClassId;
                    var checkInput = new TimetableConflictCheckInput
                    {
                        ClassId = classId,
                        SubjectId = session.SubjectId,
                        LecturerId = input.TargetLecturerId ?? session.LecturerId,
                        RoomId = input.TargetRoomId ?? session.RoomId,
                        SchoolYearId = input.TargetSchoolYearId,
                        WeekNo = session.WeekNo,
                        Weekday = session.Weekday,
                        StartTime = session.StartTime,
                        EndTime = session.EndTime
                    };

                    var (hasConflict, _) = await ValidateBeforeSaveAsync(checkInput);
                    if (hasConflict && input.SkipConflicts)
                    {
                        result.Skipped++;
                        continue;
                    }
                    if (hasConflict)
                    {
                        result.Errors.Add($"Session {session.SessionId}: Conflicts detected");
                        result.Skipped++;
                        continue;
                    }

                    var createInput = new TimetableCreateInput
                    {
                        ClassId = classId,
                        SubjectId = session.SubjectId,
                        LecturerId = input.TargetLecturerId ?? session.LecturerId,
                        RoomId = input.TargetRoomId ?? session.RoomId,
                        SchoolYearId = input.TargetSchoolYearId,
                        WeekNo = session.WeekNo,
                        Weekday = session.Weekday,
                        StartTime = session.StartTime,
                        EndTime = session.EndTime,
                        PeriodFrom = session.PeriodFrom != null ? int.Parse(session.PeriodFrom) : null,
                        PeriodTo = session.PeriodTo != null ? int.Parse(session.PeriodTo) : null,
                        Recurrence = session.Recurrence ?? "weekly",
                        Status = input.TargetStatus ?? "planned",
                        Actor = input.Actor
                    };

                    await CreateSessionAsync(createInput);
                    result.Copied++;
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Session {session.SessionId}: {ex.Message}");
                    result.Skipped++;
                }
            }

            return result;
        }

        /// <summary>
        /// Get conflict resolution suggestions
        /// </summary>
        public async Task<ConflictSuggestions> GetConflictSuggestionsAsync(TimetableConflictCheckInput input)
        {
            var suggestions = new ConflictSuggestions
            {
                AlternativeRooms = new List<RoomDto>(),
                AlternativeTimes = new List<TimeSlotSuggestion>(),
                AlternativeLecturers = new List<LecturerSuggestion>()
            };

            // Get available rooms for the same time slot
            var allRooms = await GetRoomsAsync(null, true);
            foreach (var room in allRooms)
            {
                if (room.RoomId == input.RoomId) continue;

                var roomCheck = new TimetableConflictCheckInput
                {
                    SessionId = input.SessionId,
                    ClassId = input.ClassId,
                    SubjectId = input.SubjectId,
                    LecturerId = input.LecturerId,
                    RoomId = room.RoomId,
                    SchoolYearId = input.SchoolYearId,
                    WeekNo = input.WeekNo,
                    Weekday = input.Weekday,
                    StartTime = input.StartTime,
                    EndTime = input.EndTime
                };

                var (hasConflict, conflicts) = await ValidateBeforeSaveAsync(roomCheck);
                if (!hasConflict || (!conflicts.RoomConflicts.Any() && !conflicts.IsOverCapacity))
                {
                    suggestions.AlternativeRooms.Add(room);
                }
            }

            // Suggest alternative time slots (same day, different hours)
            var timeSlots = GenerateTimeSlotSuggestions(input);
            foreach (var slot in timeSlots)
            {
                var timeCheck = new TimetableConflictCheckInput
                {
                    SessionId = input.SessionId,
                    ClassId = input.ClassId,
                    SubjectId = input.SubjectId,
                    LecturerId = input.LecturerId,
                    RoomId = input.RoomId,
                    SchoolYearId = input.SchoolYearId,
                    WeekNo = input.WeekNo,
                    Weekday = input.Weekday,
                    StartTime = slot.StartTime,
                    EndTime = slot.EndTime
                };

                var (hasConflict, _) = await ValidateBeforeSaveAsync(timeCheck);
                if (!hasConflict)
                {
                    suggestions.AlternativeTimes.Add(slot);
                }
            }

            return suggestions;
        }

        /// <summary>
        /// Get sessions by semester
        /// </summary>
        public async Task<List<TimetableSessionDto>> GetSessionsBySemesterAsync(
            string schoolYearId,
            int semester,
            string? classId = null)
        {
            var dt = await _repo.GetSessionsBySemesterAsync(schoolYearId, semester, classId);
            return MapSessions(dt);
        }

        /// <summary>
        /// Create session with recurrence pattern
        /// </summary>
        public async Task<RecurrenceCreateResult> CreateSessionWithRecurrenceAsync(
            TimetableCreateInput input,
            DateTime? startDate = null,
            DateTime? endDate = null)
        {
            var result = new RecurrenceCreateResult
            {
                Created = 0,
                Skipped = 0,
                SessionIds = new List<string>(),
                Errors = new List<string>()
            };

            // If no recurrence or "once", create single session
            if (string.IsNullOrEmpty(input.Recurrence) || input.Recurrence == "once")
            {
                try
                {
                    var (hasConflict, _) = await ValidateBeforeSaveAsync(input);
                    if (hasConflict)
                    {
                        result.Errors.Add("Conflicts detected");
                        return result;
                    }
                    var id = await CreateSessionAsync(input);
                    result.Created = 1;
                    result.SessionIds.Add(id);
                    return result;
                }
                catch (Exception ex)
                {
                    result.Errors.Add(ex.Message);
                    return result;
                }
            }

            // For recurrence patterns, need date range
            if (!startDate.HasValue || !endDate.HasValue)
            {
                result.Errors.Add("startDate and endDate required for recurrence patterns");
                return result;
            }

            var sessionIds = await ApplyRecurrencePatternAsync(input, startDate.Value, endDate.Value);
            result.Created = sessionIds.Count;
            result.SessionIds = sessionIds;

            return result;
        }

        // Helper methods
        private async Task<List<int>> CalculateWeeksAsync(BulkCreateSessionsInput input)
        {
            if (input == null)
                throw new ArgumentNullException(nameof(input));

            var weeks = new List<int>();

            // Priority 1: Specific week numbers
            if (input.WeekNumbers != null && input.WeekNumbers.Any())
            {
                return input.WeekNumbers.Where(w => w > 0).OrderBy(w => w).Distinct().ToList();
            }

            // Priority 2: Calculate from semester
            if (input.Semester.HasValue && !string.IsNullOrEmpty(input.SchoolYearId))
            {
                var semesterWeeks = await _repo.GetSemesterWeeksAsync(input.SchoolYearId, input.Semester.Value);
                if (semesterWeeks == null || !semesterWeeks.Any())
                    throw new InvalidOperationException($"Không tìm thấy tuần học cho học kỳ {input.Semester.Value} của năm học {input.SchoolYearId}");
                return semesterWeeks;
            }

            // Priority 3: Week range
            if (input.WeekFrom.HasValue && input.WeekTo.HasValue)
            {
                if (input.WeekFrom.Value < 1 || input.WeekTo.Value < 1)
                    throw new ArgumentException("Số tuần phải lớn hơn 0", nameof(input));
                
                if (input.WeekFrom.Value > input.WeekTo.Value)
                    throw new ArgumentException("WeekFrom phải nhỏ hơn hoặc bằng WeekTo", nameof(input));

                for (int i = input.WeekFrom.Value; i <= input.WeekTo.Value; i++)
                {
                    weeks.Add(i);
                }
                return weeks;
            }

            // No valid input provided
            throw new ArgumentException("Phải cung cấp WeekNumbers, (Semester + SchoolYearId), hoặc (WeekFrom + WeekTo)", nameof(input));
        }

        /// <summary>
        /// Apply recurrence pattern to generate sessions
        /// </summary>
        public async Task<List<string>> ApplyRecurrencePatternAsync(TimetableCreateInput input, DateTime startDate, DateTime endDate)
        {
            var createdSessionIds = new List<string>();

            if (string.IsNullOrEmpty(input.Recurrence) || input.Recurrence == "once")
            {
                // Single session - no recurrence
                var id = await CreateSessionAsync(input);
                createdSessionIds.Add(id);
                return createdSessionIds;
            }

            var currentDate = startDate;
            var weekday = input.Weekday; // 1=Sunday, 2=Monday, ..., 7=Saturday

            while (currentDate <= endDate)
            {
                // Check if current date matches the weekday
                var currentWeekday = (int)currentDate.DayOfWeek;
                if (currentWeekday == 0) currentWeekday = 7; // Sunday = 7

                if (currentWeekday == weekday)
                {
                    // Calculate week number for this date
                    var weekNo = GetWeekNumber(currentDate);

                    // Check if we should create session based on recurrence pattern
                    bool shouldCreate = input.Recurrence switch
                    {
                        "weekly" => true, // Every week
                        "bi-weekly" => ShouldCreateBiWeekly(currentDate, startDate), // Every 2 weeks
                        "monthly" => ShouldCreateMonthly(currentDate, startDate), // Same day of month
                        _ => true
                    };

                    if (shouldCreate)
                    {
                        var sessionInput = new TimetableCreateInput
                        {
                            ClassId = input.ClassId,
                            SubjectId = input.SubjectId,
                            LecturerId = input.LecturerId,
                            RoomId = input.RoomId,
                            SchoolYearId = input.SchoolYearId,
                            WeekNo = weekNo,
                            Weekday = weekday,
                            StartTime = input.StartTime,
                            EndTime = input.EndTime,
                            PeriodFrom = input.PeriodFrom,
                            PeriodTo = input.PeriodTo,
                            Recurrence = input.Recurrence,
                            Status = input.Status,
                            Actor = input.Actor
                        };

                        // Check conflicts before creating
                        var checkInput = new TimetableConflictCheckInput
                        {
                            ClassId = sessionInput.ClassId,
                            SubjectId = sessionInput.SubjectId,
                            LecturerId = sessionInput.LecturerId,
                            RoomId = sessionInput.RoomId,
                            SchoolYearId = sessionInput.SchoolYearId,
                            WeekNo = weekNo,
                            Weekday = weekday,
                            StartTime = sessionInput.StartTime,
                            EndTime = sessionInput.EndTime
                        };

                        var (hasConflict, _) = await ValidateBeforeSaveAsync(checkInput);
                        if (!hasConflict)
                        {
                            var id = await CreateSessionAsync(sessionInput);
                            createdSessionIds.Add(id);
                        }
                    }
                }

                currentDate = currentDate.AddDays(1);
            }

            return createdSessionIds;
        }

        private bool ShouldCreateBiWeekly(DateTime currentDate, DateTime startDate)
        {
            var daysDiff = (currentDate - startDate).Days;
            return daysDiff % 14 == 0; // Every 14 days
        }

        private bool ShouldCreateMonthly(DateTime currentDate, DateTime startDate)
        {
            return currentDate.Day == startDate.Day; // Same day of month
        }

        private int GetWeekNumber(DateTime date)
        {
            // ISO week number calculation
            var day = (int)date.DayOfWeek;
            if (day == 0) day = 7; // Sunday = 7
            var jan1 = new DateTime(date.Year, 1, 1);
            var daysOffset = day - (int)jan1.DayOfWeek;
            if (daysOffset < 0) daysOffset += 7;
            var firstMonday = jan1.AddDays(daysOffset);
            var firstWeek = firstMonday.AddDays(-((int)firstMonday.DayOfWeek - 1));
            var weekNum = (int)Math.Ceiling((date - firstWeek).TotalDays / 7.0);
            return weekNum;
        }

        private List<TimeSlotSuggestion> GenerateTimeSlotSuggestions(TimetableConflictCheckInput input)
        {
            var suggestions = new List<TimeSlotSuggestion>();
            var duration = input.EndTime - input.StartTime;

            // Common time slots in Vietnamese universities
            var commonSlots = new[]
            {
                new { Start = TimeSpan.FromHours(7), End = TimeSpan.FromHours(9) },   // 7:00-9:00
                new { Start = TimeSpan.FromHours(9), End = TimeSpan.FromHours(11) },  // 9:00-11:00
                new { Start = TimeSpan.FromHours(13), End = TimeSpan.FromHours(15) },  // 13:00-15:00
new { Start = TimeSpan.FromHours(15), End = TimeSpan.FromHours(17) },  // 15:00-17:00
                new { Start = TimeSpan.FromHours(17), End = TimeSpan.FromHours(19) },  // 17:00-19:00
            };

            foreach (var slot in commonSlots)
            {
                if (slot.Start == input.StartTime && slot.End == input.EndTime) continue;

                suggestions.Add(new TimeSlotSuggestion
                {
                    StartTime = slot.Start,
                    EndTime = slot.End,
                    Weekday = input.Weekday
                });
            }

            return suggestions;
        }
    }

    public class TimetableSessionDto
    {
        public string SessionId { get; set; } = string.Empty;
        public int? WeekNo { get; set; }
        public int Weekday { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? PeriodFrom { get; set; }
        public string? PeriodTo { get; set; }
        public string? Status { get; set; }
        public string? Recurrence { get; set; }
        public string ClassId { get; set; } = string.Empty;
        public string ClassCode { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? LecturerId { get; set; }
        public string? LecturerName { get; set; }
        public string? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? SchoolYearId { get; set; }
        public string? SchoolYearCode { get; set; }
    }

    public class TimetableConflictCheckInput
    {
        public string? SessionId { get; set; }
        public string ClassId { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string? LecturerId { get; set; }
        public string? RoomId { get; set; }
        public string? SchoolYearId { get; set; }
        public int? WeekNo { get; set; }
        public int Weekday { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int? PeriodFrom { get; set; }  // ✅ THÊM
        public int? PeriodTo { get; set; }    // ✅ THÊM
    }

    public class TimetableCreateInput : TimetableConflictCheckInput
    {
        public int? PeriodFrom { get; set; }
        public int? PeriodTo { get; set; }
        public string? Recurrence { get; set; }
        public string? Status { get; set; }
        public string? Actor { get; set; }
    }

    public class TimetableUpdateInput
    {
        public string? LecturerId { get; set; }
        public string? RoomId { get; set; }
        public int? WeekNo { get; set; }
        public int Weekday { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int? PeriodFrom { get; set; }
        public int? PeriodTo { get; set; }
        public string? Recurrence { get; set; }
        public string? Status { get; set; }
        public string? Actor { get; set; }
    }

    public class TimetableConflicts
    {
        public List<TimetableConflictItem> LecturerConflicts { get; set; } = new();
        public List<TimetableConflictItem> RoomConflicts { get; set; } = new();
        public List<TimetableStudentConflictItem> StudentConflicts { get; set; } = new();
        public List<TimetablePeriodConflictItem> PeriodConflicts { get; set; } = new(); // ✅ THÊM
        public List<string> Errors { get; set; } = new(); // ✅ THÊM
        public int? RoomCapacity { get; set; }
        public int Enrolled { get; set; }
        public bool IsOverCapacity { get; set; }
    }
    
    // ✅ THÊM: Period Conflict Item
    public class TimetablePeriodConflictItem
    {
        public string Type { get; set; } = string.Empty; // "LECTURER_PERIOD", "ROOM_PERIOD", "STUDENT_PERIOD"
        public string ExistingSessionId { get; set; } = string.Empty;
        public int PeriodFrom { get; set; }
        public int PeriodTo { get; set; }
        public string? LecturerId { get; set; }
        public string? RoomId { get; set; }
        public string? ClassCode { get; set; }
    }

    public class TimetableConflictItem
    {
        public string ExistingSessionId { get; set; } = string.Empty;
        public int? WeekNo { get; set; }
        public int Weekday { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? ClassCode { get; set; }
        public string? RoomCode { get; set; }
        public string? Message { get; set; } // ✅ THÊM: Message mô tả xung đột
    }

    public class TimetableStudentConflictItem : TimetableConflictItem
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
    }

    public class TimetableForeignKeys
    {
        public string? ClassId { get; set; }
        public string? SubjectId { get; set; }
        public string? LecturerId { get; set; }
        public string? RoomId { get; set; }
        public string? SchoolYearId { get; set; }
    }

    // NEW: Room DTO for rooms list endpoint
    public class RoomDto
    {
        public string RoomId { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public string? Building { get; set; }
        public int? Capacity { get; set; }
        public bool IsActive { get; set; }
    }

    // ============================================
    // NEW DTOs for advanced features
    // ============================================

    public class BulkCreateSessionsInput
    {
        public string ClassId { get; set; } = string.Empty;
        public string SubjectId { get; set; } = string.Empty;
        public string? LecturerId { get; set; }
        public string? RoomId { get; set; }
        public string? SchoolYearId { get; set; }
        public int Weekday { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int? PeriodFrom { get; set; }
        public int? PeriodTo { get; set; }
        public string? Recurrence { get; set; }
        public string? Status { get; set; }
        public string? Actor { get; set; }

        // Options for bulk creation
        public List<int>? WeekNumbers { get; set; }  // Specific weeks: [1,2,3,5,7]
        public int? WeekFrom { get; set; }           // Range: WeekFrom=1, WeekTo=15
        public int? WeekTo { get; set; }
        public int? Semester { get; set; }           // Auto-calculate weeks for semester
        public bool SkipConflicts { get; set; } = false;  // Skip weeks with conflicts
    }

    public class BulkCreateSessionsResult
    {
        public int TotalRequested { get; set; }
        public int Created { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class CopySessionsInput
    {
        public string SourceSchoolYearId { get; set; } = string.Empty;
        public int SourceSemester { get; set; }
        public string? SourceClassId { get; set; }  // NULL = all classes
        public string TargetSchoolYearId { get; set; } = string.Empty;
        public string? TargetClassId { get; set; }  // NULL = keep same class
        public string? TargetLecturerId { get; set; }  // NULL = keep same lecturer
        public string? TargetRoomId { get; set; }  // NULL = keep same room
        public string? TargetStatus { get; set; }  // Default: "planned"
        public bool SkipConflicts { get; set; } = false;
        public string? Actor { get; set; }
    }

    public class CopySessionsResult
    {
        public int TotalFound { get; set; }
        public int Copied { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class ConflictSuggestions
    {
        public List<RoomDto> AlternativeRooms { get; set; } = new();
        public List<TimeSlotSuggestion> AlternativeTimes { get; set; } = new();
        public List<LecturerSuggestion> AlternativeLecturers { get; set; } = new();
    }

    public class TimeSlotSuggestion
    {
        public int Weekday { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }

    public class LecturerSuggestion
    {
        public string LecturerId { get; set; } = string.Empty;
        public string LecturerName { get; set; } = string.Empty;
    }

    public class RecurrenceCreateResult
    {
        public int Created { get; set; }
        public int Skipped { get; set; }
        public List<string> SessionIds { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    public class TimetableCreateWithRecurrenceInput : TimetableCreateInput
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
