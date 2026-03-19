import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, Sector
} from 'recharts'
import lookupApi from '../../../api/lookupApi'
import reportApi from '../../../api/reportApi'

const GPA_COLORS = { excellent: '#28a745', good: '#0d6efd', average: '#ffc107', weak: '#dc3545' }
const WARNING_COLORS = { lowGpa: '#ffc107', poorAttendance: '#fd7e14', both: '#dc3545' }
const DEBT_COLORS = '#36a2eb'

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
}

interface SchoolYearItem {
  schoolYearId: string
  yearName?: string
  schoolYearCode?: string
}

interface FacultyItem {
  facultyId: string
  facultyName?: string
  name?: string
}

interface MajorItem {
  majorId: string
  majorName?: string
  name?: string
}

interface GpaDistribution {
  excellent?: number
  good?: number
  average?: number
  weak?: number
}

interface CreditDebtRange {
  range?: string
  count?: number
}

interface AcademicWarnings {
  total?: number
  lowGpa?: number
  poorAttendance?: number
  both?: number
}

interface CreditDebtStats {
  total?: number
  byRange?: CreditDebtRange[]
}

interface TopDebtStudent {
  studentId?: string
  studentCode?: string
  fullName?: string
  studentName?: string
  className?: string
  adminClassName?: string
  creditDebt?: number
  debt?: number
  gpa?: number | string
  GPA?: number | string
}

interface AdminReportsResponse {
  creditDebtStats?: CreditDebtStats
  academicWarnings?: AcademicWarnings
  gpaDistribution?: GpaDistribution
  topCreditDebt?: TopDebtStudent[]
}

interface GpaChartEntry {
  name: string
  value: number
  color: string
}

interface WarningChartEntry {
  name: string
  value: number
  color: string
}

interface DebtChartEntry {
  range?: string
  count?: number
}

interface Filters {
  schoolYearId: string
  facultyId: string
  majorId: string
  semester: string
}

interface SectorProps {
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
}

function renderActiveShape(props: SectorProps): React.ReactElement {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

export default function AdminReportPage(): React.JSX.Element {
  const [filters, setFilters] = useState<Filters>({
    schoolYearId: '', facultyId: '', majorId: '', semester: '',
  })
  const [activeGpaIndex, setActiveGpaIndex] = useState<number>(0)
  const [activeWarningIndex, setActiveWarningIndex] = useState<number>(0)

  const { data: schoolYears = [] } = useQuery<SchoolYearItem[]>({
    queryKey: ['school-years-dropdown'], staleTime: 5 * 60 * 1000,
    queryFn: () => lookupApi.getSchoolYears().then((r: any) => {
      const d = r.data
      return (Array.isArray(d) ? d : (d?.data || d?.items || [])) as SchoolYearItem[]
    }),
  })
  const { data: faculties = [] } = useQuery<FacultyItem[]>({
    queryKey: ['faculties-dropdown'], staleTime: 5 * 60 * 1000,
    queryFn: () => lookupApi.getFaculties().then((r: any) => {
      const d = r.data
      return (Array.isArray(d) ? d : (d?.data || d?.items || [])) as FacultyItem[]
    }),
  })
  const { data: majors = [] } = useQuery<MajorItem[]>({
    queryKey: ['majors-dropdown', filters.facultyId], staleTime: 5 * 60 * 1000,
    enabled: !!filters.facultyId,
    queryFn: () => lookupApi.getMajors(filters.facultyId).then((r: any) => {
      const d = r.data
      return (Array.isArray(d) ? d : (d?.data || d?.items || [])) as MajorItem[]
    }),
  })

  const { data: reports = {}, isLoading, refetch } = useQuery<AdminReportsResponse>({
    queryKey: ['admin-reports', filters],
    queryFn: () => reportApi.getAdminReports(filters).then((r: any) => {
      const d = r.data
      return (d?.data || d || {}) as AdminReportsResponse
    }),
    staleTime: 0,
  })

  const creditDebt = reports.creditDebtStats || { total: 0, byRange: [] }
  const warnings = reports.academicWarnings || { total: 0, lowGpa: 0, poorAttendance: 0, both: 0 }
  const gpaDist = reports.gpaDistribution || { excellent: 0, good: 0, average: 0, weak: 0 }
  const topDebt = reports.topCreditDebt || []

  const gpaTotal = gpaDist.excellent + gpaDist.good + gpaDist.average + gpaDist.weak
  const warningTotal = warnings.lowGpa + warnings.poorAttendance + warnings.both

  const gpaData: GpaChartEntry[] = [
    { name: 'Giỏi (≥3.5)', value: gpaDist.excellent, color: GPA_COLORS.excellent },
    { name: 'Khá (3.0–3.49)', value: gpaDist.good, color: GPA_COLORS.good },
    { name: 'TB (2.0–2.99)', value: gpaDist.average, color: GPA_COLORS.average },
    { name: 'Yếu (<2.0)', value: gpaDist.weak, color: GPA_COLORS.weak },
  ].filter((d) => d.value > 0)

  const warningData: WarningChartEntry[] = [
    { name: 'GPA < 2.0', value: warnings.lowGpa, color: WARNING_COLORS.lowGpa },
    { name: 'Điểm danh < 50%', value: warnings.poorAttendance, color: WARNING_COLORS.poorAttendance },
    { name: 'Cả hai', value: warnings.both, color: WARNING_COLORS.both },
  ].filter((d) => d.value > 0)

  const debtData: DebtChartEntry[] = (creditDebt.byRange || []).map((r): DebtChartEntry => ({
    range: r.range,
    count: r.count,
  }))

  function handleExportExcel(): void {
    const wb = XLSX.utils.book_new()

    const gpaSheet = XLSX.utils.json_to_sheet([
      { 'Xếp loại': 'Giỏi (≥3.5)', 'Số SV': gpaDist.excellent, 'Tỷ lệ': gpaTotal ? Math.round(gpaDist.excellent / gpaTotal * 100) + '%' : '0%' },
      { 'Xếp loại': 'Khá (3.0–3.49)', 'Số SV': gpaDist.good, 'Tỷ lệ': gpaTotal ? Math.round(gpaDist.good / gpaTotal * 100) + '%' : '0%' },
      { 'Xếp loại': 'Trung bình (2.0–2.99)', 'Số SV': gpaDist.average, 'Tỷ lệ': gpaTotal ? Math.round(gpaDist.average / gpaTotal * 100) + '%' : '0%' },
      { 'Xếp loại': 'Yếu (<2.0)', 'Số SV': gpaDist.weak, 'Tỷ lệ': gpaTotal ? Math.round(gpaDist.weak / gpaTotal * 100) + '%' : '0%' },
    ])
    XLSX.utils.book_append_sheet(wb, gpaSheet, 'Phân bố GPA')

    const warnSheet = XLSX.utils.json_to_sheet([
      { 'Loại cảnh báo': 'GPA thấp (<2.0)', 'Số SV': warnings.lowGpa },
      { 'Loại cảnh báo': 'Điểm danh thấp (<50%)', 'Số SV': warnings.poorAttendance },
      { 'Loại cảnh báo': 'Cả hai', 'Số SV': warnings.both },
    ])
    XLSX.utils.book_append_sheet(wb, warnSheet, 'Cảnh báo học tập')

    const debtSheet = XLSX.utils.json_to_sheet(
      (creditDebt.byRange || []).map((r) => ({ 'Khoảng nợ': r.range, 'Số sinh viên': r.count }))
    )
    XLSX.utils.book_append_sheet(wb, debtSheet, 'Nợ tín chỉ')

    if (topDebt.length > 0) {
      const topSheet = XLSX.utils.json_to_sheet(
        topDebt.map((s, i) => ({
          'STT': i + 1,
          'Mã SV': s.studentCode || '',
          'Họ tên': s.fullName || s.studentName || '',
          'Số tín chỉ nợ': s.creditDebt ?? s.debt ?? 0,
          'GPA': s.gpa ?? s.GPA ?? '',
          'Lớp': s.className || s.adminClassName || '',
        }))
      )
      XLSX.utils.book_append_sheet(wb, topSheet, 'Top nợ tín chỉ')
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const fileName = `BaoCao_Admin_${new Date().toISOString().slice(0, 10)}.xlsx`
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName)
    toast.success('Đã tải file Excel!')
  }

  function handleFacultyChange(fid: string): void {
    setFilters((f) => ({ ...f, facultyId: fid, majorId: '' }))
  }

  return (
    <div>
      <div className="page-header d-flex justify-content-between align-items-center">
        <div>
          <h1><i className="fas fa-chart-bar"></i> Báo cáo thống kê</h1>
          <p className="text-muted mb-0">Thống kê toàn diện hệ thống</p>
        </div>
        <button className="btn btn-success" onClick={handleExportExcel}>
          <i className="fas fa-file-excel"></i> Export Excel
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Năm học</label>
              <select className="form-control" value={filters.schoolYearId}
                onChange={(e) => setFilters((f) => ({ ...f, schoolYearId: e.target.value }))}>
                <option value="">— Tất cả —</option>
                {schoolYears.map((s) => <option key={s.schoolYearId} value={s.schoolYearId}>{s.yearName || s.schoolYearCode}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Khoa</label>
              <select className="form-control" value={filters.facultyId}
                onChange={(e) => handleFacultyChange(e.target.value)}>
                <option value="">— Tất cả —</option>
                {faculties.map((f) => <option key={f.facultyId} value={f.facultyId}>{f.facultyName || f.name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Ngành</label>
              <select className="form-control" value={filters.majorId}
                onChange={(e) => setFilters((f) => ({ ...f, majorId: e.target.value }))}
                disabled={!filters.facultyId}>
                <option value="">— Tất cả —</option>
                {majors.map((m) => <option key={m.majorId} value={m.majorId}>{m.majorName || m.name}</option>)}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button className="btn btn-primary w-100" onClick={() => refetch()}>
                <i className="fas fa-sync"></i> Tải báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x"></i></div>
      )}

      {!isLoading && (
        <>
          <div className="row mb-3">
            <div className="col-md-3 col-6">
              <div className="card text-center">
                <div className="card-body">
                  <div className="h3 mb-0 text-danger">{creditDebt.total}</div>
                  <small>SV nợ tín chỉ</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card text-center">
                <div className="card-body">
                  <div className="h3 mb-0 text-warning">{warnings.total}</div>
                  <small>SV cảnh báo HT</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card text-center">
                <div className="card-body">
                  <div className="h3 mb-0">{gpaTotal}</div>
                  <small>Tổng SV đánh giá</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card text-center">
                <div className="card-body">
                  <div className="h3 mb-0 text-success">{gpaTotal ? Math.round(gpaDist.excellent / gpaTotal * 100) : 0}%</div>
                  <small>Tỷ lệ Giỏi</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-header"><strong><i className="fas fa-chart-pie"></i> Phân bố GPA</strong></div>
                <div className="card-body">
                  {gpaData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          activeIndex={activeGpaIndex}
                          activeShape={renderActiveShape}
                          data={gpaData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          dataKey="value"
                          onMouseEnter={(_, idx) => setActiveGpaIndex(idx)}
                        >
                          {gpaData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${v} SV`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">Chưa có dữ liệu</div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-header"><strong><i className="fas fa-exclamation-triangle"></i> Cảnh báo học tập</strong></div>
                <div className="card-body">
                  {warningData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          activeIndex={activeWarningIndex}
                          activeShape={renderActiveShape}
                          data={warningData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          dataKey="value"
                          onMouseEnter={(_, idx) => setActiveWarningIndex(idx)}
                        >
                          {warningData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${v} SV`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">Không có cảnh báo</div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-header"><strong><i className="fas fa-chart-bar"></i> Nợ tín chỉ theo khoảng</strong></div>
                <div className="card-body">
                  {debtData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={debtData}>
                        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v} SV`} />
                        <Bar dataKey="count" fill={DEBT_COLORS} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">Chưa có dữ liệu</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {topDebt.length > 0 && (
            <div className="card">
              <div className="card-header">
                <strong><i className="fas fa-exclamation-circle"></i> Top 10 sinh viên nợ tín chỉ nhiều nhất</strong>
              </div>
              <div className="card-body p-0">
                <div className="table-container">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã SV</th>
                        <th>Họ tên</th>
                        <th>Lớp</th>
                        <th>Tín chỉ nợ</th>
                        <th>GPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDebt.map((s, i) => (
                        <tr key={s.studentId || i}>
                          <td>{i + 1}</td>
                          <td><strong>{s.studentCode || '—'}</strong></td>
                          <td>{s.fullName || s.studentName || '—'}</td>
                          <td>{s.className || s.adminClassName || '—'}</td>
                          <td><span className="badge badge-danger">{s.creditDebt ?? s.debt ?? 0}</span></td>
                          <td>{s.gpa ?? s.GPA ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
