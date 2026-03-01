namespace EducationManagement.Common.Interfaces
{
    /// <summary>
    /// Interface for sending real-time notifications via SignalR
    /// This abstraction allows BLL layer to send notifications without depending on SignalR directly
    /// </summary>
    public interface INotificationHubContext
    {
        /// <summary>
        /// Send a notification to a specific user
        /// </summary>
        Task SendNotificationToUserAsync(string userId, object notificationData);

        /// <summary>
        /// Update unread count for a specific user
        /// </summary>
        Task UpdateUnreadCountAsync(string userId, int unreadCount);
    }
}

