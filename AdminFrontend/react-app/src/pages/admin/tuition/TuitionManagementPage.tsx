import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import tuitionApi from '../../../api/tuitionApi'
import type { Invoice, CreatePaymentDto } from '../../../api/tuitionApi'

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
  }
}

interface PaymentForm {
  invoiceId: string
  studentId: string
  amount: string
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'
  transactionRef: string
  note: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'PAID': return 'badge-success'
    case 'PARTIAL': return 'badge-warning'
    case 'UNPAID': return 'badge-danger'
    case 'OVERDUE': return 'badge-danger'
    default: return 'badge-secondary'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'PAID': return 'Đã thanh toán'
    case 'PARTIAL': return 'Thanh toán 1 phần'
    case 'UNPAID': return 'Chưa thanh toán'
    case 'OVERDUE': return 'Quá hạn'
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

export default function TuitionManagementPage(): React.JSX.Element {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    invoiceId: '',
    studentId: '',
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    transactionRef: '',
    note: '',
  })

  // Fetch unpaid invoices
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['unpaid-invoices'],
    queryFn: () =>
      tuitionApi
        .getUnpaidInvoices()
        .then((r) => r.data as { data: Invoice[]; totalCount: number }),
    staleTime: 30 * 1000,
  })

  const allInvoices: Invoice[] = rawData?.data || []
  const filtered = search
    ? allInvoices.filter(
        (inv) =>
          inv.studentCode?.toLowerCase().includes(search.toLowerCase()) ||
          inv.studentName?.toLowerCase().includes(search.toLowerCase())
      )
    : allInvoices

  const statusFiltered = filterStatus
    ? filtered.filter((inv) => inv.status === filterStatus)
    : filtered

  const totalPages = Math.ceil(statusFiltered.length / pageSize)
  const paginatedInvoices = statusFiltered.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  // Stats
  const totalInvoices = allInvoices.length
  const totalPaid = allInvoices.filter((i) => i.status === 'PAID').length
  const totalUnpaid = allInvoices.filter((i) => i.status === 'UNPAID').length
  const totalOverdue = allInvoices.filter((i) => i.status === 'OVERDUE').length
  const totalDebt = allInvoices.reduce((sum, i) => sum + i.debtAmount, 0)

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data: CreatePaymentDto) => tuitionApi.createPayment(data),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Ghi nhận thanh toán thành công')
      queryClient.invalidateQueries({ queryKey: ['unpaid-invoices'] })
      setShowPaymentModal(false)
      resetPaymentForm()
    },
    onError: (error: ApiError) => {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Lỗi khi ghi nhận thanh toán'
      toast.error(msg)
    },
  })

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaymentForm({
      invoiceId: invoice.invoiceId,
      studentId: invoice.studentId,
      amount: invoice.debtAmount.toString(),
      paymentMethod: 'BANK_TRANSFER',
      transactionRef: '',
      note: '',
    })
    setShowPaymentModal(true)
  }

  const resetPaymentForm = () => {
    setPaymentForm({
      invoiceId: '',
      studentId: '',
      amount: '',
      paymentMethod: 'BANK_TRANSFER',
      transactionRef: '',
      note: '',
    })
    setSelectedInvoice(null)
  }

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(paymentForm.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Số tiền thanh toán không hợp lệ')
      return
    }
    if (selectedInvoice && amount > selectedInvoice.debtAmount) {
      toast.error('Số tiền thanh toán vượt quá số tiền còn nợ')
      return
    }
    createPaymentMutation.mutate({
      invoiceId: paymentForm.invoiceId,
      studentId: paymentForm.studentId,
      amount,
      paymentMethod: paymentForm.paymentMethod,
      transactionRef: paymentForm.transactionRef || undefined,
      note: paymentForm.note || undefined,
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Học phí</h1>
        <p className="text-gray-600 mt-1">
          Quản lý hóa đơn học phí và thanh toán của sinh viên
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tổng hóa đơn</div>
          <div className="text-2xl font-bold text-gray-800">{totalInvoices}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Đã thanh toán</div>
          <div className="text-2xl font-bold text-green-600">{totalPaid}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Chưa thanh toán</div>
          <div className="text-2xl font-bold text-orange-600">{totalUnpaid}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Quá hạn</div>
          <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tổng nợ</div>
          <div className="text-xl font-bold text-red-600">
            {formatCurrency(totalDebt)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tìm kiếm sinh viên
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Mã SV, tên sinh viên..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PARTIAL">Thanh toán 1 phần</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="OVERDUE">Quá hạn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Mã SV
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tên sinh viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Năm học / HK
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Tổng tiền
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Đã thanh toán
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Còn nợ
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Hạn thanh toán
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedInvoices.map((invoice) => (
                    <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.studentCode || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.studentName || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {invoice.schoolYearName || '—'} / HK{invoice.semester}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                        {formatCurrency(invoice.paidAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                        {formatCurrency(invoice.debtAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(
                            invoice.status
                          )}`}
                        >
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {invoice.status !== 'PAID' && (
                          <button
                            onClick={() => handleRecordPayment(invoice)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ghi nhận thanh toán
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
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Hiển thị {(page - 1) * pageSize + 1} -{' '}
                  {Math.min(page * pageSize, statusFiltered.length)} / {statusFiltered.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Ghi nhận thanh toán
              </h3>
            </div>
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sinh viên
                </label>
                <div className="text-sm text-gray-900">
                  {selectedInvoice.studentCode} - {selectedInvoice.studentName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hóa đơn
                </label>
                <div className="text-sm text-gray-900">
                  {selectedInvoice.schoolYearName} / HK{selectedInvoice.semester}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền còn nợ
                </label>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(selectedInvoice.debtAmount)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền thanh toán <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  required
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phương thức thanh toán <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: e.target.value as PaymentForm['paymentMethod'],
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                  <option value="CARD">Thẻ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã giao dịch
                </label>
                <input
                  type="text"
                  value={paymentForm.transactionRef}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, transactionRef: e.target.value })
                  }
                  placeholder="Mã tham chiếu giao dịch (nếu có)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={paymentForm.note}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, note: e.target.value })
                  }
                  rows={3}
                  placeholder="Ghi chú thêm (nếu có)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false)
                    resetPaymentForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createPaymentMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
