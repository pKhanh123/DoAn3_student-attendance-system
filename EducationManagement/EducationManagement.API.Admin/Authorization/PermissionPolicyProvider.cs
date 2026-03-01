using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace EducationManagement.API.Admin.Authorization
{
    /// <summary>
    /// Policy Provider để tạo policy động cho permission-based authorization
    /// Policy name format: "Permission:PERMISSION_CODE"
    /// </summary>
    public class PermissionPolicyProvider : IAuthorizationPolicyProvider
    {
        private readonly DefaultAuthorizationPolicyProvider _fallbackPolicyProvider;

        public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
        {
            _fallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
        }

        public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
        {
            // Nếu policy name bắt đầu với "Permission:", tạo policy với PermissionRequirement
            if (policyName.StartsWith("Permission:", StringComparison.OrdinalIgnoreCase))
            {
                var permissionPart = policyName.Substring("Permission:".Length);
                
                // Hỗ trợ nhiều permission codes (OR logic)
                string[] permissionCodes;
                if (permissionPart.StartsWith("Any:", StringComparison.OrdinalIgnoreCase))
                {
                    var codesPart = permissionPart.Substring("Any:".Length);
                    permissionCodes = codesPart.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(c => c.Trim())
                        .ToArray();
                }
                else
                {
                    permissionCodes = new[] { permissionPart };
                }
                
                var policy = new AuthorizationPolicyBuilder()
                    .AddRequirements(new PermissionRequirement(permissionCodes))
                    .Build();
                return Task.FromResult<AuthorizationPolicy?>(policy);
            }

            // Fallback về default policy provider
            return _fallbackPolicyProvider.GetPolicyAsync(policyName);
        }

        public Task<AuthorizationPolicy> GetDefaultPolicyAsync()
        {
            return _fallbackPolicyProvider.GetDefaultPolicyAsync();
        }

        public Task<AuthorizationPolicy?> GetFallbackPolicyAsync()
        {
            return _fallbackPolicyProvider.GetFallbackPolicyAsync();
        }
    }
}

