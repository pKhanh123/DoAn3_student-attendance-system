using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using EducationManagement.Common.Models;

namespace EducationManagement.BLL.Services
{
    public class InMemoryRefreshTokenStore : IRefreshTokenStore
    {
        private static readonly ConcurrentDictionary<Guid, RefreshToken> IdToToken = new();
        private static readonly ConcurrentDictionary<string, Guid> TokenStringToId = new(StringComparer.Ordinal);

        public Task SaveAsync(string userId, RefreshToken refreshToken)
        {
            refreshToken.UserId = userId;
            IdToToken[refreshToken.Id] = refreshToken;
            TokenStringToId[refreshToken.Token] = refreshToken.Id;
            return Task.CompletedTask;
        }

        public Task<RefreshToken?> GetByTokenAsync(string token)
        {
            if (TokenStringToId.TryGetValue(token, out var id) && IdToToken.TryGetValue(id, out var rt))
            {
                return Task.FromResult<RefreshToken?>(rt);
            }
            return Task.FromResult<RefreshToken?>(null);
        }

        public Task RevokeAsync(Guid id)
        {
            if (IdToToken.TryGetValue(id, out var rt))
            {
                rt.RevokedAt = DateTime.UtcNow;
                IdToToken[id] = rt;
            }
            return Task.CompletedTask;
        }
    }
}



