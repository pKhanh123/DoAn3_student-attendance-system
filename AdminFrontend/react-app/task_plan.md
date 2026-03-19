# Task Plan: Migrate React/Vite JS → TypeScript

## Quy tắc đặt tên file
- **`.ts`** → Logic thuần (stores, hooks, api, types, utils)
- **`.tsx`** → React component có JSX markup (pages, components, layouts, contexts)

## Mục tiêu
Migrate toàn bộ source code từ JavaScript (.js/.jsx) sang TypeScript (.ts/.tsx)
Giữ nguyên logic, UI, functionality — chỉ thêm type annotations.

---

## Phase 1: Setup TypeScript ✅
- [x] `tsconfig.json`, `eslint.config.js`, `@typescript-eslint/parser`
- [x] `vite.config.ts`
- [x] Dependencies: `typescript`, `@typescript-eslint/*`

## Phase 2: Shared Types & Interfaces ✅
- [x] `src/types/index.ts` — Tất cả shared interfaces
- [x] `src/api.ts` — Typed axios instance

## Phase 3+4: Utils + API Layer ✅
- [x] `src/utils/constants.ts`
- [x] `src/api/*.ts` — 16 API files

---

## Phase 5: Stores + Hooks + Core Components/Layout ✅
> Stores: `.ts` | Hooks: `.ts` | Contexts/Layouts/Components: `.tsx`

### 5.1 Stores (`.ts`/`.tsx`)
- [x] `src/stores/authStore.tsx`
- [x] `src/stores/appStore.ts`
- [x] `src/stores/sidebarStore.tsx`
- [x] `src/stores/queryStore.tsx`
- [x] `src/stores/userStore.tsx`

### 5.2 Hooks (`.ts`/`.tsx`)
- [x] `src/hooks/useAuth.ts`
- [x] `src/hooks/useFormatters.ts`
- [x] `src/hooks/useDebounce.ts`
- [x] `src/hooks/usePagination.tsx`
- [x] `src/hooks/usePageTitle.tsx`
- [x] `src/hooks/useExport.tsx`

### 5.3 Contexts (`.tsx`)
- [x] `src/contexts/AuthContext.tsx`

### 5.4 Layout Components (`.tsx`)
- [x] `src/components/layout/Sidebar.tsx`
- [x] `src/components/layout/Topbar.tsx`
- [x] `src/components/layout/MainLayout.tsx`

### 5.5 Common Components (`.tsx`)
- [x] `src/components/common/NotificationBell.tsx`
- [x] `src/components/common/PlaceholderPage.tsx`

---

## Phase 6: Admin Pages (`.tsx`) — 24 files (CHƯA LÀM)
- [ ] Phase A: DashboardPage, UserListPage, UserFormPage, StudentListPage, StudentFormPage, LecturerManagePage, AdvisorManagePage, ClassListPage, AdminClassListPage, SubjectListPage (10 files)
- [ ] Phase B: AcademicYearListPage, AcademicYearFormPage, SchoolYearListPage, SchoolYearFormPage, RoleListPage, OrganizationPage, AuditLogPage, NotificationPage, EnrollmentAdminPage, RegistrationPeriodPage, SubjectPrerequisitePage, AdminTimetablePage, AdminReportPage (14 files)

## Phase 7: Lecturer Pages (`.tsx`) — 8 files
- [ ] DashboardPage, ClassListPage, TimetablePage, AttendancePage, GradeEntryPage, GradeFormulaPage, GradeAppealPage, ReportPage

## Phase 8: Advisor Pages (`.tsx`) — 12 files
- [ ] DashboardPage, StudentListPage, StudentDetailPage, StudentProgressPage, EnrollmentPage, EnrollmentApprovalPage, ExamSchedulePage, ExamScorePage, GradeAppealPage, GradeFormulaPage, RetakePage, WarningPage, ReportPage

## Phase 9: Student Pages (`.tsx`) — 11 files
- [ ] DashboardPage, ProfilePage, CourseRegisterPage, AttendancePage, GradesPage, ExamSchedulePage, TimetablePage, GradeAppealPage, RetakePage, RetakeRegisterPage, ReportPage

## Phase 10: Auth Pages (`.tsx`) — 4 files
- [ ] LoginPage, ForgotPasswordPage, VerifyOTPPage, ResetPasswordPage

## Phase 11: App Entry Points ✅
- [x] `src/main.tsx`
- [x] `src/App.tsx`
- [x] Cleanup: xóa các `.js/.jsx` file trùng lặp (17 files)

## Phase 12: Final Verification ✅
- [x] `npm run build` — ✅ 941 modules, 0 error
- [ ] `npm run dev` — dev server hoạt động
- [ ] TypeScript check không lỗi nghiêm trọng

---

## Errors Encountered
| Error | Phase | Resolution |
|-------|-------|-----------|
| User hiểu nhầm .ts vs .tsx | Plan | Giải thích: `.ts` = logic thuần, `.tsx` = có JSX |
