using EducationManagement.Common.Models;
using EducationManagement.DAL.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EducationManagement.BLL.Services
{
    public class ScheduleService
    {
        private readonly ScheduleRepository _scheduleRepository;

        public ScheduleService(ScheduleRepository scheduleRepository)
        {
            _scheduleRepository = scheduleRepository;
        }

        public async Task<List<Schedule>> GetAllSchedulesAsync()
        {
            return await _scheduleRepository.GetAllAsync();
        }

        public async Task<Schedule?> GetScheduleByIdAsync(string scheduleId)
        {
            if (string.IsNullOrWhiteSpace(scheduleId))
                throw new ArgumentException("Schedule ID không được để trống");

            return await _scheduleRepository.GetByIdAsync(scheduleId);
        }

        public async Task<List<Schedule>> GetSchedulesByClassAsync(string classId)
        {
            if (string.IsNullOrWhiteSpace(classId))
                throw new ArgumentException("Class ID không được để trống");

            return await _scheduleRepository.GetByClassIdAsync(classId);
        }
    }
}

