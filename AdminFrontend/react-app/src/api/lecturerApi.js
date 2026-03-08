import apiClient from './index'

const BASE = '/lecturers'

const lecturerApi = {
  getAll: () => apiClient.get(BASE),
  getById: (id) => apiClient.get(`${BASE}/${id}`),
  create: (data) => apiClient.post(BASE, data),
  update: (id, data) => apiClient.put(`${BASE}/${id}`, data),
  delete: (id) => apiClient.delete(`${BASE}/${id}`),
  getDepartments: () => apiClient.get('/departments'),
  getSubjects: () => apiClient.get('/subjects'),
  getLecturerSubjects: (lecturerId) => apiClient.get(`/lecturer-subjects/lecturer/${lecturerId}`),
  assignSubject: (data) => apiClient.post('/lecturer-subjects', data),
  removeSubject: (id) => apiClient.delete(`/lecturer-subjects/${id}`),
}

export default lecturerApi
