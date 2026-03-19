namespace EducationManagement.Common.DTOs.Report
{
    public class StudentReportDto
    {
        public StudentOverviewDto Overview { get; set; } = new();
        public List<GpaTrendDto> GpaTrend { get; set; } = new();
        public GradeDistributionDto GradeDistribution { get; set; } = new();
        public CreditDebtDto CreditDebt { get; set; } = new();
    }

    public class StudentOverviewDto
    {
        public decimal? CumulativeGpa { get; set; }
        public decimal AttendanceRate { get; set; }
        public int CreditsEarned { get; set; }
        public int CreditsRegistered { get; set; }
        public int TotalSubjects { get; set; }
        public int PassedSubjects { get; set; }
        public int FailedSubjects { get; set; }
    }

    public class GpaTrendDto
    {
        public string Semester { get; set; } = string.Empty; // e.g., "HK1 2023-2024"
        public decimal Gpa { get; set; }
    }

    public class GradeDistributionDto
    {
        public int A { get; set; }
        public int B { get; set; }
        public int C { get; set; }
        public int D { get; set; }
        public int F { get; set; }
    }

    public class CreditDebtDto
    {
        public int Total { get; set; }
        public int RequiredCredits { get; set; }
        public decimal Progress { get; set; }
    }
}
