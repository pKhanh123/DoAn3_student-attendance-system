# Findings: Migrate JS → TypeScript

## Tổng quan dự án hiện tại (xác minh scan thực tế)

### Cấu trúc thư mục chính xác
```
AdminFrontend/react-app/src/
├── api/                  # 16 files — Axios API calls
│   ├── index.js           # apiClient (axios instance)
│   ├── authApi.js, userApi.js, studentApi.js, lecturerApi.js
│   ├── advisorApi.js, classApi.js, adminClassApi.js
│   ├── subjectApi.js, lookupApi.js, timetableApi.js
│   ├── attendanceApi.js, enrollmentApi.js
│   ├── roomApi.js, scheduleApi.js, reportApi.js
├── components/
│   ├── common/           # PlaceholderPage.jsx, NotificationBell.jsx
│   └── layout/           # Sidebar.jsx, Topbar.jsx, MainLayout.jsx
├── contexts/             # AuthContext.jsx
├── pages/
│   ├── admin/            # 24 files (Dashboard, users, students, lecturers,
│   │                     #   advisors, classes, admin-classes, subjects,
│   │                     #   rooms, timetable, reports, academic-years,
│   │                     #   school-years, roles, organization,
│   │                     #   audit-logs, notifications, enrollments,
│   │                     #   registration-periods, subject-prerequisites)
│   ├── advisor/          # 12 files (Dashboard, students, enrollment,
│   │                     #   exam-schedules, appeals, grade-formula,
│   │                     #   retakes, warnings, reports)
│   ├── auth/             # 4 files (Login, ForgotPassword, VerifyOTP, ResetPassword)
│   ├── lecturer/         # 8 files (Dashboard, classes, timetable,
│   │                     #   attendance, grades, appeals, reports)
│   └── student/          # 11 files (Dashboard, profile, enrollment,
│                          #   attendance, grades, exam-schedule,
│                          #   timetable, appeals, retakes, reports)
├── utils/
│   └── constants.js       # ACADEMIC_RULES, API_BASE_URL, ROLES, ROLE_REDIRECTS,
│                          # STORAGE_KEYS, PAGINATION, ATTENDANCE_STATUS,
│                          # GRADE_STATUS, TIMETABLE_DAYS, TIMETABLE_SLOTS, SESSION_TIMEOUT
├── App.jsx               # All routes (100% match verified)
├── main.jsx              # QueryClient + BrowserRouter + AuthProvider + Toaster
├── hooks/                # EMPTY — chưa có custom hooks
└── routes/               # EMPTY — chưa có route files riêng
```

### Dependencies hiện tại
- react ^19.2.4, react-dom ^19.2.4
- @tanstack/react-query ^5.91.2
- axios ^1.13.6
- react-router-dom ^7.13.1
- recharts ^3.8.1
- zustand ^5.0.12
- xlsx ^0.18.5, file-saver ^2.0.5
- react-hot-toast ^2.6.0

### DevDependencies hiện tại
- vite ^5.4.21, @vitejs/plugin-react ^4.7.0
- eslint ^9.39.4, @eslint/js ^9.39.4
- eslint-plugin-react-hooks ^7.0.1, eslint-plugin-react-refresh ^0.5.2
- globals ^17.4.0
- @types/react ^19.2.14, @types/react-dom ^19.2.3

## Cần thêm cho TypeScript

### Dependencies cần cài
```
npm install --save-dev typescript @types/node @types/react-dom @types/file-saver @types/xlsx @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-typescript
```

### tsconfig.json cấu hình
```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,         // OFF ban đầu, bật sau
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### tsconfig.node.json
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": false
  },
  "include": ["vite.config.ts"]
}
```

## Key Interfaces cần định nghĩa

### Core Domain Types
- `User`, `Student`, `Lecturer`, `Advisor`, `Admin`
- `Attendance` (present/absent/late/excused)
- `Schedule`, `Room`, `Subject`, `Class`, `AcademicYear`, `SchoolYear`
- `Grade`, `GradeFormula`
- `Notification`, `AuditLog`
- `Report` (admin/lecturer/advisor/student)

### API Types
- `ApiResponse<T>` — standard wrapper
- `PaginatedResponse<T>` — with `total`, `page`, `pageSize`
- `ApiError` — { message, errors }

### Component Props Types
- `PageProps` — navigation, params từ react-router
- `ModalProps` — onClose, onConfirm, isOpen
- `FormProps<T>` — onSubmit, initialData, isLoading

## Phương pháp migrate

### 1. Bước cơ bản mỗi file
```
1. Rename .js → .ts hoặc .jsx → .tsx
2. Thêm import 'react' nếu thiếu
3. Thêm explicit return type cho functions
4. Thêm generic <T> cho useState/useRef
5. Export types từ src/types/index.ts
```

### 2. API files pattern
```typescript
// Before (JS)
export const getStudents = async (params) => {
  const res = await apiClient.get('/students', { params });
  return res.data;
};

// After (TS)
export const getStudents = async (params?: StudentQueryParams): Promise<ApiResponse<PaginatedResponse<Student>>> => {
  const res = await apiClient.get<PaginatedResponse<Student>>('/students', { params });
  return res.data;
};
```

### 3. Page components pattern
```typescript
// Before (JSX)
const StudentListPage = () => {
  const [filters, setFilters] = useState({ search: '', status: '' });

// After (TSX)
interface StudentListPageProps {}

const StudentListPage: React.FC<StudentListPageProps> = () => {
  const [filters, setFilters] = useState<StudentFilters>({ search: '', status: '' });
```

### 4. React Query pattern
```typescript
// useQuery typed
const { data } = useQuery({
  queryKey: ['students', filters],
  queryFn: () => studentApi.getAll(filters),
});

// useMutation typed
const mutation = useMutation({
  mutationFn: (data: CreateStudentPayload) => studentApi.create(data),
  onSuccess: () => { ... },
});
```

## Vite Config rename
- `vite.config.js` → `vite.config.ts` (cần đổi)
- Cập nhật `index.html` script tag: `type="module"` (đã có)

## ESLint Config cần update
- eslint.config.js hiện dùng flat config
- Cần thêm: `@typescript-eslint` parser
- Flat config với typescript: dùng `tsconfig` option trong rule
