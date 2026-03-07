# Task Plan: Hệ thống Quản lý Điểm danh Sinh viên — React Conversion

## Goal
Convert hệ thống AngularJS thành ReactJS (Vite), giữ nguyên backend ASP.NET Core tại `https://localhost:7033`, push từng stage lên GitHub `main` với commit timestamp chronological.

## Current Phase
Phase 6 (User Management Pages)

## Completed Phases

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| Stage 1 | Init React + Vite, project structure | ✅ complete |
| Stage 2 | Auth Pages (Login, Register) | ✅ complete |
| Stage 3 | Auth Pages (Forgot Password, OTP, Reset) | ✅ complete |
| Stage 4 | MainLayout (Sidebar, Topbar, NotificationBell) | ✅ complete |
| Stage 5 | Dashboard Pages (Admin, Lecturer, Advisor, Student) | ✅ complete |

## Phases

### Phase 6: User Management Pages
- [ ] Admin: User List page với search, filter theo role
- [ ] Admin: Create/Edit User modal hoặc page
- [ ] Admin: Delete user
- [ ] Commit với fake timestamp

### Phase 7: Student Management Pages
- [ ] Admin/Lecturer: Student List page với search, filter
- [ ] Admin: Student CRUD (Import Excel, Create, Edit, Delete)
- [ ] Advisor: View assigned students
- [ ] Commit với fake timestamp

### Phase 8: Lecturer & Advisor Management
- [ ] Admin: Lecturer CRUD
- [ ] Admin: Advisor CRUD
- [ ] Admin: Assign students to advisors
- [ ] Commit với fake timestamp

### Phase 9: Class & Subject Management
- [ ] Admin: Class management (CRUD)
- [ ] Admin: Subject management (CRUD)
- [ ] Admin: Assign subjects to lecturers
- [ ] Commit với fake timestamp

### Phase 10: Attendance Management
- [ ] Lecturer: Take attendance page (scan/manual)
- [ ] Lecturer: Attendance history per class
- [ ] Student: View own attendance
- [ ] Commit với fake timestamp

### Phase 11: Schedule & Room Management
- [ ] Admin: Schedule management
- [ ] Admin: Room management
- [ ] Commit với fake timestamp

### Phase 12: Reports & Export
- [ ] Export attendance report (Excel/PDF)
- [ ] Dashboard charts cho Admin
- [ ] Commit với fake timestamp

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Fake commit timestamp | Để thầy thấy progress chronological trên GitHub |
| Giữ backend ASP.NET Core | Tránh break API, chuyển từng stage |
| React Query cho data fetching | Caching, loading states, refetch tự động |
| Zustand cho state | Nhẹ, đơn giản, không cần Redux |
| Vite proxy `/api-edu/*` | Tránh CORS, giữ token cookie |
| Axios interceptor cho 401 | Auto-refresh token hoặc redirect login |

## Notes
- GitHub main: `https://github.com/pKhanh123/DoAn3_student-attendance-system`
- Backend: `https://localhost:7033`
- Đã force push nhiều lần — cần git reflog để recover nếu cần
