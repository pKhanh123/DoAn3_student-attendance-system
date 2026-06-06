import apiClient from './index'
import type {
  StudentListResponse,
  StudentDetailResponse,
  StudentDefaultResponse,
  StudentImportResponse,
  FacultyListResponse,
  MajorListResponse,
  AcademicYearListResponse,
} from '../types/api'
import type {
  Student,
  StudentFormData,
  StudentQueryParams,
} from '../types'

const BASE = '/students'

const studentApi = {
  getAll: (params: StudentQueryParams = {}) =>
    apiClient.get<Student[]>(BASE, { params }),
  getById: (id: number | string) =>
    apiClient.get<Student>(`${BASE}/${id}`),
  create: (data: StudentFormData) =>
    apiClient.post<Student>(`${BASE}/addstudent`, data),
  update: (data: StudentFormData & { StudentId?: string }) =>
    apiClient.put<Student>(`${BASE}/update`, data),
  delete: (data: { studentId: string; deletedBy: string }) =>
    apiClient.delete(`${BASE}/delete`, { data }),
  importBatch: (students: unknown[]) =>
    apiClient.post<{ success: number; failed: number; errors?: string[] }>(
      `${BASE}/import/batch`,
      { students }
    ),
  getFaculties: () =>
    apiClient.get<{ facultyId: number; facultyName: string; facultyCode: string }[]>('/faculties'),
  getMajors: (facultyId: number) =>
    apiClient.get<{ majorId: number; majorName: string; facultyId: number }[]>(`/majors/by-faculty/${facultyId}`),
  getAcademicYears: () =>
    apiClient.get<{ academicYearId: number; academicYearName: string }[]>('/academic-years'),
}

export default studentApi
