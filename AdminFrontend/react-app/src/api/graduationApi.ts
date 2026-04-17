import apiClient from './index'

export interface GraduationRequirement {
  requirementId: string
  majorId: string
  majorName?: string
  requiredCredits: number
  minGpa: number
  isActive: boolean
  createdAt?: string
  createdBy?: string
}

export interface GraduationEligibility {
  isEligible: boolean
  reason?: string
  totalCredits?: number
  requiredCredits?: number
  gpa?: number
  minGpa?: number
  hasDebt?: boolean
  failedSubjects?: number
}

export interface GraduationApplication {
  applicationId: string
  studentId: string
  studentCode?: string
  studentName?: string
  schoolYearId?: string
  schoolYearName?: string
  semester?: number
  majorId?: string
  majorName?: string
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'DIPLOMA_ISSUED'
  advisorNote?: string
  adminNote?: string
  requestedAt?: string
  verifiedAt?: string
  verifiedBy?: string
  approvedAt?: string
  approvedBy?: string
  diplomaNumber?: string
  issueDate?: string
  createdAt?: string
}

export interface CreateRequirementDto {
  majorId: string
  requiredCredits: number
  minGpa: number
}

export interface CreateApplicationDto {
  studentId: string
  schoolYearId: string
  semester: number
}

export interface UpdateStatusDto {
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'DIPLOMA_ISSUED'
  note?: string
}

export interface IssueDiplomaDto {
  diplomaNumber: string
  issueDate: string
}

const graduationApi = {
  // Requirements
  getRequirementByMajor: (majorId: string) =>
    apiClient.get<{ success: boolean; data: GraduationRequirement | null }>(
      `/graduation/requirements/${majorId}`
    ),

  createRequirement: (data: CreateRequirementDto) =>
    apiClient.post<{ success: boolean; message: string; requirementId: string }>(
      '/graduation/requirements',
      data
    ),

  // Eligibility
  checkEligibility: (studentId: string) =>
    apiClient.get<{ success: boolean; data: GraduationEligibility | null }>(
      `/graduation/check-eligibility/${studentId}`
    ),

  // Applications
  createApplication: (data: CreateApplicationDto) =>
    apiClient.post<{ success: boolean; message: string; applicationId: string }>(
      '/graduation/applications',
      data
    ),

  getApplicationsByStudent: (studentId: string) =>
    apiClient.get<{ success: boolean; data: GraduationApplication[]; totalCount: number }>(
      `/graduation/applications/student/${studentId}`
    ),

  getApplicationById: (applicationId: string) =>
    apiClient.get<{ success: boolean; data: GraduationApplication | null }>(
      `/graduation/applications/${applicationId}`
    ),

  getAllApplications: (status?: string, pageNumber = 1, pageSize = 20) =>
    apiClient.get<{ success: boolean; data: GraduationApplication[]; totalCount: number }>(
      '/graduation/applications',
      { params: { status, pageNumber, pageSize } }
    ),

  updateStatus: (applicationId: string, data: UpdateStatusDto) =>
    apiClient.put<{ success: boolean; message: string }>(
      `/graduation/applications/${applicationId}/status`,
      data
    ),

  issueDiploma: (applicationId: string, data: IssueDiplomaDto) =>
    apiClient.post<{ success: boolean; message: string }>(
      `/graduation/applications/${applicationId}/issue-diploma`,
      data
    ),
}

export default graduationApi
