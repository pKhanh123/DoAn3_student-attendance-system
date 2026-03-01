using EducationManagement.Common.Models;
using EducationManagement.Common.Interfaces;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class NotificationService
    {
        private readonly NotificationRepository _notificationRepository;
        private readonly INotificationHubContext? _hubContext;

        public NotificationService(NotificationRepository notificationRepository, INotificationHubContext? hubContext = null)
        {
            _notificationRepository = notificationRepository;
            _hubContext = hubContext;
        }

        public async Task<string> CreateNotificationAsync(string recipientId, string title, string content, string type, string? createdBy = null, DateTime? sentDate = null)
        {
            if (string.IsNullOrWhiteSpace(recipientId))
                throw new ArgumentException("Recipient ID không được để trống");

            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Title không được để trống");

            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("Content không được để trống");

            if (string.IsNullOrWhiteSpace(type))
                type = "System";

            var notificationId = await _notificationRepository.CreateAsync(recipientId, title, content, type, createdBy, sentDate);

            // ✅ Send real-time notification via SignalR
            if (_hubContext != null)
            {
                try
                {
                    // Get notification details for real-time push
                    var notification = await _notificationRepository.GetByIdAsync(notificationId);
                    if (notification != null)
                    {
                        // Send to user's personal group
                        await _hubContext.SendNotificationToUserAsync(recipientId, new
                        {
                            notificationId = notification.NotificationId,
                            title = notification.Title,
                            content = notification.Content,
                            type = notification.Type,
                            isRead = notification.IsRead,
                            createdAt = notification.CreatedAt,
                            sentDate = notification.SentDate
                        });

                        // Also send unread count update
                        var unreadCount = await _notificationRepository.GetUnreadCountAsync(recipientId);
                        await _hubContext.UpdateUnreadCountAsync(recipientId, unreadCount);
                    }
                }
                catch (Exception ex)
                {
                    // Log error silently
                }
            }

            return notificationId;
        }

        public async Task<(List<Notification> Notifications, int TotalCount)> GetNotificationsByUserAsync(string userId, int page = 1, int pageSize = 50, string? type = null, bool? isRead = null)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("User ID không được để trống");

            return await _notificationRepository.GetByUserIdAsync(userId, page, pageSize, type, isRead);
        }

        public async Task<List<Notification>> GetUnreadNotificationsAsync(string userId, int limit = 10)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("User ID không được để trống");

            return await _notificationRepository.GetUnreadByUserIdAsync(userId, limit);
        }

        public async Task<int> GetUnreadCountAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("User ID không được để trống");

            return await _notificationRepository.GetUnreadCountAsync(userId);
        }

        public async Task<Notification?> GetNotificationByIdAsync(string notificationId)
        {
            if (string.IsNullOrWhiteSpace(notificationId))
                throw new ArgumentException("Notification ID không được để trống");

            return await _notificationRepository.GetByIdAsync(notificationId);
        }

        public async Task MarkAsReadAsync(string notificationId, string? userId = null)
        {
            if (string.IsNullOrWhiteSpace(notificationId))
                throw new ArgumentException("Notification ID không được để trống");

            await _notificationRepository.MarkAsReadAsync(notificationId, userId);

            // ✅ Update unread count via SignalR if userId provided
            if (!string.IsNullOrWhiteSpace(userId) && _hubContext != null)
            {
                try
                {
                    var unreadCount = await _notificationRepository.GetUnreadCountAsync(userId);
                    await _hubContext.UpdateUnreadCountAsync(userId, unreadCount);
                }
                catch (Exception ex)
                {
                }
            }
        }

        public async Task<int> MarkAllAsReadAsync(string userId, string? updatedBy = null)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("User ID không được để trống");

            var count = await _notificationRepository.MarkAllAsReadAsync(userId, updatedBy);

            // ✅ Update unread count via SignalR
            if (_hubContext != null)
            {
                try
                {
                    await _hubContext.UpdateUnreadCountAsync(userId, 0);
                }
                catch (Exception ex)
                {
                }
            }

            return count;
        }

        public async Task DeleteNotificationAsync(string notificationId, string? deletedBy = null)
        {
            if (string.IsNullOrWhiteSpace(notificationId))
                throw new ArgumentException("Notification ID không được để trống");

            await _notificationRepository.DeleteAsync(notificationId, deletedBy);
        }
    }
}

