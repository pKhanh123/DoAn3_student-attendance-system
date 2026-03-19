namespace EducationManagement.API.Admin.Helpers
{
    public static class HttpRequestExtensions
    {
        // Hàm chuyển đường dẫn tương đối ("/uploads/...") thành tuyệt đối ("https://host/uploads/...")
        public static string? ToAbsoluteUrl(this HttpRequest request, string? relativeOrAbsolute)
        {
            if (string.IsNullOrWhiteSpace(relativeOrAbsolute))
                return null;

            // Nếu đã là URL tuyệt đối thì trả lại luôn
            if (relativeOrAbsolute.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                return relativeOrAbsolute;

            var pathBase = request.PathBase.HasValue ? request.PathBase.Value : string.Empty;
            return $"{request.Scheme}://{request.Host}{pathBase}{relativeOrAbsolute}";
        }
    }
}
