import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import MainLayout from './components/layout/MainLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import VerifyOTPPage from './pages/auth/VerifyOTPPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage'
import UserListPage from './pages/admin/users/UserListPage'
import UserFormPage from './pages/admin/users/UserFormPage'
import RoleListPage from './pages/admin/roles/RoleListPage'
import OrganizationPage from './pages/admin/organization/OrganizationPage'
import AuditLogPage from './pages/admin/audit-logs/AuditLogPage'
import NotificationPage from './pages/admin/notifications/NotificationPage'
import StudentListPage from './pages/admin/students/StudentListPage'
import StudentFormPage from './pages/admin/students/StudentFormPage'
import LecturerManagePage from './pages/admin/lecturers/LecturerManagePage'
import ClassListPage from './pages/admin/classes/ClassListPage'
import AdminClassListPage from './pages/admin/admin-classes/AdminClassListPage'
import RoomListPage from './pages/admin/rooms/RoomListPage'
import AdminTimetablePage from './pages/admin/timetable/AdminTimetablePage'
import AdminReportPage from './pages/admin/reports/AdminReportPage'
import AcademicYearListPage from './pages/admin/academic-years/AcademicYearListPage'
import AcademicYearFormPage from './pages/admin/academic-years/AcademicYearFormPage'
import SchoolYearListPage from './pages/admin/school-years/SchoolYearListPage'
import SchoolYearFormPage from './pages/admin/school-years/SchoolYearFormPage'
import RegistrationPeriodPage from './pages/admin/registration-periods/RegistrationPeriodPage'
import SubjectPrerequisitePage from './pages/admin/subject-prerequisites/SubjectPrerequisitePage'
import EnrollmentAdminPage from './pages/admin/enrollments/EnrollmentAdminPage'

// Lecturer Pages
import LecturerDashboardPage from './pages/lecturer/DashboardPage'
import AttendancePage from './pages/lecturer/attendance/AttendancePage'
import GradeEntryPage from './pages/lecturer/grades/GradeEntryPage'
import GradeFormulaPage from './pages/lecturer/grades/GradeFormulaPage'
import LecturerGradeAppealPage from './pages/lecturer/appeals/GradeAppealPage'
import LecturerTimetablePage from './pages/lecturer/timetable/TimetablePage'
import LecturerClassListPage from './pages/lecturer/classes/ClassListPage'
import LecturerReportPage from './pages/lecturer/reports/ReportPage'

// Advisor Pages
import AdvisorDashboardPage from './pages/advisor/DashboardPage'
import AdvisorStudentListPage from './pages/advisor/students/StudentListPage'
import AdvisorStudentDetailPage from './pages/advisor/students/StudentDetailPage'
import AdvisorStudentProgressPage from './pages/advisor/students/StudentProgressPage'
import AdvisorWarningPage from './pages/advisor/warnings/WarningPage'
import AdvisorGradeAppealPage from './pages/advisor/appeals/GradeAppealPage'
import AdvisorRetakePage from './pages/advisor/retakes/RetakePage'
import AdvisorGradeFormulaPage from './pages/advisor/grade-formula/GradeFormulaPage'
import AdvisorEnrollmentApprovalPage from './pages/advisor/enrollment/EnrollmentApprovalPage'
import AdvisorEnrollmentPage from './pages/advisor/enrollment/EnrollmentPage'
import AdvisorExamSchedulePage from './pages/advisor/exam-schedules/ExamSchedulePage'
import AdvisorExamScorePage from './pages/advisor/exam-schedules/ExamScorePage'
import AdvisorReportPage from './pages/advisor/reports/ReportPage'

// Student Pages
import StudentDashboardPage from './pages/student/DashboardPage'
import StudentTimetablePage from './pages/student/timetable/TimetablePage'
import StudentGradesPage from './pages/student/grades/GradesPage'
import StudentAttendancePage from './pages/student/attendance/AttendancePage'
import StudentExamSchedulePage from './pages/student/exam-schedule/ExamSchedulePage'
import StudentGradeAppealPage from './pages/student/appeals/GradeAppealPage'
import StudentRetakePage from './pages/student/retakes/RetakePage'
import StudentRetakeRegisterPage from './pages/student/retakes/RetakeRegisterPage'
import CourseRegisterPage from './pages/student/enrollment/CourseRegisterPage'
import StudentProfilePage from './pages/student/profile/ProfilePage'
import StudentReportPage from './pages/student/reports/ReportPage'

import { ROLES } from './utils/constants'

// Route guard component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

// Redirect authenticated users away from login
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

// Role-based redirect on root
function RootRedirect() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  switch (user.role) {
    case ROLES.ADMIN:
      return <Navigate to="/admin/dashboard" replace />
    case ROLES.ADVISOR:
      return <Navigate to="/advisor/dashboard" replace />
    case ROLES.LECTURER:
      return <Navigate to="/lecturer/dashboard" replace />
    case ROLES.STUDENT:
      return <Navigate to="/student/dashboard" replace />
    default:
      return <Navigate to="/login" replace />
  }
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/verify-otp" element={<PublicRoute><VerifyOTPPage /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

      {/* Root Redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><MainLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="users/new" element={<UserFormPage />} />
        <Route path="users/:id/edit" element={<UserFormPage />} />
        <Route path="roles" element={<RoleListPage />} />
        <Route path="organization" element={<OrganizationPage />} />
        <Route path="students" element={<StudentListPage />} />
        <Route path="students/new" element={<StudentFormPage />} />
        <Route path="students/:id/edit" element={<StudentFormPage />} />
        <Route path="lecturers" element={<LecturerManagePage />} />
        <Route path="classes" element={<ClassListPage />} />
        <Route path="admin-classes" element={<AdminClassListPage />} />
        <Route path="rooms" element={<RoomListPage />} />
        <Route path="timetable" element={<AdminTimetablePage />} />
        <Route path="reports" element={<AdminReportPage />} />
        <Route path="academic-years" element={<AcademicYearListPage />} />
        <Route path="academic-years/new" element={<AcademicYearFormPage />} />
        <Route path="academic-years/:id/edit" element={<AcademicYearFormPage />} />
        <Route path="school-years" element={<SchoolYearListPage />} />
        <Route path="school-years/new" element={<SchoolYearFormPage />} />
        <Route path="school-years/:id/edit" element={<SchoolYearFormPage />} />
        <Route path="registration-periods" element={<RegistrationPeriodPage />} />
        <Route path="subject-prerequisites" element={<SubjectPrerequisitePage />} />
        <Route path="enrollments" element={<EnrollmentAdminPage />} />
        <Route path="audit-logs" element={<AuditLogPage />} />
        <Route path="notifications" element={<NotificationPage />} />
      </Route>

      {/* Lecturer Routes */}
      <Route path="/lecturer" element={<ProtectedRoute allowedRoles={[ROLES.LECTURER]}><MainLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<LecturerDashboardPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="grades" element={<GradeEntryPage />} />
        <Route path="grade-formula" element={<GradeFormulaPage />} />
        <Route path="appeals" element={<LecturerGradeAppealPage />} />
        <Route path="timetable" element={<LecturerTimetablePage />} />
        <Route path="classes" element={<LecturerClassListPage />} />
        <Route path="reports" element={<LecturerReportPage />} />
      </Route>

      {/* Advisor Routes */}
      <Route path="/advisor" element={<ProtectedRoute allowedRoles={[ROLES.ADVISOR]}><MainLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<AdvisorDashboardPage />} />
        <Route path="students" element={<AdvisorStudentListPage />} />
        <Route path="students/:id" element={<AdvisorStudentDetailPage />} />
        <Route path="students/:id/progress" element={<AdvisorStudentProgressPage />} />
        <Route path="warnings" element={<AdvisorWarningPage />} />
        <Route path="appeals" element={<AdvisorGradeAppealPage />} />
        <Route path="retakes" element={<AdvisorRetakePage />} />
        <Route path="grade-formula" element={<AdvisorGradeFormulaPage />} />
        <Route path="enrollment-approval" element={<AdvisorEnrollmentApprovalPage />} />
        <Route path="enrollments" element={<AdvisorEnrollmentPage />} />
        <Route path="exam-schedules" element={<AdvisorExamSchedulePage />} />
        <Route path="exam-scores" element={<AdvisorExamScorePage />} />
        <Route path="reports" element={<AdvisorReportPage />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><MainLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="timetable" element={<StudentTimetablePage />} />
        <Route path="grades" element={<StudentGradesPage />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="exam-schedule" element={<StudentExamSchedulePage />} />
        <Route path="appeals" element={<StudentGradeAppealPage />} />
        <Route path="retakes" element={<StudentRetakePage />} />
        <Route path="retake-register" element={<StudentRetakeRegisterPage />} />
        <Route path="course-register" element={<CourseRegisterPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="reports" element={<StudentReportPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
