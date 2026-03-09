// ============================================================
// CORE API TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  data?: T
  message?: string
  isSuccess?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

// ============================================================
// AUTH & USER
// ============================================================

export type UserRole = 'Admin' | 'Lecturer' | 'Advisor' | 'Student'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthUser {
  userId: string | number
  username: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  role: UserRole | null
}

export interface User {
  accountId: string | number
  username: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  isActive: boolean
  createdAt?: string
}

export interface UserFormData {
  username: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  password?: string
}

// ============================================================
// STUDENT
// ============================================================

export type StudentStatus = 'Active' | 'Inactive' | 'Graduated' | 'Suspended'

export interface Student {
  studentId: string | number
  studentCode: string
  firstName: string
  lastName: string
  fullName: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  phone: string
  email: string
  address: string
  facultyId: number
  facultyName: string
  majorId: number
  majorName: string
  academicYearId: number
  academicYearName: string
  status: StudentStatus
  avatarUrl?: string
  enrollmentDate?: string
  gpa?: number
  totalCredits?: number
}

export interface StudentFormData {
  studentCode: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  phone: string
  email: string
  address: string
  facultyId: number
  majorId: number
  academicYearId: number
  password?: string
}

export interface StudentQueryParams {
  search?: string
  facultyId?: number
  majorId?: number
  status?: StudentStatus
  academicYearId?: number
  page?: number
  pageSize?: number
}

export interface StudentImportRow {
  studentCode: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  phone: string
  email: string
  address: string
  facultyName: string
  majorName: string
  academicYearName: string
}

// ============================================================
// LECTURER
// ============================================================

export interface Lecturer {
  lecturerId: string | number
  lecturerCode: string
  firstName: string
  lastName: string
  fullName: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  phone: string
  email: string
  address: string
  departmentId: number
  departmentName: string
  isActive: boolean
  avatarUrl?: string
}

export interface LecturerFormData {
  lecturerCode: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  phone: string
  email: string
  address: string
  departmentId: number
  password?: string
}

export interface LecturerSubject {
  lecturerSubjectId: string | number
  lecturerId: number
  lecturerName: string
  subjectId: number
  subjectName: string
  departmentId: number
  departmentName: string
}

// ============================================================
// ADVISOR
// ============================================================

export interface Advisor {
  advisorId: string | number
  advisorCode: string
  firstName: string
  lastName: string
  fullName: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  phone: string
  email: string
  address: string
  departmentId: number
  departmentName: string
  isActive: boolean
  avatarUrl?: string
}

export interface AdvisorFormData {
  advisorCode: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  phone: string
  email: string
  address: string
  departmentId: number
  password?: string
}

// ============================================================
// SUBJECT
// ============================================================

export interface Subject {
  subjectId: string | number
  subjectCode: string
  subjectName: string
  credits: number
  departmentId: number
  departmentName: string
  isActive: boolean
  description?: string
}

export interface SubjectFormData {
  subjectCode: string
  subjectName: string
  credits: number
  departmentId: number
  description?: string
}

// ============================================================
// CLASS
// ============================================================

export interface Class {
  classId: string | number
  classCode: string
  className: string
  subjectId: number
  subjectName: string
  lecturerId: number
  lecturerName: string
  semester: string
  academicYear: string
  maxStudents: number
  enrolledStudents: number
}

export interface ClassFormData {
  classCode: string
  className: string
  subjectId: number
  lecturerId: number
  semester: string
  academicYear: string
  maxStudents: number
}

export interface AdminClass {
  adminClassId: string | number
  classCode: string
  className: string
  facultyId: number
  facultyName: string
  academicYearId: number
  academicYearName: string
  yearLevel: number
  studentCount: number
  maxStudents: number
}

export interface AdminClassFormData {
  classCode: string
  className: string
  facultyId: number
  academicYearId: number
  yearLevel: number
  maxStudents: number
}

// ============================================================
// SCHEDULE
// ============================================================

export interface Schedule {
  scheduleId: string | number
  scheduleCode: string
  classId: number
  className: string
  subjectId: number
  subjectName: string
  lecturerId: number
  lecturerName: string
  roomId: number
  roomName: string
  building: string
  dayOfWeek: number  // 1=Monday, 7=Sunday
  periodStart: number
  periodEnd: number
  weekNumber: number
  semester: string
  academicYear: string
}

export interface ScheduleFormData {
  scheduleCode: string
  classId: number
  lecturerId: number
  roomId: number
  dayOfWeek: number
  periodStart: number
  periodEnd: number
  weekNumber: number
  semester: string
  academicYear: string
}

export interface ScheduleConflict {
  hasConflict: boolean
  conflicts?: {
    scheduleId: number
    scheduleCode: string
    lecturerName?: string
    roomName?: string
    message: string
  }[]
}

// ============================================================
// ROOM
// ============================================================

export interface Room {
  roomId: string | number
  roomCode: string
  roomName: string
  building: string
  capacity: number
  roomType: 'Lecture' | 'Lab' | 'Exam'
  isActive: boolean
  description?: string
}

export interface RoomFormData {
  roomCode: string
  roomName: string
  building: string
  capacity: number
  roomType: 'Lecture' | 'Lab' | 'Exam'
  isActive: boolean
  description?: string
}

// ============================================================
// ATTENDANCE
// ============================================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface Attendance {
  attendanceId: string | number
  studentId: number
  studentCode: string
  studentName: string
  scheduleId: number
  scheduleCode: string
  subjectName: string
  className: string
  attendanceDate: string
  status: AttendanceStatus
  notes?: string
  markedBy?: string
  createdAt: string
}

export interface AttendanceRecord {
  studentId: number
  scheduleId: number
  attendanceDate: string
  status: AttendanceStatus
  notes?: string
  markedBy?: string
}

export interface AttendancePayload {
  studentId: number
  scheduleId: number
  attendanceDate: string
  status: AttendanceStatus
  notes?: string
  markedBy?: string
}

export interface StudentAttendance {
  attendanceId: number
  scheduleId: number
  scheduleCode: string
  subjectName: string
  className: string
  lecturerName: string
  attendanceDate: string
  status: AttendanceStatus
  periodStart: number
  periodEnd: number
  roomName?: string
}

// ============================================================
// TIMETABLE
// ============================================================

export interface TimetableSession {
  scheduleId: number
  scheduleCode: string
  subjectName: string
  className: string
  lecturerName: string
  roomName?: string
  building?: string
  dayOfWeek: number
  periodStart: number
  periodEnd: number
  weekNumber: number
  semester: string
  academicYear: string
  totalStudents: number
}

export interface LecturerTodaySession {
  scheduleId: number
  scheduleCode: string
  subjectName: string
  className: string
  roomName?: string
  building?: string
  dayOfWeek: number
  periodStart: number
  periodEnd: number
  weekNumber: number
  semester: string
  academicYear: string
  totalStudents: number
  alreadyMarked: boolean
}

// ============================================================
// ENROLLMENT
// ============================================================

export interface Enrollment {
  enrollmentId: string | number
  studentId: number
  studentCode: string
  studentName: string
  classId: number
  className: string
  subjectName: string
  semester: string
  academicYear: string
  enrollmentDate: string
  status: 'Enrolled' | 'Dropped' | 'Completed'
}

export interface EnrollmentFormData {
  studentId: number
  classId: number
  semester: string
  academicYear: string
}

// ============================================================
// REPORTS
// ============================================================

export interface AdminReport {
  totalStudents: number
  totalLecturers: number
  totalAdvisors: number
  totalSubjects: number
  totalClasses: number
  avgGpa: number
  totalWarnings: number
  attendanceStats: {
    present: number
    absent: number
    late: number
    excused: number
    total: number
    attendanceRate: number
  }
  gpaDistribution: {
    range: string
    count: number
  }[]
  warningStudents: {
    studentId: number
    studentName: string
    studentCode: string
    warningCount: number
    gpa: number
  }[]
  creditDebt: {
    studentId: number
    studentName: string
    studentCode: string
    totalCredits: number
    debtCredits: number
    gpa: number
  }[]
}

export interface LecturerReport {
  totalStudents: number
  avgGpa: number
  attendanceRate: number
  gpaDistribution: {
    range: string
    count: number
  }[]
  attendanceStats: {
    present: number
    absent: number
    late: number
    excused: number
    total: number
    attendanceRate: number
  }
  lowAttendanceStudents: {
    studentId: number
    studentName: string
    studentCode: string
    className: string
    attendanceRate: number
  }[]
}

export interface AdvisorReport {
  totalStudents: number
  avgGpa: number
  totalWarnings: number
  gpaDistribution: {
    range: string
    count: number
  }[]
  warningStats: {
    type: string
    count: number
  }[]
  creditDebt: {
    studentId: number
    studentName: string
    studentCode: string
    debtCredits: number
    gpa: number
  }[]
}

export interface StudentReport {
  gpa: number
  totalCredits: number
  completedCredits: number
  gpaTrend: {
    semester: string
    gpa: number
  }[]
  gradeDistribution: {
    grade: string
    count: number
  }[]
  creditProgress: {
    type: string
    credits: number
  }[]
}

// ============================================================
// LOOKUP / DROPDOWN TYPES
// ============================================================

export interface Faculty {
  facultyId: number
  facultyName: string
  facultyCode: string
}

export interface Major {
  majorId: number
  majorName: string
  facultyId: number
}

export interface Department {
  departmentId: number
  departmentName: string
}

export interface AcademicYear {
  academicYearId: number
  academicYearName: string
  startYear: number
  endYear: number
  isCurrent: boolean
}

export interface SchoolYear {
  schoolYearId: number
  schoolYearName: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export interface Role {
  roleId: number
  roleName: string
  description?: string
}

// ============================================================
// ADMIN MISC
// ============================================================

export interface Notification {
  notificationId: string | number
  title: string
  message: string
  type: 'Info' | 'Warning' | 'Success' | 'Error'
  isRead: boolean
  createdAt: string
}

export interface AuditLog {
  auditLogId: string | number
  userId: number
  userName: string
  action: string
  entityType: string
  entityId?: string
  details?: string
  ipAddress?: string
  timestamp: string
}

export interface RegistrationPeriod {
  registrationPeriodId: string | number
  name: string
  type: 'CourseRegistration' | 'RetakeRegistration'
  semester: string
  academicYear: string
  startDate: string
  endDate: string
  isActive: boolean
}

export interface SubjectPrerequisite {
  prerequisiteId: string | number
  subjectId: number
  subjectName: string
  prerequisiteSubjectId: number
  prerequisiteSubjectName: string
}

// ============================================================
// COMPONENT PROPS TYPES
// ============================================================

export interface SelectOption {
  value: number | string
  label: string
}

export interface ToastMessage {
  id?: string | number
  type?: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
}

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  variant?: 'danger' | 'warning' | 'info'
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export interface FilterConfig<T = unknown> {
  key: keyof T
  label: string
  type: 'text' | 'select' | 'date' | 'daterange'
  options?: SelectOption[]
  placeholder?: string
}

export interface TableColumn<T = unknown> {
  key: keyof T | string
  header: string
  render?: (value: unknown, record: T) => React.ReactNode
  width?: string | number
  sortable?: boolean
}
