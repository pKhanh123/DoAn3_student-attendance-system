import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import userApi from '../../../api/userApi'

function validatePassword(pwd) {
  if (!pwd) return 'Mật khẩu không được để trống'
  if (pwd.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự'
  return null
}

function validateUsername(u) {
  if (!u) return 'Tên đăng nhập không được để trống'
  if (u.length < 3 || u.length > 20) return 'Tên đăng nhập từ 3-20 ký tự'
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Chỉ chứa chữ, số và dấu gạch dưới'
  return null
}

function validateForm(form) {
  const errors = {}

  if (!form.isEditMode) {
    const uErr = validateUsername(form.username)
    if (uErr) errors.username = uErr

    const pErr = validatePassword(form.password)
    if (pErr) errors.password = pErr
  }

  if (!form.fullName || form.fullName.trim().length < 3)
    errors.fullName = 'Họ tên từ 3-100 ký tự'
  if (form.fullName && form.fullName.length > 100)
    errors.fullName = 'Họ tên từ 3-100 ký tự'

  if (!form.email) {
    errors.email = 'Email không được để trống'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email không hợp lệ'
  }

  if (form.phone && !/^0\d{9,10}$/.test(form.phone))
    errors.phone = 'Số điện thoại gồm 10-11 chữ số, bắt đầu bằng 0'

  if (!form.roleId) errors.roleId = 'Vui lòng chọn vai trò'

  return errors
}

export default function UserFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = Boolean(id)

  const [form, setForm] = useState({
    isEditMode,
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    roleId: '',
    isActive: true,
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => userApi.getRoles().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch user for edit
  const { isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userApi.getById(id).then((r) => {
      const u = r.data?.data || r.data
      setForm((f) => ({
        ...f,
        username: u.username || '',
        fullName: u.fullName || '',
        email: u.email || '',
        phone: u.phone || '',
        roleId: u.roleId || '',
        isActive: u.isActive ?? true,
      }))
    }),
    enabled: isEditMode,
    staleTime: 0,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const { isEditMode: _em, password: _pw, ...payload } = form
      if (!isEditMode) payload.password = form.password
      return isEditMode
        ? userApi.update(id, payload)
        : userApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${isEditMode ? 'Cập nhật' : 'Thêm'} người dùng thành công!`)
      navigate('/admin/users')
    },
    onError: (error) => {
      const data = error.response?.data
      if (data?.message) {
        toast.error(data.message)
      } else if (data?.errors) {
        const msgs = Object.values(data.errors).flat().join('; ')
        toast.error(msgs)
      } else if (error.response?.status === 409) {
        toast.error('Tên đăng nhập hoặc email đã tồn tại')
      } else if (error.response?.status === 400) {
        toast.error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.')
      } else if (error.response?.status === 404) {
        toast.error('Không tìm thấy người dùng')
      } else {
        toast.error('Không thể lưu người dùng. Vui lòng thử lại.')
      }
    },
  })

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    // Clear error on change
    setErrors((err) => { const n = { ...err }; delete n[name]; return n })
  }

  function handleBlur(e) {
    const { name } = e.target
    setTouched((t) => ({ ...t, [name]: true }))
    // Validate single field
    const errs = validateForm({ ...form })
    setErrors((prev) => ({ ...prev, [name]: errs[name] }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTouched({ username: true, password: true, fullName: true, email: true, phone: true, roleId: true })
      toast.error('Vui lòng kiểm tra lại các trường đã nhập')
      return
    }
    setErrors({})
    saveMutation.mutate()
  }

  const field = (name) => ({
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    className: `form-control${touched[name] && errors[name] ? ' is-invalid' : ''}`,
  })

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{isEditMode ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h3>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p>Đang tải...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>

              {/* Section 1: Thông tin đăng nhập */}
              {!isEditMode && (
                <div className="form-section">
                  <h4 className="form-section-title">Thông tin đăng nhập</h4>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label>Tên đăng nhập <span className="text-danger">*</span></label>
                      <input
                        {...field('username')}
                        type="text"
                        placeholder="3-20 ký tự, chỉ chữ và số"
                        autoComplete="username"
                      />
                      {touched.username && errors.username && (
                        <div className="invalid-feedback d-block">{errors.username}</div>
                      )}
                    </div>
                    <div className="form-group col-md-6">
                      <label>Mật khẩu <span className="text-danger">*</span></label>
                      <input
                        {...field('password')}
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        autoComplete="new-password"
                      />
                      {touched.password && errors.password && (
                        <div className="invalid-feedback d-block">{errors.password}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Thông tin cá nhân */}
              <div className="form-section">
                <h4 className="form-section-title">Thông tin cá nhân</h4>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Họ tên <span className="text-danger">*</span></label>
                    <input {...field('fullName')} type="text" placeholder="Họ và tên đầy đủ" />
                    {touched.fullName && errors.fullName && (
                      <div className="invalid-feedback d-block">{errors.fullName}</div>
                    )}
                  </div>
                  <div className="form-group col-md-6">
                    <label>Email <span className="text-danger">*</span></label>
                    <input {...field('email')} type="email" placeholder="email@example.com" autoComplete="email" />
                    {touched.email && errors.email && (
                      <div className="invalid-feedback d-block">{errors.email}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Số điện thoại</label>
                    <input {...field('phone')} type="text" placeholder="0xxxxxxxxx (10-11 số)" autoComplete="tel" />
                    {touched.phone && errors.phone && (
                      <div className="invalid-feedback d-block">{errors.phone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Phân quyền */}
              <div className="form-section">
                <h4 className="form-section-title">Phân quyền</h4>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Vai trò <span className="text-danger">*</span></label>
                    <select {...field('roleId')}>
                      <option value="">-- Chọn vai trò --</option>
                      {roles.map((r) => (
                        <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
                      ))}
                    </select>
                    {touched.roleId && errors.roleId && (
                      <div className="invalid-feedback d-block">{errors.roleId}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Trạng thái (edit mode only) */}
              {isEditMode && (
                <div className="form-section">
                  <h4 className="form-section-title">Trạng thái tài khoản</h4>
                  <div className="form-group">
                    <div className="form-check form-switch">
                      <input
                        {...field('isActive')}
                        type="checkbox"
                        className="form-check-input"
                        id="isActive"
                        style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                      />
                      <label className="form-check-label" htmlFor="isActive">
                        {form.isActive ? 'Hoạt động' : 'Khóa'}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/users')}>
                  <i className="fas fa-arrow-left"></i> Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                  ) : (
                    <><i className="fas fa-save"></i> {isEditMode ? 'Cập nhật' : 'Thêm mới'}</>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
