using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Background Service để gửi thông báo nhắc nhở lịch thi trước 1 ngày và 3 ngày
    /// Chạy định kỳ mỗi ngày một lần vào 8:00 AM
    /// </summary>
    public class ExamReminderNotificationService : BackgroundService
    {
        private readonly ILogger<ExamReminderNotificationService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;

        public ExamReminderNotificationService(
            ILogger<ExamReminderNotificationService> logger,
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Exam Reminder Notification Service đã khởi động.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Lấy thời gian chạy từ config (mặc định 8:00 AM)
                    var runTime = _configuration["ExamReminder:RunTime"] ?? "08:00";
                    string[] runTimeParts = runTime.Split(':');
                    var runHour = int.Parse(runTimeParts[0]);
                    var runMinute = runTimeParts.Length > 1 ? int.Parse(runTimeParts[1]) : 0;

                    // Tính thời gian chờ đến lần chạy tiếp theo
                    var now = DateTime.Now;
                    var nextRun = now.Date.AddHours(runHour).AddMinutes(runMinute);

                    // Nếu thời gian đã qua trong ngày hôm nay, chạy ngay
                    if (now >= nextRun)
                    {
                        await ProcessExamRemindersAsync(stoppingToken);
                        
                        // Chờ đến ngày mai cùng giờ
                        nextRun = nextRun.AddDays(1);
                    }

                    // Tính số giây cần chờ
                    var delay = (nextRun - now).TotalMilliseconds;
                    
                    if (delay > 0)
                    {
                        _logger.LogInformation($"Đợi đến {nextRun:dd/MM/yyyy HH:mm} để chạy lần tiếp theo ({(delay / 1000 / 60):F0} phút nữa).");
                        await Task.Delay(TimeSpan.FromMilliseconds(delay), stoppingToken);
                    }
                    else
                    {
                        // Nếu có lỗi tính toán, chờ 1 giờ rồi thử lại
                        await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Exam Reminder Notification Service đang dừng...");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi trong Exam Reminder Notification Service. Sẽ thử lại sau 1 giờ.");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
            }

            _logger.LogInformation("Exam Reminder Notification Service đã dừng.");
        }

        private async Task ProcessExamRemindersAsync(CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Bắt đầu xử lý thông báo nhắc nhở lịch thi...");

                using var scope = _serviceProvider.CreateScope();
                var examScheduleService = scope.ServiceProvider.GetRequiredService<ExamScheduleService>();

                // Lấy danh sách exams sắp tới (1 ngày và 3 ngày)
                var today = DateTime.Today;
                var tomorrow = today.AddDays(1);
                var dayAfter3Days = today.AddDays(3);

                // Exams trước 1 ngày
                var examsIn1Day = await examScheduleService.GetUpcomingExamsAsync(tomorrow, tomorrow);
                if (examsIn1Day != null && examsIn1Day.Count > 0)
                {
                    _logger.LogInformation($"Tìm thấy {examsIn1Day.Count} kỳ thi trong 1 ngày tới.");
                    await examScheduleService.SendExamReminderNotificationsAsync(examsIn1Day, 1);
                }

                // Exams trước 3 ngày
                var examsIn3Days = await examScheduleService.GetUpcomingExamsAsync(dayAfter3Days, dayAfter3Days);
                if (examsIn3Days != null && examsIn3Days.Count > 0)
                {
                    _logger.LogInformation($"Tìm thấy {examsIn3Days.Count} kỳ thi trong 3 ngày tới.");
                    await examScheduleService.SendExamReminderNotificationsAsync(examsIn3Days, 3);
                }

                _logger.LogInformation("Hoàn thành xử lý thông báo nhắc nhở lịch thi.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xử lý thông báo nhắc nhở lịch thi.");
            }
        }
    }
}

