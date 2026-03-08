import apiClient from './index'

const BASE = '/advisors'

const advisorApi = {
  getAll: () => apiClient.get(BASE),
  getById: (id) => apiClient.get(`${BASE}/${id}`),
  create: (data) => apiClient.post(BASE, data),
  update: (id, data) => apiClient.put(`${BASE}/${id}`, data),
  delete: (id) => apiClient.delete(`${BASE}/${id}`),
  getDepartments: () => apiClient.get('/departments'),
  getStudents: (params = {}) => apiClient.get('/students', { params }),
  assignStudents: (advisorId, studentIds) =>
    apiClient.post(`${BASE}/${advisorId}/assign-students`, { studentIds }),
}

export default advisorApi
