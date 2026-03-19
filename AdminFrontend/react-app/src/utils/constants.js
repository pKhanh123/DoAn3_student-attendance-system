// ============================================================
// ACADEMIC RULES - Thay thế ACADEMIC_RULES từ app.js AngularJS
// ============================================================
export const ACADEMIC_RULES = {
  PASSING_SCORE: 5.0,
  GPA_THRESHOLD_GOOD: 8.0,
  GPA_THRESHOLD_EXCELLENT: 9.0,
  MIN_CREDITS_SEMESTER: 12,
  MAX_CREDITS_SEMESTER: 24,
  WARNING_GPA_THRESHOLD: 5.5,
}

// ============================================================
// API CONFIG - Đường dẫn API (thông qua Vite proxy)
// ============================================================
export const API_BASE_URL = '/api-edu'

// ============================================================
// ROLES
// ============================================================
export const ROLES = {
  ADMIN: 'Admin',
  ADVISOR: 'Advisor',
  LECTURER: 'Lecturer',
  STUDENT: 'Student',
}

// ============================================================
// ROLE-BASED REDIRECTS
// ============================================================
export const ROLE_REDIRECTS = {
  Admin: '/admin/dashboard',
  Advisor: '/advisor/dashboard',
  Lecturer: '/lecturer/dashboard',
  Student: '/student/dashboard',
}

// ============================================================
// LOCAL STORAGE KEYS
// ============================================================
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  REMEMBER_ME: 'rememberMe',
}

// ============================================================
// PAGINATION DEFAULTS
// ============================================================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
}

// ============================================================
// ATTENDANCE STATUS
// ============================================================
export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
}

// ============================================================
// GRADE STATUS
// ============================================================
export const GRADE_STATUS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  APPEALED: 'Appealed',
}

// ============================================================
// TIMETABLE DAYS (1 = Monday, 7 = Sunday)
// ============================================================
export const TIMETABLE_DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'Chủ nhật' },
]

// ============================================================
// TIMETABLE SLOTS (tiết học)
// ============================================================
export const TIMETABLE_SLOTS = Array.from({ length: 14 }, (_, i) => ({
  value: i + 1,
  label: `Tiết ${i + 1}`,
}))

// ============================================================
// SESSION TIMEOUT (ms)
// ============================================================
export const SESSION_TIMEOUT = 2 * 60 * 60 * 1000 // 2 hours (matching JWT expiry)
