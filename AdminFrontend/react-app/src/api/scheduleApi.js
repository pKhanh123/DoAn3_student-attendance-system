import apiClient from './index'

const scheduleApi = {
  getAllByWeek: (year, week) =>
    apiClient.get('/schedules', { params: { year, week } }),
  getByClass: (classId, week) =>
    apiClient.get('/schedules', { params: { classId, week } }),
  getRooms: (building, isActive) =>
    apiClient.get('/rooms', { params: { building, isActive } }),
  checkConflicts: (data) => apiClient.post('/schedules/check-conflicts', data),
  create: (data) => apiClient.post('/schedules', data),
  update: (id, data) => apiClient.put(`/schedules/${id}`, data),
  delete: (id) => apiClient.delete(`/schedules/${id}`),
}

export default scheduleApi
