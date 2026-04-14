import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/AuthContext'
import tuitionApi from '../../../api/tuitionApi'
import type { Invoice, Payment } from '../../../api/tuitionApi'

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

export default function StudentTuitionPage(): React.JSX.Element {
  const { user } = useAuth()
  const studentId = user?.studentId?.toString() || ''

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')

  // Fetch invoices
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['student-invoices', studentId],
    queryFn: () =>
      tuitionApi
        .getInvoicesByStudent(studentId)
        .then((r) => r.data as { data: Invoice[]; totalCount: number }),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })

  // Fetch payments
  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: () =>
      tuitionApi
        .getPaymentHistory(studentId)
        .then((r) => r.data as { data: Payment[] }),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })

  // Fetch debt status
  const { data: debtData } = useQuery({
    queryKey: ['student-debt', studentId],
    queryFn: () =>
      tuitionApi
        .checkDebt(studentId)
        .then((r) => r.data.data),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })

  const invoices: Invoice[] = invoicesData?.data || []
  const payments: Payment[] = paymentsData?.data || []
  const debt = debtData || { hasDebt: false, totalDebt: 0, unpaidInvoiceCount: 0 }

  const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0)
  const totalAmount = invoices.reduce((sum, i) => sum + i.totalAmount, 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Học phí của tôi</h1>
        <p className="text-gray-600 mt-1">
          Xem hóa đơn học phí và lịch sử thanh toán
        </p>
      </div>

      {/* Debt Warning */}
      {debt.hasDebt && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <i className="fas fa-exclamation-triangle text-red-600 text-xl mr-3 mt-1"></i>
            <div>
              <h3 className="font-semibold text-red-800">Cảnh báo nợ học phí</h3>
              <p className="text-red-700 mt-1">
                Bạn còn nợ <strong>{formatCurrency(debt.totalDebt)}</strong> từ{' '}
                <strong>{debt.unpaidInvoiceCount}</strong> hóa đơn chưa thanh toán.
                Vui lòng thanh toán để tiếp tục đăng ký học phần.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tổng học phí</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(totalAmount)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Đã thanh toán</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalPaid)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Còn nợ</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(debt.totalDebt)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === 'invoices'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('invoices')}
            >
              <i className="fas fa-file-invoice mr-2"></i>
              Hóa đơn học phí
            </button>
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === 'payments'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('payments')}
            >
              <i className="fas fa-money-bill-wave mr-2"></i>
              Lịch sử thanh toán
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'invoices' && (
            <>
              {loadingInvoices ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-spinner fa-spin text-2xl"></i>
                  <p className="mt-2">Đang tải...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-inbox text-4xl mb-3"></i>
                  <p>Chưa có hóa đơn nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Năm học / Kỳ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tín chỉ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tổng tiền
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Đã thanh toán
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Còn nợ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Hạn thanh toán
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((inv) => (
                        <tr key={inv.invoiceId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {inv.schoolYearName || inv.schoolYearId}
                            </div>
                            <div className="text-sm text-gray-500">Kỳ {inv.semester}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {inv.totalCredits}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(inv.totalAmount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">
                            {formatCurrency(inv.paidAmount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                            {formatCurrency(inv.debtAmount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(inv.dueDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`badge ${getStatusClass(inv.status)}`}>
                              {getStatusText(inv.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'payments' && (
            <>
              {loadingPayments ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-spinner fa-spin text-2xl"></i>
                  <p className="mt-2">Đang tải...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-inbox text-4xl mb-3"></i>
                  <p>Chưa có lịch sử thanh toán</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ngày thanh toán
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Năm học / Kỳ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Số tiền
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Phương thức
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Mã giao dịch
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((pay) => (
                        <tr key={pay.paymentId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(pay.paymentDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {pay.schoolYearName || '—'}
                            </div>
                            {pay.semester && (
                              <div className="text-sm text-gray-500">Kỳ {pay.semester}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(pay.amount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {pay.paymentMethod === 'CASH' && 'Tiền mặt'}
                            {pay.paymentMethod === 'BANK_TRANSFER' && 'Chuyển khoản'}
                            {pay.paymentMethod === 'CARD' && 'Thẻ'}
                            {pay.paymentMethod === 'OTHER' && 'Khác'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {pay.transactionRef || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {pay.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
