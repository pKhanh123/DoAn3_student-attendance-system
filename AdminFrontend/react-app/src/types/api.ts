import { AxiosResponse } from 'axios'
import {
  ApiResponse,
  PaginatedResponse,
  Student,
  Lecturer,
  Advisor,
  User,
  Subject,
  Class,
  AdminClass,
  Schedule,
  Room,
  Attendance,
  AttendancePayload,
  StudentAttendance,
  TimetableSession,
  LecturerTodaySession,
  Enrollment,
  AdminReport,
  LecturerReport,
  AdvisorReport,
  StudentReport,
  Faculty,
  Major,
  Department,
  AcademicYear,
  SchoolYear,
  Role,
  Notification,
  AuditLog,
  RegistrationPeriod,
  SubjectPrerequisite,
  LecturerSubject,
} from './index'

// ============================================================
// AUTH
// ============================================================

export type AuthLoginResponse = ApiResponse<{ token: string; refreshToken: string; user: import('./index').AuthUser }>
export type AuthRefreshResponse = ApiResponse<{ token: string; refreshToken: string }>
export type AuthDefaultResponse = ApiResponse<string>

// ============================================================
// USER
// ============================================================

export type UserListResponse = ApiResponse<User[]>
export type UserDetailResponse = ApiResponse<User>
export type UserDefaultResponse = ApiResponse<string>
export type RoleListResponse = ApiResponse<Role[]>

// ============================================================
// STUDENT
// ============================================================

export type StudentListResponse = ApiResponse<PaginatedResponse<Student>>
export type StudentDetailResponse = ApiResponse<Student>
export type StudentDefaultResponse = ApiResponse<string>
export type FacultyListResponse = ApiResponse<Faculty[]>
export type MajorListResponse = ApiResponse<Major[]>
export type AcademicYearListResponse = ApiResponse<AcademicYear[]>
export type StudentImportResponse = ApiResponse<{ success: number; failed: number; errors?: string[] }>

// ============================================================
// LECTURER
// ============================================================

export type LecturerListResponse = ApiResponse<Lecturer[]>
export type LecturerDetailResponse = ApiResponse<Lecturer>
export type LecturerDefaultResponse = ApiResponse<string>
export type DepartmentListResponse = ApiResponse<Department[]>
export type SubjectListResponse = ApiResponse<Subject[]>
export type LecturerSubjectListResponse = ApiResponse<LecturerSubject[]>

// ============================================================
// ADVISOR
// ============================================================

export type AdvisorListResponse = ApiResponse<Advisor[]>
export type AdvisorDetailResponse = ApiResponse<Advisor>
export type AdvisorDefaultResponse = ApiResponse<string>

// ============================================================
// SUBJECT
// ============================================================

export type SubjectListResponse = ApiResponse<Subject[]>
export type SubjectDetailResponse = ApiResponse<Subject>
export type SubjectDefaultResponse = ApiResponse<string>

// ============================================================
// CLASS
// ============================================================

export type ClassListResponse = ApiResponse<Class[]>
export type ClassDetailResponse = ApiResponse<Class>
export type ClassDefaultResponse = ApiResponse<string>

export type AdminClassListResponse = ApiResponse<AdminClass[]>
export type AdminClassDetailResponse = ApiResponse<AdminClass>
export type AdminClassDefaultResponse = ApiResponse<string>

// ============================================================
// SCHEDULE
// ============================================================

export type ScheduleListResponse = ApiResponse<Schedule[]>
export type ScheduleDefaultResponse = ApiResponse<string>
export type ScheduleConflictResponse = ApiResponse<import('./index').ScheduleConflict>
export type RoomListResponse = ApiResponse<Room[]>

// ============================================================
// ROOM
// ============================================================

export type RoomListAllResponse = ApiResponse<Room[]>
export type RoomDetailResponse = ApiResponse<Room>
export type RoomDefaultResponse = ApiResponse<string>

// ============================================================
// ATTENDANCE
// ============================================================

export type AttendanceListResponse = ApiResponse<Attendance[]>
export type StudentAttendanceListResponse = ApiResponse<StudentAttendance[]>
export type AttendanceDefaultResponse = ApiResponse<string>
export type AttendanceBatchResponse = ApiResponse<{ created: number; updated: number }>

// ============================================================
// TIMETABLE
// ============================================================

export type TimetableWeekResponse = ApiResponse<TimetableSession[]>
export type LecturerTodayResponse = ApiResponse<LecturerTodaySession[]>

// ============================================================
// ENROLLMENT
// ============================================================

export type EnrollmentListResponse = ApiResponse<Enrollment[]>
export type EnrollmentDefaultResponse = ApiResponse<string>

// ============================================================
// REPORTS
// ============================================================

export type AdminReportResponse = ApiResponse<AdminReport>
export type LecturerReportResponse = ApiResponse<LecturerReport>
export type AdvisorReportResponse = ApiResponse<AdvisorReport>
export type StudentReportResponse = ApiResponse<StudentReport>

// ============================================================
// LOOKUP
// ============================================================

export type LookupFacultyResponse = ApiResponse<Faculty[]>
export type LookupMajorResponse = ApiResponse<Major[]>
export type LookupDepartmentResponse = ApiResponse<Department[]>
export type LookupAcademicYearResponse = ApiResponse<AcademicYear[]>
export type LookupSchoolYearResponse = ApiResponse<SchoolYear[]>

// ============================================================
// ADMIN MISC
// ============================================================

export type NotificationListResponse = ApiResponse<Notification[]>
export type AuditLogListResponse = ApiResponse<AuditLog[]>
export type RegistrationPeriodListResponse = ApiResponse<RegistrationPeriod[]>
export type SubjectPrerequisiteListResponse = ApiResponse<SubjectPrerequisite[]>
