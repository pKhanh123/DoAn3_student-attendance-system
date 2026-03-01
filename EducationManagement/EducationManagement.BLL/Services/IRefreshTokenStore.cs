using System;
using System.Threading.Tasks;
using EducationManagement.Common.Models;

namespace EducationManagement.BLL.Services
{
    public interface IRefreshTokenStore
    {
        Task SaveAsync(string userId, RefreshToken refreshToken);
        Task<RefreshToken?> GetByTokenAsync(string token);
        Task RevokeAsync(Guid id);
    }
}



