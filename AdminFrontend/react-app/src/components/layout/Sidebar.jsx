import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../utils/constants'
import '../../assets/css/main.css'

// ── Menu config per role ──────────────────────────────────────────────
const MENU_BY_ROLE = {
  [ROLES.ADMIN]: [
    {
      section: 'TỔNG QUAN',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/admin/dashboard' },
      ],
    },
    {
      section: 'QUẢN LÝ NGƯỜI DÙNG',
      items: [
        { label: 'Người dùng', icon: 'fas fa-users', path: '/admin/users' },
        { label: 'Vai trò', icon: 'fas fa-user-shield', path: '/admin/roles' },
        { label: 'Tổ chức', icon: 'fas fa-building', path: '/admin/organization' },
      ],
    },
    {
      section: 'QUẢN LÝ ĐÀO TẠO',
      items: [
        { label: 'Sinh viên', icon: 'fas fa-user-graduate', path: '/admin/students' },
        { label: 'Giảng viên', icon: 'fas fa-chalkboard-teacher', path: '/admin/lecturers' },
        { label: 'Cố vấn học tập', icon: 'fas fa-user-friends', path: '/admin/advisors' },
        { label: 'Lớp học', icon: 'fas fa-layer-group', path: '/admin/classes' },
        { label: 'Phòng máy', icon: 'fas fa-desktop', path: '/admin/rooms' },
        { label: 'Năm học', icon: 'fas fa-calendar-alt', path: '/admin/school-years' },
        { label: 'Kỳ học', icon: 'fas fa-calendar-week', path: '/admin/academic-years' },
        { label: 'Điều kiện môn học', icon: 'fas fa-book-open', path: '/admin/subject-prerequisites' },
      ],
    },
    {
      section: 'QUẢN LÝ HỌC TẬP',
      items: [
        { label: 'Đăng ký học phần', icon: 'fas fa-clipboard-check', path: '/admin/enrollments' },
        { label: 'Đợt đăng ký', icon: 'fas fa-clock', path: '/admin/registration-periods' },
      ],
    },
    {
      section: 'LỊCH TRÌNH',
      items: [
        { label: 'Thời khóa biểu', icon: 'fas fa-clock', path: '/admin/timetable' },
      ],
    },
    {
      section: 'BÁO CÁO',
      items: [
        { label: 'Báo cáo', icon: 'fas fa-chart-bar', path: '/admin/reports' },
      ],
    },
    {
      section: 'HỆ THỐNG',
      items: [
        { label: 'Nhật ký', icon: 'fas fa-history', path: '/admin/audit-logs' },
        { label: 'Thông báo', icon: 'fas fa-bell', path: '/admin/notifications' },
      ],
    },
  ],

  [ROLES.LECTURER]: [
    {
      section: 'TỔNG QUAN',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/lecturer/dashboard' },
      ],
    },
    {
      section: 'GIẢNG DẠY',
      items: [
        { label: 'Điểm danh', icon: 'fas fa-clipboard-list', path: '/lecturer/attendance' },
        { label: 'Nhập điểm', icon: 'fas fa-pen', path: '/lecturer/grades' },
        { label: 'Công thức điểm', icon: 'fas fa-sliders-h', path: '/lecturer/grade-formula' },
        { label: 'Lớp giảng dạy', icon: 'fas fa-layer-group', path: '/lecturer/classes' },
        { label: 'Thời khóa biểu', icon: 'fas fa-clock', path: '/lecturer/timetable' },
      ],
    },
    {
      section: 'PHÚC KHẢO',
      items: [
        { label: 'Phúc khảo điểm', icon: 'fas fa-balance-scale', path: '/lecturer/appeals' },
      ],
    },
    {
      section: 'BÁO CÁO',
      items: [
        { label: 'Báo cáo', icon: 'fas fa-chart-bar', path: '/lecturer/reports' },
      ],
    },
  ],

  [ROLES.ADVISOR]: [
    {
      section: 'TỔNG QUAN',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/advisor/dashboard' },
      ],
    },
    {
      section: 'QUẢN LÝ SINH VIÊN',
      items: [
        { label: 'Danh sách sinh viên', icon: 'fas fa-user-graduate', path: '/advisor/students' },
        { label: 'Cảnh báo học tập', icon: 'fas fa-exclamation-triangle', path: '/advisor/warnings' },
        { label: 'Học lại', icon: 'fas fa-redo', path: '/advisor/retakes' },
      ],
    },
    {
      section: 'QUẢN LÝ ĐIỂM',
      items: [
        { label: 'Công thức điểm', icon: 'fas fa-sliders-h', path: '/advisor/grade-formula' },
        { label: 'Duyệt phúc khảo', icon: 'fas fa-balance-scale', path: '/advisor/appeals' },
        { label: 'Lịch thi', icon: 'fas fa-file-alt', path: '/advisor/exam-schedules' },
        { label: 'Nhập điểm thi', icon: 'fas fa-pen', path: '/advisor/exam-scores' },
      ],
    },
    {
      section: 'ĐĂNG KÝ HỌC PHẦN',
      items: [
        { label: 'Duyệt đăng ký', icon: 'fas fa-clipboard-check', path: '/advisor/enrollment-approval' },
        { label: 'Quản lý đăng ký', icon: 'fas fa-list-ul', path: '/advisor/enrollments' },
      ],
    },
    {
      section: 'BÁO CÁO',
      items: [
        { label: 'Báo cáo', icon: 'fas fa-chart-bar', path: '/advisor/reports' },
      ],
    },
  ],

  [ROLES.STUDENT]: [
    {
      section: 'TỔNG QUAN',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', path: '/student/dashboard' },
      ],
    },
    {
      section: 'HỌC TẬP',
      items: [
        { label: 'Thời khóa biểu', icon: 'fas fa-clock', path: '/student/timetable' },
        { label: 'Điểm số', icon: 'fas fa-chart-line', path: '/student/grades' },
        { label: 'Điểm danh', icon: 'fas fa-clipboard-list', path: '/student/attendance' },
        { label: 'Lịch thi', icon: 'fas fa-file-alt', path: '/student/exam-schedule' },
      ],
    },
    {
      section: 'ĐĂNG KÝ',
      items: [
        { label: 'Đăng ký học phần', icon: 'fas fa-plus-circle', path: '/student/course-register' },
        { label: 'Học lại', icon: 'fas fa-redo', path: '/student/retakes' },
        { label: 'Đăng ký học lại', icon: 'fas fa-redo', path: '/student/retake-register' },
      ],
    },
    {
      section: 'KHIẾU NẠI',
      items: [
        { label: 'Phúc khảo điểm', icon: 'fas fa-balance-scale', path: '/student/appeals' },
      ],
    },
    {
      section: 'HỒ SƠ',
      items: [
        { label: 'Hồ sơ cá nhân', icon: 'fas fa-user', path: '/student/profile' },
      ],
    },
    {
      section: 'BÁO CÁO',
      items: [
        { label: 'Báo cáo', icon: 'fas fa-chart-bar', path: '/student/reports' },
      ],
    },
  ],
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth()
  const location = useLocation()

  const menuSections = MENU_BY_ROLE[user?.role] || []

  const isSectionOpen = (sectionIndex) => {
    const section = menuSections[sectionIndex]
    if (!section) return false
    return section.items.some((item) =>
      location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path))
    )
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>
          <i className="fas fa-graduation-cap"></i>
          {!collapsed && ` ${user?.role || 'User'} Panel`}
        </h2>
        {!collapsed && (
          <p>Xin chào, <strong>{user?.fullName || user?.userName || 'User'}</strong></p>
        )}
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuSections.map((section, sIdx) => {
            const open = isSectionOpen(sIdx)
            return (
              <li key={sIdx} className="menu-section">
                <button
                  type="button"
                  className="menu-section-toggle"
                  onClick={() => {
                    // Toggle: collapse all others, then toggle this one
                    document.querySelectorAll('.sidebar .submenu').forEach((el, i) => {
                      if (i !== sIdx) el.classList.remove('open')
                    })
                    const submenu = document.querySelectorAll('.sidebar .submenu')[sIdx]
                    if (submenu) submenu.classList.toggle('open')
                  }}
                >
                  <span className="section-title">{!collapsed && section.section}</span>
                  <i className={`fas fa-chevron-right arrow${open ? ' open' : ''}`}></i>
                </button>

                <ul className={`submenu${open ? ' open' : ''}`}>
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) => isActive ? 'active' : ''}
                        title={collapsed ? item.label : undefined}
                      >
                        <i className={item.icon}></i>
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
