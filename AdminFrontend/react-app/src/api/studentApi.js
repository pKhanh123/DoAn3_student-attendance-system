import apiClient from './index'

const BASE = '/students'

const studentApi = {
  getAll: (params = {}) => apiClient.get(BASE, { params }),
  getById: (id) => apiClient.get(`${BASE}/${id}`),
  create: (data) => apiClient.post(BASE, data),
  update: (id, data) => apiClient.put(`${BASE}/${id}`, data),
  delete: (id) => apiClient.delete(`${BASE}/${id}`),
  importBatch: (students) => apiClient.post(`${BASE}/import`, { students }),
  getFaculties: () => apiClient.get('/faculties'),
  getMajors: (facultyId) => apiClient.get('/majors', { params: { facultyId } }),
  getAcademicYears: () => apiClient.get('/academic-years'),
}

export default studentApi
