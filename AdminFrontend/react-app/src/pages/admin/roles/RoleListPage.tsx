import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import roleApi from '../../../api/roleApi'
import type { Role } from '../../../types'

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
  }
}

interface RoleForm {
  roleName: string
  description: string
  isActive: boolean
}

interface FormErrors {
  roleName?: string
}

function getPages(current: number, total: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function RoleListPage(): React.JSX.Element {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState<string>('')
  const [filterActive, setFilterActive] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState<RoleForm>({
    roleName: '',
    description: '',
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  // Lấy toàn bộ danh sách (cho stats)
  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['roles-all'],
    queryFn: () => roleApi.getAll().then((r: any) => {
      const d = r.data
      if (Array.isArray(d)) return d as Role[]
      return (d?.data || d?.items || []) as Role[]
    }),
    staleTime: 60 * 1000,
  })

  // Stats
  const stats = {
    total: allRoles.length,
    active: allRoles.filter((r) => r.isActive).length,
    inactive: allRoles.filter((r) => !r.isActive).length,
  }

  // Lấy danh sách có phân trang (server-side params)
  const { data: paginatedData = [], isLoading } = useQuery<Role[]>({
    queryKey: ['roles', page, search, filterActive],
    queryFn: () => roleApi.getAll({ page, pageSize, search, isActive: filterActive }).then((r: any) => {
      const d = r.data
      if (Array.isArray(d)) return d as Role[]
      return (d?.data || d?.items || []) as Role[]
    }),
    staleTime: 30 * 1000,
  })

  // Client-side lọc (khi API không hỗ trợ filter)
  const filtered = search.trim() || filterActive
    ? allRoles.filter((r) => {
        const matchSearch = !search.trim() ||
          r.roleName?.toLowerCase().includes(search.toLowerCase()) ||
          r.description?.toLowerCase().includes(search.toLowerCase())
        const matchActive = !filterActive ||
          (filterActive === 'true' && r.isActive) ||
          (filterActive === 'false' && !r.isActive)
        return matchSearch && matchActive
      })
    : allRoles

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const displayItems = (search.trim() || filterActive ? filtered : paginatedData).length > 0
    ? (search.trim() || filterActive ? filtered : paginatedData)
    : (search.trim() || filterActive ? filtered : paginatedData)
  const itemsToShow = search.trim() || filterActive ? filtered : paginatedData
  const sliced = itemsToShow.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Mutation tạo mới
  const createMutation = useMutation<unknown, ApiError, void>({
    mutationFn: () => {
      const errs = validateForm()
      if (Object.keys(errs).length > 0) throw { validation: errs }
      return roleApi.create({ roleName: form.roleName, description: form.description })
    },
    onSuccess: () => {
      toast.success('Thêm vai trò thành công!')
      setShowModal(false)
      setForm({ roleName: '', description: '', isActive: true })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (error: any) => {
      if (error.validation) { setFormErrors(error.validation); return }
      toast.error(error.response?.data?.message || 'Lỗi khi thêm vai trò')
    },
  })

  // Mutation cập nhật
  const updateMutation = useMutation<unknown, ApiError, void>({
    mutationFn: () => {
      if (!editingRole) return Promise.reject()
      return roleApi.update(editingRole.roleId, {
        roleName: form.roleName,
        description: form.description,
        isActive: form.isActive,
      })
    },
    onSuccess: () => {
      toast.success('Cập nhật vai trò thành công!')
      setShowModal(false)
      setEditingRole(null)
      setForm({ roleName: '', description: '', isActive: true })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật vai trò')
    },
  })

  // Mutation toggle trạng thái
  const toggleMutation = useMutation<unknown, ApiError, Role>({
    mutationFn: (role) => roleApi.toggleStatus(role.roleId),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Cập nhật trạng thái thành công!')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Không thể cập nhật trạng thái'
      toast.error(msg)
    },
  })

  // Mutation xóa
  const deleteMutation = useMutation<unknown, ApiError, number | string>({
    mutationFn: (id) => roleApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa vai trò thành công!')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Không thể xóa vai trò này'),
  })

  function validateForm(): FormErrors {
    const errs: FormErrors = {}
    if (!form.roleName.trim()) errs.roleName = 'Tên vai trò bắt buộc'
    return errs
  }

  function handleSave(): void {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    if (editingRole) updateMutation.mutate()
    else createMutation.mutate()
  }

  function handleDelete(role: Role): void {
    if (!window.confirm(`Bạn có chắc muốn xóa vai trò "${role.roleName}"?`)) return
    deleteMutation.mutate(role.roleId)
  }

  function openCreate(): void {
    setEditingRole(null)
    setForm({ roleName: '', description: '', isActive: true })
    setFormErrors({})
    setShowModal(true)
  }

  function openEdit(r: Role): void {
    setEditingRole(r)
    setForm({
      roleName: r.roleName || '',
      description: r.description || '',
      isActive: r.isActive ?? true,
    })
    setFormErrors({})
    setShowModal(true)
  }

  function closeModal(): void {
    setShowModal(false)
    setEditingRole(null)
    setForm({ roleName: '', description: '', isActive: true })
    setFormErrors({})
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      {/* Stats bar */}
      <div className="row mb-3">
        <div className="col-md-4 col-4 mb-2">
          <div className="card text-center">
            <div className="card-body py-2">
              <div className="h4 mb-0">{stats.total}</div>
              <small className="text-muted">Tổng vai trò</small>
            </div>
          </div>
        </div>
        <div className="col-md-4 col-4 mb-2">
          <div className="card text-center">
            <div className="card-body py-2">
              <div className="h4 mb-0 text-success">{stats.active}</div>
              <small className="text-muted">Đang hoạt động</small>
            </div>
          </div>
        </div>
        <div className="col-md-4 col-4 mb-2">
          <div className="card text-center">
            <div className="card-body py-2">
              <div className="h4 mb-0 text-secondary">{stats.inactive}</div>
              <small className="text-muted">Không hoạt động</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Tìm kiếm theo tên, mô tả vai trò..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="filter-group">
          <select
            className="form-control"
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setPage(1) }}
          >
            <option value="">Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fas fa-plus"></i> Thêm vai trò
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>STT</th>
                  <th>Tên vai trò</th>
                  <th>Mô tả</th>
                  <th style={{ width: 120 }}>Trạng thái</th>
                  <th style={{ width: 160 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      <i className="fas fa-spinner fa-spin"></i> Đang tải...
                    </td>
                  </tr>
                ) : sliced.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      {search || filterActive ? 'Không tìm thấy vai trò nào' : 'Chưa có vai trò nào'}
                    </td>
                  </tr>
                ) : (
                  sliced.map((r, idx) => (
                    <tr key={r.roleId}>
                      <td>{(safePage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="fas fa-user-shield" style={{ color: '#6c757d' }}></i>
                          <strong>{r.roleName}</strong>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#6c757d', fontSize: 13 }}>
                          {r.description || <em>—</em>}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.isActive ? 'badge-success' : 'badge-secondary'}`}>
                          {r.isActive ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => toggleMutation.mutate(r)}
                            title={r.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          >
                            <i className={`fas ${r.isActive ? 'fa-toggle-on text-success' : 'fa-toggle-off text-secondary'}`}></i>
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => openEdit(r)}
                          >
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(r)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {itemsToShow.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Hiển thị {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, itemsToShow.length)} / {itemsToShow.length}
              </div>
              <div className="pagination">
                <button
                  className="btn btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <i className="fas fa-chevron-left"></i> Trước
                </button>
                {getPages(safePage, totalPages).map((p) => (
                  <button
                    key={p}
                    className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="btn btn-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  Sau <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>
                {editingRole ? 'Chỉnh sửa vai trò' : 'Thêm vai trò mới'}
              </h4>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label>
                  Tên vai trò <span className="text-danger">*</span>
                </label>
                <input
                  className={`form-control${formErrors.roleName ? ' is-invalid' : ''}`}
                  value={form.roleName}
                  onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))}
                  placeholder="VD: Admin, Lecturer, Student, Advisor"
                  autoFocus
                />
                {formErrors.roleName && (
                  <div className="invalid-feedback d-block">{formErrors.roleName}</div>
                )}
              </div>

              <div className="form-group mb-3">
                <label>Mô tả</label>
                <textarea
                  className="form-control"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Mô tả chức năng, quyền hạn của vai trò này..."
                />
              </div>

              {editingRole && (
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="roleActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    style={{ width: 40, height: 20, cursor: 'pointer' }}
                  />
                  <label className="form-check-label" htmlFor="roleActive">
                    {form.isActive ? 'Hoạt động' : 'Khóa'}
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                ) : (
                  <><i className="fas fa-save"></i> Lưu</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
