using System.Collections.Generic;

namespace EducationManagement.Common.Helpers
{
    /// <summary>
    /// Helper class for formatting audit log messages in Vietnamese
    /// </summary>
    public static class AuditLogHelper
    {
        /// <summary>
        /// Map action codes to Vietnamese labels
        /// </summary>
        private static readonly Dictionary<string, string> ActionLabels = new Dictionary<string, string>
        {
            { "CREATE", "Tạo mới" },
            { "UPDATE", "Cập nhật" },
            { "DELETE", "Xóa" },
            { "LOGIN", "Đăng nhập" },
            { "LOGOUT", "Đăng xuất" },
            { "APPROVE", "Phê duyệt" },
            { "REJECT", "Từ chối" },
            { "EXPORT", "Xuất dữ liệu" },
            { "IMPORT", "Nhập dữ liệu" },
            { "FORGOT_PASSWORD_REQUEST", "Yêu cầu quên mật khẩu" },
            { "OTP_VERIFIED", "Xác thực OTP" },
            { "PASSWORD_RESET", "Đặt lại mật khẩu" },
            { "REGISTER", "Đăng ký" },
            { "ENROLL", "Ghi danh" },
            { "DROP", "Hủy đăng ký" },
            { "WITHDRAWN", "Rút khỏi lớp" },
            { "CANCEL", "Hủy" },
            { "ACTIVATE", "Kích hoạt" },
            { "DEACTIVATE", "Vô hiệu hóa" },
            { "LOCK", "Khóa" },
            { "UNLOCK", "Mở khóa" },
            { "RESET_PASSWORD", "Đặt lại mật khẩu" }
        };

        /// <summary>
        /// Map entity types to Vietnamese labels
        /// </summary>
        private static readonly Dictionary<string, string> EntityTypeLabels = new Dictionary<string, string>
        {
            { "User", "Người dùng" },
            { "Student", "Sinh viên" },
            { "Lecturer", "Giảng viên" },
            { "Faculty", "Khoa" },
            { "Department", "Bộ môn" },
            { "Major", "Ngành học" },
            { "Subject", "Môn học" },
            { "Grade", "Điểm" },
            { "Attendance", "Điểm danh" },
            { "Class", "Lớp học phần" },
            { "AcademicYear", "Niên khóa" },
            { "SchoolYear", "Năm học" },
            { "Enrollment", "Đăng ký học phần" },
            { "RegistrationPeriod", "Đợt đăng ký học phần" },
            { "Notification", "Thông báo" },
            { "Auth", "Xác thực" },
            { "Room", "Phòng học" },
            { "ExamSchedule", "Lịch thi" },
            { "ExamAssignment", "Phân công thi" },
            { "ExamScores", "Điểm thi" },
            { "RetakeRecord", "Hồ sơ học lại" },
            { "RetakeRegistration", "Đăng ký học lại" },
            { "GradeAppeal", "Phúc khảo" },
            { "Role", "Vai trò" },
            { "Permission", "Quyền" },
            { "AuditLog", "Nhật ký hệ thống" }
        };

        /// <summary>
        /// Get Vietnamese label for action code
        /// </summary>
        public static string GetActionLabel(string action)
        {
            if (string.IsNullOrWhiteSpace(action))
                return action ?? "Không xác định";

            return ActionLabels.TryGetValue(action.ToUpper(), out var label) 
                ? label 
                : action; // Return original if not found
        }

        /// <summary>
        /// Get Vietnamese label for entity type
        /// </summary>
        public static string GetEntityTypeLabel(string entityType)
        {
            if (string.IsNullOrWhiteSpace(entityType))
                return entityType ?? "Không xác định";

            return EntityTypeLabels.TryGetValue(entityType, out var label) 
                ? label 
                : entityType; // Return original if not found
        }

        /// <summary>
        /// Format action for audit log (Vietnamese)
        /// </summary>
        public static string FormatAction(string action)
        {
            return GetActionLabel(action);
        }

        /// <summary>
        /// Format entity type for audit log (Vietnamese)
        /// </summary>
        public static string FormatEntityType(string entityType)
        {
            return GetEntityTypeLabel(entityType);
        }

        /// <summary>
        /// Get all available actions for filtering
        /// </summary>
        public static Dictionary<string, string> GetAllActions()
        {
            return new Dictionary<string, string>(ActionLabels);
        }

        /// <summary>
        /// Get all available entity types for filtering
        /// </summary>
        public static Dictionary<string, string> GetAllEntityTypes()
        {
            return new Dictionary<string, string>(EntityTypeLabels);
        }
    }
}
