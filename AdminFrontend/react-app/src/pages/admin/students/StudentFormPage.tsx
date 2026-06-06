import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import studentApi from '../../../api/studentApi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Faculty {
  facultyId: string | number
  facultyName: string
}

interface Major {
  majorId: string | number
  majorName: string
}

interface AcademicYear {
  academicYearId: string | number
  yearName: string
}

interface StudentPayload {
  studentCode?: string
  fullName: string
  email: string
  phone?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  address?: string | null
  facultyId?: string | null
  majorId?: string | null
  academicYearId?: string | null
  cohortYear?: string | null
}

interface FormErrors {
  studentCode?: string
  fullName?: string
  email?: string
  phone?: string
  majorId?: string
}

interface TouchedFields {
  studentCode?: boolean
  fullName?: boolean
  email?: boolean
  phone?: boolean
  facultyId?: boolean
  majorId?: boolean
}

interface ApiError {
  response?: {
    status?: number
    data?: {
      message?: string
      errors?: Record<string, string[]>
    } | string
  }
}

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch { return '' }
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return ''
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0')) return '+84' + cleaned.substring(1)
  if (cleaned.startsWith('84')) return '+' + cleaned
  return cleaned
}

function validateForm(form: StudentPayload, isEdit: boolean): FormErrors {
  const errors: FormErrors = {}
  if (!isEdit) {
    if (!form.studentCode || !/^SV\d+$/i.test(form.studentCode))
      errors.studentCode = 'Mã SV phải có định dạng SV + số (VD: SV001)'
    if (!form.email) errors.email = 'Email không được để trống'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Email không hợp lệ'
    if (!form.majorId) errors.majorId = 'Vui lòng chọn ngành'
  }
  if (!form.fullName || form.fullName.trim().length < 3)
    errors.fullName = 'Họ tên từ 3-100 ký tự'
  if (form.phone && !/^0\d{9,10}$/.test(form.phone))
    errors.phone = 'SĐT gồm 10-11 chữ số, bắt đầu bằng 0'
  return errors
}

export default function StudentFormPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditMode = Boolean(id)

  const [form, setForm] = useState<StudentPayload>({
    studentCode: '',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    facultyId: '',
    majorId: '',
    academicYearId: '',
    cohortYear: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({})

  // Fetch faculties
  const { data: faculties = [] } = useQuery<Faculty[]>({
    queryKey: ['faculties'],
    queryFn: () => studentApi.getFaculties().then(r => {
      const d = r.data as { data?: Faculty[] } | Faculty[]
      return (typeof d === 'object' && !Array.isArray(d) ? (d as { data?: Faculty[] }).data : d) || []
    }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch majors when faculty selected
  const { data: majors = [] } = useQuery<Major[]>({
    queryKey: ['majors', form.facultyId],
    queryFn: () => form.facultyId
      ? studentApi.getMajors(Number(form.facultyId)).then(r => {
          const d = r.data as { data?: Major[] } | Major[]
          return (typeof d === 'object' && !Array.isArray(d) ? (d as { data?: Major[] }).data : d) || []
        })
      : Promise.resolve([]),
    enabled: Boolean(form.facultyId),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch academic years
  const { data: academicYears = [] } = useQuery<AcademicYear[]>({
    queryKey: ['academic-years'],
    queryFn: () => studentApi.getAcademicYears().then(r => {
      const d = r.data as { data?: AcademicYear[] } | AcademicYear[]
      return (typeof d === 'object' && !Array.isArray(d) ? (d as { data?: AcademicYear[] }).data : d) || []
    }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch student for edit
  const { isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentApi.getById(id!).then(r => {
      const raw = r.data as unknown
      const s = (typeof raw === 'object' && raw !== null && 'data' in raw
        ? (raw as { data?: StudentPayload }).data
        : raw) as StudentPayload | undefined
      if (!s) return
      setForm(f => ({
        ...f,
        studentCode: s.studentCode || '',
        fullName: s.fullName || '',
        email: s.email || '',
        phone: s.phone || '',
        dateOfBirth: formatDateForInput(s.dateOfBirth || ((s as unknown as Record<string, string | null | undefined>).dob)),
        gender: s.gender || '',
        address: s.address || '',
        facultyId: String(s.facultyId || ''),
        majorId: String(s.majorId || ''),
        academicYearId: String(s.academicYearId || ''),
        cohortYear: s.cohortYear || '',
      }))
    }),
    enabled: isEditMode,
    staleTime: 0,
  })

  // Save mutation
  const saveMutation = useMutation<unknown, ApiError, void>({
    mutationFn: () => {
      const payload = {
        ...form,
        dateOfBirth: form.dateOfBirth
          ? new Date(form.dateOfBirth + 'T00:00:00').toISOString()
          : undefined,
        phone: form.phone ? formatPhone(form.phone) : undefined,
        facultyId: form.facultyId ? String(form.facultyId) : null,
        majorId: form.majorId ? String(form.majorId) : null,
        academicYearId: form.academicYearId ? String(form.academicYearId) : null,
        cohortYear: form.cohortYear || undefined,
      } as unknown as import('../../../types').StudentFormData
      return isEditMode
        ? studentApi.update({ ...payload, StudentId: id! })
        : studentApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${isEditMode ? 'Cập nhật' : 'Thêm'} sinh viên thành công!`)
      navigate('/admin/students')
    },
    onError: (error: ApiError) => {
      const data = error.response?.data
      if (typeof data === 'object' && data?.message) toast.error(data.message)
      else if (typeof data === 'object' && data?.errors) toast.error(Object.values(data.errors).flat().join('; '))
      else if (error.response?.status === 409) toast.error('Mã SV hoặc email đã tồn tại')
      else toast.error('Không thể lưu sinh viên.')
    },
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name, value } = e.target
    setForm(f => {
      const nf = { ...f, [name]: value }
      if (name === 'facultyId') nf.majorId = ''
      return nf
    })
    setErrors(err => { const n = { ...err }; delete n[name as keyof FormErrors]; return n })
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name } = e.target
    setTouched(t => ({ ...t, [name]: true }))
    const errs = validateForm({ ...form }, isEditMode)
    setErrors(prev => ({ ...prev, [name]: errs[name as keyof FormErrors] }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const errs = validateForm(form, isEditMode)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTouched({ studentCode: true, fullName: true, email: true, phone: true, majorId: true })
      toast.error('Vui lòng kiểm tra lại các trường đã nhập')
      return
    }
    saveMutation.mutate()
  }

  const field = (name: keyof StudentPayload) => ({
    name,
    value: (form[name] ?? '') as string,
    onChange: handleChange,
    onBlur: handleBlur,
    className: `form-control${touched[name as keyof TouchedFields] && errors[name as keyof FormErrors] ? ' is-invalid' : ''}`,
  })

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{isEditMode ? 'Chỉnh sửa sinh viên' : 'Thêm sinh viên mới'}</h3>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="text-center" style={{ padding: 40 }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i><p>Đang tải...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>

              {!isEditMode && (
                <div className="form-section">
                  <h4 className="form-section-title">Thông tin sinh viên</h4>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label>Mã SV <span className="text-danger">*</span></label>
                      <input {...field('studentCode')} type="text" placeholder="VD: SV001" />
                      {touched.studentCode && errors.studentCode && <div className="invalid-feedback d-block">{errors.studentCode}</div>}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-section">
                <h4 className="form-section-title">Thông tin cá nhân</h4>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Họ tên <span className="text-danger">*</span></label>
                    <input {...field('fullName')} type="text" placeholder="Họ và tên đầy đủ" />
                    {touched.fullName && errors.fullName && <div className="invalid-feedback d-block">{errors.fullName}</div>}
                  </div>
                  <div className="form-group col-md-6">
                    <label>Email <span className="text-danger">*</span></label>
                    <input {...field('email')} type="email" placeholder="email@student.edu.vn" autoComplete="email" />
                    {touched.email && errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label>Số điện thoại</label>
                    <input {...field('phone')} type="text" placeholder="0xxxxxxxxx" autoComplete="tel" />
                    {touched.phone && errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
                  </div>
                  <div className="form-group col-md-4">
                    <label>Ngày sinh</label>
                    <input {...field('dateOfBirth')} type="date" />
                  </div>
                  <div className="form-group col-md-4">
                    <label>Giới tính</label>
                    <select {...field('gender')}>
                      <option value="">-- Chọn --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-12">
                    <label>Địa chỉ</label>
                    <input {...field('address')} type="text" placeholder="Địa chỉ thường trú" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="form-section-title">Học vụ</h4>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label>Khoa</label>
                    <select {...field('facultyId')}>
                      <option value="">-- Chọn khoa --</option>
                      {faculties.map(f => <option key={String(f.facultyId)} value={String(f.facultyId)}>{f.facultyName}</option>)}
                    </select>
                  </div>
                  <div className="form-group col-md-4">
                    <label>Ngành <span className="text-danger">*</span></label>
                    <select {...field('majorId')} disabled={!form.facultyId}>
                      <option value="">-- Chọn ngành --</option>
                      {majors.map(m => <option key={String(m.majorId)} value={String(m.majorId)}>{m.majorName}</option>)}
                    </select>
                    {touched.majorId && errors.majorId && <div className="invalid-feedback d-block">{errors.majorId}</div>}
                  </div>
                  <div className="form-group col-md-4">
                    <label>Niên khóa</label>
                    <select {...field('academicYearId')}>
                      <option value="">-- Chọn --</option>
                      {academicYears.map(a => <option key={String(a.academicYearId)} value={String(a.academicYearId)}>{a.yearName}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label>Năm nhập học</label>
                    <input {...field('cohortYear')} type="text" placeholder="VD: 2024" />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/students')}>
                  <i className="fas fa-arrow-left"></i> Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                    : <><i className="fas fa-save"></i> {isEditMode ? 'Cập nhật' : 'Thêm mới'}</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
