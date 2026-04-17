import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import graduationApi from '../../../api/graduationApi'
import type {
  GraduationApplication,
  UpdateStatusDto,
  IssueDiplomaDto,
} from '../../../api/graduationApi'

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
  }
}

interface StatusForm {
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'DIPLOMA_ISSUED'
  note: string
}

interface DiplomaForm {
  diplomaNumber: string
  issueDate: string
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

function getPages(current: number, total: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function GraduationManagementPage(): React.JSX.Element {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  const [showStatusModal, setShowStatusModal] = useState<boolean>(false)
  const [showDiplomaModal, setShowDiplomaModal] = useState<boolean>(false)
  const [selectedApp, setSelectedApp] = useState<GraduationApplication | null>(null)
  const [statusForm, setStatusForm] = useState<StatusForm>({
    status: 'PENDING',
    note: '',
  })
  const [diplomaForm, setDiplomaForm] = useState<DiplomaForm>({
    diplomaNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
  })

  // Fetch applications
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['graduation-applications', filterStatus, page],
    queryFn: () =>
      graduationApi
        .getAllApplications(filterStatus || undefined, page, pageSize)
        .then((r) => r.data as { data: GraduationApplication[]; totalCount: number }),
    staleTime: 30 * 1000,
  })

  const allApplications: GraduationApplication[] = rawData?.data || []
  const totalCount = rawData?.totalCount || 0

  const filtered = search
    ? allApplications.filter(
        (app) =>
          app.studentCode?.toLowerCase().includes(search.toLowerCase()) ||
          app.studentName?.toLowerCase().includes(search.toLowerCase())
      )
    : allApplications

  const totalPages = Math.ceil(totalCount / pageSize)

  // Stats
  const totalApps = totalCount
  const totalPending = allApplications.filter((a) => a.status === 'PENDING').length
  const totalVerified = allApplications.filter((a) => a.status === 'VERIFIED').length
  const totalApproved = allApplications.filter((a) => a.status === 'APPROVED').length
  const totalIssued = allApplications.filter((a) => a.status === 'DIPLOMA_ISSUED').length

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { applicationId: string; payload: UpdateStatusDto }) =>
      graduationApi.updateStatus(data.applicationId, data.payload),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Cập nhật trạng thái thành công')
      queryClient.invalidateQueries({ queryKey: ['graduation-applications'] })
      setShowStatusModal(false)
      resetStatusForm()
    },
    onError: (error: ApiError) => {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Lỗi khi cập nhật trạng thái'
      toast.error(msg)
    },
  })

  // Issue diploma mutation
  const issueDiplomaMutation = useMutation({
    mutationFn: (data: { applicationId: string; payload: IssueDiplomaDto }) =>
      graduationApi.issueDiploma(data.applicationId, data.payload),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Cấp bằng tốt nghiệp thành công')
      queryClient.invalidateQueries({ queryKey: ['graduation-applications'] })
      setShowDiplomaModal(false)
      resetDiplomaForm()
    },
    onError: (error: ApiError) => {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Lỗi khi cấp bằng'
      toast.error(msg)
    },
  })

  const handleUpdateStatus = (app: GraduationApplication) => {
    setSelectedApp(app)
    setStatusForm({
      status: app.status,
      note: '',
    })
    setShowStatusModal(true)
  }

  const handleIssueDiploma = (app: GraduationApplication) => {
    setSelectedApp(app)
    setDiplomaForm({
      diplomaNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
    })
    setShowDiplomaModal(true)
  }

  const resetStatusForm = () => {
    setStatusForm({ status: 'PENDING', note: '' })
    setSelectedApp(null)
  }

  const resetDiplomaForm = () => {
    setDiplomaForm({ diplomaNumber: '', issueDate: new Date().toISOString().split('T')[0] })
    setSelectedApp(null)
  }

  const handleSubmitStatus = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApp) return
    updateStatusMutation.mutate({
      applicationId: selectedApp.applicationId,
      payload: {
        status: statusForm.status,
        note: statusForm.note || undefined,
      },
    })
  }

  const handleSubmitDiploma = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApp) return
    if (!diplomaForm.diplomaNumber.trim()) {
      toast.error('Vui lòng nhập số bằng')
      return
    }
    issueDiplomaMutation.mutate({
      applicationId: selectedApp.applicationId,
      payload: {
        diplomaNumber: diplomaForm.diplomaNumber,
        issueDate: diplomaForm.issueDate,
      },
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Tốt nghiệp</h1>
        <p className="text-gray-600 mt-1">
          Quản lý hồ sơ xét tốt nghiệp và cấp bằng cho sinh viên
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tổng hồ sơ</div>
          <div className="text-2xl font-bold text-gray-800">{totalApps}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Chờ duyệt</div>
          <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Đã xác minh</div>
          <div className="text-2xl font-bold text-blue-600">{totalVerified}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Đã phê duyệt</div>
          <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Đã cấp bằng</div>
          <div className="text-2xl font-bold text-green-700">{totalIssued}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Mã SV, tên sinh viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="VERIFIED">Đã xác minh</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="DIPLOMA_ISSUED">Đã cấp bằng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-spinner fa-spin text-2xl"></i>
            <p className="mt-2">Đang tải...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-inbox text-4xl mb-2"></i>
            <p>Không có hồ sơ nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sinh viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngành
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Năm học / Kỳ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày yêu cầu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Số bằng
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((app) => (
                    <tr key={app.applicationId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {app.studentCode}
                        </div>
                        <div className="text-sm text-gray-500">{app.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {app.majorName || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {app.schoolYearName || '—'} / HK{app.semester || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusClass(app.status)}`}>
                          {getStatusText(app.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(app.requestedAt || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {app.diplomaNumber || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleUpdateStatus(app)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Cập nhật trạng thái"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        {app.status === 'APPROVED' && !app.diplomaNumber && (
                          <button
                            onClick={() => handleIssueDiploma(app)}
                            className="text-green-600 hover:text-green-900"
                            title="Cấp bằng"
                          >
                            <i className="fas fa-certificate"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{(page - 1) * pageSize + 1}</span> đến{' '}
                  <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> trong{' '}
                  <span className="font-medium">{totalCount}</span> kết quả
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Trước
                  </button>
                  {getPages(page, totalPages).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 border rounded-md ${
                        p === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Update Status Modal */}
      {showStatusModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Cập nhật trạng thái</h3>
            <form onSubmit={handleSubmitStatus}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sinh viên
                </label>
                <div className="text-sm text-gray-900">
                  {selectedApp.studentCode} - {selectedApp.studentName}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      status: e.target.value as StatusForm['status'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="VERIFIED">Đã xác minh</option>
                  <option value="APPROVED">Đã phê duyệt</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={statusForm.note}
                  onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Nhập ghi chú (nếu có)..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false)
                    resetStatusForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? 'Đang xử lý...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Diploma Modal */}
      {showDiplomaModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Cấp bằng tốt nghiệp</h3>
            <form onSubmit={handleSubmitDiploma}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sinh viên
                </label>
                <div className="text-sm text-gray-900">
                  {selectedApp.studentCode} - {selectedApp.studentName}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số bằng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diplomaForm.diplomaNumber}
                  onChange={(e) =>
                    setDiplomaForm({ ...diplomaForm, diplomaNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nhập số bằng..."
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày cấp <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={diplomaForm.issueDate}
                  onChange={(e) =>
                    setDiplomaForm({ ...diplomaForm, issueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiplomaModal(false)
                    resetDiplomaForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={issueDiplomaMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {issueDiplomaMutation.isPending ? 'Đang xử lý...' : 'Cấp bằng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
