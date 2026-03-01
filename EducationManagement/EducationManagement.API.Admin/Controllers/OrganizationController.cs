using EducationManagement.BLL.Services;
using EducationManagement.DAL.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace EducationManagement.API.Admin.Controllers
{
    /// <summary>
    /// Controller quản lý tổ chức (Organization structure: Faculty -> Department -> Major)
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api-edu/organization")]
    public class OrganizationController : ControllerBase
    {
        private readonly FacultyRepository _facultyRepository;
        private readonly DepartmentRepository _departmentRepository;
        private readonly MajorRepository _majorRepository;

        public OrganizationController(
            FacultyRepository facultyRepository,
            DepartmentRepository departmentRepository,
            MajorRepository majorRepository)
        {
            _facultyRepository = facultyRepository;
            _departmentRepository = departmentRepository;
            _majorRepository = majorRepository;
        }

        /// <summary>
        /// Lấy toàn bộ cấu trúc tổ chức (hierarchy)
        /// </summary>
        [HttpGet("structure")]
        public async Task<IActionResult> GetOrganizationStructure()
        {
            try
            {
                var faculties = await _facultyRepository.GetAllAsync();
                var departments = await _departmentRepository.GetAllAsync();
                var majors = await _majorRepository.GetAllAsync();

                return Ok(new
                {
                    data = new
                    {
                        faculties,
                        departments,
                        majors
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy departments theo faculty
        /// </summary>
        [HttpGet("faculties/{facultyId}/departments")]
        public async Task<IActionResult> GetDepartmentsByFaculty(string facultyId)
        {
            try
            {
                var departments = await _departmentRepository.GetAllAsync();
                var filtered = departments.FindAll(d => d.FacultyId == facultyId);

                return Ok(new { data = filtered });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy majors theo faculty
        /// </summary>
        [HttpGet("faculties/{facultyId}/majors")]
        public async Task<IActionResult> GetMajorsByFaculty(string facultyId)
        {
            try
            {
                var allMajors = await _majorRepository.GetAllAsync();
                var majors = allMajors.FindAll(m => m.FacultyId == facultyId);
                return Ok(new { data = majors });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }
    }
}

