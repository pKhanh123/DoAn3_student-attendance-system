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

## Phase 5: Stores + Hooks + Core Components/Layout (IN PROGRESS)
> Stores: `.ts` | Hooks: `.ts` | Contexts/Layouts/Components: `.tsx`

### 5.1 Stores (`.ts`)
- [x] `src/stores/authStore.ts`
- [x] `src/stores/appStore.ts`
- [ ] `src/stores/sidebarStore.ts` — migrate từ `.js`
- [ ] `src/stores/queryStore.ts` — migrate từ `.js`
- [ ] `src/stores/userStore.ts` — migrate từ `.js`

### 5.2 Hooks (`.ts`)
- [x] `src/hooks/useAuth.ts`
- [x] `src/hooks/useFormatters.ts`
- [x] `src/hooks/useDebounce.ts`
- [ ] `src/hooks/usePagination.ts` — migrate từ `.js`
- [ ] `src/hooks/usePageTitle.ts` — migrate từ `.js`
- [ ] `src/hooks/useExport.ts` — migrate từ `.js`

### 5.3 Contexts (`.tsx`)
- [ ] `src/contexts/AuthContext.tsx` — migrate từ `.jsx`

### 5.4 Layout Components (`.tsx`)
- [ ] `src/components/layout/Sidebar.tsx`
- [ ] `src/components/layout/Topbar.tsx`
- [ ] `src/components/layout/MainLayout.tsx`

### 5.5 Common Components (`.tsx`)
- [ ] `src/components/common/NotificationBell.tsx`
- [ ] `src/components/common/PlaceholderPage.tsx`

---

## Phase 6: Admin Pages (`.tsx`) — 24 files
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

## Phase 11: App Entry Points
- [ ] `src/main.tsx` — migrate từ `.jsx`
- [ ] `src/App.tsx` — migrate từ `.jsx`
- [ ] Cleanup: xóa các `.js/.jsx` file gốc

## Phase 12: Final Verification
- [ ] `npm run build` — 0 error
- [ ] `npm run dev` — dev server hoạt động
- [ ] TypeScript check không lỗi nghiêm trọng

---

## Errors Encountered
| Error | Phase | Resolution |
|-------|-------|-----------|
| User hiểu nhầm .ts vs .tsx | Plan | Giải thích: `.ts` = logic thuần, `.tsx` = có JSX |
