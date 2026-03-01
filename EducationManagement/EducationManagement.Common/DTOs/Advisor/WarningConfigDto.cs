namespace EducationManagement.Common.DTOs.Advisor
{
    public class WarningConfigDto
    {
        public decimal AttendanceThreshold { get; set; } = 20.0m; // Default: 20% absence rate
        public decimal GpaThreshold { get; set; } = 2.0m; // Default: 2.0 GPA
        public string? EmailTemplate { get; set; }
        public string? EmailSubject { get; set; }
        public bool AutoSendEmails { get; set; } = false;
    }
    
    public class SendWarningEmailDto
    {
        public List<string> StudentIds { get; set; } = new();
        public string WarningType { get; set; } = string.Empty; // "attendance", "academic", "both"
        public string? CustomSubject { get; set; }
        public string? CustomMessage { get; set; }
    }
}

