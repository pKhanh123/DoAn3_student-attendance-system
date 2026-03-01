using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class AuditLogService
    {
        private readonly AuditLogRepository _auditLogRepository;

        public AuditLogService(AuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        public async Task<(List<AuditLogDto> Logs, int TotalCount)> GetAllAuditLogsAsync(
            int page = 1,
            int pageSize = 25,
            string? search = null,
            string? action = null,
            string? entityType = null,
            string? userId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 25;
            if (pageSize > 100) pageSize = 100;

            return await _auditLogRepository.GetAllAsync(page, pageSize, search, action, entityType, userId, fromDate, toDate);
        }

        public async Task<AuditLogDto?> GetAuditLogByIdAsync(long logId)
        {
            return await _auditLogRepository.GetByIdAsync(logId);
        }

        public async Task<(List<AuditLogDto> Logs, int TotalCount)> GetAuditLogsByUserAsync(
            string userId, int page = 1, int pageSize = 25)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 25;
            if (pageSize > 100) pageSize = 100;

            return await _auditLogRepository.GetByUserAsync(userId, page, pageSize);
        }

        public async Task<(List<AuditLogDto> Logs, int TotalCount)> GetAuditLogsByEntityAsync(
            string entityType, string entityId, int page = 1, int pageSize = 25)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 25;
            if (pageSize > 100) pageSize = 100;

            return await _auditLogRepository.GetByEntityAsync(entityType, entityId, page, pageSize);
        }

        public async Task<long> CreateAuditLogAsync(AuditLogDto auditLog)
        {
            return await _auditLogRepository.CreateAsync(auditLog);
        }
    }
}

