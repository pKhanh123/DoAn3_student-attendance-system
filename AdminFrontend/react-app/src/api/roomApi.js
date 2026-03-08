import apiClient from './index'

const roomApi = {
  getAll: (params = {}) => apiClient.get('/rooms', { params }),
  getById: (id) => apiClient.get(`/rooms/${id}`),
  create: (data) => apiClient.post('/rooms', data),
  update: (id, data) => apiClient.put(`/rooms/${id}`, data),
  delete: (id) => apiClient.delete(`/rooms/${id}`),
}

export default roomApi
