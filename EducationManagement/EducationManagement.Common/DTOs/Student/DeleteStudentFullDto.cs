using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EducationManagement.Common.DTOs.Student
{
    public class DeleteStudentFullDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string DeletedBy { get; set; } = string.Empty;
    }
}
