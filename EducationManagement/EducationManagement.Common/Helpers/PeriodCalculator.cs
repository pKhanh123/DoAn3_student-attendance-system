using System;

namespace EducationManagement.Common.Helpers
{
    /// <summary>
    /// Helper class để tính toán thời gian tiết học theo chuẩn đại học Việt Nam
    /// - 1 tiết = 50 phút
    /// - Ra chơi giữa các tiết = 5 phút (trừ giữa tiết 2-3)
    /// - Ra chơi giữa tiết 2-3 = 15 phút (đặc biệt)
    /// - Số tiết: 1-12 (có thể xếp bất kỳ tiết nào, không có nghỉ trưa cố định)
    /// </summary>
    public static class PeriodCalculator
    {
        // Thời gian bắt đầu của mỗi tiết (tính từ 07:00)
        private static readonly TimeSpan[] PeriodStartTimes = new TimeSpan[]
        {
            new TimeSpan(7, 0, 0),    // Tiết 1: 07:00
            new TimeSpan(7, 55, 0),   // Tiết 2: 07:55 (ra chơi 5 phút)
            new TimeSpan(9, 0, 0),    // Tiết 3: 09:00 (ra chơi 15 phút đặc biệt)
            new TimeSpan(9, 55, 0),   // Tiết 4: 09:55 (ra chơi 5 phút)
            new TimeSpan(10, 50, 0),  // Tiết 5: 10:50 (ra chơi 5 phút)
            new TimeSpan(11, 45, 0),   // Tiết 6: 11:45 (ra chơi 5 phút)
            new TimeSpan(12, 40, 0),  // Tiết 7: 12:40 (ra chơi 5 phút)
            new TimeSpan(13, 35, 0),  // Tiết 8: 13:35 (ra chơi 5 phút)
            new TimeSpan(14, 30, 0),  // Tiết 9: 14:30 (ra chơi 5 phút)
            new TimeSpan(15, 25, 0),  // Tiết 10: 15:25 (ra chơi 5 phút)
            new TimeSpan(16, 20, 0),  // Tiết 11: 16:20 (ra chơi 5 phút)
            new TimeSpan(17, 15, 0)   // Tiết 12: 17:15 (ra chơi 5 phút)
        };

        private const int PeriodDurationMinutes = 50; // 1 tiết = 50 phút

        /// <summary>
        /// Lấy thời gian bắt đầu của một tiết
        /// </summary>
        /// <param name="period">Số tiết (1-12)</param>
        /// <returns>TimeSpan bắt đầu của tiết</returns>
        /// <exception cref="ArgumentException">Nếu period không hợp lệ</exception>
        public static TimeSpan GetPeriodStartTime(int period)
        {
            if (period < 1 || period > 12)
                throw new ArgumentException("Số tiết phải từ 1 đến 12", nameof(period));
            
            return PeriodStartTimes[period - 1];
        }

        /// <summary>
        /// Lấy thời gian kết thúc của một tiết
        /// </summary>
        /// <param name="period">Số tiết (1-12)</param>
        /// <returns>TimeSpan kết thúc của tiết</returns>
        public static TimeSpan GetPeriodEndTime(int period)
        {
            return GetPeriodStartTime(period).Add(TimeSpan.FromMinutes(PeriodDurationMinutes));
        }

        /// <summary>
        /// Tính thời gian bắt đầu và kết thúc cho một buổi học (từ tiết X đến tiết Y)
        /// </summary>
        /// <param name="periodFrom">Tiết bắt đầu (1-12)</param>
        /// <param name="periodTo">Tiết kết thúc (1-12, >= periodFrom)</param>
        /// <returns>Tuple (StartTime, EndTime)</returns>
        /// <exception cref="ArgumentException">Nếu period không hợp lệ</exception>
        public static (TimeSpan StartTime, TimeSpan EndTime) CalculateSessionTime(int periodFrom, int periodTo)
        {
            if (periodFrom < 1 || periodFrom > 12)
                throw new ArgumentException("Tiết bắt đầu phải từ 1 đến 12", nameof(periodFrom));
            
            if (periodTo < periodFrom || periodTo > 12)
                throw new ArgumentException("Tiết kết thúc phải >= tiết bắt đầu và <= 12", nameof(periodTo));

            var startTime = GetPeriodStartTime(periodFrom);
            var endTime = GetPeriodEndTime(periodTo);
            
            return (startTime, endTime);
        }

        /// <summary>
        /// Kiểm tra xem một thời gian có nằm trong khoảng tiết học không
        /// </summary>
        /// <param name="time">Thời gian cần kiểm tra</param>
        /// <param name="period">Số tiết (1-12)</param>
        /// <returns>True nếu thời gian nằm trong tiết</returns>
        public static bool IsTimeInPeriod(TimeSpan time, int period)
        {
            var periodStart = GetPeriodStartTime(period);
            var periodEnd = GetPeriodEndTime(period);
            return time >= periodStart && time < periodEnd;
        }

        /// <summary>
        /// Tìm tiết học chứa một thời gian cụ thể
        /// </summary>
        /// <param name="time">Thời gian cần tìm</param>
        /// <returns>Số tiết (1-12) hoặc null nếu không tìm thấy</returns>
        public static int? FindPeriodByTime(TimeSpan time)
        {
            for (int i = 1; i <= 12; i++)
            {
                if (IsTimeInPeriod(time, i))
                    return i;
            }
            return null;
        }

        /// <summary>
        /// Kiểm tra xem hai khoảng tiết có xung đột không (có overlap)
        /// </summary>
        /// <param name="periodFrom1">Tiết bắt đầu của khoảng 1</param>
        /// <param name="periodTo1">Tiết kết thúc của khoảng 1</param>
        /// <param name="periodFrom2">Tiết bắt đầu của khoảng 2</param>
        /// <param name="periodTo2">Tiết kết thúc của khoảng 2</param>
        /// <returns>True nếu có xung đột (overlap)</returns>
        public static bool HasPeriodOverlap(int periodFrom1, int periodTo1, int periodFrom2, int periodTo2)
        {
            // Xung đột nếu có bất kỳ tiết nào trùng nhau
            // Logic: Không xung đột nếu periodTo1 < periodFrom2 HOẶC periodTo2 < periodFrom1
            // => Xung đột nếu KHÔNG (periodTo1 < periodFrom2 || periodTo2 < periodFrom1)
            return !(periodTo1 < periodFrom2 || periodTo2 < periodFrom1);
        }

        /// <summary>
        /// Validate một buổi học: phải là các tiết liên tiếp
        /// </summary>
        /// <param name="periodFrom">Tiết bắt đầu</param>
        /// <param name="periodTo">Tiết kết thúc</param>
        /// <returns>True nếu hợp lệ (các tiết liên tiếp)</returns>
        public static bool ValidateConsecutivePeriods(int periodFrom, int periodTo)
        {
            // Logic: periodTo - periodFrom + 1 = số tiết
            // Nếu số tiết > 0 và <= 12 thì hợp lệ
            // Ví dụ: 1-3 = 3 tiết (1,2,3) - hợp lệ
            // Ví dụ: 1-5 = 5 tiết (1,2,3,4,5) - hợp lệ
            int numberOfPeriods = periodTo - periodFrom + 1;
            return numberOfPeriods > 0 && numberOfPeriods <= 12 && periodFrom >= 1 && periodTo <= 12;
        }

        /// <summary>
        /// Format text hiển thị period (VD: "Tiết 1-3")
        /// </summary>
        /// <param name="periodFrom">Tiết bắt đầu</param>
        /// <param name="periodTo">Tiết kết thúc</param>
        /// <returns>Text hiển thị</returns>
        public static string GetPeriodDisplayText(int periodFrom, int periodTo)
        {
            if (periodFrom == periodTo)
                return $"Tiết {periodFrom}";
            return $"Tiết {periodFrom}-{periodTo}";
        }
    }
}

