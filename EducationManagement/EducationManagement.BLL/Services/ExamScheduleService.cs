using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.Exam;
using EducationManagement.DAL.Repositories;

namespace EducationManagement.BLL.Services
{
    public class ExamScheduleService
    {
        private readonly ExamScheduleRepository _examScheduleRepository;
        private readonly ExamAssignmentRepository _examAssignmentRepository;
        private readonly RoomRepository _roomRepository;
        private readonly ClassRepository _classRepository;
        private readonly NotificationService? _notificationService;
        private readonly StudentRepository? _studentRepository;
        private readonly LecturerRepository? _lecturerRepository;

        public ExamScheduleService(
            ExamScheduleRepository examScheduleRepository,
            ExamAssignmentRepository examAssignmentRepository,
            RoomRepository roomRepository,
            ClassRepository classRepository,
            NotificationService? notificationService = null,
            StudentRepository? studentRepository = null,
            LecturerRepository? lecturerRepository = null)
        {
            _examScheduleRepository = examScheduleRepository;
            _examAssignmentRepository = examAssignmentRepository;
            _roomRepository = roomRepository;
            _classRepository = classRepository;
            _notificationService = notificationService;
            _studentRepository = studentRepository;
            _lecturerRepository = lecturerRepository;
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH LỊCH THI
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
            return await _examScheduleRepository.GetAllAsync(
                schoolYearId, semester, examType, startDate, endDate, classId, subjectId);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI THEO ID
        // ============================================================
        public async Task<ExamSchedule?> GetByIdAsync(string examId)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            return await _examScheduleRepository.GetByIdAsync(examId);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI THEO NĂM HỌC VÀ HỌC KỲ
        // ============================================================
        public async Task<List<ExamSchedule>> GetBySchoolYearAsync(string schoolYearId, int? semester = null)
        {
            if (string.IsNullOrWhiteSpace(schoolYearId))
                throw new ArgumentException("School Year ID không được để trống");

            return await _examScheduleRepository.GetBySchoolYearAsync(schoolYearId, semester);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI THEO LỚP HỌC PHẦN
        // ============================================================
        public async Task<List<ExamSchedule>> GetByClassAsync(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _examScheduleRepository.GetByClassAsync(classId);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI CỦA SINH VIÊN
        // ============================================================
        public async Task<List<ExamSchedule>> GetByStudentAsync(string studentId, string? schoolYearId = null, int? semester = null)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            return await _examScheduleRepository.GetByStudentAsync(studentId, schoolYearId, semester);
        }

        // ============================================================
        // 🔹 KIỂM TRA PHÒNG THI CÓ SẴN KHÔNG (CHECK ROOM AVAILABILITY)
        // ============================================================
        public async Task<bool> CheckRoomAvailabilityAsync(
            string roomId,
            DateTime examDate,
            TimeSpan startTime,
            TimeSpan endTime,
            string? excludeExamId = null)
        {
            if (string.IsNullOrWhiteSpace(roomId))
                throw new ArgumentException("Room ID không được để trống");

            // Kiểm tra xung đột
            var hasConflict = await _examScheduleRepository.CheckRoomConflictAsync(
                roomId, examDate, startTime, endTime, excludeExamId);

            return !hasConflict; // Trả về true nếu không có xung đột (phòng sẵn sàng)
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
            if (string.IsNullOrWhiteSpace(roomId))
                throw new ArgumentException("Room ID không được để trống");

            return await _examScheduleRepository.CheckRoomConflictAsync(
                roomId, examDate, startTime, endTime, excludeExamId);
        }

        // ============================================================
        // 🔹 KIỂM TRA SINH VIÊN CÓ ĐỦ ĐIỀU KIỆN DỰ THI KHÔNG
        // ============================================================
        public async Task<bool> CheckStudentQualificationAsync(string studentId, string classId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _examAssignmentRepository.CheckStudentQualificationAsync(studentId, classId);
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH SINH VIÊN TRONG LỚP HỌC PHẦN
        // ============================================================
        public async Task<List<ClassStudentDto>> GetStudentsByClassAsync(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _examScheduleRepository.GetStudentsByClassAsync(classId);
        }

        // ============================================================
        // 🔹 LẤY DANH SÁCH SINH VIÊN TRONG CA THI (ĐỂ NHẬP ĐIỂM)
        // ============================================================
        public async Task<List<ExamAssignment>> GetExamAssignmentsAsync(string examId)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            return await _examAssignmentRepository.GetByExamAsync(examId);
        }

        // ============================================================
        // 🔹 TÍNH SỐ CA THI CẦN THIẾT DỰA TRÊN SỐ LƯỢNG SINH VIÊN VÀ CAPACITY PHÒNG
        // ============================================================
        public async Task<int> CalculateRequiredSessionsAsync(string classId, string roomId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(roomId))
                throw new ArgumentException("Room ID không được để trống");

            // Lấy danh sách sinh viên trong lớp
            var students = await GetStudentsByClassAsync(classId);
            var studentCount = students.Count(s => s.EnrollmentStatus == "APPROVED");

            // Lấy capacity của phòng
            var room = await _roomRepository.GetByIdAsync(roomId);
            if (room == null)
                throw new Exception($"Không tìm thấy phòng thi với ID: {roomId}");

            var roomCapacity = room.Capacity ?? 50; // Default 50 nếu null

            // Tính số ca thi cần thiết
            if (studentCount == 0)
                return 1; // Ít nhất 1 ca thi

            var requiredSessions = (int)Math.Ceiling((double)studentCount / roomCapacity);
            return requiredSessions;
        }

        // ============================================================
        // 🔹 TẠO LỊCH THI MỚI
        // ============================================================
        public async Task<string> CreateAsync(ExamSchedule exam)
        {
            // Validation
            ValidateExamSchedule(exam);

            // Kiểm tra xung đột phòng thi
            if (!string.IsNullOrWhiteSpace(exam.RoomId))
            {
                var hasConflict = await CheckRoomConflictAsync(
                    exam.RoomId, exam.ExamDate, exam.ExamTime, exam.EndTime);

                if (hasConflict)
                    throw new Exception($"Phòng thi đã được sử dụng trong khoảng thời gian này: {exam.ExamDate:dd/MM/yyyy} {exam.ExamTime:hh\\:mm} - {exam.EndTime:hh\\:mm}");
            }

            // Tạo exam_id nếu chưa có
            if (string.IsNullOrWhiteSpace(exam.ExamId))
            {
                exam.ExamId = $"EXAM-{Guid.NewGuid()}";
            }

            return await _examScheduleRepository.CreateAsync(exam);
        }

        // ============================================================
        // 🔹 TẠO LỊCH THI CHO LỚP HỌC PHẦN (TỰ ĐỘNG PHÂN SINH VIÊN VÀO CÁC CA THI)
        // ============================================================
        public async Task<List<ExamSchedule>> CreateExamScheduleForClassAsync(CreateExamScheduleForClassDto dto)
        {
            // Validation
            if (string.IsNullOrWhiteSpace(dto.ClassId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.SubjectId))
                throw new ArgumentException("Subject ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.RoomId))
                throw new ArgumentException("Room ID không được để trống");

            if (dto.ExamDate < DateTime.Today)
                throw new ArgumentException("Ngày thi không thể trong quá khứ");

            if (dto.ExamTime >= dto.EndTime)
                throw new ArgumentException("Giờ bắt đầu phải nhỏ hơn giờ kết thúc");

            if (dto.ExamType != "GIỮA_HỌC_PHẦN" && dto.ExamType != "KẾT_THÚC_HỌC_PHẦN")
                throw new ArgumentException("Loại kỳ thi không hợp lệ. Chỉ chấp nhận: GIỮA_HỌC_PHẦN hoặc KẾT_THÚC_HỌC_PHẦN");

            // Kiểm tra lớp học phần tồn tại
            var classInfo = await _classRepository.GetByIdAsync(dto.ClassId);
            if (classInfo == null)
                throw new Exception($"Không tìm thấy lớp học phần với ID: {dto.ClassId}");

            // Kiểm tra phòng thi tồn tại
            var room = await _roomRepository.GetByIdAsync(dto.RoomId);
            if (room == null)
                throw new Exception($"Không tìm thấy phòng thi với ID: {dto.RoomId}");

            // Tạo ExamSchedule object
            var exam = new ExamSchedule
            {
                ClassId = dto.ClassId,
                SubjectId = dto.SubjectId,
                ExamDate = dto.ExamDate,
                ExamTime = dto.ExamTime,
                EndTime = dto.EndTime,
                RoomId = dto.RoomId,
                ExamType = dto.ExamType,
                ProctorLecturerId = dto.ProctorLecturerId,
                Duration = dto.Duration,
                Notes = dto.Notes,
                Status = "PLANNED",
                SchoolYearId = dto.SchoolYearId ?? classInfo.AcademicYearId,
                Semester = dto.Semester ?? (int.TryParse(classInfo.Semester, out var parsedSemester) ? parsedSemester : null),
                CreatedBy = dto.CreatedBy
            };

            // Tạo lịch thi cho lớp (stored procedure sẽ tự động phân sinh viên vào các ca thi)
            var createdExams = await _examScheduleRepository.CreateExamScheduleForClassAsync(exam, dto.RoomId);
            
            // ✅ GỬI THÔNG BÁO CHO SINH VIÊN VÀ GIẢNG VIÊN COI THI
            await SendExamScheduleNotificationsAsync(createdExams, "CREATED", dto.CreatedBy);
            
            // ✅ GỬI THÔNG BÁO CHO SINH VIÊN KHÔNG ĐỦ ĐIỀU KIỆN DỰ THI (NOT_QUALIFIED)
            if (createdExams != null && createdExams.Count > 0)
            {
                var firstExam = createdExams[0];
                var subjectName = firstExam.SubjectName ?? "Môn học";
                
                // Lấy tất cả assignments từ các exams vừa tạo và lọc ra những assignments NOT_QUALIFIED
                var disqualifiedStudentIds = new List<string>();
                
                foreach (var createdExam in createdExams)
                {
                    var assignments = await _examAssignmentRepository.GetByExamAsync(createdExam.ExamId);
                    var notQualifiedAssignments = assignments.Where(a => a.Status == "NOT_QUALIFIED").ToList();
                    
                    foreach (var assignment in notQualifiedAssignments)
                    {
                        if (!string.IsNullOrWhiteSpace(assignment.StudentId) && 
                            !disqualifiedStudentIds.Contains(assignment.StudentId))
                        {
                            disqualifiedStudentIds.Add(assignment.StudentId);
                        }
                    }
                }
                
                // Gửi thông báo cho sinh viên bị NOT_QUALIFIED
                if (disqualifiedStudentIds.Count > 0)
                {
                    await SendDisqualificationNotificationsAsync(
                        dto.ClassId,
                        subjectName,
                        firstExam.ExamType,
                        firstExam.ExamDate,
                        disqualifiedStudentIds,
                        dto.CreatedBy);
                }
            }
            
            return createdExams;
        }
        
        // ============================================================
        // 🔹 GỬI THÔNG BÁO CHO SINH VIÊN VÀ GIẢNG VIÊN KHI CÓ THAY ĐỔI LỊCH THI
        // ============================================================
        private async Task SendExamScheduleNotificationsAsync(
            List<ExamSchedule> exams,
            string action, // "CREATED", "UPDATED", "CANCELLED"
            string actor)
        {
            if (_notificationService == null || exams == null || exams.Count == 0)
                return;
            
            try
            {
                // Lấy danh sách sinh viên trong lớp (từ exam đầu tiên, tất cả exams cùng lớp)
                var firstExam = exams[0];
                var students = await GetStudentsByClassAsync(firstExam.ClassId);
                
                // Tạo thông báo cho từng sinh viên
                foreach (var student in students)
                {
                    if (_studentRepository != null && !string.IsNullOrWhiteSpace(student.StudentId))
                    {
                        try
                        {
                            var studentInfo = await _studentRepository.GetByIdAsync(student.StudentId);
                            if (studentInfo != null && !string.IsNullOrWhiteSpace(studentInfo.UserId))
                            {
                                var title = action == "CREATED" ? "Lịch thi mới đã được tạo" :
                                           action == "UPDATED" ? "Lịch thi đã được cập nhật" :
                                           action == "CANCELLED" ? "Lịch thi đã bị hủy" : "Thông báo lịch thi";
                                
                                var examTypeText = firstExam.ExamType == "GIỮA_HỌC_PHẦN" ? "Thi giữa học phần" : "Thi kết thúc học phần";
                                var sessionsInfo = exams.Count > 1 ? $" ({exams.Count} ca thi)" : "";
                                
                                var content = action == "CREATED" 
                                    ? $"Lịch thi {examTypeText} cho môn {firstExam.SubjectName} đã được tạo.{sessionsInfo} " +
                                      $"Ngày thi: {firstExam.ExamDate:dd/MM/yyyy}, Giờ: {firstExam.ExamTime:hh\\:mm} - {firstExam.EndTime:hh\\:mm}, Phòng: {firstExam.RoomCode}."
                                    : action == "UPDATED"
                                    ? $"Lịch thi {examTypeText} cho môn {firstExam.SubjectName} đã được cập nhật.{sessionsInfo} " +
                                      $"Vui lòng kiểm tra lại thông tin lịch thi."
                                    : $"Lịch thi {examTypeText} cho môn {firstExam.SubjectName} đã bị hủy. " +
                                      $"Vui lòng liên hệ phòng đào tạo để biết thêm chi tiết.";
                                
                                await _notificationService.CreateNotificationAsync(
                                    studentInfo.UserId,
                                    title,
                                    content,
                                    "ExamSchedule",
                                    actor);
                            }
                        }
                        catch (Exception ex)
                        {
                            // Log error but continue with other students
                        }
                    }
                }
                
                // Gửi thông báo cho giảng viên coi thi (nếu có)
                if (!string.IsNullOrWhiteSpace(firstExam.ProctorLecturerId) && _lecturerRepository != null)
                {
                    try
                    {
                        var lecturer = await _lecturerRepository.GetByIdAsync(firstExam.ProctorLecturerId);
                        if (lecturer != null && !string.IsNullOrWhiteSpace(lecturer.UserId))
                        {
                            var title = action == "CREATED" ? "Được phân công coi thi" :
                                       action == "UPDATED" ? "Lịch coi thi đã được cập nhật" :
                                       action == "CANCELLED" ? "Lịch coi thi đã bị hủy" : "Thông báo coi thi";
                            
                            var examTypeText = firstExam.ExamType == "GIỮA_HỌC_PHẦN" ? "Thi giữa học phần" : "Thi kết thúc học phần";
                            var sessionsInfo = exams.Count > 1 ? $" ({exams.Count} ca thi)" : "";
                            
                            var content = action == "CREATED"
                                ? $"Bạn đã được phân công coi thi {examTypeText} cho môn {firstExam.SubjectName}.{sessionsInfo} " +
                                  $"Ngày thi: {firstExam.ExamDate:dd/MM/yyyy}, Giờ: {firstExam.ExamTime:hh\\:mm} - {firstExam.EndTime:hh\\:mm}, Phòng: {firstExam.RoomCode}."
                                : action == "UPDATED"
                                ? $"Lịch coi thi {examTypeText} cho môn {firstExam.SubjectName} đã được cập nhật.{sessionsInfo} " +
                                  $"Vui lòng kiểm tra lại thông tin."
                                : $"Lịch coi thi {examTypeText} cho môn {firstExam.SubjectName} đã bị hủy.";
                            
                            await _notificationService.CreateNotificationAsync(
                                lecturer.UserId,
                                title,
                                content,
                                "ExamSchedule",
                                actor);
                        }
                    }
                    catch (Exception ex)
                    {
                        // Log error but continue
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the operation
            }
        }
        
        // ============================================================
        // 🔹 GỬI THÔNG BÁO CHO SINH VIÊN KHÔNG ĐỦ ĐIỀU KIỆN DỰ THI
        // ============================================================
        private async Task SendDisqualificationNotificationsAsync(
            string classId,
            string subjectName,
            string examType,
            DateTime examDate,
            List<string> disqualifiedStudentIds,
            string actor)
        {
            if (_notificationService == null || _studentRepository == null || 
                disqualifiedStudentIds == null || disqualifiedStudentIds.Count == 0)
                return;
            
            try
            {
                foreach (var studentId in disqualifiedStudentIds)
                {
                    try
                    {
                        var student = await _studentRepository.GetByIdAsync(studentId);
                        if (student != null && !string.IsNullOrWhiteSpace(student.UserId))
                        {
                            var examTypeText = examType == "GIỮA_HỌC_PHẦN" ? "Thi giữa học phần" : "Thi kết thúc học phần";
                            
                            await _notificationService.CreateNotificationAsync(
                                student.UserId,
                                "Không đủ điều kiện dự thi",
                                $"Bạn không đủ điều kiện dự thi {examTypeText} cho môn {subjectName} do vắng mặt > 20%. " +
                                $"Ngày thi: {examDate:dd/MM/yyyy}. Vui lòng liên hệ phòng đào tạo để biết thêm chi tiết.",
                                "ExamSchedule",
                                actor);
                        }
                    }
                    catch (Exception ex)
                    {
                        // Continue with other students
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail
            }
        }

        // ============================================================
        // 🔹 TỰ ĐỘNG PHÂN SINH VIÊN VÀO CÁC CA THI
        // ============================================================
        public async Task AutoAssignStudentsToExamsAsync(string examId)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            // Lấy thông tin exam
            var exam = await GetByIdAsync(examId);
            if (exam == null)
                throw new Exception($"Không tìm thấy lịch thi với ID: {examId}");

            // Stored procedure sp_AutoAssignStudentsToExam sẽ tự động:
            // 1. Lấy danh sách sinh viên trong lớp
            // 2. Kiểm tra điều kiện dự thi (vắng mặt <= 20%)
            // 3. Phân sinh viên vào ca thi
            // 4. Đánh dấu NOT_QUALIFIED nếu vắng mặt > 20%

            // Gọi stored procedure thông qua repository
            // Note: Method này có thể cần được thêm vào ExamScheduleRepository
            // Tạm thời logic được xử lý trong CreateExamScheduleForClassAsync
        }

        // ============================================================
        // 🔹 CẬP NHẬT LỊCH THI
        // ============================================================
        public async Task UpdateAsync(ExamSchedule exam)
        {
            if (string.IsNullOrWhiteSpace(exam.ExamId))
                throw new ArgumentException("Exam ID không được để trống");

            // Lấy lịch thi hiện tại
            var existingExam = await GetByIdAsync(exam.ExamId);
            if (existingExam == null)
                throw new Exception($"Không tìm thấy lịch thi với ID: {exam.ExamId}");

            // Validation: Không cho phép sửa nếu đã nhập điểm
            // (Kiểm tra xem có điểm trong grades table chưa)
            if (existingExam.Status == "COMPLETED")
                throw new Exception("Không thể sửa lịch thi đã hoàn thành (đã nhập điểm)");

            // Validation
            ValidateExamSchedule(exam);

            // Kiểm tra xung đột phòng thi (nếu thay đổi phòng hoặc thời gian)
            if (!string.IsNullOrWhiteSpace(exam.RoomId) &&
                (exam.RoomId != existingExam.RoomId ||
                 exam.ExamDate != existingExam.ExamDate ||
                 exam.ExamTime != existingExam.ExamTime ||
                 exam.EndTime != existingExam.EndTime))
            {
                var hasConflict = await CheckRoomConflictAsync(
                    exam.RoomId, exam.ExamDate, exam.ExamTime, exam.EndTime, exam.ExamId);

                if (hasConflict)
                    throw new Exception($"Phòng thi đã được sử dụng trong khoảng thời gian này: {exam.ExamDate:dd/MM/yyyy} {exam.ExamTime:hh\\:mm} - {exam.EndTime:hh\\:mm}");
            }

            await _examScheduleRepository.UpdateAsync(exam);
        }

        // ============================================================
        // 🔹 XÓA LỊCH THI (SOFT DELETE)
        // ============================================================
        public async Task DeleteAsync(string examId, string deletedBy)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            // Lấy lịch thi hiện tại
            var existingExam = await GetByIdAsync(examId);
            if (existingExam == null)
                throw new Exception($"Không tìm thấy lịch thi với ID: {examId}");

            // Validation: Không cho phép xóa nếu đã nhập điểm
            if (existingExam.Status == "COMPLETED")
                throw new Exception("Không thể xóa lịch thi đã hoàn thành (đã nhập điểm). Vui lòng hủy lịch thi thay vì xóa.");

            await _examScheduleRepository.DeleteAsync(examId, deletedBy);
        }

        // ============================================================
        // 🔹 HỦY LỊCH THI (CANCEL)
        // ============================================================
        public async Task CancelExamScheduleAsync(string examId, string updatedBy)
        {
            if (string.IsNullOrWhiteSpace(examId))
                throw new ArgumentException("Exam ID không được để trống");

            var exam = await GetByIdAsync(examId);
            if (exam == null)
                throw new Exception($"Không tìm thấy lịch thi với ID: {examId}");

            // Không cho phép hủy nếu đã nhập điểm
            if (exam.Status == "COMPLETED")
                throw new Exception("Không thể hủy lịch thi đã hoàn thành (đã nhập điểm)");

            exam.Status = "CANCELLED";
            exam.UpdatedBy = updatedBy;
            exam.UpdatedAt = DateTime.Now;

            await _examScheduleRepository.UpdateAsync(exam);
            
            // ✅ GỬI THÔNG BÁO CHO SINH VIÊN VÀ GIẢNG VIÊN COI THI
            await SendExamScheduleNotificationsAsync(
                new List<ExamSchedule> { exam },
                "CANCELLED",
                updatedBy);
        }

        // ============================================================
        // 🔹 CHUYỂN SINH VIÊN GIỮA CÁC CA THI
        // ============================================================
        public async Task TransferStudentBetweenSessionsAsync(string assignmentId, string targetExamId, string updatedBy)
        {
            if (string.IsNullOrWhiteSpace(assignmentId))
                throw new ArgumentException("Assignment ID không được để trống");

            if (string.IsNullOrWhiteSpace(targetExamId))
                throw new ArgumentException("Target Exam ID không được để trống");

            // Lấy exam hiện tại để tìm assignment
            // Tìm assignment trong tất cả exam để tìm assignmentId
            var allExams = await _examScheduleRepository.GetAllAsync();
            ExamAssignment? currentAssignment = null;
            ExamSchedule? sourceExam = null;

            foreach (var exam in allExams)
            {
                var assignments = await _examAssignmentRepository.GetByExamAsync(exam.ExamId);
                var assignment = assignments.FirstOrDefault(a => a.AssignmentId == assignmentId);
                if (assignment != null)
                {
                    currentAssignment = assignment;
                    sourceExam = exam;
                    break;
                }
            }

            if (currentAssignment == null || sourceExam == null)
                throw new Exception($"Không tìm thấy phân công với ID: {assignmentId}");

            // Lấy exam đích
            var targetExam = await GetByIdAsync(targetExamId);
            if (targetExam == null)
                throw new Exception($"Không tìm thấy lịch thi đích với ID: {targetExamId}");

            // Kiểm tra exam đích cùng lớp và cùng loại thi
            if (targetExam.ClassId != sourceExam.ClassId || targetExam.ExamType != sourceExam.ExamType)
                throw new Exception("Không thể chuyển sinh viên sang ca thi khác lớp hoặc khác loại thi");

            // Kiểm tra capacity của exam đích
            var targetAssignments = await _examAssignmentRepository.GetByExamAsync(targetExamId);
            var currentCount = targetAssignments.Count(a => a.Status != "NOT_QUALIFIED" && a.Status != "EXCUSED");
            var maxStudents = targetExam.MaxStudents ?? 50;

            if (currentCount >= maxStudents)
                throw new Exception($"Ca thi đích đã đầy ({currentCount}/{maxStudents} sinh viên)");

            // Xóa assignment cũ
            await _examAssignmentRepository.DeleteAsync(assignmentId, updatedBy);

            // Tạo assignment mới
            var newAssignment = new ExamAssignment
            {
                AssignmentId = $"EA-{Guid.NewGuid()}",
                ExamId = targetExamId,
                EnrollmentId = currentAssignment.EnrollmentId,
                StudentId = currentAssignment.StudentId,
                Status = currentAssignment.Status, // Giữ nguyên status (có thể là NOT_QUALIFIED)
                CreatedBy = updatedBy
            };

            await _examAssignmentRepository.CreateAsync(newAssignment);
        }

        // ============================================================
        // 🔹 LẤY LỊCH THI CỦA LỚP TRONG TUẦN (ĐỂ TÍCH HỢP TIMETABLE)
        // ============================================================
        public async Task<List<object>> GetExamsByClassAndWeekAsync(string classId, int year, int week)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            var exams = await _examScheduleRepository.GetExamsByClassAndWeekAsync(classId, year, week);

            // Convert exams sang format timetable
            var timetableItems = exams.Select(exam => ConvertExamToTimetableItem(exam)).ToList();

            return timetableItems.Cast<object>().ToList();
        }

        // ============================================================
        // 🔹 CONVERT EXAM SANG FORMAT TIMETABLE
        // ============================================================
        public object ConvertExamToTimetableItem(ExamSchedule exam)
        {
            var examDate = exam.ExamDate;
            var weekday = ((int)examDate.DayOfWeek) == 0 ? 7 : (int)examDate.DayOfWeek; // Sunday = 7

            return new
            {
                type = "exam",  // ✅ Flag để phân biệt với session
                sessionId = exam.ExamId,  // Dùng examId làm sessionId để tương thích
                examId = exam.ExamId,
                weekday = weekday,
                startTime = exam.ExamTime.ToString(@"hh\:mm"),
                endTime = exam.EndTime.ToString(@"hh\:mm"),
                classCode = exam.ClassCode ?? string.Empty,
                className = exam.ClassName ?? string.Empty,
                subjectName = exam.SubjectName ?? string.Empty,
                subjectCode = exam.SubjectCode ?? string.Empty,
                lecturerName = exam.ProctorName ?? "—",  // Proctor thay vì lecturer
                roomCode = exam.RoomCode ?? "—",
                roomId = exam.RoomId,
                building = exam.Building,
                status = exam.Status,
                examType = exam.ExamType,
                sessionNo = exam.SessionNo,
                examDate = exam.ExamDate.ToString("yyyy-MM-dd"),
                duration = exam.Duration,
                maxStudents = exam.MaxStudents,
                assignedStudents = exam.AssignedStudents,
                notes = exam.Notes
            };
        }

        // ============================================================
        // 🔹 HELPER: TÍNH TUẦN ISO TỪ DATE
        // ============================================================
        public int GetIsoWeekNumber(DateTime date)
        {
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
        // 🔹 LẤY DANH SÁCH LỊCH THI SẮP TỚI (ĐỂ GỬI THÔNG BÁO NHẮC NHỞ)
        // ============================================================
        public async Task<List<ExamSchedule>> GetUpcomingExamsAsync(DateTime targetDate, DateTime endDate)
        {
            // Lấy tất cả exams trong khoảng thời gian
            var exams = await _examScheduleRepository.GetAllAsync(
                startDate: targetDate,
                endDate: endDate);

            // Chỉ lấy exams có status PLANNED hoặc CONFIRMED (chưa hoàn thành)
            var upcomingExams = exams.Where(e => 
                (e.Status == "PLANNED" || e.Status == "CONFIRMED") &&
                e.ExamDate.Date == targetDate.Date &&
                e.DeletedAt == null).ToList();

            return upcomingExams;
        }

        // ============================================================
        // 🔹 GỬI THÔNG BÁO NHẮC NHỞ LỊCH THI
        // ============================================================
        public async Task SendExamReminderNotificationsAsync(
            List<ExamSchedule> exams,
            int daysBefore)
        {
            if (_notificationService == null || exams == null || exams.Count == 0)
                return;

            try
            {
                foreach (var exam in exams)
                {
                    // Lấy danh sách sinh viên trong ca thi
                    var assignments = await _examAssignmentRepository.GetByExamAsync(exam.ExamId);
                    var studentIds = assignments
                        .Where(a => a.Status != "NOT_QUALIFIED" && a.Status != "EXCUSED")
                        .Select(a => a.StudentId)
                        .Distinct()
                        .ToList();

                    // Gửi thông báo cho từng sinh viên
                    foreach (var studentId in studentIds)
                    {
                        if (_studentRepository != null && !string.IsNullOrWhiteSpace(studentId))
                        {
                            try
                            {
                                var student = await _studentRepository.GetByIdAsync(studentId);
                                if (student != null && !string.IsNullOrWhiteSpace(student.UserId))
                                {
                                    var examTypeText = exam.ExamType == "GIỮA_HỌC_PHẦN" 
                                        ? "Thi giữa học phần" 
                                        : "Thi kết thúc học phần";

                                    var title = daysBefore == 1 
                                        ? "Nhắc nhở: Lịch thi trong 1 ngày tới"
                                        : $"Nhắc nhở: Lịch thi trong {daysBefore} ngày tới";

                                    var content = daysBefore == 1
                                        ? $"Bạn có lịch thi {examTypeText} cho môn {exam.SubjectName ?? "Môn học"} trong ngày mai. " +
                                          $"Ngày thi: {exam.ExamDate:dd/MM/yyyy}, Giờ: {exam.ExamTime:hh\\:mm} - {exam.EndTime:hh\\:mm}, Phòng: {exam.RoomCode ?? "Chưa có"}. " +
                                          $"Vui lòng chuẩn bị và có mặt đúng giờ."
                                        : $"Bạn có lịch thi {examTypeText} cho môn {exam.SubjectName ?? "Môn học"} trong {daysBefore} ngày tới. " +
                                          $"Ngày thi: {exam.ExamDate:dd/MM/yyyy}, Giờ: {exam.ExamTime:hh\\:mm} - {exam.EndTime:hh\\:mm}, Phòng: {exam.RoomCode ?? "Chưa có"}. " +
                                          $"Vui lòng chuẩn bị và có mặt đúng giờ.";

                                    await _notificationService.CreateNotificationAsync(
                                        student.UserId,
                                        title,
                                        content,
                                        "ExamSchedule",
                                        "system");
                                }
                            }
                            catch (Exception ex)
                            {
                                // Log error but continue with other students
                            }
                        }
                    }

                    // Gửi thông báo cho giảng viên coi thi (nếu có)
                    if (!string.IsNullOrWhiteSpace(exam.ProctorLecturerId) && _lecturerRepository != null)
                    {
                        try
                        {
                            var lecturer = await _lecturerRepository.GetByIdAsync(exam.ProctorLecturerId);
                            if (lecturer != null && !string.IsNullOrWhiteSpace(lecturer.UserId))
                            {
                                var examTypeText = exam.ExamType == "GIỮA_HỌC_PHẦN" 
                                    ? "Thi giữa học phần" 
                                    : "Thi kết thúc học phần";

                                var title = daysBefore == 1 
                                    ? "Nhắc nhở: Lịch coi thi trong 1 ngày tới"
                                    : $"Nhắc nhở: Lịch coi thi trong {daysBefore} ngày tới";

                                var content = daysBefore == 1
                                    ? $"Bạn có lịch coi thi {examTypeText} cho môn {exam.SubjectName ?? "Môn học"} trong ngày mai. " +
                                      $"Ngày thi: {exam.ExamDate:dd/MM/yyyy}, Giờ: {exam.ExamTime:hh\\:mm} - {exam.EndTime:hh\\:mm}, Phòng: {exam.RoomCode ?? "Chưa có"}. " +
                                      $"Vui lòng có mặt đúng giờ."
                                    : $"Bạn có lịch coi thi {examTypeText} cho môn {exam.SubjectName ?? "Môn học"} trong {daysBefore} ngày tới. " +
                                      $"Ngày thi: {exam.ExamDate:dd/MM/yyyy}, Giờ: {exam.ExamTime:hh\\:mm} - {exam.EndTime:hh\\:mm}, Phòng: {exam.RoomCode ?? "Chưa có"}. " +
                                      $"Vui lòng có mặt đúng giờ.";

                                await _notificationService.CreateNotificationAsync(
                                    lecturer.UserId,
                                    title,
                                    content,
                                    "ExamSchedule",
                                    "system");
                            }
                        }
                        catch (Exception ex)
                        {
                            // Log error but continue
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail
            }
        }

        // ============================================================
        // 🔹 VALIDATION HELPER
        // ============================================================
        private void ValidateExamSchedule(ExamSchedule exam)
        {
            if (string.IsNullOrWhiteSpace(exam.ClassId))
                throw new ArgumentException("Class ID không được để trống");

            if (string.IsNullOrWhiteSpace(exam.SubjectId))
                throw new ArgumentException("Subject ID không được để trống");

            if (exam.ExamDate < DateTime.Today)
                throw new ArgumentException("Ngày thi không thể trong quá khứ");

            if (exam.ExamTime >= exam.EndTime)
                throw new ArgumentException("Giờ bắt đầu phải nhỏ hơn giờ kết thúc");

            if (exam.Duration <= 0)
                throw new ArgumentException("Thời lượng thi phải lớn hơn 0");

            if (exam.ExamType != "GIỮA_HỌC_PHẦN" && exam.ExamType != "KẾT_THÚC_HỌC_PHẦN")
                throw new ArgumentException("Loại kỳ thi không hợp lệ. Chỉ chấp nhận: GIỮA_HỌC_PHẦN hoặc KẾT_THÚC_HỌC_PHẦN");

            if (exam.Status != "PLANNED" && exam.Status != "CONFIRMED" && exam.Status != "COMPLETED" && exam.Status != "CANCELLED")
                throw new ArgumentException("Status không hợp lệ. Chỉ chấp nhận: PLANNED, CONFIRMED, COMPLETED, CANCELLED");
        }
    }
}

