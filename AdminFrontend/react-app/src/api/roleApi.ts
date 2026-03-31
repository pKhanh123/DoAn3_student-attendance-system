import apiClient from './index'
import type { RoleListResponse } from '../types/api'
import type { Role } from '../types'

const BASE = '/roles'

const roleApi = {
  getAll: (params: Record<string, unknown> = {}) =>
    apiClient.get<Role[]>(BASE, { params }),
  getById: (id: number | string) =>
    apiClient.get<Role>(`${BASE}/${id}`),
  create: (data: { roleName: string; description?: string }) =>
    apiClient.post<Role>(BASE, data),
  update: (id: number | string, data: { roleName?: string; description?: string; isActive?: boolean }) =>
    apiClient.put<Role>(`${BASE}/${id}`, data),
  delete: (id: number | string) =>
    apiClient.delete(`${BASE}/${id}`),
  toggleStatus: (id: number | string) =>
    apiClient.put<{ message: string; isActive: boolean }>(`${BASE}/${id}/toggle-status`),
}

export default roleApi
