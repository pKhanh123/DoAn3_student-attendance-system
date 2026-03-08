import apiClient from './index'

const enrollmentApi = {
  getClassRoster: (classId) =>
    apiClient.get(`/enrollments/class/${classId}`),
  getByStudent: (studentId) =>
    apiClient.get(`/enrollments/student/${studentId}`),
}

export default enrollmentApi
