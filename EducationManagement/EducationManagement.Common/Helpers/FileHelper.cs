using System;
using System.IO;

namespace EducationManagement.Common.Helpers
{
    public static class FileHelper
    {
        /// <summary>
        /// 🔹 Chuẩn hóa đường dẫn avatar (kiểm tra tồn tại, fallback nếu cần)
        /// </summary>
        /// <param name="avatarUrl">Đường dẫn avatar trong DB (VD: /uploads/avatars/user-001.png)</param>
        /// <param name="avatarFolder">Thư mục gốc chứa Avatar_User</param>
        /// <returns>Đường dẫn tương đối chuẩn hóa (VD: /avatars/default.png)</returns>
        public static string NormalizeAvatarUrl(string? avatarUrl, string avatarFolder)
        {
            if (string.IsNullOrEmpty(avatarUrl))
                return "/avatars/default.png";

            // 🔹 Strip /avatars/ prefix nếu có (vì Gateway sẽ thêm lại)
            string relativePath = avatarUrl.TrimStart('/');
            if (relativePath.StartsWith("avatars/", StringComparison.OrdinalIgnoreCase))
            {
                relativePath = relativePath.Substring("avatars/".Length);
            }

            // 🔹 Chuẩn hóa đường dẫn tương thích OS
            relativePath = relativePath.Replace('/', Path.DirectorySeparatorChar);
            string physicalPath = Path.Combine(avatarFolder, relativePath);

            // DEBUG logs đã tắt để tránh spam console
            // Console.WriteLine($"🔍 [NormalizeAvatarUrl] DB: {avatarUrl}");

            // 🔹 Nếu file không tồn tại → trả về ảnh mặc định
            if (File.Exists(physicalPath))
            {
                // Return với /avatars/ prefix
                string normalized = "/" + relativePath.Replace(Path.DirectorySeparatorChar, '/');
                if (!normalized.StartsWith("/avatars/", StringComparison.OrdinalIgnoreCase))
                {
                    normalized = "/avatars" + normalized;
                }
                // Console.WriteLine($"   ✅ Normalized: {normalized}");
                return normalized;
            }
            
            // Console.WriteLine($"   ⚠️ File not found, using default");
            return "/avatars/default.png";
        }

        /// <summary>
        /// 🔹 Tạo URL đầy đủ cho avatar (qua Gateway) - với gateway URL
        /// </summary>
        public static string BuildFullAvatarUrl(string gatewayUrl, string? relativePath)
        {
            // ✅ Nếu user chưa có ảnh → fallback mặc định
            if (string.IsNullOrWhiteSpace(relativePath))
                relativePath = "/avatars/default.png";

            // ✅ Đảm bảo relativePath bắt đầu với /
            if (!relativePath.StartsWith("/"))
                relativePath = "/" + relativePath;

            // ✅ Đảm bảo gatewayUrl không kết thúc với /
            gatewayUrl = gatewayUrl.TrimEnd('/');

            return $"{gatewayUrl}{relativePath}";
        }

        /// <summary>
        /// 🔹 Tạo URL đầy đủ cho avatar (qua Gateway) - Legacy với scheme và host
        /// </summary>
        public static string BuildFullAvatarUrl(string scheme, string host, string? relativePath)
        {
            // ✅ Nếu user chưa có ảnh → fallback mặc định
            if (string.IsNullOrWhiteSpace(relativePath))
                relativePath = "/avatars/default.png";

            // ✅ Nếu chỉ là tên file (VD: "user-001.jpg") → thêm prefix /avatars/
            if (!relativePath.StartsWith("/avatars/", StringComparison.OrdinalIgnoreCase))
            {
                relativePath = relativePath.TrimStart('/');
                relativePath = "/avatars/" + relativePath;
            }

            // ✅ Đảm bảo có dấu "/" đầu
            if (!relativePath.StartsWith("/"))
                relativePath = "/" + relativePath;

            // ✅ Luôn dùng Gateway cố định (đồng bộ FE)
            const string gatewayHost = "localhost:7033";

            return $"{scheme}://{gatewayHost}{relativePath}";
        }

        /// <summary>
        /// 🔹 Trả về đường dẫn vật lý tuyệt đối đến ảnh (dùng khi lưu hoặc xóa file)
        /// </summary>
        public static string BuildPhysicalPath(string fileName)
        {
            // ✅ Khớp với cấu trúc dự án
            var baseFolder = @"C:\Users\TK\Desktop\student-attendance-system\EducationManagement\Avatar_User";

            // ✅ Tạo thư mục nếu chưa tồn tại
            if (!Directory.Exists(baseFolder))
                Directory.CreateDirectory(baseFolder);

            return Path.Combine(baseFolder, fileName);
        }
    }
}
