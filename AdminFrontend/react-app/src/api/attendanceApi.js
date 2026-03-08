import apiClient from './index'

const attendanceApi = {
  // Get attendance records for a schedule/session
  getBySchedule: (scheduleId) =>
    apiClient.get(`/attendances/schedule/${scheduleId}`),

  // Get attendance records for a student
  getByStudent: (studentId, params = {}) =>
    apiClient.get(`/attendances/student/${studentId}`, { params }),

  // Create a single attendance record
  create: (data) => apiClient.post('/attendances', data),

  // Update a single attendance record
  update: (id, data) => apiClient.put(`/attendances/${id}`, data),

  // Batch create or update (post array)
  batchUpsert: (records) => apiClient.post('/attendances/batch', records),
}

export default attendanceApi
