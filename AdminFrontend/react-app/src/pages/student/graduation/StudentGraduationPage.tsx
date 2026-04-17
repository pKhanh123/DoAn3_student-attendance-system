import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../../../contexts/AuthContext'
import graduationApi from '../../../api/graduationApi'
import type {
  GraduationEligibility,
  GraduationApplication,
  CreateApplicationDto,
} from '../../../api/graduationApi'

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
  }
}

interface ApplicationForm {
  schoolYearId: string
  semester: number
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'APPROVED': return 'badge-success'
    case 'VERIFIED': return 'badge-info'
    case 'PENDING': return 'badge-warning'
    case 'REJECTED': return 'badge-danger'
    case 'DIPLOMA_ISSUED': return 'badge-success'
    default: return 'badge-secondary'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'PENDING': return 'Chờ duyệt'
    case 'VERIFIED': return 'Đã xác minh'
    case 'APPROVED': return 'Đã phê duyệt'
    case 'REJECTED': return 'Từ chối'
    case 'DIPLOMA_ISSUED': return 'Đã cấp bằng'
    default: return status || '—'
  }
}

export default function StudentGraduationPage(): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const studentId = user?.studentId?.toString() || ''

  const [showApplicationModal, setShowApplicationModal] = useState<boolean>(false)
  const [applicationForm, setApplicationForm] = useState<ApplicationForm>({
    schoolYearId: '',
    semester: 1,
  })

  // Fetch eligibility
  const { data: eligibilityData, isLoading: loadingEligibility } = useQuery({
    queryKey: ['graduation-eligibility', studentId],
    queryFn: () =>
      graduationApi
        .checkEligibility(studentId)
        .then((r) => r.data.data as GraduationEligibility | null),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })

  // Fetch applications
  const { data: applicationsData, isLoading: loadingApplications } = useQuery({
    queryKey: ['graduation-applications', studentId],
    queryFn: () =>
      graduationApi
        .getApplicationsByStudent(studentId)
        .then((r) => r.data as { data: GraduationApplication[]; totalCount: number }),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })

  const eligibility = eligibilityData || {
    isEligible: false,
    reason: 'Chưa kiểm tra điều kiện',
  }
  const applications: GraduationApplication[] = applicationsData?.data || []

  // Create application mutation
  const createApplicationMutation = useMutation({
    mutationFn: (data: CreateApplicationDto) => graduationApi.createApplication(data),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Gửi yêu cầu tốt nghiệp thành công')
      queryClient.invalidateQueries({ queryKey: ['graduation-applications'] })
      setShowApplicationModal(false)
      resetApplicationForm()
    },
    onError: (error: ApiError) => {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Lỗi khi gửi yêu cầu tốt nghiệp'
      toast.error(msg)
    },
  })

  const resetApplicationForm = () => {
    setApplicationForm({
      schoolYearId: '',
      semester: 1,
    })
  }

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault()
    if (!applicationForm.schoolYearId) {
      toast.error('Vui lòng chọn năm học')
      return
    }
    createApplicationMutation.mutate({
      studentId,
      schoolYearId: applicationForm.schoolYearId,
      semester: applicationForm.semester,
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Xét tốt nghiệp</h1>
        <p className="text-gray-600 mt-1">
          Kiểm tra điều kiện và gửi yêu cầu xét tốt nghiệp
        </p>
      </div>

      {/* Eligibility Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          <i className="fas fa-check-circle mr-2"></i>
          Điều kiện tốt nghiệp
        </h2>

        {loadingEligibility ? (
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-spinner fa-spin text-xl"></i>
            <p className="mt-2">Đang kiểm tra...</p>
          </div>
        ) : (
          <>
            {eligibility.isEligible ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="fas fa-check-circle text-green-600 text-2xl mr-3 mt-1"></i>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      Bạn đủ điều kiện tốt nghiệp
                    </h3>
                    <p className="text-green-700 mt-1">
                      Bạn có thể gửi yêu cầu xét tốt nghiệp ngay bây giờ.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-green-600">Tín chỉ tích lũy:</span>
                        <span className="ml-2 font-semibold text-green-800">
                          {eligibility.totalCredits || 0} / {eligibility.requiredCredits || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-green-600">GPA:</span>
                        <span className="ml-2 font-semibold text-green-800">
                          {eligibility.gpa?.toFixed(2) || '0.00'} (≥ {eligibility.minGpa?.toFixed(2) || '0.00'})
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowApplicationModal(true)}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <i className="fas fa-paper-plane mr-2"></i>
                      Gửi yêu cầu tốt nghiệp
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="fas fa-times-circle text-red-600 text-2xl mr-3 mt-1"></i>
                  <div>
                    <h3 className="font-semibold text-red-800">
                      Chưa đủ điều kiện tốt nghiệp
                    </h3>
                    <p className="text-red-700 mt-1">
                      {eligibility.reason || 'Vui lòng hoàn thành các yêu cầu còn thiếu'}
                    </p>
                    {eligibility.totalCredits !== undefined && (
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-red-600">Tín chỉ tích lũy:</span>
                          <span className="ml-2 font-semibold text-red-800">
                            {eligibility.totalCredits} / {eligibility.requiredCredits || 0}
                          </span>
                        </div>
                        {eligibility.gpa !== undefined && (
                          <div>
                            <span className="text-sm text-red-600">GPA:</span>
                            <span className="ml-2 font-semibold text-red-800">
                              {eligibility.gpa.toFixed(2)} (≥ {eligibility.minGpa?.toFixed(2) || '0.00'})
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Applications History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            <i className="fas fa-history mr-2"></i>
            Lịch sử yêu cầu tốt nghiệp
          </h2>
        </div>

        <div className="p-6">
          {loadingApplications ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-spinner fa-spin text-2xl"></i>
              <p className="mt-2">Đang tải...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p>Chưa có yêu cầu tốt nghiệp nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.applicationId}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Yêu cầu #{app.applicationId.substring(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Gửi ngày: {formatDate(app.requestedAt || '')}
                      </p>
                    </div>
                    <span className={`badge ${getStatusClass(app.status)}`}>
                      {getStatusText(app.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Năm học:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {app.schoolYearName || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Học kỳ:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {app.semester || '—'}
                      </span>
                    </div>
                  </div>

                  {app.status === 'VERIFIED' && app.verifiedAt && (
                    <div className="mt-3 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                      <i className="fas fa-info-circle mr-1"></i>
                      Đã xác minh ngày {formatDate(app.verifiedAt)}
                    </div>
                  )}

                  {app.status === 'APPROVED' && app.approvedAt && (
                    <div className="mt-3 text-sm text-green-700 bg-green-50 p-2 rounded">
                      <i className="fas fa-check-circle mr-1"></i>
                      Đã phê duyệt ngày {formatDate(app.approvedAt)}
                    </div>
                  )}

                  {app.status === 'REJECTED' && app.adminNote && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 p-2 rounded">
                      <i className="fas fa-times-circle mr-1"></i>
                      Lý do từ chối: {app.adminNote}
                    </div>
                  )}

                  {app.status === 'DIPLOMA_ISSUED' && app.diplomaNumber && (
                    <div className="mt-3 text-sm text-green-700 bg-green-50 p-2 rounded">
                      <i className="fas fa-certificate mr-1"></i>
                      Số bằng: <strong>{app.diplomaNumber}</strong> - Ngày cấp: {formatDate(app.issueDate || '')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="modal-overlay" onClick={() => setShowApplicationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Gửi yêu cầu tốt nghiệp</h3>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitApplication}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    Năm học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={applicationForm.schoolYearId}
                    onChange={(e) =>
                      setApplicationForm({ ...applicationForm, schoolYearId: e.target.value })
                    }
                    placeholder="Nhập mã năm học (VD: SY2023)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Học kỳ <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-input"
                    value={applicationForm.semester}
                    onChange={(e) =>
                      setApplicationForm({ ...applicationForm, semester: parseInt(e.target.value) })
                    }
                    required
                  >
                    <option value={1}>Học kỳ 1</option>
                    <option value={2}>Học kỳ 2</option>
                    <option value={3}>Học kỳ 3</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                  <i className="fas fa-info-circle mr-2"></i>
                  Sau khi gửi yêu cầu, cố vấn học tập và phòng đào tạo sẽ xem xét hồ sơ của bạn.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowApplicationModal(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createApplicationMutation.isPending}
                >
                  {createApplicationMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      Gửi yêu cầu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
