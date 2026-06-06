import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authApi from '../../api/authApi'
import type { ApiError } from '../../types'

const ForgotPasswordPage: React.FC = (): React.JSX.Element => {
  const navigate = useNavigate()
  
  const [email, setEmail] = useState<string>('')
  const [localError, setLocalError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [isPending, setIsPending] = useState<boolean>(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMessage('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setLocalError('Vui lòng nhập email.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalError('Email không hợp lệ.')
      return
    }

    setIsPending(true)

    authApi
      .forgotPassword({ email: trimmedEmail })
      .then(() => {
        setIsPending(false)
        setSuccessMessage('Mã OTP đã được gửi đến email của bạn. Đang chuyển hướng…')
        // Lưu email vào sessionStorage để dùng ở trang VerifyOTP
        sessionStorage.setItem('pendingResetEmail', trimmedEmail)
        setTimeout(() => {
          navigate('/auth/verify-otp', { replace: true })
        }, 2000)
      })
      .catch((err: ApiError) => {
        setIsPending(false)
        setLocalError(err?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.')
      })
  }

  const handleEmailChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setEmail(e.target.value)
    setLocalError('')
    setSuccessMessage('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Quên mật khẩu</h2>
          <p style={styles.subtitle}>
            Nhập email của bạn để nhận mã OTP đặt lại mật khẩu
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={handleEmailChange}
              style={styles.input}
              autoComplete="email"
              disabled={isPending}
            />
          </div>

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
            {isPending ? 'Đang gửi…' : 'Gửi mã OTP'}
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
    gap: '20px',
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
  input: {
    padding: '12px 16px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
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

export default ForgotPasswordPage