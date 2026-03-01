using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducationManagement.Common.Models
{
    [Table("rooms")]
    public class Room
    {
        [Key]
        [Column("room_id")]
        public string RoomId { get; set; } = string.Empty;

        [Column("room_code")]
        [Required]
        [MaxLength(50)]
        public string RoomCode { get; set; } = string.Empty;

        [Column("building")]
        [MaxLength(100)]
        public string? Building { get; set; }

        [Column("capacity")]
        public int? Capacity { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        // ==================================================
        // 🔹 Audit fields
        // ==================================================

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

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

