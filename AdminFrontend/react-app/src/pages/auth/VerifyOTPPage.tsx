import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import authApi from '../../api/authApi'
import type { ApiError } from '../../types'
import type { AuthDefaultResponse } from '../../types/api'

interface VerifyOTPVariables {
  email: string
  otp: string
}

interface CountdownResult {
  minutes: number
  seconds: number
  isExpired: boolean
}

const useCountdown = (targetTime: number): CountdownResult => {
  const [remaining, setRemaining] = useState<number>(
    Math.max(0, Math.floor((targetTime - Date.now()) / 1000))
  )

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [remaining])

  return {
    minutes: Math.floor(remaining / 60),
    seconds: remaining % 60,
    isExpired: remaining <= 0,
  }
}

const VerifyOTPPage: React.FC = (): React.JSX.Element => {
  const navigate = useNavigate()

  const [email, setEmail] = useState<string>('')
  const [otp, setOtp] = useState<string>('')
  const [otpExpiry, setOtpExpiry] = useState<number>(0)
  const [resendCooldown, setResendCooldown] = useState<number>(0)
  const [localError, setLocalError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  const emailRef = useRef<HTMLInputElement>(null)

  const { minutes, seconds, isExpired } = useCountdown(otpExpiry)
  const { minutes: resendMin, seconds: resendSec, isExpired: canResend } = useCountdown(resendCooldown)

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('pendingResetEmail')
    if (storedEmail) {
      setEmail(storedEmail)
      emailRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    if (otpExpiry > 0) return
    const storedExpiry = sessionStorage.getItem('otpExpiry')
    if (storedExpiry) {
      setOtpExpiry(Number(storedExpiry))
    }
  }, [otpExpiry])

  // Inline mutation to keep component self-contained and avoid extra deps
  const [mutationState, setMutationState] = useState<{
    isPending: boolean
    error: ApiError | null
  }>({ isPending: false, error: null })

  const handleVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMessage('')

    const trimmedOtp = otp.trim()
    if (!trimmedOtp) {
      setLocalError('Vui lòng nhập mã OTP.')
      return
    }
    if (!/^\d{4}$/.test(trimmedOtp)) {
      setLocalError('Mã OTP phải gồm 4 chữ số.')
      return
    }
    if (isExpired) {
      setLocalError('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.')
      return
    }

    setMutationState({ isPending: true, error: null })

    authApi
      .verifyOTP({ email, otp: trimmedOtp })
      .then((response) => {
        const res = response as unknown as { data?: AuthDefaultResponse['data'] }
        setMutationState({ isPending: false, error: null })
        setSuccessMessage('Xác thực OTP thành công! Đang chuyển hướng…')
        sessionStorage.setItem('pendingResetOtp', trimmedOtp)
        sessionStorage.removeItem('otpExpiry')
        setTimeout(() => {
          navigate('/auth/reset-password', { state: { email } })
        }, 1500)
      })
      .catch((err: ApiError) => {
        setMutationState({ isPending: false, error: err })
        setLocalError(err?.message || 'Mã OTP không hợp lệ. Vui lòng thử lại.')
      })
  }

  const handleResend = () => {
    if (!canResend) return
    setLocalError('')
    setSuccessMessage('')
    setMutationState({ isPending: false, error: null })

    authApi
      .forgotPassword({ email })
      .then(() => {
        const newExpiry = Date.now() + 5 * 60 * 1000
        setOtpExpiry(newExpiry)
        sessionStorage.setItem('otpExpiry', String(newExpiry))
        setResendCooldown(Date.now() + 60 * 1000)
        setOtp('')
        setSuccessMessage('Đã gửi lại mã OTP. Vui lòng kiểm tra email của bạn.')
      })
      .catch((err: ApiError) => {
        setLocalError(err?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.')
      })
  }

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setOtp(value)
    setLocalError('')
    setSuccessMessage('')
  }

  const pad = (n: number): string => n.toString().padStart(2, '0')

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Xác thực OTP</h2>
          <p style={styles.subtitle}>
            Mã OTP đã được gửi đến <strong>{email || 'email của bạn'}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="otp" style={styles.label}>Mã OTP</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="Nhập 4 chữ số"
              value={otp}
              onChange={handleChange}
              maxLength={4}
              style={styles.input}
              disabled={mutationState.isPending}
            />
            {!isExpired && (
              <small style={styles.timer}>
                Hết hạn sau: {pad(minutes)}:{pad(seconds)}
              </small>
            )}
            {isExpired && (
              <small style={{ ...styles.timer, color: '#dc2626' }}>
                Mã OTP đã hết hạn
              </small>
            )}
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
              ...(mutationState.isPending ? styles.buttonDisabled : {}),
            }}
            disabled={mutationState.isPending}
          >
            {mutationState.isPending ? 'Đang xác thực…' : 'Xác nhận'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Chưa nhận được mã?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              style={{
                ...styles.linkButton,
                ...(canResend ? {} : styles.linkButtonDisabled),
              }}
            >
              {canResend
                ? 'Gửi lại mã OTP'
                : `Gửi lại sau ${pad(resendMin)}:${pad(resendSec)}`}
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
    fontSize: '18px',
    letterSpacing: '8px',
    textAlign: 'center' as const,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  timer: {
    color: '#6b7280',
    fontSize: '12px',
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
  linkButtonDisabled: {
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
}

export default VerifyOTPPage
