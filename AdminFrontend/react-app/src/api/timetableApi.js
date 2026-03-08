import apiClient from './index'

const timetableApi = {
  getLecturerWeek: (lecturerId, year, week) =>
    apiClient.get('/timetables/lecturer', {
      params: { lecturerId, year, week },
    }),
  getStudentWeek: (studentId, year, week) =>
    apiClient.get('/timetables/student', {
      params: { studentId, year, week },
    }),
}

export default timetableApi
