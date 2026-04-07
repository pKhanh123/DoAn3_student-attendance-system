import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import organizationApi from '../../../api/organizationApi'
import type {
  Faculty,
  Department,
  Major,
} from '../../../api/organizationApi'

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getPages(current: number, total: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

// ─── Type aliases for existing types ─────────────────────────────────────────
type FacultyItem = Faculty
type DepartmentItem = Department
type MajorItem = Major

// ─── Faculty Modal ──────────────────────────────────────────────────────────
interface FacultyForm {
  facultyCode: string
  facultyName: string
  description?: string
}

interface FacultyFormErrors {
  facultyCode?: string
  facultyName?: string
}

// ─── Department Modal ───────────────────────────────────────────────────────
interface DepartmentForm {
  departmentCode: string
  departmentName: string
  facultyId: string
  description?: string
}

interface DepartmentFormErrors {
  departmentCode?: string
  departmentName?: string
  facultyId?: string
}

// ─── Major Modal ────────────────────────────────────────────────────────────
interface MajorForm {
  majorCode: string
  majorName: string
  facultyId: string
  departmentId?: string
  description?: string
}

interface MajorFormErrors {
  majorCode?: string
  majorName?: string
  facultyId?: string
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function OrganizationPage(): React.JSX.Element {
  const queryClient = useQueryClient()

  // ─── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'faculties' | 'departments' | 'majors'>('faculties')

  // ─── Faculty state ────────────────────────────────────────────────────────
  const [facultyPage, setFacultyPage] = useState<number>(1)
  const [facultySearch, setFacultySearch] = useState<string>('')
  const [showFacultyModal, setShowFacultyModal] = useState<boolean>(false)
  const [editingFaculty, setEditingFaculty] = useState<FacultyItem | null>(null)
  const [facultyForm, setFacultyForm] = useState<FacultyForm>({ facultyCode: '', facultyName: '', description: '' })
  const [facultyErrors, setFacultyErrors] = useState<FacultyFormErrors>({})

  // ─── Department state ─────────────────────────────────────────────────────
  const [deptPage, setDeptPage] = useState<number>(1)
  const [deptSearch, setDeptSearch] = useState<string>('')
  const [deptFacultyFilter, setDeptFacultyFilter] = useState<string>('')
  const [showDeptModal, setShowDeptModal] = useState<boolean>(false)
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null)
  const [deptForm, setDeptForm] = useState<DepartmentForm>({ departmentCode: '', departmentName: '', facultyId: '', description: '' })
  const [deptErrors, setDeptErrors] = useState<DepartmentFormErrors>({})

  // ─── Major state ──────────────────────────────────────────────────────────
  const [majorPage, setMajorPage] = useState<number>(1)
  const [majorSearch, setMajorSearch] = useState<string>('')
  const [majorFacultyFilter, setMajorFacultyFilter] = useState<string>('')
  const [showMajorModal, setShowMajorModal] = useState<boolean>(false)
  const [editingMajor, setEditingMajor] = useState<MajorItem | null>(null)
  const [majorForm, setMajorForm] = useState<MajorForm>({ majorCode: '', majorName: '', facultyId: '', departmentId: '', description: '' })
  const [majorErrors, setMajorErrors] = useState<MajorFormErrors>({})
  const [majorDeptFacultyId, setMajorDeptFacultyId] = useState<string>('')

  // ─── Fetch Departments for Major modal (by faculty) ─────────────────────
  const { data: majorDeptsRaw } = useQuery({
    queryKey: ['departments-by-faculty', majorDeptFacultyId],
    queryFn: () => organizationApi.getDepartmentsByFaculty(majorDeptFacultyId),
    enabled: Boolean(majorDeptFacultyId),
    staleTime: 60 * 1000,
  })
  const majorDeptOptions: DepartmentItem[] = majorDeptsRaw?.data?.data || []

  const pageSize = 15

  // ─── Fetch Faculty list ──────────────────────────────────────────────────
  const { data: facultyRaw, isLoading: facultyLoading } = useQuery({
    queryKey: ['faculties', facultyPage, facultySearch],
    queryFn: () =>
      organizationApi.getFaculties({
        page: facultyPage,
        pageSize,
        search: facultySearch || undefined,
      }),
    staleTime: 60 * 1000,
  })

  const facultyData: FacultyItem[] = facultyRaw?.data?.data || []
  const facultyTotal = facultyRaw?.data?.totalCount || 0
  const facultyTotalPages = Math.max(1, Math.ceil(facultyTotal / pageSize))

  const facultyStats = {
    total: facultyTotal,
  }

  // ─── Fetch Departments list ──────────────────────────────────────────────
  const { data: deptRaw, isLoading: deptLoading } = useQuery({
    queryKey: ['departments', deptPage, deptSearch, deptFacultyFilter],
    queryFn: () =>
      organizationApi.getDepartments({
        page: deptPage,
        pageSize,
        search: deptSearch || undefined,
      }),
    staleTime: 60 * 1000,
  })

  const deptData: DepartmentItem[] = deptRaw?.data?.data || []
  const deptTotal = deptRaw?.data?.totalCount || 0
  const deptTotalPages = Math.max(1, Math.ceil(deptTotal / pageSize))

  const deptFiltered = deptFacultyFilter
    ? deptData.filter((d) => d.facultyId === deptFacultyFilter)
    : deptData

  const deptStats = { total: deptTotal }

  // ─── Fetch Majors list ────────────────────────────────────────────────────
  const { data: majorRaw, isLoading: majorLoading } = useQuery({
    queryKey: ['majors', majorPage, majorSearch, majorFacultyFilter],
    queryFn: () => {
      if (majorFacultyFilter) {
        return organizationApi.getMajorsByFaculty(majorFacultyFilter).then((r: unknown) => {
          const res = r as { data: MajorItem[] }
          return { data: { data: res.data || [], totalCount: (res.data || []).length } }
        })
      }
      return organizationApi.getStructure().then((r: unknown) => {
        const res = r as { data: { majors: MajorItem[] } }
        return { data: { data: res.data?.majors || [], totalCount: (res.data?.majors || []).length } }
      })
    },
    staleTime: 60 * 1000,
  })

  const majorData: MajorItem[] = majorRaw?.data?.data || []
  const majorTotal = majorRaw?.data?.totalCount || 0
  const majorTotalPages = Math.max(1, Math.ceil(majorTotal / pageSize))

  const majorFiltered = majorFacultyFilter
    ? majorData.filter((m) => m.facultyId === majorFacultyFilter)
    : majorData

  const majorStats = { total: majorTotal }

  // ─── Faculty Mutations ────────────────────────────────────────────────────
  const facultyCreate = useMutation<unknown, ApiError, Omit<FacultyItem, 'facultyId' | 'createdAt' | 'updatedAt'>>({
    mutationFn: (data) => organizationApi.createFaculty(data),
    onSuccess: () => {
      toast.success('Tạo khoa thành công!')
      setShowFacultyModal(false)
      setFacultyForm({ facultyCode: '', facultyName: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['faculties'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi tạo khoa'),
  })

  const facultyUpdate = useMutation<unknown, ApiError, { id: string; data: Partial<FacultyItem> }>({
    mutationFn: ({ id, data }) => organizationApi.updateFaculty(id, data),
    onSuccess: () => {
      toast.success('Cập nhật khoa thành công!')
      setShowFacultyModal(false)
      setEditingFaculty(null)
      setFacultyForm({ facultyCode: '', facultyName: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['faculties'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi cập nhật khoa'),
  })

  const facultyDelete = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => organizationApi.deleteFaculty(id),
    onSuccess: () => {
      toast.success('Xóa khoa thành công!')
      queryClient.invalidateQueries({ queryKey: ['faculties'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi xóa khoa'),
  })

  // ─── Department Mutations ────────────────────────────────────────────────
  const deptCreate = useMutation<unknown, ApiError, Omit<DepartmentItem, 'departmentId' | 'createdAt' | 'updatedAt'>>({
    mutationFn: (data) => organizationApi.createDepartment(data),
    onSuccess: () => {
      toast.success('Tạo bộ môn thành công!')
      setShowDeptModal(false)
      setDeptForm({ departmentCode: '', departmentName: '', facultyId: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi tạo bộ môn'),
  })

  const deptUpdate = useMutation<unknown, ApiError, { id: string; data: Partial<DepartmentItem> }>({
    mutationFn: ({ id, data }) => organizationApi.updateDepartment(id, data),
    onSuccess: () => {
      toast.success('Cập nhật bộ môn thành công!')
      setShowDeptModal(false)
      setEditingDept(null)
      setDeptForm({ departmentCode: '', departmentName: '', facultyId: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi cập nhật bộ môn'),
  })

  const deptDelete = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => organizationApi.deleteDepartment(id),
    onSuccess: () => {
      toast.success('Xóa bộ môn thành công!')
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi xóa bộ môn'),
  })

  // ─── Major Mutations ─────────────────────────────────────────────────────
  const majorCreate = useMutation<unknown, ApiError, { majorCode: string; majorName: string; facultyId: string; departmentId?: string; description?: string }>({
    mutationFn: (data) => organizationApi.majorCreate(data),
    onSuccess: () => {
      toast.success('Tạo ngành thành công!')
      setShowMajorModal(false)
      setMajorForm({ majorCode: '', majorName: '', facultyId: '', departmentId: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['majors'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi tạo ngành'),
  })

  const majorUpdate = useMutation<unknown, ApiError, { id: string; data: Partial<MajorItem> }>({
    mutationFn: ({ id, data }) => organizationApi.majorUpdate(id, data),
    onSuccess: () => {
      toast.success('Cập nhật ngành thành công!')
      setShowMajorModal(false)
      setEditingMajor(null)
      setMajorForm({ majorCode: '', majorName: '', facultyId: '', departmentId: '', description: '' })
      queryClient.invalidateQueries({ queryKey: ['majors'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi cập nhật ngành'),
  })

  const majorDelete = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => organizationApi.majorDelete(id),
    onSuccess: () => {
      toast.success('Xóa ngành thành công!')
      queryClient.invalidateQueries({ queryKey: ['majors'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi khi xóa ngành'),
  })

  // ─── Faculty handlers ────────────────────────────────────────────────────
  function openFacultyCreate(): void {
    setEditingFaculty(null)
    setFacultyForm({ facultyCode: '', facultyName: '', description: '' })
    setFacultyErrors({})
    setShowFacultyModal(true)
  }

  function openFacultyEdit(f: FacultyItem): void {
    setEditingFaculty(f)
    setFacultyForm({ facultyCode: f.facultyCode || '', facultyName: f.facultyName || '', description: f.description || '' })
    setFacultyErrors({})
    setShowFacultyModal(true)
  }

  function validateFacultyForm(): boolean {
    const errs: FacultyFormErrors = {}
    if (!facultyForm.facultyCode.trim()) errs.facultyCode = 'Mã khoa bắt buộc'
    if (!facultyForm.facultyName.trim()) errs.facultyName = 'Tên khoa bắt buộc'
    setFacultyErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleFacultySave(): void {
    if (!validateFacultyForm()) return
    if (editingFaculty) {
      facultyUpdate.mutate({ id: editingFaculty.facultyId, data: facultyForm })
    } else {
      facultyCreate.mutate(facultyForm)
    }
  }

  function handleFacultyDelete(f: FacultyItem): void {
    if (!window.confirm(`Xóa khoa "${f.facultyName}"?`)) return
    facultyDelete.mutate(f.facultyId)
  }

  // ─── Department handlers ──────────────────────────────────────────────────
  function openDeptCreate(): void {
    setEditingDept(null)
    setDeptForm({ departmentCode: '', departmentName: '', facultyId: '', description: '' })
    setDeptErrors({})
    setShowDeptModal(true)
  }

  function openDeptEdit(d: DepartmentItem): void {
    setEditingDept(d)
    setDeptForm({
      departmentCode: d.departmentCode || '',
      departmentName: d.departmentName || '',
      facultyId: d.facultyId || '',
      description: d.description || '',
    })
    setDeptErrors({})
    setShowDeptModal(true)
  }

  function validateDeptForm(): boolean {
    const errs: DepartmentFormErrors = {}
    if (!deptForm.departmentCode.trim()) errs.departmentCode = 'Mã bộ môn bắt buộc'
    if (!deptForm.departmentName.trim()) errs.departmentName = 'Tên bộ môn bắt buộc'
    if (!deptForm.facultyId.trim()) errs.facultyId = 'Chọn khoa bắt buộc'
    setDeptErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleDeptSave(): void {
    if (!validateDeptForm()) return
    const payload = { ...deptForm, facultyId: deptForm.facultyId }
    if (editingDept) {
      deptUpdate.mutate({ id: editingDept.departmentId, data: payload })
    } else {
      deptCreate.mutate(payload)
    }
  }

  function handleDeptDelete(d: DepartmentItem): void {
    if (!window.confirm(`Xóa bộ môn "${d.departmentName}"?`)) return
    deptDelete.mutate(d.departmentId)
  }

  // ─── Major handlers ──────────────────────────────────────────────────────
  function openMajorCreate(): void {
    setEditingMajor(null)
    setMajorForm({ majorCode: '', majorName: '', facultyId: '', departmentId: '', description: '' })
    setMajorErrors({})
    setMajorDeptFacultyId('')
    setShowMajorModal(true)
  }

  function validateMajorForm(): boolean {
    const errs: MajorFormErrors = {}
    if (!majorForm.majorCode.trim()) errs.majorCode = 'Mã ngành bắt buộc'
    if (!majorForm.majorName.trim()) errs.majorName = 'Tên ngành bắt buộc'
    if (!majorForm.facultyId.trim()) errs.facultyId = 'Chọn khoa bắt buộc'
    setMajorErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleMajorSave(): void {
    if (!validateMajorForm()) return
    if (editingMajor) {
      majorUpdate.mutate({
        id: editingMajor.majorId,
        data: {
          majorCode: majorForm.majorCode,
          majorName: majorForm.majorName,
          facultyId: majorForm.facultyId,
          departmentId: majorForm.departmentId || undefined,
          description: majorForm.description,
        },
      })
    } else {
      majorCreate.mutate({
        majorCode: majorForm.majorCode,
        majorName: majorForm.majorName,
        facultyId: majorForm.facultyId,
        departmentId: majorForm.departmentId || undefined,
        description: majorForm.description,
      })
    }
  }

  // ─── Render helpers ──────────────────────────────────────────────────────
  function renderPagination(page: number, totalPages: number, setter: (p: number) => void, total: number) {
    const safePage = Math.min(page, totalPages)
    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Hiển thị {Math.min((safePage - 1) * pageSize + 1, total)}–{Math.min(safePage * pageSize, total)} / {total}
        </div>
        <div className="pagination">
          <button className="btn btn-sm" onClick={() => setter(Math.max(1, page - 1))} disabled={safePage === 1}>
            <i className="fas fa-chevron-left"></i> Trước
          </button>
          {getPages(safePage, totalPages).map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setter(p)}
            >
              {p}
            </button>
          ))}
          <button className="btn btn-sm" onClick={() => setter(Math.min(totalPages, page + 1))} disabled={safePage === totalPages}>
            Sau <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    )
  }

  // ─── Render Faculty Tab ───────────────────────────────────────────────────
  function renderFacultyTab() {
    const safePage = Math.min(facultyPage, facultyTotalPages)
    return (
      <div>
        {/* Stats */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h4 mb-0">{facultyStats.total}</div>
                <small className="text-muted">Tổng khoa</small>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <div className="filter-group" style={{ flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm khoa..."
              value={facultySearch}
              onChange={(e) => { setFacultySearch(e.target.value); setFacultyPage(1) }}
            />
          </div>
          <div className="filter-group">
            <button className="btn btn-primary" onClick={openFacultyCreate}>
              <i className="fas fa-plus"></i> Thêm khoa
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã khoa</th>
                    <th>Tên khoa</th>
                    <th>Mô tả</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyLoading ? (
                    <tr><td colSpan={4} className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                  ) : facultyData.length === 0 ? (
                    <tr><td colSpan={4} className="text-center">Chưa có khoa nào</td></tr>
                  ) : facultyData.map((f) => (
                    <tr key={f.facultyId}>
                      <td><strong>{f.facultyCode || '—'}</strong></td>
                      <td>{f.facultyName || '—'}</td>
                      <td><small className="text-muted">{f.description || '—'}</small></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => openFacultyEdit(f)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleFacultyDelete(f)}
                            disabled={facultyDelete.isPending}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {facultyTotal > 0 && renderPagination(facultyPage, facultyTotalPages, setFacultyPage, facultyTotal)}
          </div>
        </div>

        {/* Faculty Modal */}
        {showFacultyModal && (
          <div className="modal-overlay" onClick={() => setShowFacultyModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>{editingFaculty ? 'Chỉnh sửa khoa' : 'Thêm khoa mới'}</h4>
                <button className="btn-close" onClick={() => setShowFacultyModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label>Mã khoa <span className="text-danger">*</span></label>
                  <input
                    className={`form-control${facultyErrors.facultyCode ? ' is-invalid' : ''}`}
                    value={facultyForm.facultyCode}
                    onChange={(e) => setFacultyForm((f) => ({ ...f, facultyCode: e.target.value }))}
                    placeholder="VD: KHOA_CNTT"
                    disabled={!!editingFaculty}
                  />
                  {facultyErrors.facultyCode && <div className="invalid-feedback d-block">{facultyErrors.facultyCode}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Tên khoa <span className="text-danger">*</span></label>
                  <input
                    className={`form-control${facultyErrors.facultyName ? ' is-invalid' : ''}`}
                    value={facultyForm.facultyName}
                    onChange={(e) => setFacultyForm((f) => ({ ...f, facultyName: e.target.value }))}
                    placeholder="VD: Khoa Công nghệ thông tin"
                  />
                  {facultyErrors.facultyName && <div className="invalid-feedback d-block">{facultyErrors.facultyName}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Mô tả</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={facultyForm.description || ''}
                    onChange={(e) => setFacultyForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Mô tả về khoa..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowFacultyModal(false)}>Hủy</button>
                <button
                  className="btn btn-primary"
                  onClick={handleFacultySave}
                  disabled={facultyCreate.isPending || facultyUpdate.isPending}
                >
                  <i className="fas fa-save"></i> Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render Department Tab ──────────────────────────────────────────────
  function renderDeptTab() {
    const safePage = Math.min(deptPage, deptTotalPages)
    return (
      <div>
        {/* Stats */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h4 mb-0">{deptStats.total}</div>
                <small className="text-muted">Tổng bộ môn</small>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <div className="filter-group" style={{ flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm bộ môn..."
              value={deptSearch}
              onChange={(e) => { setDeptSearch(e.target.value); setDeptPage(1) }}
            />
          </div>
          <div className="filter-group">
            <select
              className="form-control"
              value={deptFacultyFilter}
              onChange={(e) => { setDeptFacultyFilter(e.target.value); setDeptPage(1) }}
            >
              <option value="">Tất cả khoa</option>
              {facultyData.map((f) => (
                <option key={f.facultyId} value={f.facultyId}>{f.facultyName || f.facultyCode}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={openDeptCreate}>
              <i className="fas fa-plus"></i> Thêm bộ môn
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã bộ môn</th>
                    <th>Tên bộ môn</th>
                    <th>Khoa</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {deptLoading ? (
                    <tr><td colSpan={4} className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                  ) : deptFiltered.length === 0 ? (
                    <tr><td colSpan={4} className="text-center">Chưa có bộ môn nào</td></tr>
                  ) : deptFiltered.map((d) => {
                    const fac = facultyData.find((f) => f.facultyId === d.facultyId)
                    return (
                      <tr key={d.departmentId}>
                        <td><strong>{d.departmentCode || '—'}</strong></td>
                        <td>{d.departmentName || '—'}</td>
                        <td>{fac ? (fac.facultyName || '—') : (d.facultyName || '—')}</td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-sm btn-primary" onClick={() => openDeptEdit(d)}>
                              <i className="fas fa-edit"></i> Sửa
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeptDelete(d)}
                              disabled={deptDelete.isPending}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {deptTotal > 0 && renderPagination(deptPage, deptTotalPages, setDeptPage, deptTotal)}
          </div>
        </div>

        {/* Department Modal */}
        {showDeptModal && (
          <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>{editingDept ? 'Chỉnh sửa bộ môn' : 'Thêm bộ môn mới'}</h4>
                <button className="btn-close" onClick={() => setShowDeptModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label>Mã bộ môn <span className="text-danger">*</span></label>
                  <input
                    className={`form-control${deptErrors.departmentCode ? ' is-invalid' : ''}`}
                    value={deptForm.departmentCode}
                    onChange={(e) => setDeptForm((f) => ({ ...f, departmentCode: e.target.value }))}
                    placeholder="VD: BM_CNTT"
                    disabled={!!editingDept}
                  />
                  {deptErrors.departmentCode && <div className="invalid-feedback d-block">{deptErrors.departmentCode}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Tên bộ môn <span className="text-danger">*</span></label>
                  <input
                    className={`form-control${deptErrors.departmentName ? ' is-invalid' : ''}`}
                    value={deptForm.departmentName}
                    onChange={(e) => setDeptForm((f) => ({ ...f, departmentName: e.target.value }))}
                    placeholder="VD: Bộ môn Công nghệ phần mềm"
                  />
                  {deptErrors.departmentName && <div className="invalid-feedback d-block">{deptErrors.departmentName}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Khoa <span className="text-danger">*</span></label>
                  <select
                    className={`form-control${deptErrors.facultyId ? ' is-invalid' : ''}`}
                    value={deptForm.facultyId}
                    onChange={(e) => setDeptForm((f) => ({ ...f, facultyId: e.target.value }))}
                  >
                    <option value="">— Chọn khoa —</option>
                    {facultyData.map((f) => (
                      <option key={f.facultyId} value={f.facultyId}>{f.facultyName || f.facultyCode}</option>
                    ))}
                  </select>
                  {deptErrors.facultyId && <div className="invalid-feedback d-block">{deptErrors.facultyId}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Mô tả</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={deptForm.description || ''}
                    onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeptModal(false)}>Hủy</button>
                <button
                  className="btn btn-primary"
                  onClick={handleDeptSave}
                  disabled={deptCreate.isPending || deptUpdate.isPending}
                >
                  <i className="fas fa-save"></i> Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render Major Tab ────────────────────────────────────────────────────
  function renderMajorTab() {
    const safePage = Math.min(majorPage, majorTotalPages)
    return (
      <div>
        {/* Stats */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h4 mb-0">{majorStats.total}</div>
                <small className="text-muted">Tổng ngành</small>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <div className="filter-group" style={{ flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm ngành..."
              value={majorSearch}
              onChange={(e) => { setMajorSearch(e.target.value); setMajorPage(1) }}
            />
          </div>
          <div className="filter-group">
            <select
              className="form-control"
              value={majorFacultyFilter}
              onChange={(e) => { setMajorFacultyFilter(e.target.value); setMajorPage(1) }}
            >
              <option value="">Tất cả khoa</option>
              {facultyData.map((f) => (
                <option key={f.facultyId} value={f.facultyId}>{f.facultyName || f.facultyCode}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={openMajorCreate}>
              <i className="fas fa-plus"></i> Thêm ngành
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã ngành</th>
                    <th>Tên ngành</th>
                    <th>Khoa</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {majorLoading ? (
                    <tr><td colSpan={4} className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                  ) : majorFiltered.length === 0 ? (
                    <tr><td colSpan={4} className="text-center">Chưa có ngành nào</td></tr>
                  ) : majorFiltered.map((m) => {
                    const fac = facultyData.find((f) => f.facultyId === m.facultyId)
                    return (
                      <tr key={m.majorId}>
                        <td><strong>{m.majorCode || '—'}</strong></td>
                        <td>{m.majorName || '—'}</td>
                        <td>{fac ? (fac.facultyName || '—') : (m.facultyName || '—')}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setEditingMajor(m)
                                setMajorForm({
                                  majorCode: m.majorCode || '',
                                  majorName: m.majorName || '',
                                  facultyId: m.facultyId || '',
                                  departmentId: (m as unknown as { departmentId?: string }).departmentId || '',
                                  description: m.description || '',
                                })
                                setMajorErrors({})
                                setShowMajorModal(true)
                              }}
                            >
                              <i className="fas fa-edit"></i> Sửa
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                if (!window.confirm(`Xóa ngành "${m.majorName}"?`)) return
                                majorDelete.mutate(m.majorId)
                              }}
                              disabled={majorDelete.isPending}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {majorTotal > 0 && renderPagination(majorPage, majorTotalPages, setMajorPage, majorTotal)}
          </div>
        </div>

        {/* Major Modal */}
        {showMajorModal && (
          <div className="modal-overlay" onClick={() => setShowMajorModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h4>{editingMajor ? 'Chỉnh sửa ngành' : 'Thêm ngành mới'}</h4>
                <button className="btn-close" onClick={() => setShowMajorModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label>Mã ngành <span className="text-danger">*</span></label>
                  <input
                    className={`form-control${majorErrors.majorCode ? ' is-invalid' : ''}`}
                    value={majorForm.majorCode}
                    onChange={(e) => setMajorForm((f) => ({ ...f, majorCode: e.target.value }))}
                    placeholder="VD: CNTT"
                    disabled={!!editingMajor}
                  />
                  {majorErrors.majorCode && <div className="invalid-feedback d-block">{majorErrors.majorCode}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Tên ngành <span className="text-danger">*</span></label>
                  <input
                    className={`form-control${majorErrors.majorName ? ' is-invalid' : ''}`}
                    value={majorForm.majorName}
                    onChange={(e) => setMajorForm((f) => ({ ...f, majorName: e.target.value }))}
                    placeholder="VD: Công nghệ thông tin"
                  />
                  {majorErrors.majorName && <div className="invalid-feedback d-block">{majorErrors.majorName}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Khoa <span className="text-danger">*</span></label>
                  <select
                    className={`form-control${majorErrors.facultyId ? ' is-invalid' : ''}`}
                    value={majorForm.facultyId}
                    onChange={(e) => {
                      const fid = e.target.value
                      setMajorForm((f) => ({ ...f, facultyId: fid, departmentId: '' }))
                      setMajorDeptFacultyId(fid)
                    }}
                  >
                    <option value="">— Chọn khoa —</option>
                    {facultyData.map((f) => (
                      <option key={f.facultyId} value={f.facultyId}>{f.facultyName || f.facultyCode}</option>
                    ))}
                  </select>
                  {majorErrors.facultyId && <div className="invalid-feedback d-block">{majorErrors.facultyId}</div>}
                </div>
                <div className="form-group mb-3">
                  <label>Bộ môn (tùy chọn)</label>
                  <select
                    className="form-control"
                    value={majorForm.departmentId}
                    onChange={(e) => setMajorForm((f) => ({ ...f, departmentId: e.target.value }))}
                    disabled={!majorForm.facultyId}
                  >
                    <option value="">— Không chọn —</option>
                    {majorDeptOptions.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>{d.departmentName || d.departmentCode}</option>
                    ))}
                  </select>
                  {!majorForm.facultyId && <small className="text-muted">Chọn khoa trước</small>}
                </div>
                <div className="form-group mb-3">
                  <label>Mô tả</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={majorForm.description || ''}
                    onChange={(e) => setMajorForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowMajorModal(false)}>Hủy</button>
                <button
                  className="btn btn-primary"
                  onClick={handleMajorSave}
                  disabled={majorCreate.isPending || majorUpdate.isPending}
                >
                  <i className="fas fa-save"></i> Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* Tab navigation */}
      <ul className="nav nav-tabs mb-3">
        <li key="faculties-tab" className="nav-item">
          <button
            className={`nav-link${activeTab === 'faculties' ? ' active' : ''}`}
            onClick={() => setActiveTab('faculties')}
          >
            <i className="fas fa-university me-1"></i> Khoa
          </button>
        </li>
        <li key="departments-tab" className="nav-item">
          <button
            className={`nav-link${activeTab === 'departments' ? ' active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            <i className="fas fa-building me-1"></i> Bộ môn
          </button>
        </li>
        <li key="majors-tab" className="nav-item">
          <button
            className={`nav-link${activeTab === 'majors' ? ' active' : ''}`}
            onClick={() => setActiveTab('majors')}
          >
            <i className="fas fa-graduation-cap me-1"></i> Ngành
          </button>
        </li>
      </ul>

      {/* Tab content */}
      {activeTab === 'faculties' && renderFacultyTab()}
      {activeTab === 'departments' && renderDeptTab()}
      {activeTab === 'majors' && renderMajorTab()}
    </div>
  )
}
