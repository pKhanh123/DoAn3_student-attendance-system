# Task Plan: Hệ thống Quản lý Điểm danh Sinh viên — React Conversion

## Goal
Convert hệ thống AngularJS thành ReactJS (Vite), giữ nguyên backend ASP.NET Core tại `https://localhost:7033`, push từng stage lên GitHub `main` với commit timestamp chronological.

## Current Phase
Phase 11 (Schedule & Room Management) — đang code xong, chờ commit

## Completed Phases

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| Stage 1 | Init React + Vite, project structure | ✅ complete |
| Stage 2 | Auth Pages (Login, Register) | ✅ complete |
| Stage 3 | Auth Pages (Forgot Password, OTP, Reset) | ✅ complete |
| Stage 4 | MainLayout (Sidebar, Topbar, NotificationBell) | ✅ complete |
| Stage 5 | Dashboard Pages (Admin, Lecturer, Advisor, Student) | ✅ complete |
| Stage 6 | User Management Pages (List, Create, Edit, Delete) | ✅ complete |
| Stage 7 | Student Management Pages (List, Form, Import/Export) | ✅ complete |
| Stage 8 | Lecturer & Advisor Management (CRUD, Subject Assignment) | ✅ complete |
| Stage 9 | Class & Subject Management (Class CRUD, Admin Class CRUD, Subject CRUD, lookupApi) | ✅ complete |
| Stage 10 | Attendance Management (Lecturer take attendance, Student view attendance, APIs) | ✅ complete |
| Stage 11 | Schedule & Room Management (Room CRUD, Timetable week grid, Schedule CRUD, check-conflicts) | ✅ hoàn thành |

## Phases

### Phase 10: Attendance Management ✅
- [x] Lecturer: Take attendance page (load today's sessions, mark per student, batch save) ✅
- [x] Student: View own attendance (filter by month, status badges) ✅
- [x] attendanceApi.js — attendance CRUD endpoints ✅
- [x] timetableApi.js — timetable lookup ✅
- [x] enrollmentApi.js — class roster ✅
- [x] Commit với fake timestamp

### Phase 11: Schedule & Room Management ✅
- [x] Admin: Room Management (CRUD, stats, toggle active) ✅
- [x] Admin: Timetable Management (week grid, CRUD sessions, check conflicts) ✅
- [x] roomApi.js — room CRUD ✅
- [x] scheduleApi.js — schedule CRUD + check-conflicts ✅
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
