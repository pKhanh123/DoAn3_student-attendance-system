using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Service gửi email thông báo
    /// </summary>
    public class EmailService
    {
        private readonly IConfiguration _configuration;
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _fromEmail;
        private readonly string _fromName;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
            _smtpServer = configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
            _smtpPort = int.Parse(configuration["Email:SmtpPort"] ?? "587");
            _smtpUsername = (configuration["Email:Username"] ?? "").Trim();
            _smtpPassword = (configuration["Email:Password"] ?? "").Trim();
            _fromEmail = (configuration["Email:FromEmail"] ?? "noreply@edu.com").Trim();
            _fromName = configuration["Email:FromName"] ?? "Hệ thống Quản lý Giáo dục";
            
            // Validate email configuration
            if (string.IsNullOrWhiteSpace(_smtpUsername) || string.IsNullOrWhiteSpace(_smtpPassword))
            {
                throw new InvalidOperationException("Email configuration is missing. Please check appsettings.json or appsettings.Development.json");
            }
            
            // Validate App Password length (Gmail App Passwords are 16 characters)
            var cleanPassword = _smtpPassword.Replace(" ", "");
        }

        /// <summary>
        /// Gửi email đơn giản
        /// </summary>
        public async Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true)
        {
            try
            {
                using var message = new MailMessage();
                message.From = new MailAddress(_fromEmail, _fromName);
                message.To.Add(new MailAddress(toEmail));
                message.Subject = subject;
                message.Body = body;
                message.IsBodyHtml = isHtml;

                using var client = new SmtpClient(_smtpServer, _smtpPort);
                
                // Remove spaces from App Password if present (Gmail App Passwords may have spaces)
                var cleanPassword = _smtpPassword.Replace(" ", "");
                
                // Configure SSL/TLS based on port
                if (_smtpPort == 465)
                {
                    // Port 465 requires SSL
                    client.EnableSsl = true;
                }
                else if (_smtpPort == 587)
                {
                    // Port 587 uses STARTTLS
                    client.EnableSsl = true;
                }
                else
                {
                    client.EnableSsl = true; // Default to SSL
                }
                
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(_smtpUsername, cleanPassword);
                
                // Set timeout
                client.Timeout = 30000; // 30 seconds

                await client.SendMailAsync(message);
            }
            catch (Exception ex)
            {
                // Log error silently
                throw;
            }
        }

        /// <summary>
        /// Gửi email cho nhiều người nhận
        /// </summary>
        public async Task SendBulkEmailAsync(List<string> toEmails, string subject, string body, bool isHtml = true)
        {
            var tasks = toEmails.Select(email => SendEmailAsync(email, subject, body, isHtml));
            await Task.WhenAll(tasks);
        }

        /// <summary>
        /// Template email chuyên nghiệp với header và footer
        /// </summary>
        private string GetEmailTemplate(string title, string greeting, string content, string icon = "📧", string iconColor = "#3b82f6")
        {
            var currentYear = DateTime.Now.Year;
            return $@"
<!DOCTYPE html>
<html lang='vi'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <meta http-equiv='X-UA-Compatible' content='IE=edge'>
    <title>{title}</title>
</head>
<body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f1f5f9; line-height: 1.6;'>
    <table role='presentation' style='width: 100%; border-collapse: collapse; background-color: #f1f5f9; padding: 20px 0;'>
        <tr>
            <td align='center' style='padding: 20px 0;'>
                <table role='presentation' style='width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);'>
                    <!-- Header -->
                    <tr>
                        <td style='background: linear-gradient(135deg, {iconColor} 0%, #2563eb 100%); padding: 32px 40px; text-align: center;'>
                            <div style='font-size: 48px; margin-bottom: 12px;'>{icon}</div>
                            <h1 style='margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;'>{title}</h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style='padding: 40px; background-color: #ffffff;'>
                            <p style='margin: 0 0 24px 0; font-size: 16px; color: #334155; line-height: 1.6;'>
                                {greeting}
                            </p>
                            
                            {content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style='background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;'>
                            <table role='presentation' style='width: 100%; border-collapse: collapse;'>
                                <tr>
                                    <td style='text-align: center; padding-bottom: 20px;'>
                                        <p style='margin: 0; font-size: 16px; color: #1e293b; font-weight: 600; margin-bottom: 8px;'>
                                            Hệ thống Quản lý Giáo dục
                                        </p>
                                        <p style='margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;'>
                                            Email này được gửi tự động từ hệ thống.<br>
                                            Vui lòng không trả lời email này.
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style='text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;'>
                                        <p style='margin: 0; font-size: 12px; color: #94a3b8;'>
                                            © {currentYear} Hệ thống Quản lý Giáo dục. Tất cả quyền được bảo lưu.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }

        /// <summary>
        /// Gửi email cảnh báo vắng học
        /// </summary>
        public async Task SendAttendanceWarningAsync(string studentEmail, string studentName, string className, double absentRate)
        {
            var subject = "⚠️ Cảnh báo vắng học";
            var isCritical = absentRate >= 20;
            var body = GetEmailTemplate(
                title: "Cảnh báo vắng học",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Chúng tôi nhận thấy tỷ lệ vắng mặt của bạn đã vượt quá ngưỡng cho phép. Thông tin chi tiết như sau:
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444; border-radius: 12px; padding: 24px; margin: 24px 0;'>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Lớp học:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{className}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Tỷ lệ vắng mặt:</span>
                            <strong style='font-size: 20px; color: #dc2626;'>{absentRate:F1}%</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Ngưỡng cho phép:</span>
                            <span style='font-size: 14px; color: #64748b;'>20%</span>
                        </div>
                    </div>
                    
                    {(isCritical ? $@"
                    <div style='background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>🚨 Cảnh báo nghiêm trọng:</strong>
                            Theo quy định của nhà trường, sinh viên vắng mặt quá <strong>20%</strong> số buổi học sẽ <strong>không được dự thi</strong> môn học này.
                        </p>
                    </div>
                    " : $@"
                    <div style='background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>⚠️ Lưu ý:</strong>
                            Nếu tỷ lệ vắng mặt tiếp tục tăng và vượt quá 20%, bạn sẽ không được dự thi môn học này.
                        </p>
                    </div>
                    ")}
                    
                    <div style='background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            💡 Hành động cần thực hiện:
                        </p>
                        <ul style='margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;'>
                            <li>Liên hệ ngay với <strong>giảng viên phụ trách</strong> để giải thích lý do vắng mặt</li>
                            <li>Nộp đơn xin phép vắng mặt (nếu có) cho <strong>Phòng Đào tạo</strong></li>
                            <li>Tham gia đầy đủ các buổi học còn lại để đảm bảo tỷ lệ vắng mặt không vượt quá 20%</li>
                        </ul>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với Phòng Đào tạo để được hỗ trợ.
                    </p>
                ",
                icon: "⚠️",
                iconColor: "#ef4444"
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email thông báo điểm
        /// </summary>
        public async Task SendGradeNotificationAsync(string studentEmail, string studentName, string className, double finalGrade)
        {
            var subject = "📊 Thông báo điểm môn học";
            var status = finalGrade >= 4.0 ? "Đạt" : "Không đạt";
            var statusColor = finalGrade >= 4.0 ? "#10b981" : "#ef4444";
            var statusBg = finalGrade >= 4.0 ? "#d1fae5" : "#fee2e2";
            var gradeLevel = finalGrade >= 9.0 ? "Xuất sắc" : finalGrade >= 8.0 ? "Giỏi" : finalGrade >= 6.5 ? "Khá" : finalGrade >= 5.0 ? "Trung bình" : finalGrade >= 4.0 ? "Trung bình yếu" : "Kém";
            
            var body = GetEmailTemplate(
                title: "Thông báo điểm môn học",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Điểm môn học của bạn đã được cập nhật trên hệ thống. Thông tin chi tiết như sau:
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #3b82f6; border-radius: 16px; padding: 28px; margin: 24px 0; text-align: center;'>
                        <p style='font-size: 14px; color: #64748b; margin: 0 0 12px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>
                            {className}
                        </p>
                        <div style='font-size: 56px; font-weight: 700; color: {statusColor}; margin: 16px 0; line-height: 1;'>
                            {finalGrade:F2}
                        </div>
                        <div style='display: inline-block; background: {statusBg}; color: {statusColor}; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-top: 12px;'>
                            {status} ({gradeLevel})
                        </div>
                    </div>
                    
                    <div style='background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            📋 Thông tin chi tiết:
                        </p>
                        <table style='width: 100%; border-collapse: collapse;'>
                            <tr>
                                <td style='padding: 8px 0; color: #64748b; font-size: 14px;'>Môn học:</td>
                                <td style='padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;'>{className}</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px 0; color: #64748b; font-size: 14px;'>Điểm số:</td>
                                <td style='padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;'>{finalGrade:F2} / 10.0</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px 0; color: #64748b; font-size: 14px;'>Kết quả:</td>
                                <td style='padding: 8px 0; color: {statusColor}; font-size: 14px; font-weight: 600; text-align: right;'>{status}</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px 0; color: #64748b; font-size: 14px;'>Xếp loại:</td>
                                <td style='padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;'>{gradeLevel}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Bạn có thể đăng nhập vào hệ thống để xem chi tiết điểm thành phần và nhận xét từ giảng viên.
                    </p>
                ",
                icon: "📊",
                iconColor: "#3b82f6"
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email reset mật khẩu (dùng token - cũ)
        /// </summary>
        public async Task SendPasswordResetAsync(string email, string resetToken, string resetUrl)
        {
            var subject = "🔐 Yêu cầu đặt lại mật khẩu";
            var body = $@"
                <html>
                <body style='font-family: Arial, sans-serif;'>
                    <h2 style='color: #2196F3;'>Đặt lại mật khẩu</h2>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
                    <p>Nhấp vào liên kết bên dưới để đặt lại mật khẩu (có hiệu lực trong 30 phút):</p>
                    <p>
                        <a href='{resetUrl}?token={resetToken}' 
                           style='background-color: #2196F3; color: white; padding: 10px 20px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;'>
                            Đặt lại mật khẩu
                        </a>
                    </p>
                    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                    <br/>
                    <p>Trân trọng,</p>
                    <p><strong>Hệ thống Quản lý Giáo dục</strong></p>
                </body>
                </html>
            ";

            await SendEmailAsync(email, subject, body, true);
        }

        /// <summary>
        /// Gửi email OTP cho forgot password
        /// </summary>
        public async Task SendOTPEmailAsync(string email, string otp, string fullName)
        {
            var subject = "🔐 Mã xác thực đặt lại mật khẩu";
            var body = GetEmailTemplate(
                title: "Mã xác thực OTP",
                greeting: $"Kính gửi <strong>{fullName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình. Vui lòng sử dụng mã OTP sau để xác thực:
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #3b82f6; border-radius: 16px; padding: 32px; text-align: center; margin: 32px 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);'>
                        <p style='font-size: 14px; color: #64748b; margin: 0 0 12px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>
                            Mã xác thực của bạn
                        </p>
                        <div style='font-size: 48px; font-weight: 700; color: #1e40af; letter-spacing: 12px; font-family: ''Courier New'', monospace; line-height: 1.2;'>
                            {otp}
                        </div>
                    </div>
                    
                    <div style='background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>⚠️ Lưu ý quan trọng:</strong>
                            Mã OTP có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên hỗ trợ.
                        </p>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ ngay lập tức.
                    </p>
                ",
                icon: "🔐",
                iconColor: "#3b82f6"
            );

            await SendEmailAsync(email, subject, body, true);
        }

        /// <summary>
        /// Gửi email cảnh báo học tập (GPA thấp)
        /// </summary>
        public async Task SendAcademicWarningAsync(string studentEmail, string studentName, string className, decimal gpa, string? customSubject = null, string? customMessage = null)
        {
            if (!string.IsNullOrEmpty(customMessage))
            {
                await SendEmailAsync(studentEmail, customSubject ?? "⚠️ Cảnh báo học tập", customMessage, true);
                return;
            }

            var subject = customSubject ?? "⚠️ Cảnh báo học tập - GPA thấp";
            var isCritical = gpa < 1.5m;
            var body = GetEmailTemplate(
                title: "Cảnh báo học tập",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Chúng tôi nhận thấy GPA tích lũy của bạn hiện tại đang thấp hơn ngưỡng quy định. Thông tin chi tiết như sau:
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444; border-radius: 12px; padding: 24px; margin: 24px 0;'>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Lớp học:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{className}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>GPA tích lũy:</span>
                            <strong style='font-size: 20px; color: #dc2626;'>{gpa:F2}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Ngưỡng quy định:</span>
                            <span style='font-size: 14px; color: #64748b;'>2.0</span>
                        </div>
                    </div>
                    
                    {(isCritical ? $@"
                    <div style='background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>🚨 Cảnh báo nghiêm trọng:</strong>
                            GPA của bạn đang ở mức rất thấp. Nếu không cải thiện, bạn có thể bị cảnh báo học vụ hoặc buộc thôi học.
                        </p>
                    </div>
                    " : $@"
                    <div style='background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>⚠️ Lưu ý:</strong>
                            Nếu GPA tiếp tục giảm và không đạt ngưỡng quy định, bạn sẽ gặp khó khăn trong việc tốt nghiệp.
                        </p>
                    </div>
                    ")}
                    
                    <div style='background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            💡 Hành động cần thực hiện:
                        </p>
                        <ul style='margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;'>
                            <li>Liên hệ ngay với <strong>Cố vấn học tập</strong> để được tư vấn và hỗ trợ</li>
                            <li>Tham gia các lớp học bổ trợ hoặc phụ đạo nếu có</li>
                            <li>Chủ động học tập và cải thiện điểm số trong các môn học tiếp theo</li>
                            <li>Liên hệ với <strong>Phòng Đào tạo</strong> để được hỗ trợ về chính sách học tập</li>
                        </ul>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Chúng tôi luôn sẵn sàng hỗ trợ bạn trong quá trình học tập. Đừng ngần ngại liên hệ với chúng tôi nếu bạn cần bất kỳ sự giúp đỡ nào.
                    </p>
                ",
                icon: "📚",
                iconColor: "#ef4444"
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email cảnh báo chuyên cần (tỷ lệ vắng cao)
        /// </summary>
        public async Task SendAttendanceWarningEmailAsync(string studentEmail, string studentName, string className, decimal absenceRate, string? customSubject = null, string? customMessage = null)
        {
            if (!string.IsNullOrEmpty(customMessage))
            {
                await SendEmailAsync(studentEmail, customSubject ?? "⚠️ Cảnh báo chuyên cần", customMessage, true);
                return;
            }

            var subject = customSubject ?? "⚠️ Cảnh báo chuyên cần - Tỷ lệ vắng cao";
            var isCritical = absenceRate >= 20;
            var body = GetEmailTemplate(
                title: "Cảnh báo chuyên cần",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Chúng tôi nhận thấy tỷ lệ vắng mặt của bạn đã vượt quá ngưỡng cho phép. Thông tin chi tiết như sau:
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444; border-radius: 12px; padding: 24px; margin: 24px 0;'>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Lớp học:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{className}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Tỷ lệ vắng mặt:</span>
                            <strong style='font-size: 20px; color: #dc2626;'>{absenceRate:F1}%</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Ngưỡng cho phép:</span>
                            <span style='font-size: 14px; color: #64748b;'>20%</span>
                        </div>
                    </div>
                    
                    {(isCritical ? $@"
                    <div style='background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>🚨 Cảnh báo nghiêm trọng:</strong>
                            Theo quy định của nhà trường, sinh viên vắng mặt quá <strong>20%</strong> số buổi học sẽ <strong>không được dự thi</strong> môn học này.
                        </p>
                    </div>
                    " : $@"
                    <div style='background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>⚠️ Lưu ý:</strong>
                            Nếu tỷ lệ vắng mặt tiếp tục tăng và vượt quá 20%, bạn sẽ không được dự thi môn học này.
                        </p>
                    </div>
                    ")}
                    
                    <div style='background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            💡 Hành động cần thực hiện:
                        </p>
                        <ul style='margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;'>
                            <li>Liên hệ ngay với <strong>giảng viên phụ trách</strong> để giải thích lý do vắng mặt</li>
                            <li>Nộp đơn xin phép vắng mặt (nếu có) cho <strong>Phòng Đào tạo</strong></li>
                            <li>Tham gia đầy đủ các buổi học còn lại để đảm bảo tỷ lệ vắng mặt không vượt quá 20%</li>
                        </ul>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với Phòng Đào tạo để được hỗ trợ.
                    </p>
                ",
                icon: "⚠️",
                iconColor: "#ef4444"
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email cảnh báo cả hai (GPA thấp + vắng cao)
        /// </summary>
        public async Task SendBothWarningEmailAsync(string studentEmail, string studentName, string className, decimal gpa, decimal absenceRate, string? customSubject = null, string? customMessage = null)
        {
            if (!string.IsNullOrEmpty(customMessage))
            {
                await SendEmailAsync(studentEmail, customSubject ?? "⚠️ Cảnh báo nghiêm trọng", customMessage, true);
                return;
            }

            var subject = customSubject ?? "🚨 Cảnh báo nghiêm trọng: GPA thấp và Tỷ lệ vắng cao";
            var body = GetEmailTemplate(
                title: "Cảnh báo nghiêm trọng",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Chúng tôi nhận thấy bạn đang gặp vấn đề nghiêm trọng về cả <strong>học tập</strong> và <strong>chuyên cần</strong>. Đây là tình trạng cần được quan tâm ngay lập tức.
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #dc2626; border-radius: 12px; padding: 24px; margin: 24px 0;'>
                        <p style='margin: 0 0 16px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            📊 Thông tin chi tiết:
                        </p>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Lớp học:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{className}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>GPA tích lũy:</span>
                            <strong style='font-size: 20px; color: #dc2626;'>{gpa:F2} / 4.0</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Tỷ lệ vắng mặt:</span>
                            <strong style='font-size: 20px; color: #dc2626;'>{absenceRate:F1}%</strong>
                        </div>
                    </div>
                    
                    <div style='background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>🚨 Cảnh báo nghiêm trọng:</strong>
                            Tình trạng hiện tại của bạn có thể dẫn đến các hậu quả nghiêm trọng như <strong>không được dự thi</strong>, <strong>cảnh báo học vụ</strong>, hoặc thậm chí <strong>buộc thôi học</strong> nếu không được cải thiện kịp thời.
                        </p>
                    </div>
                    
                    <div style='background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #92400e; font-weight: 600;'>
                            ⚠️ Hậu quả có thể xảy ra:
                        </p>
                        <ul style='margin: 0; padding-left: 20px; color: #92400e; line-height: 1.8; font-size: 14px;'>
                            <li>Không được dự thi các môn học do vắng mặt quá 20%</li>
                            <li>GPA thấp có thể ảnh hưởng đến việc tốt nghiệp</li>
                            <li>Có thể bị cảnh báo học vụ hoặc buộc thôi học</li>
                        </ul>
                    </div>
                    
                    <div style='background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            💡 Hành động khẩn cấp cần thực hiện:
                        </p>
                        <ul style='margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;'>
                            <li><strong>Liên hệ ngay</strong> với <strong>Cố vấn học tập</strong> để được tư vấn và lập kế hoạch cải thiện</li>
                            <li><strong>Gặp trực tiếp</strong> giảng viên phụ trách để giải thích tình hình và xin hỗ trợ</li>
                            <li><strong>Nộp đơn xin phép</strong> vắng mặt (nếu có lý do chính đáng) cho Phòng Đào tạo</li>
                            <li><strong>Tham gia đầy đủ</strong> các buổi học còn lại và tích cực học tập</li>
                            <li><strong>Liên hệ Phòng Đào tạo</strong> để được hỗ trợ về các chính sách và quy định</li>
                        </ul>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        <strong>Chúng tôi rất quan tâm đến tình hình học tập của bạn và sẵn sàng hỗ trợ bạn vượt qua khó khăn này.</strong> Vui lòng liên hệ với chúng tôi ngay để được hỗ trợ kịp thời.
                    </p>
                ",
                icon: "🚨",
                iconColor: "#dc2626"
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email thông báo có phúc khảo mới (cho Advisor)
        /// </summary>
        public async Task SendGradeAppealCreatedEmailAsync(string advisorEmail, string advisorName, string studentName, string subjectName, string appealId, string appealReason)
        {
            var subject = "📋 Yêu cầu phúc khảo mới cần xử lý";
            var body = GetEmailTemplate(
                title: "Yêu cầu phúc khảo mới",
                greeting: $"Kính gửi <strong>{advisorName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Bạn có một yêu cầu phúc khảo điểm mới cần được xem xét và xử lý. Thông tin chi tiết như sau:
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 24px 0;'>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(59, 130, 246, 0.2);'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Mã yêu cầu:</span>
                            <strong style='font-size: 16px; color: #1e40af; font-family: monospace;'>{appealId}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(59, 130, 246, 0.2);'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Sinh viên:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{studentName}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Môn học:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{subjectName}</strong>
                        </div>
                    </div>
                    
                    <div style='background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #3b82f6;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            📝 Lý do phúc khảo:
                        </p>
                        <p style='margin: 0; font-size: 14px; color: #334155; line-height: 1.8; padding: 12px; background: white; border-radius: 8px;'>
                            {appealReason}
                        </p>
                    </div>
                    
                    <div style='background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            ⚡ Hành động cần thực hiện:
                        </p>
                        <ul style='margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;'>
                            <li>Đăng nhập vào hệ thống để xem chi tiết yêu cầu phúc khảo</li>
                            <li>Xem xét lý do phúc khảo và điểm số hiện tại của sinh viên</li>
                            <li>Liên hệ với giảng viên phụ trách môn học để trao đổi</li>
                            <li>Đưa ra quyết định phù hợp và cập nhật trên hệ thống</li>
                        </ul>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Vui lòng xử lý yêu cầu này trong thời gian sớm nhất để đảm bảo quyền lợi của sinh viên.
                    </p>
                ",
                icon: "📋",
                iconColor: "#3b82f6"
            );

            await SendEmailAsync(advisorEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email thông báo phản hồi từ giảng viên (cho Student)
        /// </summary>
        public async Task SendGradeAppealLecturerResponseEmailAsync(string studentEmail, string studentName, string lecturerName, string subjectName, string decision, string? response)
        {
            var decisionText = decision switch
            {
                "APPROVE" => "Đồng ý",
                "REJECT" => "Từ chối",
                "NEED_REVIEW" => "Yêu cầu xem xét thêm",
                _ => decision
            };

            var decisionColor = decision switch
            {
                "APPROVE" => "#10b981",
                "REJECT" => "#ef4444",
                "NEED_REVIEW" => "#f59e0b",
                _ => "#3b82f6"
            };

            var decisionBg = decision switch
            {
                "APPROVE" => "#d1fae5",
                "REJECT" => "#fee2e2",
                "NEED_REVIEW" => "#fef3c7",
                _ => "#eff6ff"
            };

            var subject = decision switch
            {
                "APPROVE" => "✅ Phúc khảo được giảng viên đồng ý",
                "REJECT" => "❌ Phúc khảo bị giảng viên từ chối",
                "NEED_REVIEW" => "⏳ Phúc khảo cần xem xét thêm",
                _ => "📨 Phản hồi từ giảng viên về phúc khảo"
            };

            var body = GetEmailTemplate(
                title: "Phản hồi từ giảng viên",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Giảng viên <strong>{lecturerName}</strong> đã phản hồi yêu cầu phúc khảo của bạn cho môn học <strong>{subjectName}</strong>.
                    </p>
                    
                    <div style='background: linear-gradient(135deg, {decisionBg} 0%, {decisionBg} 100%); border: 2px solid {decisionColor}; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;'>
                        <p style='font-size: 14px; color: #64748b; margin: 0 0 12px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>
                            Quyết định
                        </p>
                        <div style='display: inline-block; background: {decisionColor}; color: white; padding: 12px 32px; border-radius: 24px; font-weight: 700; font-size: 18px; margin-top: 8px;'>
                            {decisionText}
                        </div>
                    </div>
                    
                    {(string.IsNullOrEmpty(response) ? "" : $@"
                    <div style='background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid {decisionColor};'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            💬 Phản hồi từ giảng viên:
                        </p>
                        <p style='margin: 0; font-size: 14px; color: #334155; line-height: 1.8; padding: 12px; background: white; border-radius: 8px;'>
                            {response}
                        </p>
                    </div>
                    ")}
                    
                    {(decision == "NEED_REVIEW" ? $@"
                    <div style='background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>ℹ️ Thông tin:</strong>
                            Yêu cầu phúc khảo của bạn đã được chuyển đến <strong>Cố vấn học tập</strong> để xem xét và quyết định cuối cùng. Bạn sẽ nhận được thông báo khi có kết quả.
                        </p>
                    </div>
                    " : "")}
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Bạn có thể đăng nhập vào hệ thống để xem chi tiết và theo dõi trạng thái yêu cầu phúc khảo.
                    </p>
                ",
                icon: decision switch { "APPROVE" => "✅", "REJECT" => "❌", "NEED_REVIEW" => "⏳", _ => "📨" },
                iconColor: decisionColor
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email thông báo quyết định từ cố vấn (cho Student)
        /// </summary>
        public async Task SendGradeAppealAdvisorDecisionEmailAsync(string studentEmail, string studentName, string advisorName, string subjectName, string decision, decimal? finalScore, string? response)
        {
            var decisionText = decision == "APPROVE" ? "Đồng ý" : "Từ chối";
            var decisionColor = decision == "APPROVE" ? "#10b981" : "#ef4444";
            var decisionBg = decision == "APPROVE" ? "#d1fae5" : "#fee2e2";

            var subject = decision == "APPROVE" ? "✅ Phúc khảo đã được duyệt" : "❌ Phúc khảo đã bị từ chối";
            var body = GetEmailTemplate(
                title: decision == "APPROVE" ? "Phúc khảo đã được duyệt" : "Phúc khảo đã bị từ chối",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Cố vấn học tập <strong>{advisorName}</strong> đã đưa ra quyết định cuối cùng về yêu cầu phúc khảo của bạn cho môn học <strong>{subjectName}</strong>.
                    </p>
                    
                    <div style='background: linear-gradient(135deg, {decisionBg} 0%, {decisionBg} 100%); border: 2px solid {decisionColor}; border-radius: 12px; padding: 28px; margin: 24px 0; text-align: center;'>
                        <p style='font-size: 14px; color: #64748b; margin: 0 0 12px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>
                            Quyết định cuối cùng
                        </p>
                        <div style='display: inline-block; background: {decisionColor}; color: white; padding: 14px 36px; border-radius: 24px; font-weight: 700; font-size: 20px; margin: 12px 0;'>
                            {decisionText}
                        </div>
                        {(finalScore.HasValue ? $@"
                        <div style='margin-top: 20px; padding-top: 20px; border-top: 2px solid {decisionColor};'>
                            <p style='font-size: 14px; color: #64748b; margin: 0 0 8px 0; font-weight: 500;'>
                                Điểm sau phúc khảo
                            </p>
                            <div style='font-size: 48px; font-weight: 700; color: {decisionColor}; line-height: 1;'>
                                {finalScore.Value:F2}
                            </div>
                        </div>
                        " : "")}
                    </div>
                    
                    {(string.IsNullOrEmpty(response) ? "" : $@"
                    <div style='background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid {decisionColor};'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            💬 Phản hồi từ cố vấn học tập:
                        </p>
                        <p style='margin: 0; font-size: 14px; color: #334155; line-height: 1.8; padding: 12px; background: white; border-radius: 8px;'>
                            {response}
                        </p>
                    </div>
                    ")}
                    
                    {(decision == "APPROVE" ? $@"
                    <div style='background: #d1fae5; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #065f46; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>🎉 Chúc mừng:</strong>
                            Yêu cầu phúc khảo của bạn đã được duyệt. Điểm số đã được cập nhật trên hệ thống.
                        </p>
                    </div>
                    " : $@"
                    <div style='background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>ℹ️ Thông tin:</strong>
                            Yêu cầu phúc khảo của bạn đã bị từ chối. Nếu bạn có thắc mắc, vui lòng liên hệ với Cố vấn học tập hoặc Phòng Đào tạo.
                        </p>
                    </div>
                    ")}
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Bạn có thể đăng nhập vào hệ thống để xem chi tiết và kiểm tra điểm số đã được cập nhật.
                    </p>
                ",
                icon: decision == "APPROVE" ? "✅" : "❌",
                iconColor: decisionColor
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }

        /// <summary>
        /// Gửi email thông báo đăng ký học phần đã được duyệt
        /// </summary>
        public async Task SendEnrollmentApprovedEmailAsync(string studentEmail, string studentName, string className, string subjectName, DateTime enrollmentDate)
        {
            var subject = "✅ Đăng ký học phần đã được duyệt";
            var body = GetEmailTemplate(
                title: "Đăng ký học phần thành công",
                greeting: $"Kính gửi <strong>{studentName}</strong>,",
                content: $@"
                    <p style='font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6;'>
                        Chúc mừng! Đăng ký học phần của bạn đã được duyệt thành công. Thông tin chi tiết như sau:
                    </p>
                    
                    <div style='background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0;'>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(16, 185, 129, 0.2);'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Môn học:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{subjectName}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(16, 185, 129, 0.2);'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Lớp học:</span>
                            <strong style='font-size: 16px; color: #1e293b;'>{className}</strong>
                        </div>
                        <div style='display: flex; align-items: center; justify-content: space-between;'>
                            <span style='font-size: 14px; color: #64748b; font-weight: 500;'>Ngày đăng ký:</span>
                            <strong style='font-size: 14px; color: #1e293b;'>{enrollmentDate:dd/MM/yyyy HH:mm}</strong>
                        </div>
                    </div>
                    
                    <div style='background: #d1fae5; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #065f46; line-height: 1.6;'>
                            <strong style='display: block; margin-bottom: 4px;'>🎉 Thông tin quan trọng:</strong>
                            Bạn đã được xác nhận tham gia lớp học này. Vui lòng tham gia đầy đủ các buổi học và tuân thủ quy định của lớp.
                        </p>
                    </div>
                    
                    <div style='background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0;'>
                        <p style='margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;'>
                            📅 Bước tiếp theo:
                        </p>
                        <ul style='margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;'>
                            <li>Đăng nhập vào hệ thống để xem <strong>lịch học</strong> và <strong>thông tin lớp học</strong></li>
                            <li>Kiểm tra <strong>thời khóa biểu</strong> và <strong>địa điểm học</strong></li>
                            <li>Tham gia đầy đủ các buổi học và hoàn thành các yêu cầu của môn học</li>
                        </ul>
                    </div>
                    
                    <p style='font-size: 14px; color: #64748b; margin-top: 24px; line-height: 1.6;'>
                        Chúc bạn học tập tốt! Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với Phòng Đào tạo.
                    </p>
                ",
                icon: "✅",
                iconColor: "#10b981"
            );

            await SendEmailAsync(studentEmail, subject, body, true);
        }
    }
}

