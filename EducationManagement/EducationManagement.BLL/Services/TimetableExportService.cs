using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using EducationManagement.BLL.Services;

namespace EducationManagement.BLL.Services
{
    /// <summary>
    /// Service để export thời khóa biểu ra các định dạng khác nhau
    /// </summary>
    public class TimetableExportService
    {
        private readonly TimetableService _timetableService;

        public TimetableExportService(TimetableService timetableService)
        {
            _timetableService = timetableService;
        }

        /// <summary>
        /// Export thời khóa biểu sinh viên ra CSV
        /// </summary>
        public async Task<string> ExportStudentTimetableToCsvAsync(string studentId, int year, int week)
        {
            var sessions = await _timetableService.GetStudentTimetableByWeekAsync(studentId, year, week);
            
            var csv = new StringBuilder();
            csv.AppendLine("Thứ,Giờ bắt đầu,Giờ kết thúc,Mã lớp,Tên lớp,Môn học,Giảng viên,Phòng học,Tiết học");
            
            foreach (var session in sessions)
            {
                var weekdayName = GetWeekdayName(session.Weekday);
                var timeSlot = $"{session.StartTime:hh\\:mm} - {session.EndTime:hh\\:mm}";
                var period = session.PeriodFrom != null && session.PeriodTo != null 
                    ? $"Tiết {session.PeriodFrom}-{session.PeriodTo}" 
                    : "";
                
                csv.AppendLine($"{weekdayName},{session.StartTime:hh\\:mm},{session.EndTime:hh\\:mm}," +
                    $"{session.ClassCode},{session.ClassName},{session.SubjectName}," +
                    $"{session.LecturerName ?? ""},{session.RoomCode ?? ""},{period}");
            }
            
            return csv.ToString();
        }

        /// <summary>
        /// Export thời khóa biểu giảng viên ra CSV
        /// </summary>
        public async Task<string> ExportLecturerTimetableToCsvAsync(string lecturerId, int year, int week)
        {
            var sessions = await _timetableService.GetLecturerTimetableByWeekAsync(lecturerId, year, week);
            
            var csv = new StringBuilder();
            csv.AppendLine("Thứ,Giờ bắt đầu,Giờ kết thúc,Mã lớp,Tên lớp,Môn học,Phòng học,Tiết học");
            
            foreach (var session in sessions)
            {
                var weekdayName = GetWeekdayName(session.Weekday);
                var period = session.PeriodFrom != null && session.PeriodTo != null 
                    ? $"Tiết {session.PeriodFrom}-{session.PeriodTo}" 
                    : "";
                
                csv.AppendLine($"{weekdayName},{session.StartTime:hh\\:mm},{session.EndTime:hh\\:mm}," +
                    $"{session.ClassCode},{session.ClassName},{session.SubjectName}," +
                    $"{session.RoomCode ?? ""},{period}");
            }
            
            return csv.ToString();
        }

        /// <summary>
        /// Export thời khóa biểu theo học kỳ ra CSV
        /// </summary>
        public async Task<string> ExportSemesterTimetableToCsvAsync(string schoolYearId, int semester, string? classId = null)
        {
            var sessions = await _timetableService.GetSessionsBySemesterAsync(schoolYearId, semester, classId);
            
            var csv = new StringBuilder();
            csv.AppendLine("Tuần,Thứ,Giờ bắt đầu,Giờ kết thúc,Mã lớp,Tên lớp,Môn học,Giảng viên,Phòng học,Tiết học");
            
            foreach (var session in sessions.OrderBy(s => s.WeekNo).ThenBy(s => s.Weekday).ThenBy(s => s.StartTime))
            {
                var weekdayName = GetWeekdayName(session.Weekday);
                var weekNo = session.WeekNo?.ToString() ?? "Tất cả";
                var period = session.PeriodFrom != null && session.PeriodTo != null 
                    ? $"Tiết {session.PeriodFrom}-{session.PeriodTo}" 
                    : "";
                
                csv.AppendLine($"{weekNo},{weekdayName},{session.StartTime:hh\\:mm},{session.EndTime:hh\\:mm}," +
                    $"{session.ClassCode},{session.ClassName},{session.SubjectName}," +
                    $"{session.LecturerName ?? ""},{session.RoomCode ?? ""},{period}");
            }
            
            return csv.ToString();
        }

        /// <summary>
        /// Export thời khóa biểu sinh viên ra Excel (HTML format)
        /// </summary>
        public async Task<string> ExportStudentTimetableToExcelAsync(string studentId, int year, int week, string studentName = "")
        {
            var sessions = await _timetableService.GetStudentTimetableByWeekAsync(studentId, year, week);
            
            var html = new StringBuilder();
            html.AppendLine(@"<html xmlns:o=""urn:schemas-microsoft-com:office:office"" xmlns:x=""urn:schemas-microsoft-com:office:excel"" xmlns=""http://www.w3.org/TR/REC-html40"">");
            html.AppendLine("<head>");
            html.AppendLine("<meta charset=\"UTF-8\">");
            html.AppendLine(@"<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Thời khóa biểu</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->");
            html.AppendLine("<style>");
            html.AppendLine("table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }");
            html.AppendLine("td, th { border: 1px solid #000; padding: 8px; text-align: left; }");
            html.AppendLine(".title { font-size: 16pt; font-weight: bold; text-align: center; background-color: #4472C4; color: white; padding: 12px; }");
            html.AppendLine(".header { font-weight: bold; background-color: #E7E6E6; text-align: center; }");
            html.AppendLine("</style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine($"<table>");
            html.AppendLine($"<tr><td colspan=\"9\" class=\"title\">THỜI KHÓA BIỂU SINH VIÊN - Tuần {week} - Năm {year}</td></tr>");
            if (!string.IsNullOrEmpty(studentName))
            {
                html.AppendLine($"<tr><td colspan=\"9\" style=\"text-align: center; padding: 8px;\"><strong>Sinh viên: {studentName}</strong></td></tr>");
            }
            html.AppendLine("<tr class=\"header\">");
            html.AppendLine("<th>Thứ</th><th>Giờ bắt đầu</th><th>Giờ kết thúc</th><th>Mã lớp</th><th>Tên lớp</th><th>Môn học</th><th>Giảng viên</th><th>Phòng học</th><th>Tiết học</th>");
            html.AppendLine("</tr>");
            
            foreach (var session in sessions.OrderBy(s => s.Weekday).ThenBy(s => s.StartTime))
            {
                var weekdayName = GetWeekdayName(session.Weekday);
                var period = session.PeriodFrom != null && session.PeriodTo != null 
                    ? $"Tiết {session.PeriodFrom}-{session.PeriodTo}" 
                    : "";
                
                html.AppendLine("<tr>");
                html.AppendLine($"<td>{weekdayName}</td>");
                html.AppendLine($"<td>{session.StartTime:hh\\:mm}</td>");
                html.AppendLine($"<td>{session.EndTime:hh\\:mm}</td>");
                html.AppendLine($"<td>{session.ClassCode}</td>");
                html.AppendLine($"<td>{session.ClassName}</td>");
                html.AppendLine($"<td>{session.SubjectName}</td>");
                html.AppendLine($"<td>{session.LecturerName ?? ""}</td>");
                html.AppendLine($"<td>{session.RoomCode ?? ""}</td>");
                html.AppendLine($"<td>{period}</td>");
                html.AppendLine("</tr>");
            }
            
            html.AppendLine("</table>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");
            
            return html.ToString();
        }

        private static string GetWeekdayName(int weekday)
        {
            return weekday switch
            {
                1 => "Chủ nhật",
                2 => "Thứ 2",
                3 => "Thứ 3",
                4 => "Thứ 4",
                5 => "Thứ 5",
                6 => "Thứ 6",
                7 => "Thứ 7",
                _ => $"Thứ {weekday}"
            };
        }
    }
}

