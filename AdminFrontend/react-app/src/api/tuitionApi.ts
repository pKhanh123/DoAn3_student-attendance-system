import apiClient from './index'

export interface TuitionFeeConfig {
  configId: string
  academicYearId: string
  academicYear?: string
  feePerCredit: number
  effectiveFrom: string
  effectiveTo?: string
  isActive: boolean
  createdAt?: string
  createdBy?: string
}

export interface Invoice {
  invoiceId: string
  studentId: string
  studentCode?: string
  studentName?: string
  schoolYearId: string
  schoolYearName?: string
  semester: number
  totalCredits: number
  feePerCredit: number
  totalAmount: number
  paidAmount: number
  debtAmount: number
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  dueDate: string
  invoiceDate: string
  note?: string
  createdAt?: string
}

export interface Payment {
  paymentId: string
  invoiceId: string
  studentId: string
  studentCode?: string
  studentName?: string
  amount: number
  paymentDate: string
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'
  transactionRef?: string
  note?: string
  schoolYearId?: string
  schoolYearName?: string
  semester?: number
  invoiceTotal?: number
  invoicePaid?: number
  invoiceDebt?: number
}

export interface TuitionCalculation {
  totalCredits: number
  feePerCredit: number
  totalAmount: number
}

export interface StudentDebt {
  hasDebt: boolean
  totalDebt: number
  unpaidInvoiceCount: number
}

export interface CreateFeeConfigDto {
  academicYearId: string
  feePerCredit: number
  effectiveFrom: string
  effectiveTo?: string
}

export interface CreateInvoiceDto {
  studentId: string
  schoolYearId: string
  semester: number
  dueDate: string
}

export interface CreatePaymentDto {
  invoiceId: string
  studentId: string
  amount: number
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'
  transactionRef?: string
  note?: string
}

const tuitionApi = {
  // Fee Config
  getFeeConfigs: (academicYearId: string) =>
    apiClient.get<{ success: boolean; data: TuitionFeeConfig[] }>(
      `/tuition/fee-configs/${academicYearId}`
    ),

  createFeeConfig: (data: CreateFeeConfigDto) =>
    apiClient.post<{ success: boolean; message: string; configId: string }>(
      '/tuition/fee-configs',
      data
    ),

  // Tuition Calculation
  calculateTuition: (studentId: string, schoolYearId: string, semester: number) =>
    apiClient.get<{ success: boolean; data: TuitionCalculation }>(
      `/tuition/calculate/${studentId}`,
      { params: { schoolYearId, semester } }
    ),

  // Invoices
  getInvoicesByStudent: (studentId: string, status?: string) =>
    apiClient.get<{ success: boolean; data: Invoice[]; totalCount: number }>(
      `/tuition/invoices/student/${studentId}`,
      { params: status ? { status } : {} }
    ),

  getUnpaidInvoices: () =>
    apiClient.get<{ success: boolean; data: Invoice[]; totalCount: number }>(
      '/tuition/unpaid-invoices'
    ),

  createInvoice: (data: CreateInvoiceDto) =>
    apiClient.post<{ success: boolean; message: string; invoiceId: string }>(
      '/tuition/invoices',
      data
    ),

  // Payments
  getPaymentHistory: (studentId: string) =>
    apiClient.get<{ success: boolean; data: Payment[] }>(
      `/tuition/payments/student/${studentId}`
    ),

  createPayment: (data: CreatePaymentDto) =>
    apiClient.post<{ success: boolean; message: string; paymentId: string }>(
      '/tuition/payments',
      data
    ),

  // Debt Check
  checkDebt: (studentId: string) =>
    apiClient.get<{ success: boolean; data: StudentDebt }>(
      `/tuition/check-debt/${studentId}`
    ),
}

export default tuitionApi
