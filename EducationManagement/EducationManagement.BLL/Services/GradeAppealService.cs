using EducationManagement.Common.Models;
using EducationManagement.Common.DTOs.GradeAppeal;
using EducationManagement.Common.Helpers;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class GradeAppealService
    {
        private readonly GradeAppealRepository _appealRepository;
        private readonly NotificationService _notificationService;
        private readonly EmailService _emailService;
        private readonly UserRepository _userRepository;

        public GradeAppealService(
            GradeAppealRepository appealRepository,
            NotificationService notificationService,
            EmailService emailService,
            UserRepository userRepository)
        {
            _appealRepository = appealRepository;
            _notificationService = notificationService;
            _emailService = emailService;
            _userRepository = userRepository;
        }

        public async Task<string> CreateAppealAsync(GradeAppealCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.GradeId))
                throw new ArgumentException("Grade ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.StudentId))
                throw new ArgumentException("Student ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.AppealReason))
                throw new ArgumentException("Lý do phúc khảo không được để trống");

            if (dto.ExpectedScore.HasValue && (dto.ExpectedScore < 0 || dto.ExpectedScore > 10))
                throw new ArgumentException("Điểm mong muốn phải nằm trong khoảng 0 đến 10");

            var appealId = IdGenerator.Generate("appeal");
            
            Console.WriteLine($"[GradeAppealService] CreateAppealAsync - Starting with appealId: {appealId}");
            Console.WriteLine($"[GradeAppealService] DTO: GradeId={dto.GradeId}, StudentId={dto.StudentId}, ComponentType={dto.ComponentType}");
            
            string result;
            try
            {
                Console.WriteLine($"[GradeAppealService] Calling repository.CreateAsync...");
                result = await _appealRepository.CreateAsync(
                    appealId, dto.GradeId, dto.EnrollmentId, dto.StudentId, dto.ClassId,
                    dto.AppealReason, dto.CurrentScore, dto.ExpectedScore, dto.ComponentType, dto.CreatedBy
                );
                Console.WriteLine($"[GradeAppealService] ✅ Repository.CreateAsync completed. Result: {result}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GradeAppealService] ❌ Exception in repository.CreateAsync:");
                Console.WriteLine($"   Error Message: {ex.Message}");
                Console.WriteLine($"   Error Type: {ex.GetType().Name}");
                Console.WriteLine($"   Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"   Inner Exception: {ex.InnerException.Message}");
                    Console.WriteLine($"   Inner Exception Type: {ex.InnerException.GetType().Name}");
                }
                throw;
            }

            // Get appeal details for notification
            Console.WriteLine($"[GradeAppealService] Getting appeal details for notification...");
            var appeal = await _appealRepository.GetByIdAsync(appealId);
            if (appeal != null)
            {
                // Get advisor users (all advisors can see all appeals)
                var advisorUsers = await _userRepository.GetUsersByRoleNameAsync("Advisor");
                
                // Send notification and email to all advisors
                foreach (var (advisorUserId, advisorEmail, advisorName) in advisorUsers)
                {
                    try
                    {
                        await _notificationService.CreateNotificationAsync(
                            advisorUserId,
                            "Yêu cầu phúc khảo mới",
                            $"Sinh viên {appeal.StudentName} đã tạo yêu cầu phúc khảo cho môn {appeal.SubjectName}. Lý do: {dto.AppealReason}",
                            "GradeAppeal",
                            dto.CreatedBy
                        );

                        // Send email to advisor if email is available
                        if (!string.IsNullOrEmpty(advisorEmail))
                        {
                            try
                            {
                                await _emailService.SendGradeAppealCreatedEmailAsync(
                                    advisorEmail,
                                    advisorName,
                                    appeal.StudentName ?? "Sinh viên",
                                    appeal.SubjectName ?? "môn học",
                                    appealId,
                                    dto.AppealReason
                                );
                            }
                            catch (Exception ex)
                            {
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                    }
                }

                // Send notification to student (using student user_id)
                if (!string.IsNullOrEmpty(appeal.StudentUserId))
                {
                    try
                    {
                        await _notificationService.CreateNotificationAsync(
                            appeal.StudentUserId,
                            "Yêu cầu phúc khảo đã được gửi",
                            $"Yêu cầu phúc khảo của bạn cho môn {appeal.SubjectName} đã được gửi thành công. Vui lòng chờ phản hồi từ cố vấn học tập.",
                            "GradeAppeal",
                            dto.CreatedBy
                        );
                    }
                    catch (Exception ex)
                    {
                    }
                }
            }

            return result;
        }

        public async Task<GradeAppeal?> GetAppealByIdAsync(string appealId)
        {
            if (string.IsNullOrWhiteSpace(appealId))
                throw new ArgumentException("Appeal ID không được để trống");

            return await _appealRepository.GetByIdAsync(appealId);
        }

        public async Task<(List<GradeAppeal> Appeals, int TotalCount)> GetAllAppealsAsync(
            int page = 1, int pageSize = 20, string? status = null, string? studentId = null,
            string? lecturerId = null, string? advisorId = null, string? classId = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            return await _appealRepository.GetAllAsync(page, pageSize, status, studentId, 
                lecturerId, advisorId, classId);
        }

        public async Task UpdateLecturerResponseAsync(string appealId, GradeAppealLecturerResponseDto dto)
        {
            if (string.IsNullOrWhiteSpace(appealId))
                throw new ArgumentException("Appeal ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.LecturerId))
                throw new ArgumentException("Lecturer ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.LecturerDecision))
                throw new ArgumentException("Decision không được để trống");

            var validDecisions = new[] { "APPROVE", "REJECT", "NEED_REVIEW" };
            if (!Array.Exists(validDecisions, d => d == dto.LecturerDecision))
                throw new ArgumentException("Decision phải là APPROVE, REJECT hoặc NEED_REVIEW");

            await _appealRepository.UpdateLecturerResponseAsync(
                appealId, dto.LecturerId, dto.LecturerResponse, dto.LecturerDecision, dto.UpdatedBy
            );

            // Get appeal details for notification
            var appeal = await _appealRepository.GetByIdAsync(appealId);
            if (appeal != null)
            {
                // Send notification to student
                try
                {
                    var decisionText = dto.LecturerDecision switch
                    {
                        "APPROVE" => "đề xuất chấp nhận",
                        "REJECT" => "đề xuất từ chối",
                        "NEED_REVIEW" => "yêu cầu xem xét thêm",
                        _ => dto.LecturerDecision
                    };

                    // Send notification to student (using student user_id)
                    if (!string.IsNullOrEmpty(appeal.StudentUserId))
                    {
                        await _notificationService.CreateNotificationAsync(
                            appeal.StudentUserId,
                            "Phản hồi từ giảng viên",
                            $"Giảng viên {appeal.LecturerName} đã {decisionText} yêu cầu phúc khảo của bạn cho môn {appeal.SubjectName}. Đang chờ cố vấn học tập quyết định cuối cùng.{(string.IsNullOrEmpty(dto.LecturerResponse) ? "" : $" Phản hồi: {dto.LecturerResponse}")}",
                            "GradeAppeal",
                            dto.UpdatedBy
                        );
                    }

                    // Send email to student
                    if (!string.IsNullOrEmpty(appeal.StudentEmail))
                    {
                        try
                        {
                            await _emailService.SendGradeAppealLecturerResponseEmailAsync(
                                appeal.StudentEmail,
                                appeal.StudentName ?? "Sinh viên",
                                appeal.LecturerName ?? "Giảng viên",
                                appeal.SubjectName ?? "môn học",
                                dto.LecturerDecision,
                                dto.LecturerResponse
                            );
                        }
                        catch (Exception ex)
                        {
                        }
                    }
                }
                catch (Exception ex)
                {
                }

                // ✅ GỬI NOTIFICATION CHO ADVISORS CHO TẤT CẢ CÁC LECTURER DECISIONS
                // Lecturer chỉ đề xuất, advisor mới quyết định cuối cùng
                var advisorUserIds = await _userRepository.GetUserIdsByRoleNameAsync("Advisor");
                var decisionTextForAdvisor = dto.LecturerDecision switch
                {
                    "APPROVE" => "đề xuất chấp nhận",
                    "REJECT" => "đề xuất từ chối",
                    "NEED_REVIEW" => "yêu cầu xem xét thêm",
                    _ => dto.LecturerDecision
                };
                
                foreach (var advisorUserId in advisorUserIds)
                {
                    try
                    {
                        await _notificationService.CreateNotificationAsync(
                            advisorUserId,
                            "Giảng viên đã đề xuất quyết định phúc khảo",
                            $"Giảng viên {appeal.LecturerName} đã {decisionTextForAdvisor} phúc khảo của sinh viên {appeal.StudentName} cho môn {appeal.SubjectName}. Vui lòng xem xét và quyết định cuối cùng.{(string.IsNullOrEmpty(dto.LecturerResponse) ? "" : $" Phản hồi: {dto.LecturerResponse}")}",
                            "GradeAppeal",
                            dto.UpdatedBy
                        );
                    }
                    catch (Exception ex)
                    {
                    }
                }
            }
        }

        public async Task UpdateAdvisorDecisionAsync(string appealId, GradeAppealAdvisorDecisionDto dto)
        {
            if (string.IsNullOrWhiteSpace(appealId))
                throw new ArgumentException("Appeal ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.AdvisorId))
                throw new ArgumentException("Advisor ID không được để trống");

            if (string.IsNullOrWhiteSpace(dto.AdvisorDecision))
                throw new ArgumentException("Decision không được để trống");

            var validDecisions = new[] { "APPROVE", "REJECT" };
            if (!Array.Exists(validDecisions, d => d == dto.AdvisorDecision))
                throw new ArgumentException("Decision phải là APPROVE hoặc REJECT");

            // ✅ VALIDATION: Chỉ cho phép advisor quyết định khi status = REVIEWING hoặc PENDING
            var appeal = await _appealRepository.GetByIdAsync(appealId);
            if (appeal == null)
                throw new ArgumentException("Không tìm thấy yêu cầu phúc khảo");

            if (appeal.Status != "REVIEWING" && appeal.Status != "PENDING")
                throw new InvalidOperationException($"Không thể quyết định phúc khảo ở trạng thái '{appeal.Status}'. Chỉ có thể quyết định khi status là 'REVIEWING' hoặc 'PENDING'.");

            if (dto.AdvisorDecision == "APPROVE" && !dto.FinalScore.HasValue)
                throw new ArgumentException("Vui lòng nhập điểm sau phúc khảo khi duyệt");

            if (dto.AdvisorDecision == "APPROVE" && dto.FinalScore.HasValue)
            {
                if (dto.FinalScore < 0 || dto.FinalScore > 10)
                    throw new ArgumentException("Final score phải nằm trong khoảng 0 đến 10");
            }

            await _appealRepository.UpdateAdvisorDecisionAsync(
                appealId, dto.AdvisorId, dto.AdvisorResponse, dto.AdvisorDecision,
                dto.FinalScore, dto.ResolutionNotes, dto.UpdatedBy
            );

            // Get updated appeal details for notification
            appeal = await _appealRepository.GetByIdAsync(appealId);
            if (appeal != null)
            {
                // Send notification to student
                try
                {
                    var decisionText = dto.AdvisorDecision == "APPROVE" ? "đồng ý" : "từ chối";
                    var notificationTitle = dto.AdvisorDecision == "APPROVE" 
                        ? "Phúc khảo đã được duyệt" 
                        : "Phúc khảo đã bị từ chối";

                    var notificationContent = $"Cố vấn học tập {appeal.AdvisorName} đã {decisionText} yêu cầu phúc khảo của bạn cho môn {appeal.SubjectName}.";
                    if (dto.AdvisorDecision == "APPROVE" && dto.FinalScore.HasValue)
                    {
                        notificationContent += $" Điểm sau phúc khảo: {dto.FinalScore.Value:F2}.";
                    }
                    if (!string.IsNullOrEmpty(dto.AdvisorResponse))
                    {
                        notificationContent += $" Phản hồi: {dto.AdvisorResponse}";
                    }

                    // Send notification to student (using student user_id)
                    if (!string.IsNullOrEmpty(appeal.StudentUserId))
                    {
                        await _notificationService.CreateNotificationAsync(
                            appeal.StudentUserId,
                            notificationTitle,
                            notificationContent,
                            "GradeAppeal",
                            dto.UpdatedBy
                        );
                    }

                    // Send email to student
                    if (!string.IsNullOrEmpty(appeal.StudentEmail))
                    {
                        try
                        {
                            await _emailService.SendGradeAppealAdvisorDecisionEmailAsync(
                                appeal.StudentEmail,
                                appeal.StudentName ?? "Sinh viên",
                                appeal.AdvisorName ?? "Cố vấn học tập",
                                appeal.SubjectName ?? "môn học",
                                dto.AdvisorDecision,
                                dto.FinalScore,
                                dto.AdvisorResponse
                            );
                        }
                        catch (Exception ex)
                        {
                        }
                    }

                    // If APPROVED, send grade notification email
                    if (dto.AdvisorDecision == "APPROVE" && dto.FinalScore.HasValue && !string.IsNullOrEmpty(appeal.StudentEmail))
                    {
                        try
                        {
                            await _emailService.SendGradeNotificationAsync(
                                appeal.StudentEmail,
                                appeal.StudentName ?? "Sinh viên",
                                appeal.SubjectName ?? "môn học",
                                (double)dto.FinalScore.Value
                            );
                        }
                        catch (Exception ex)
                        {
                        }
                    }
                }
                catch (Exception ex)
                {
                }
            }
        }

        public async Task CancelAppealAsync(string appealId, string cancelledBy)
        {
            if (string.IsNullOrWhiteSpace(appealId))
                throw new ArgumentException("Appeal ID không được để trống");

            await _appealRepository.CancelAsync(appealId, cancelledBy);
        }
    }
}

