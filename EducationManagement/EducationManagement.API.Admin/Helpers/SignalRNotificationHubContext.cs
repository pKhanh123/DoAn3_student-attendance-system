using EducationManagement.Common.Interfaces;
using Microsoft.AspNetCore.SignalR;
using EducationManagement.API.Admin.Hubs;

namespace EducationManagement.API.Admin.Helpers
{
    /// <summary>
    /// Implementation of INotificationHubContext using SignalR
    /// This bridges the BLL layer with SignalR without creating circular dependencies
    /// </summary>
    public class SignalRNotificationHubContext : INotificationHubContext
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public SignalRNotificationHubContext(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendNotificationToUserAsync(string userId, object notificationData)
        {
            await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", notificationData);
        }

        public async Task UpdateUnreadCountAsync(string userId, int unreadCount)
        {
            await _hubContext.Clients.Group($"user_{userId}").SendAsync("UpdateUnreadCount", unreadCount);
        }
    }
}

