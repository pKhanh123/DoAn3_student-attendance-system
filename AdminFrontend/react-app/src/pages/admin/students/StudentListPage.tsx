import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import studentApi from '../../../api/studentApi'
import { useAuth } from '../../../hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  studentId: string
  studentCode: string
  fullName: string
  email: string
  phone?: string | null
  facultyName?: string
  majorName?: string
  isActive?: boolean
}

interface Faculty {
  facultyId: string | number
  facultyName: string
}

interface Major {
  majorId: string | number
  majorName: string
}

interface PaginationMeta {
  totalPages?: number
  totalCount?: number
}

interface StudentsResponse {
  data?: Student[] | { data?: Student[]; items?: Student[] }
  items?: Student[]
  pagination?: PaginationMeta
}

interface ImportRow {
  row: number
  code: string
  errors: string[]
}

interface ApiError {
  response?: {
    data?: {
      message?: string
    } | string
  }
}

// Declare xlsx on window for import/export
declare global {
  interface Window {
    XLSX: {
      read: (data: Uint8Array, opts: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> }
      utils: {
        sheet_to_json: (sheet: unknown, opts: { defval: string }) => Record<string, string>[]
        aoa_to_sheet: (data: (string | null)[][]) => unknown
        book_new: () => unknown
        book_append_sheet: (wb: unknown, ws: unknown, name: string) => void
        writeFile: (wb: unknown, filename: string) => void
      }
      writeFile: (wb: unknown, filename: string) => void
    }
  }
}

// ── Pagination helpers ─────────────────────────────────────────────────────────

function getPages(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function StudentListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [search, setSearch] = useState<string>('')
  const [filterFaculty, setFilterFaculty] = useState<string>('')
  const [filterMajor, setFilterMajor] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  // Import modal state
  const [showImport, setShowImport] = useState<boolean>(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<Record<string, string | null>[]>([])
  const [importErrors, setImportErrors] = useState<ImportRow[]>([])
  const [validCount, setValidCount] = useState<number>(0)
  const [errorCount, setErrorCount] = useState<number>(0)

  // Fetch students
  const { data: students = [], isLoading } = useQuery<StudentsResponse>({
    queryKey: ['students', page, search, filterFaculty, filterMajor, filterStatus],
    queryFn: () => {
      const params: Record<string, string | number> = { page, pageSize }
      if (search) params.search = search
      if (filterFaculty) params.facultyId = filterFaculty
      if (filterMajor) params.majorId = filterMajor
      return studentApi.getAll(params).then((r) => {
        const d = (r.data as { data?: unknown } | unknown) as StudentsResponse
        const raw = (d as { data?: StudentsResponse }).data || (d as StudentsResponse).items || (d as StudentsResponse) || {}
        if (Array.isArray(raw)) {
          return { data: raw, pagination: {} }
        }
        return {
          data: (raw as { data?: Student[]; items?: Student[] }).data || (raw as { items?: Student[] }).items || [],
          pagination: (raw as { pagination?: PaginationMeta }).pagination || {},
        }
      })
    },
    staleTime: 30 * 1000,
  })

  const studentsData: Student[] = Array.isArray((students as unknown as Student[]))
    ? (students as unknown as Student[])
    : ((students as unknown as { data?: Student[] }).data || [])

  const pagination: PaginationMeta = (students as unknown as { pagination?: PaginationMeta }).pagination || {}

  // Fetch faculties
  const { data: faculties = [] } = useQuery<Faculty[]>({
    queryKey: ['faculties'],
    queryFn: () => studentApi.getFaculties().then((r) => {
      const d = r.data as { data?: Faculty[] } | Faculty[]
      return (typeof d === 'object' && !Array.isArray(d) ? (d as { data?: Faculty[] }).data : d) || []
    }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch majors when faculty changes
  const { data: majors = [] } = useQuery<Major[]>({
    queryKey: ['majors', filterFaculty],
    queryFn: () => filterFaculty
      ? studentApi.getMajors(Number(filterFaculty)).then((r) => {
          const d = r.data as { data?: Major[] } | Major[]
          return (typeof d === 'object' && !Array.isArray(d) ? (d as { data?: Major[] }).data : d) || []
        })
      : Promise.resolve([]),
    enabled: Boolean(filterFaculty),
    staleTime: 5 * 60 * 1000,
  })

  // Delete mutation
  const deleteMutation = useMutation<unknown, ApiError, string>({
    mutationFn: (id: string) => studentApi.delete({ studentId: id, deletedBy: String(user?.userId ?? '') }),
    onSuccess: () => {
      toast.success('Xóa sinh viên thành công!')
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (error: ApiError) => {
      const msg =
        (typeof error.response?.data === 'object' && error.response?.data?.message) ||
        (typeof error.response?.data === 'string' ? error.response?.data : 'Không thể xóa sinh viên.')
      toast.error(msg as string)
    },
  })

  // Import mutation
  const importMutation = useMutation<unknown, ApiError, Record<string, string | null>[]>({
    mutationFn: (studentsToImport: Record<string, string | null>[]) =>
      studentApi.importBatch(studentsToImport),
    onSuccess: (res) => {
      const result = (res as unknown as { data?: { successCount?: number; errorCount?: number } }).data || {}
      const ok = result.successCount || 0
      const fail = result.errorCount || 0
      if (fail > 0) {
        toast.error(`Import ${ok}/${ok + fail} sinh viên. ${fail} lỗi.`)
      } else {
        toast.success(`Import thành công ${ok} sinh viên!`)
      }
      setShowImport(false)
      resetImport()
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (error: ApiError) => {
      const msg =
        (typeof error.response?.data === 'object' && error.response?.data?.message) ||
        (typeof error.response?.data === 'string' ? error.response?.data : 'Lỗi khi import.')
      toast.error(msg as string)
    },
  })

  // Client-side filter (for status since backend may not support)
  const filtered = studentsData.filter((s: Student) => {
    const s2 = search.toLowerCase()
    const matchSearch = !s2 ||
      (s.studentCode || '').toLowerCase().includes(s2) ||
      (s.fullName || '').toLowerCase().includes(s2) ||
      (s.email || '').toLowerCase().includes(s2)
    const matchStatus = filterStatus === '' ||
      (filterStatus === 'true' ? s.isActive : !s.isActive)
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, pagination.totalPages || Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function resetFilters(): void {
    setSearch('')
    setFilterFaculty('')
    setFilterMajor('')
    setFilterStatus('')
    setPage(1)
  }

  function handleFacultyChange(val: string): void {
    setFilterFaculty(val)
    setFilterMajor('')
    setPage(1)
  }

  function handleDelete(id: string): void {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) return
    deleteMutation.mutate(id)
  }

  // Import handlers
  function resetImport(): void {
    setImportFile(null)
    setImportPreview([])
    setImportErrors([])
    setValidCount(0)
    setErrorCount(0)
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        importXlsx(data)
      } catch {
        toast.error('Không thể đọc file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  async function importXlsx(data: Uint8Array): Promise<void> {
    const XLSX = window.XLSX
    if (!XLSX) { toast.error('Thư viện xlsx chưa được load.'); return }

    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })

    if (!rows.length) { toast.error('File trống.'); return }

    const valid: Record<string, string | null>[] = []
    const invalid: ImportRow[] = []
    rows.forEach((row, idx) => {
      const code = (row as Record<string, string>)['Mã SV'] || (row as Record<string, string>)['Mã SV (*)'] || ''
      const name = (row as Record<string, string>)['Họ tên'] || (row as Record<string, string>)['Họ tên (*)'] || ''
      const email = (row as Record<string, string>)['Email'] || (row as Record<string, string>)['Email (*)'] || ''
      const majorId = (row as Record<string, string>)['Mã Ngành'] || (row as Record<string, string>)['Mã Ngành (*)'] || ''
      const dob = (row as Record<string, string>)['Ngày sinh'] || ''
      const gender = (row as Record<string, string>)['Giới tính'] || ''
      const phone = (row as Record<string, string>)['Số điện thoại'] || ''
      const address = (row as Record<string, string>)['Địa chỉ'] || ''
      const ay = (row as Record<string, string>)['Niên khóa'] || ''

      const errors: string[] = []
      if (!code || !/^SV\d+$/i.test(String(code).trim())) errors.push('Mã SV không hợp lệ (cần SV + số)')
      if (!name) errors.push('Họ tên trống')
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) errors.push('Email không hợp lệ')
      if (!majorId) errors.push('Mã ngành trống')

      if (errors.length > 0) {
        invalid.push({ row: idx + 2, code, errors })
      } else {
        valid.push({
          studentCode: String(code).trim(),
          fullName: String(name).trim(),
          email: String(email).trim(),
          phone: String(phone).trim() || null,
          dateOfBirth: dob ? new Date(dob).toISOString() : null,
          gender: String(gender).trim() || null,
          address: String(address).trim() || null,
          majorId: String(majorId).trim(),
          academicYearId: String(ay).trim() || null,
        })
      }
    })

    setImportPreview(valid)
    setImportErrors(invalid)
    setValidCount(valid.length)
    setErrorCount(invalid.length)
  }

  function handleImport(): void {
    if (!importPreview.length) { toast.error('Không có dữ liệu hợp lệ.'); return }
    importMutation.mutate(importPreview)
  }

  function downloadTemplate(): void {
    const headers = ['Mã SV (*)', 'Họ tên (*)', 'Email (*)', 'Số điện thoại', 'Ngày sinh', 'Giới tính', 'Địa chỉ', 'Mã Ngành (*)', 'Niên khóa']
    const sample = ['SV2024001', 'Nguyễn Văn A', 'nguyenvana@student.edu.vn', '0912345678', '2003-05-15', 'Nam', 'TP.HCM', 'MAJ001', 'AY2024']
    const ws = window.XLSX.utils.aoa_to_sheet([headers, sample])
    const wb = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(wb, ws, 'SinhVien')
    window.XLSX.writeFile(wb, 'MauNhapSinhVien.xlsx')
  }

  function handleExport(): void {
    const XLSX = window.XLSX
    if (!XLSX) { toast.error('Thư viện xlsx chưa được load.'); return }
    const cols: { label: string; f: (r: Student) => string | undefined | null }[] = [
      { label: 'Mã SV', f: r => r.studentCode },
      { label: 'Họ tên', f: r => r.fullName },
      { label: 'Email', f: r => r.email },
      { label: 'SĐT', f: r => r.phone },
      { label: 'Khoa', f: r => r.facultyName },
      { label: 'Ngành', f: r => r.majorName },
      { label: 'Trạng thái', f: r => r.isActive ? 'Hoạt động' : 'Khóa' },
    ]
    const rows = filtered.map(r => cols.map(c => c.f(r)))
    const ws = XLSX.utils.aoa_to_sheet([['DANH SÁCH SINH VIÊN'], ...cols.map(c => [c.label]), ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SinhVien')
    XLSX.writeFile(wb, `DanhSachSinhVien_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input
            type="text" className="form-control"
            placeholder="Tìm kiếm theo mã SV, tên, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="filter-group">
          <select className="form-control" value={filterFaculty} onChange={e => handleFacultyChange(e.target.value)}>
            <option value="">Tất cả khoa</option>
            {faculties.map(f => <option key={String(f.facultyId)} value={String(f.facultyId)}>{f.facultyName}</option>)}
          </select>
          <select className="form-control" value={filterMajor} onChange={e => { setFilterMajor(e.target.value); setPage(1) }} disabled={!filterFaculty}>
            <option value="">Tất cả ngành</option>
            {majors.map(m => <option key={String(m.majorId)} value={String(m.majorId)}>{m.majorName}</option>)}
          </select>
          <select className="form-control" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Khóa</option>
          </select>
          <button className="btn btn-secondary" onClick={resetFilters}><i className="fas fa-redo"></i> Đặt lại</button>
          <button className="btn btn-success" onClick={() => setShowImport(true)}><i className="fas fa-file-import"></i> Import</button>
          <button className="btn btn-info" onClick={handleExport}><i className="fas fa-file-export"></i> Export</button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/students/new')}>
            <i className="fas fa-plus"></i> Thêm SV
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => { setShowImport(false); resetImport() }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h4>Import Sinh viên từ Excel</h4>
              <button className="btn-close" onClick={() => { setShowImport(false); resetImport() }}>×</button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <button className="btn btn-outline-primary btn-sm" onClick={downloadTemplate}>
                  <i className="fas fa-download"></i> Tải mẫu Excel
                </button>
              </div>
              <div className="mb-3">
                <label className="form-label">Chọn file Excel (.xlsx, .xls)</label>
                <input type="file" className="form-control" accept=".xlsx,.xls" onChange={handleFileChange} />
              </div>
              {(validCount > 0 || errorCount > 0) && (
                <div className="alert alert-info">
                  <i className="fas fa-check-circle text-success"></i> Hợp lệ: {validCount} &nbsp;
                  <i className="fas fa-times-circle text-danger"></i> Lỗi: {errorCount}
                </div>
              )}
              {importErrors.length > 0 && (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <table className="table table-sm table-bordered">
                    <thead className="table-danger"><tr><th>Dòng</th><th>Mã SV</th><th>Lỗi</th></tr></thead>
                    <tbody>
                      {importErrors.map((err, i) => (
                        <tr key={i}>
                          <td>{err.row}</td><td>{err.code}</td>
                          <td>{err.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowImport(false); resetImport() }}>Hủy</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={!validCount || importMutation.isPending}>
                {importMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i> Đang import...</> : <>Import {validCount} sinh viên</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã SV</th><th>Họ tên</th><th>Email</th><th>SĐT</th>
                  <th>Khoa</th><th>Ngành</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="text-center">Không có dữ liệu</td></tr>
                ) : (
                  paginated.map(s => (
                    <tr key={s.studentId}>
                      <td><strong>{s.studentCode}</strong></td>
                      <td>{s.fullName}</td>
                      <td>{s.email}</td>
                      <td>{s.phone}</td>
                      <td>{s.facultyName}</td>
                      <td>{s.majorName}</td>
                      <td>
                        <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {s.isActive ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/students/${s.studentId}/edit`)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.studentId)}>
                            <i className="fas fa-trash"></i> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Hiển thị {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} / {pagination.totalCount || filtered.length}
              </div>
              <div className="pagination">
                <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <i className="fas fa-chevron-left"></i> Trước
                </button>
                {getPages(safePage, totalPages).map(p => (
                  <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  Sau <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
