import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import classApi from '../../../api/classApi'
import lookupApi from '../../../api/lookupApi'

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
  }
}

interface Pagination {
  totalPages?: number
  totalCount?: number
}

interface ClassItem {
  classId: string
  classCode?: string
  className?: string
  subjectId?: string
  subjectName?: string
  lecturerId?: string
  lecturerName?: string
  semester?: number | string
  academicYearId?: string
  academicYearName?: string
  maxStudents?: number
  currentEnrollment?: number
  currentStudents?: number
}

interface SubjectItem {
  subjectId: string
  subjectName: string
}

interface LecturerItem {
  lecturerId: string
  fullName: string
}

interface AcademicYearItem {
  academicYearId: string
  yearName: string
}

interface ClassForm {
  classCode: string
  className: string
  subjectId: string
  lecturerId: string
  semester: string
  academicYearId: string
  maxStudents: number | string
}

interface FormErrors {
  classCode?: string
  className?: string
  subjectId?: string
  academicYearId?: string
}

interface ClassQueryData {
  data: ClassItem[]
  pagination: Pagination
}

function getPages(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function ClassListPage(): React.JSX.Element {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState<string>('')
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [filterLecturer, setFilterLecturer] = useState<string>('')
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [form, setForm] = useState<ClassForm>({
    classCode: '', className: '', subjectId: '', lecturerId: '',
    semester: '1', academicYearId: '', maxStudents: 50,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const semesters = [
    { value: '1', label: 'Học kỳ 1' },
    { value: '2', label: 'Học kỳ 2' },
    { value: '3', label: 'Học kỳ hè' },
  ]

  const { data: rawData = { data: [], pagination: {} }, isLoading } = useQuery<ClassQueryData>({
    queryKey: ['classes', page, search, filterSubject, filterLecturer, filterAcademicYear],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize }
      if (search) params.search = search
      if (filterSubject) params.subjectId = filterSubject
      if (filterLecturer) params.lecturerId = filterLecturer
      if (filterAcademicYear) params.academicYearId = filterAcademicYear
      return classApi.getAll(params).then((r: any) => {
        const d = r.data
        if (Array.isArray(d)) return { data: d as ClassItem[], pagination: {} }
        return { data: (d?.data || d?.items || []) as ClassItem[], pagination: (d?.pagination || {}) as Pagination }
      })
    },
    staleTime: 30 * 1000,
  })
  const classes = Array.isArray(rawData as unknown) ? [] : (rawData?.data || [])
  const pagination = rawData?.pagination || {}

  const { data: subjects = [] } = useQuery<SubjectItem[]>({
    queryKey: ['subjects-dropdown'],
    queryFn: () => lookupApi.getSubjects().then((r: any) => {
      const d = r.data
      return (Array.isArray(d) ? d : (d?.data || d?.items || [])) as SubjectItem[]
    }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: lecturers = [] } = useQuery<LecturerItem[]>({
    queryKey: ['lecturers-dropdown'],
    queryFn: () => lookupApi.getLecturers().then((r: any) => {
      const d = r.data
      return (Array.isArray(d) ? d : (d?.data || d?.items || [])) as LecturerItem[]
    }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: academicYears = [] } = useQuery<AcademicYearItem[]>({
    queryKey: ['academic-years-dropdown'],
    queryFn: () => lookupApi.getAcademicYears().then((r: any) => {
      const d = r.data
      return (Array.isArray(d) ? d : (d?.data || d?.items || [])) as AcademicYearItem[]
    }),
    staleTime: 5 * 60 * 1000,
  })

  const saveMutation = useMutation<unknown, ApiError, void>({
    mutationFn: () => {
      const payload = { ...form, maxStudents: Number(form.maxStudents) || 50 }
      return editingClass
        ? classApi.update(editingClass.classId, payload)
        : classApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${editingClass ? 'Cập nhật' : 'Tạo'} lớp học thành công!`)
      setShowModal(false)
      setEditingClass(null)
      setForm({ classCode: '', className: '', subjectId: '', lecturerId: '', semester: '1', academicYearId: '', maxStudents: 50 })
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Lỗi khi lưu lớp học'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation<unknown, ApiError, string>({
    mutationFn: (id) => classApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa lớp học thành công!')
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể xóa lớp học')
    },
  })

  const totalPages = Math.max(1, pagination.totalPages || Math.ceil(classes.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = classes.slice((safePage - 1) * pageSize, safePage * pageSize)

  function validateForm(): FormErrors {
    const errs: FormErrors = {}
    if (!form.classCode) errs.classCode = 'Mã lớp bắt buộc'
    if (!form.className) errs.className = 'Tên lớp bắt buộc'
    if (!form.subjectId) errs.subjectId = 'Vui lòng chọn môn học'
    if (!form.academicYearId) errs.academicYearId = 'Vui lòng chọn năm học'
    return errs
  }

  function handleSave(): void {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    saveMutation.mutate()
  }

  function handleDelete(id: string): void {
    if (!window.confirm('Bạn có chắc muốn xóa lớp học này?')) return
    deleteMutation.mutate(id)
  }

  function openCreate(): void {
    setEditingClass(null)
    setForm({ classCode: '', className: '', subjectId: '', lecturerId: '', semester: '1', academicYearId: '', maxStudents: 50 })
    setFormErrors({})
    setShowModal(true)
  }

  function openEdit(c: ClassItem): void {
    setEditingClass(c)
    setForm({
      classCode: c.classCode || '',
      className: c.className || '',
      subjectId: c.subjectId || '',
      lecturerId: c.lecturerId || '',
      semester: String(c.semester || '1'),
      academicYearId: c.academicYearId || '',
      maxStudents: c.maxStudents || 50,
    })
    setFormErrors({})
    setShowModal(true)
  }

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input type="text" className="form-control" placeholder="Tìm kiếm theo mã, tên lớp..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="filter-group">
          <select className="form-control" value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setPage(1) }}>
            <option value="">Tất cả môn</option>
          </select>
          <select className="form-control" value={filterLecturer} onChange={(e) => { setFilterLecturer(e.target.value); setPage(1) }}>
            <option value="">Tất cả GV</option>
          </select>
          <select className="form-control" value={filterAcademicYear} onChange={(e) => { setFilterAcademicYear(e.target.value); setPage(1) }}>
            <option value="">Tất cả HK</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fas fa-plus"></i> Thêm lớp
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã lớp</th><th>Tên lớp</th><th>Môn học</th><th>GV</th>
                  <th>HK</th><th>Năm học</th><th>SV</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="text-center">Không có dữ liệu</td></tr>
                ) : (
                  paginated.map((c) => (
                    <tr key={c.classId}>
                      <td><strong>{c.classCode}</strong></td>
                      <td>{c.className}</td>
                      <td>{c.subjectName}</td>
                      <td>{c.lecturerName}</td>
                      <td>{semesters.find((s) => s.value === String(c.semester))?.label || c.semester}</td>
                      <td>{c.academicYearName}</td>
                      <td><span className="badge badge-info">{c.currentEnrollment ?? c.currentStudents ?? 0}/{c.maxStudents}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => openEdit(c)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.classId)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {classes.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Hiển thị {(safePage-1)*pageSize+1}–{Math.min(safePage*pageSize, classes.length)} / {pagination.totalCount || classes.length}
              </div>
              <div className="pagination">
                <button className="btn btn-sm" onClick={() => setPage((p) => Math.max(1,p-1))} disabled={safePage===1}>
                  <i className="fas fa-chevron-left"></i> Trước
                </button>
                {getPages(safePage, totalPages).map((p) => (
                  <button key={p} className={`btn btn-sm ${p===safePage?'btn-primary':'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="btn btn-sm" onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={safePage===totalPages}>
                  Sau <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editingClass ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label>Mã lớp <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.classCode ? ' is-invalid' : ''}`}
                  value={form.classCode}
                  onChange={(e) => setForm((f) => ({ ...f, classCode: e.target.value }))}
                  placeholder="VD: CNPM001" />
                {formErrors.classCode && <div className="invalid-feedback d-block">{formErrors.classCode}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Tên lớp <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.className ? ' is-invalid' : ''}`}
                  value={form.className}
                  onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                  placeholder="VD: CNPM01 - Nhóm 1" />
                {formErrors.className && <div className="invalid-feedback d-block">{formErrors.className}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Môn học <span className="text-danger">*</span></label>
                <select className={`form-control${formErrors.subjectId ? ' is-invalid' : ''}`}
                  value={form.subjectId}
                  onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
                </select>
                {formErrors.subjectId && <div className="invalid-feedback d-block">{formErrors.subjectId}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Giảng viên</label>
                <select className="form-control"
                  value={form.lecturerId}
                  onChange={(e) => setForm((f) => ({ ...f, lecturerId: e.target.value }))}>
                  <option value="">-- Chọn giảng viên --</option>
                  {lecturers.map((l) => <option key={l.lecturerId} value={l.lecturerId}>{l.fullName}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group col-md-4 mb-3">
                  <label>Học kỳ</label>
                  <select className="form-control"
                    value={form.semester}
                    onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}>
                    {semesters.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group col-md-4 mb-3">
                  <label>Năm học <span className="text-danger">*</span></label>
                  <select className={`form-control${formErrors.academicYearId ? ' is-invalid' : ''}`}
                    value={form.academicYearId}
                    onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))}>
                    <option value="">-- Chọn --</option>
                    {academicYears.map((a) => <option key={a.academicYearId} value={a.academicYearId}>{a.yearName}</option>)}
                  </select>
                  {formErrors.academicYearId && <div className="invalid-feedback d-block">{formErrors.academicYearId}</div>}
                </div>
                <div className="form-group col-md-4 mb-3">
                  <label>SL tối đa</label>
                  <input className="form-control" type="number" min="1"
                    value={form.maxStudents}
                    onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
