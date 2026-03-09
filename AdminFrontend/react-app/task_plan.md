# Task Plan: Migrate React/Vite JS → TypeScript

## Mục tiêu
Migrate toàn bộ source code từ JavaScript (.js/.jsx) sang TypeScript (.ts/.tsx)
Giữ nguyên logic, UI, functionality — chỉ thêm type annotations.

## Phạm vi (xác minh bằng scan thực tế)
- Path: `d:/Khanh/BTL API/EducationManagement/student-attendance-system/AdminFrontend/react-app/`
- Tổng: **80 files** cần migrate (xác nhận đúng)
  - API files: **16** (authApi, userApi, studentApi, lecturerApi, advisorApi, classApi, adminClassApi, subjectApi, lookupApi, timetableApi, attendanceApi, enrollmentApi, roomApi, scheduleApi, reportApi, index.js)
  - Page files: **57** (Admin 24 + Lecturer 8 + Advisor 12 + Student 11 + Auth 4)
  - Component files: **5** (Sidebar, Topbar, MainLayout, PlaceholderPage, NotificationBell)
  - Context: **1** (AuthContext)
  - Utils: **1** (constants.js)
  - Config: **2** (main.jsx, App.jsx)
  - `.js` files: 1 (src/utils/constants.js)
  - `.jsx` files: 79
- Route verification: **100% match** — mọi import trong App.jsx đều có file tương ứng
- Không có file `.ts`/`.tsx` nào tồn tại

## Quy tắc migrate
- `.js` → `.ts` (không có JSX)
- `.jsx` → `.tsx`
- Props components → typed interface
- API response → typed interfaces
- useState → generic `useState<T>`
- useQuery / useMutation → typed via queryFn return type
- Axios response → typed

---

## Các Phase

### Phase 1: Setup TypeScript ✅ (pending)
- [ ] Cài đặt dependencies: `typescript`, `@typescript-eslint/...`, `@types/*`
- [ ] Tạo `tsconfig.json` (strict: false để dễ migrate dần)
- [ ] Tạo `tsconfig.node.json` cho Vite
- [ ] Rename vite.config.js → vite.config.ts
- [ ] Update `index.html` reference nếu cần
- [ ] Verify `npm run dev` chạy được
- [ ] Verify `npm run build` không lỗi

### Phase 2: Shared Types & Interfaces 🔲
- [ ] Tạo `src/types/index.ts` — gom tất cả shared interfaces
  - User, Student, Lecturer, Advisor, Admin
  - Attendance, Schedule, Room, Subject, Class
  - ApiResponse, PaginatedResponse, ApiError
  - FormProps interfaces
- [ ] Tạo `src/types/api.ts` — typed axios response wrappers
- [ ] Export tất cả từ `src/types/index.ts`

### Phase 3: Utils & Constants 🔲
- [ ] Migrate `src/utils/constants.js` → `src/utils/constants.ts`

### Phase 4: API Layer 🔲
- [ ] Migrate `src/api/index.ts` (apiClient axios instance)
- [ ] Migrate 16 API files → .ts:
  - authApi, userApi, studentApi, lecturerApi, advisorApi
  - classApi, adminClassApi, subjectApi, lookupApi
  - timetableApi, attendanceApi, enrollmentApi, roomApi
  - scheduleApi, reportApi

### Phase 5: Context & Auth 🔲
- [ ] Migrate `src/contexts/AuthContext.jsx` → `src/contexts/AuthContext.tsx`

### Phase 6: Layout Components 🔲
- [ ] Migrate `src/components/layout/Sidebar.tsx`
- [ ] Migrate `src/components/layout/Topbar.tsx`
- [ ] Migrate `src/components/layout/MainLayout.tsx`
- [ ] Migrate `src/components/common/PlaceholderPage.tsx`
- [ ] Migrate `src/components/common/NotificationBell.tsx`

### Phase 7: Admin Pages (Phase A) — 10 files 🔲
- [ ] DashboardPage
- [ ] users: UserListPage, UserFormPage
- [ ] students: StudentListPage, StudentFormPage
- [ ] lecturers: LecturerManagePage
- [ ] advisors: AdvisorManagePage
- [ ] classes: ClassListPage, AdminClassListPage
- [ ] subjects: SubjectListPage

### Phase 8: Admin Pages (Phase B) — 14 files 🔲
- [ ] academic-years: AcademicYearListPage, AcademicYearFormPage
- [ ] school-years: SchoolYearListPage, SchoolYearFormPage
- [ ] roles: RoleListPage
- [ ] organization: OrganizationPage
- [ ] audit-logs: AuditLogPage
- [ ] notifications: NotificationPage
- [ ] enrollments: EnrollmentAdminPage
- [ ] registration-periods: RegistrationPeriodPage
- [ ] subject-prerequisites: SubjectPrerequisitePage
- [ ] timetable: AdminTimetablePage
- [ ] reports: AdminReportPage

### Phase 9: Lecturer Pages — 8 files 🔲
- [ ] DashboardPage
- [ ] classes: ClassListPage
- [ ] timetable: TimetablePage
- [ ] attendance: AttendancePage
- [ ] grades: GradeEntryPage, GradeFormulaPage
- [ ] appeals: GradeAppealPage
- [ ] reports: ReportPage

### Phase 10: Advisor Pages — 12 files 🔲
- [ ] DashboardPage
- [ ] students: StudentListPage, StudentDetailPage, StudentProgressPage
- [ ] enrollment: EnrollmentPage, EnrollmentApprovalPage
- [ ] exam-schedules: ExamSchedulePage, ExamScorePage
- [ ] appeals: GradeAppealPage
- [ ] grade-formula: GradeFormulaPage
- [ ] retakes: RetakePage
- [ ] warnings: WarningPage
- [ ] reports: ReportPage

### Phase 11: Student Pages — 11 files 🔲
- [ ] DashboardPage
- [ ] profile: ProfilePage
- [ ] enrollment: CourseRegisterPage
- [ ] attendance: AttendancePage
- [ ] grades: GradesPage
- [ ] exam-schedule: ExamSchedulePage
- [ ] timetable: TimetablePage
- [ ] appeals: GradeAppealPage
- [ ] retakes: RetakePage, RetakeRegisterPage
- [ ] reports: ReportPage

### Phase 12: Auth Pages — 4 files 🔲
- [ ] LoginPage
- [ ] ForgotPasswordPage
- [ ] VerifyOTPPage
- [ ] ResetPasswordPage

### Phase 13: App Entry Points 🔲
- [ ] Migrate `src/main.jsx` → `src/main.tsx`
- [ ] Migrate `src/App.jsx` → `src/App.tsx`
- [ ] Update `index.html` (nếu cần)
- [ ] Cleanup: xóa các .js/.jsx file gốc

### Phase 14: Final Verification 🔲
- [ ] Chạy `npm run build` — 0 error
- [ ] Chạy `npm run dev` — dev server hoạt động
- [ ] ESLint / TypeScript check không lỗi nghiêm trọng
- [ ] Test nhanh các trang chính

---

## Thứ tự ưu tiên migrate
1. Setup TypeScript (Phase 1) → Cần xong trước
2. Types/Interfaces (Phase 2) → Nền tảng cho tất cả
3. Utils (Phase 3) → Dependencies nhỏ
4. API (Phase 4) → Nhiều file, độc lập
5. Context (Phase 5) → Phụ thuộc types
6. Components → Phụ thuộc context & types
7. Pages → Phụ thuộc components & api
8. App entry → Cuối cùng
9. Cleanup → Verify hoàn tất

## Migration Strategy
- Strict mode: **OFF** ban đầu (để migrate nhanh)
- eslint: `@typescript-eslint/strict` bật sau Phase 7
- Mỗi phase: migrate xong → verify `npm run build`
- Commit sau mỗi phase hoặc mỗi 2-3 phases

## Errors Encountered
| Error | Phase | Resolution |
|-------|-------|------------|
| — | — | — |
