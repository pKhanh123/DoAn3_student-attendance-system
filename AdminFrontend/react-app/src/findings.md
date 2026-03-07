# Findings & Decisions

## Requirements
- Convert AngularJS → ReactJS (Vite)
- Backend: ASP.NET Core at `https://localhost:7033`
- Role-based system: Admin, Lecturer, Advisor, Student
- Features: Authentication (JWT), Dashboard, User/Student/Lecturer/Advisor management, Attendance, Schedule, Reports
- Export: Excel (xlsx), PDF

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| React + Vite 5 | Fast HMR, modern tooling |
| React Query (`@tanstack/react-query`) | Data fetching, caching, loading states |
| Zustand | Lightweight state management |
| React Router v6 | Standard routing, nested routes |
| `useAuth()` context | JWT storage, login/logout, role check |
| Axios interceptor | Auto-refresh token on 401 |
| `window.location.href` for auth redirects | Reliable redirect, bypasses React Router |
| Vite proxy `/api-edu/*` → `https://localhost:7033` | CORS avoidance |
| react-hot-toast | Non-intrusive notifications |
| xlsx library | Excel export |
| Font Awesome icons | Match AngularJS design |

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + Vite 5 |
| Routing | React Router v6 |
| Data Fetching | @tanstack/react-query |
| State | Zustand |
| HTTP | Axios |
| UI | Custom CSS (from AngularJS main.css/dashboard.css) |
| Icons | Font Awesome 6 |
| Notifications | react-hot-toast |
| Excel | xlsx |
| Auth | JWT with refresh token |

## Project Structure

```
AdminFrontend/react-app/
├── src/
│   ├── api/
│   │   ├── index.js          # Axios instance, 401 interceptor
│   │   └── authApi.js         # Auth endpoints (login, register, forgot password, OTP)
│   ├── components/
│   │   ├── common/            # NotificationBell, LoadingSpinner, etc.
│   │   └── layout/            # Sidebar, Topbar, MainLayout
│   ├── contexts/
│   │   └── AuthContext.jsx    # Auth state, login/logout
│   ├── hooks/                 # Custom hooks (useAuth, useRoleAccess)
│   ├── pages/
│   │   ├── admin/             # Dashboard, UserManagement
│   │   ├── advisor/           # Dashboard, EnrollmentApproval
│   │   ├── auth/              # Login, Register, ForgotPassword, VerifyOTP, ResetPassword
│   │   ├── lecturer/          # Dashboard, TakeAttendance
│   │   └── student/           # Dashboard, Schedule, Attendance
│   ├── routes/               # Route configs
│   ├── utils/                # Helpers (date, role, etc.)
│   ├── App.jsx               # Route definitions
│   └── main.jsx             # Entry point
```

## Git History (on main)

| Hash | Date | Stage |
|------|------|-------|
| 3f7fcca | 2026-03-20 01:03 | init project |
| 4d6d0c3 | 2026-03-20 02:30 | Stage 1 - Init React + Vite |
| 8bb7b79 | 2026-03-21 12:23 | Stage 3 - Auth (ForgotPass, OTP, Reset) |
| 2c2d911 | 2026-03-21 16:14 | Stage 4 - MainLayout (Sidebar, Topbar) |
| 4b9de76 | 2026-03-22 00:51 | Stage 5 - Dashboard Pages |
| (pending) | (pending) | Stage 6 - User Management |

## AngularJS Reference Files (for conversion reference)

| File | Purpose |
|------|---------|
| `AdminFrontend/.../views/admin/dashboard.html` | Admin dashboard template |
| `AdminFrontend/.../controllers/admin/dashboardController.js` | Admin dashboard logic |
| `AdminFrontend/.../views/lecturer/dashboard.html` | Lecturer dashboard template |
| `AdminFrontend/.../views/advisor/dashboard.html` | Advisor dashboard template |
| `AdminFrontend/.../views/student/dashboard.html` | Student dashboard template |
| `AdminFrontend/.../controllers/sidebarController.js` | Sidebar logic |
| `AdminFrontend/.../controllers/topbarController.js` | Topbar logic |
| `AdminFrontend/.../directives/notificationBell.js` | Notification bell directive |
| `AdminFrontend/.../services/authService.js` | Auth service |
| `AdminFrontend/.../services/apiService.js` | API service |
| `AdminFrontend/.../assets/css/main.css` | Main CSS |
| `AdminFrontend/.../assets/css/dashboard.css` | Dashboard CSS |
| `AdminFrontend/.../assets/css/components.css` | Component CSS |

## API Endpoints (from AngularJS services)

### Auth
- `POST /api-edu/Auth/login` — Login
- `POST /api-edu/Auth/register` — Register
- `POST /api-edu/Auth/forgot-password` — Send OTP
- `POST /api-edu/Auth/verify-otp` — Verify OTP
- `POST /api-edu/Auth/reset-password` — Reset password
- `POST /api-edu/Auth/refresh-token` — Refresh token

### Users
- `GET /api-edu/Users` — List all users
- `POST /api-edu/Users` — Create user
- `PUT /api-edu/Users/{id}` — Update user
- `DELETE /api-edu/Users/{id}` — Delete user

### Students
- `GET /api-edu/Students` — List students
- `GET /api-edu/Students/{id}` — Get student detail
- `POST /api-edu/Students` — Create student
- `PUT /api-edu/Students/{id}` — Update student
- `DELETE /api-edu/Students/{id}` — Delete student
- `POST /api-edu/Students/import` — Import from Excel

### Lecturers
- `GET /api-edu/Lecturers` — List lecturers

### Attendance
- `GET /api-edu/Attendance` — List attendance records
- `POST /api-edu/Attendance` — Take attendance
- `PUT /api-edu/Attendance/{id}` — Update attendance

### Schedule
- `GET /api-edu/Schedule` — List schedule
- `GET /api-edu/Schedule/my` — My schedule (student/lecturer)

### Dashboard Stats
- `GET /api-edu/Dashboard/admin/stats`
- `GET /api-edu/Dashboard/lecturer/stats`
- `GET /api-edu/Dashboard/advisor/stats`
- `GET /api-edu/Dashboard/student/stats`

## Roles

| Role | Value | Label |
|------|-------|-------|
| Admin | 1 | Quản trị viên |
| Lecturer | 2 | Giảng viên |
| Advisor | 3 | Cố vấn học tập |
| Student | 4 | Sinh viên |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| GitHub shows wrong date (author date vs committer date) | Use `GIT_COMMITTER_DATE` + `GIT_AUTHOR_DATE` env vars |
| Cherry-pick conflict between Stage 2 & 3 | `--theirs` for conflicting files (keep Stage 2 version) |
| Working directory reverted after `git reset --hard` | Cherry-pick existing commit objects then amend date |
| Auth redirect using useNavigate() failed | Use `window.location.href = '/auth/login'` |

## Resources
- Backend API: `https://localhost:7033`
- GitHub repo: `https://github.com/pKhanh123/DoAn3_student-attendance-system`
- AngularJS source: `AdminFrontend/` (trong project folder)
- planning-with-files skill: `~/.agents/skills/planning-with-files/`
