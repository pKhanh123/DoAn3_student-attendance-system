import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import studentApi from '../../../api/studentApi'

function formatDateForInput(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch { return '' }
}

function formatPhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0')) return '+84' + cleaned.substring(1)
  if (cleaned.startsWith('84')) return '+' + cleaned
  return cleaned
}

function validateForm(form, isEdit) {
  const errors = {}
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

export default function StudentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = Boolean(id)

  const [form, setForm] = useState({
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
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Fetch faculties
  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => studentApi.getFaculties().then(r => r.data?.data || r.data || []),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch majors when faculty selected
  const { data: majors = [] } = useQuery({
    queryKey: ['majors', form.facultyId],
    queryFn: () => form.facultyId
      ? studentApi.getMajors(form.facultyId).then(r => r.data?.data || r.data || [])
      : Promise.resolve([]),
    enabled: Boolean(form.facultyId),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch academic years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => studentApi.getAcademicYears().then(r => r.data?.data || r.data || []),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch student for edit
  const { isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentApi.getById(id).then(r => {
      const s = r.data?.data || r.data
      setForm(f => ({
        ...f,
        studentCode: s.studentCode || '',
        fullName: s.fullName || '',
        email: s.email || '',
        phone: s.phone || '',
        dateOfBirth: formatDateForInput(s.dateOfBirth || s.dob),
        gender: s.gender || '',
        address: s.address || '',
        facultyId: s.facultyId || '',
        majorId: s.majorId || '',
        academicYearId: s.academicYearId || '',
        cohortYear: s.cohortYear || '',
      }))
    }),
    enabled: isEditMode,
    staleTime: 0,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        dateOfBirth: form.dateOfBirth
          ? new Date(form.dateOfBirth + 'T00:00:00').toISOString()
          : null,
        phone: form.phone ? formatPhone(form.phone) : null,
        facultyId: form.facultyId || null,
        majorId: form.majorId || null,
        academicYearId: form.academicYearId || null,
        cohortYear: form.cohortYear || null,
      }
      return isEditMode
        ? studentApi.update(id, payload)
        : studentApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${isEditMode ? 'Cập nhật' : 'Thêm'} sinh viên thành công!`)
      navigate('/admin/students')
    },
    onError: (error) => {
      const data = error.response?.data
      if (data?.message) toast.error(data.message)
      else if (data?.errors) toast.error(Object.values(data.errors).flat().join('; '))
      else if (error.response?.status === 409) toast.error('Mã SV hoặc email đã tồn tại')
      else toast.error('Không thể lưu sinh viên.')
    },
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => {
      const nf = { ...f, [name]: value }
      if (name === 'facultyId') nf.majorId = ''
      return nf
    })
    setErrors(err => { const n = { ...err }; delete n[name]; return n })
  }

  function handleBlur(e) {
    const { name } = e.target
    setTouched(t => ({ ...t, [name]: true }))
    const errs = validateForm({ ...form }, isEditMode)
    setErrors(prev => ({ ...prev, [name]: errs[name] }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validateForm(form, isEditMode)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTouched({ studentCode: true, fullName: true, email: true, phone: true, facultyId: true, majorId: true })
      toast.error('Vui lòng kiểm tra lại các trường đã nhập')
      return
    }
    saveMutation.mutate()
  }

  const field = (name) => ({
    name,
    value: form[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    className: `form-control${touched[name] && errors[name] ? ' is-invalid' : ''}`,
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
                      {faculties.map(f => <option key={f.facultyId} value={f.facultyId}>{f.facultyName}</option>)}
                    </select>
                  </div>
                  <div className="form-group col-md-4">
                    <label>Ngành <span className="text-danger">*</span></label>
                    <select {...field('majorId')} disabled={!form.facultyId}>
                      <option value="">-- Chọn ngành --</option>
                      {majors.map(m => <option key={m.majorId} value={m.majorId}>{m.majorName}</option>)}
                    </select>
                    {touched.majorId && errors.majorId && <div className="invalid-feedback d-block">{errors.majorId}</div>}
                  </div>
                  <div className="form-group col-md-4">
                    <label>Niên khóa</label>
                    <select {...field('academicYearId')}>
                      <option value="">-- Chọn --</option>
                      {academicYears.map(a => <option key={a.academicYearId} value={a.academicYearId}>{a.yearName}</option>)}
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
