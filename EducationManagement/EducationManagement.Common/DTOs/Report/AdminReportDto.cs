namespace EducationManagement.Common.DTOs.Report
{
    public class AdminReportDto
    {
        public CreditDebtStatsDto CreditDebtStats { get; set; } = new();
        public AcademicWarningsDto AcademicWarnings { get; set; } = new();
        public GpaDistributionDto GpaDistribution { get; set; } = new();
        public List<TopCreditDebtStudentDto> TopCreditDebt { get; set; } = new();
    }

    public class CreditDebtStatsDto
    {
        public int Total { get; set; }
        public List<CreditDebtRangeDto> ByRange { get; set; } = new();
    }

    public class CreditDebtRangeDto
    {
        public string Range { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class AcademicWarningsDto
    {
        public int Total { get; set; }
        public int LowGpa { get; set; }
        public int PoorAttendance { get; set; }
        public int Both { get; set; }
    }

    public class GpaDistributionDto
    {
        public int Excellent { get; set; } // >= 3.5
        public int Good { get; set; }      // 3.0 - 3.49
        public int Average { get; set; }   // 2.0 - 2.99
        public int Weak { get; set; }      // < 2.0
    }

    public class TopCreditDebtStudentDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? ClassName { get; set; }
        public string? FacultyName { get; set; }
        public string? MajorName { get; set; }
        public int CreditDebt { get; set; }
        public int TotalCreditsRequired { get; set; }
        public int TotalCreditsEarned { get; set; }
    }
}
