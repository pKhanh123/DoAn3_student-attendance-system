using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("notifications")]
    public class Notification
    {
        [Key]
        [Column("notification_id")]
        public string NotificationId { get; set; } = string.Empty;

        [Required]
        [Column("recipient_id")]
        [MaxLength(50)]
        public string RecipientId { get; set; } = string.Empty;

        // 🔹 Thêm để map kết quả SP (u.full_name)
        [NotMapped]
        public string? RecipientName { get; set; }

        [Required]
        [Column("title")]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [Column("content")]
        [MaxLength(2000)]
        public string Content { get; set; } = string.Empty;

        [Required]
        [Column("type")]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // AttendanceWarning, GradeUpdate, System

        [Column("is_read")]
        public bool IsRead { get; set; } = false;

        [Column("sent_date")]
        public DateTime? SentDate { get; set; }

        // ==================================================
        // 🔹 Audit fields
        // ==================================================
        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("created_by")]
        [MaxLength(50)]
        public string? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        [MaxLength(50)]
        public string? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        [MaxLength(50)]
        public string? DeletedBy { get; set; }
    }
}
