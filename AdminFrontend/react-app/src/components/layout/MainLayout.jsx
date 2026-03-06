import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import '../../assets/css/main.css'

// Map route paths → Vietnamese page titles
const PAGE_TITLES = {
  '/admin/dashboard': 'Tổng quan',
  '/admin/users': 'Quản lý Người dùng',
  '/admin/users/new': 'Thêm Người dùng',
  '/admin/users/:id/edit': 'Chỉnh sửa Người dùng',
  '/admin/roles': 'Vai trò',
  '/admin/organization': 'Tổ chức',
  '/admin/students': 'Quản lý Sinh viên',
  '/admin/students/new': 'Thêm Sinh viên',
  '/admin/students/:id/edit': 'Chỉnh sửa Sinh viên',
  '/admin/lecturers': 'Quản lý Giảng viên',
  '/admin/classes': 'Lớp học',
  '/admin/admin-classes': 'Lớp học Quản trị',
  '/admin/rooms': 'Phòng máy',
  '/admin/timetable': 'Thời khóa biểu',
  '/admin/reports': 'Báo cáo',
  '/admin/academic-years': 'Kỳ học',
  '/admin/academic-years/new': 'Thêm Kỳ học',
  '/admin/academic-years/:id/edit': 'Chỉnh sửa Kỳ học',
  '/admin/school-years': 'Năm học',
  '/admin/school-years/new': 'Thêm Năm học',
  '/admin/school-years/:id/edit': 'Chỉnh sửa Năm học',
  '/admin/registration-periods': 'Đợt đăng ký',
  '/admin/subject-prerequisites': 'Điều kiện môn học',
  '/admin/enrollments': 'Đăng ký học phần',
  '/admin/audit-logs': 'Nhật ký',
  '/admin/notifications': 'Thông báo',

  '/lecturer/dashboard': 'Tổng quan',
  '/lecturer/attendance': 'Điểm danh',
  '/lecturer/grades': 'Nhập điểm',
  '/lecturer/grade-formula': 'Công thức điểm',
  '/lecturer/appeals': 'Phúc khảo điểm',
  '/lecturer/timetable': 'Thời khóa biểu',
  '/lecturer/classes': 'Lớp giảng dạy',
  '/lecturer/reports': 'Báo cáo',

  '/advisor/dashboard': 'Tổng quan',
  '/advisor/students': 'Danh sách Sinh viên',
  '/advisor/students/:id': 'Chi tiết Sinh viên',
  '/advisor/students/:id/progress': 'Tiến độ học tập',
  '/advisor/warnings': 'Cảnh báo học tập',
  '/advisor/appeals': 'Duyệt Phúc khảo',
  '/advisor/retakes': 'Quản lý Học lại',
  '/advisor/grade-formula': 'Công thức điểm',
  '/advisor/enrollment-approval': 'Duyệt Đăng ký',
  '/advisor/enrollments': 'Quản lý Đăng ký',
  '/advisor/exam-schedules': 'Lịch thi',
  '/advisor/exam-scores': 'Nhập điểm thi',
  '/advisor/reports': 'Báo cáo',

  '/student/dashboard': 'Tổng quan',
  '/student/timetable': 'Thời khóa biểu',
  '/student/grades': 'Điểm số',
  '/student/attendance': 'Điểm danh',
  '/student/exam-schedule': 'Lịch thi',
  '/student/appeals': 'Phúc khảo điểm',
  '/student/retakes': 'Học lại',
  '/student/retake-register': 'Đăng ký Học lại',
  '/student/course-register': 'Đăng ký Học phần',
  '/student/profile': 'Hồ sơ cá nhân',
  '/student/reports': 'Báo cáo',
}

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [key, title] of Object.entries(PAGE_TITLES)) {
    const pattern = key.replace(/:[^/]+/g, '[^/]+')
    if (new RegExp(`^${pattern}$`).test(pathname)) return title
  }
  return pathname.split('/').pop() || 'Dashboard'
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const location = useLocation()

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setCollapsed(true)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) setCollapsed(true)
  }, [location.pathname, isMobile])

  const handleToggle = () => setCollapsed((v) => !v)

  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="admin-layout">
      {/* Overlay for mobile */}
      {isMobile && !collapsed && (
        <div className="sidebar-overlay active" onClick={() => setCollapsed(true)} />
      )}

      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={handleToggle} pageTitle={pageTitle} />

      {/* Main content area */}
      <div className={`main-content${collapsed ? ' expanded' : ''}`}>
        <Topbar onToggle={handleToggle} collapsed={collapsed} pageTitle={pageTitle} />
        <div className="content-body">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
