namespace EducationManagement.Common.DTOs.Organization
{
    /// <summary>
    /// DTO để trả về thông tin ràng buộc khi kiểm tra trước khi xóa Faculty
    /// </summary>
    public class FacultyConstraintDto
    {
        public int DepartmentCount { get; set; }
        public int ActiveDepartmentCount { get; set; }
        public int MajorCount { get; set; }
        public int ActiveMajorCount { get; set; }
        public bool HasActiveRelations => ActiveDepartmentCount > 0 || ActiveMajorCount > 0;
    }

    /// <summary>
    /// DTO để trả về thông tin ràng buộc khi kiểm tra trước khi xóa Department
    /// </summary>
    public class DepartmentConstraintDto
    {
        public int SubjectCount { get; set; }
        public int ActiveSubjectCount { get; set; }
        public int LecturerCount { get; set; }
        public int ActiveLecturerCount { get; set; }
        public bool HasActiveRelations => ActiveSubjectCount > 0 || ActiveLecturerCount > 0;
    }

    /// <summary>
    /// DTO để trả về thông tin ràng buộc khi kiểm tra trước khi xóa Major
    /// </summary>
    public class MajorConstraintDto
    {
        public int StudentCount { get; set; }
        public int ActiveStudentCount { get; set; }
        public bool HasActiveRelations => ActiveStudentCount > 0;
    }
}

