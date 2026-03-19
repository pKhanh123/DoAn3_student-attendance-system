using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EducationManagement.API.Admin.Middleware
{
    public class AuditMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuditMiddleware> _logger;

        public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task Invoke(HttpContext context)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Anonymous";
            var username = context.User.FindFirstValue(ClaimTypes.Name) ?? "Guest";
            var role = context.User.FindFirstValue(ClaimTypes.Role) ?? "None";

            var path = context.Request.Path;
            var method = context.Request.Method;

            // Ghi log audit
            _logger.LogInformation("AuditLog: UserId={UserId}, Username={Username}, Role={Role}, Path={Path}, Method={Method}, Time={Time}",
                userId, username, role, path, method, DateTime.UtcNow);

            await _next(context);
        }
    }
}
