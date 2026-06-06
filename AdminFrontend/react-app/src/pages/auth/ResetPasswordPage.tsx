import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import authApi from '../../api/authApi'
import type { ApiError } from '../../types'

interface ResetPasswordVariables {
  email: string
  otp: string
  newPassword: string
}

interface FormState {
  password: string
  confirmPassword: string
}

interface ValidationErrors {
  password?: string
  confirmPassword?: string
}

const PASSWORD_MIN_LENGTH = 8

const ResetPasswordPage: React.FC = (): React.JSX.Element => {
  const navigate = useNavigate()
  const location = useLocation()

  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [form, setForm] = useState<FormState>({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
  const [localError, setLocalError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [isPending, setIsPending] = useState<boolean>(false)

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem('pendingResetEmail')
    if (!email && !pendingEmail) {
      navigate('/auth/forgot-password', { replace: true })
    }
  }, [email, navigate])

  const validate = (): ValidationErrors => {
    const errors: ValidationErrors = {}

    if (!form.password) {
      errors.password = 'Vui lòng nhập mật khẩu mới.'
    } else if (form.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`
    } else if (!/[A-Z]/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa.'
    } else if (!/[0-9]/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ số.'
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.'
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }

    return errors
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMessage('')

    const errors = validate()
    const hasErrors = Object.keys(errors).length > 0

    if (hasErrors) {
      const firstError = Object.values(errors)[0] ?? 'Vui lòng kiểm tra lại thông tin.'
      setLocalError(firstError)
      return
    }

    const storedEmail = email || sessionStorage.getItem('pendingResetEmail') || ''
    if (!storedEmail) {
      setLocalError('Không tìm thấy email. Vui lòng thực hiện lại quy trình quên mật khẩu.')
      return
    }

    const storedOtp = sessionStorage.getItem('pendingResetOtp')
    if (!storedOtp) {
      setLocalError('Không tìm thấy mã OTP. Vui lòng thực hiện lại quy trình quên mật khẩu.')
      return
    }

    const variables: ResetPasswordVariables = {
      email: storedEmail,
      otp: storedOtp,
      newPassword: form.password,
    }

    setIsPending(true)

    authApi
      .resetPassword(variables)
      .then(() => {
        setIsPending(false)
        setSuccessMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập…')
        sessionStorage.removeItem('pendingResetEmail')
        sessionStorage.removeItem('pendingResetOtp')
        sessionStorage.removeItem('otpExpiry')
        setTimeout(() => {
          navigate('/auth/login', { replace: true })
        }, 2000)
      })
      .catch((err: ApiError) => {
        setIsPending(false)
        setLocalError(err?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.')
      })
  }

  const handlePasswordChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setForm((prev) => ({ ...prev, password: e.target.value }))
    setLocalError('')
    setSuccessMessage('')
  }

  const handleConfirmPasswordChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
    setLocalError('')
    setSuccessMessage('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Đặt lại mật khẩu</h2>
          <p style={styles.subtitle}>Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Password field */}
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Mật khẩu mới</label>
            <div style={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số, 1 ký tự đặc biệt"
                value={form.password}
                onChange={handlePasswordChange}
                style={styles.input}
                autoComplete="new-password"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={styles.toggleButton}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div style={styles.inputGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>Xác nhận mật khẩu</label>
            <div style={styles.inputWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới"
                value={form.confirmPassword}
                onChange={handleConfirmPasswordChange}
                style={styles.input}
                autoComplete="new-password"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                style={styles.toggleButton}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Password strength hint */}
          {form.password && (
            <div style={styles.hint}>
              Mật khẩu phải chứa:
              <span style={form.password.length >= PASSWORD_MIN_LENGTH ? styles.hintOk : styles.hintFail}>
                ✓ Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
              </span>
              <span style={/[A-Z]/.test(form.password) ? styles.hintOk : styles.hintFail}>
                ✓ Ít nhất 1 chữ hoa
              </span>
              <span style={/[0-9]/.test(form.password) ? styles.hintOk : styles.hintFail}>
                ✓ Ít nhất 1 chữ số
              </span>
              <span style={/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? styles.hintOk : styles.hintFail}>
                ✓ Ít nhất 1 ký tự đặc biệt
              </span>
            </div>
          )}

          {localError && (
            <div style={styles.errorBox} role="alert">
              {localError}
            </div>
          )}

          {successMessage && (
            <div style={styles.successBox} role="status">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isPending ? styles.buttonDisabled : {}),
            }}
            disabled={isPending}
          >
            {isPending ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              style={styles.linkButton}
            >
              ← Quay lại đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '16px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    paddingRight: '44px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  toggleButton: {
    position: 'absolute' as const,
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px',
    lineHeight: 1,
  },
  hint: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    fontSize: '12px',
    color: '#6b7280',
    paddingLeft: '4px',
  },
  hintOk: {
    color: '#16a34a',
  },
  hintFail: {
    color: '#dc2626',
  },
  errorBox: {
    padding: '10px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '13px',
  },
  successBox: {
    padding: '10px 14px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#16a34a',
    fontSize: '13px',
  },
  button: {
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: '4px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center' as const,
  },
  footerText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontSize: '14px',
  },
}

export default ResetPasswordPage
