using System;

namespace EducationManagement.Common.DTOs.Subject
{
    public class SubjectWithCountDto
    {
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int Credits { get; set; }
        public string? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int LecturerCount { get; set; }
    }
}


