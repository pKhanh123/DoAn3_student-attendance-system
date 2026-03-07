import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import userApi from '../../../api/userApi'
import { useAuth } from '../../../contexts/AuthContext'
import { ROLES } from '../../../utils/constants'

// ── Pagination helpers ──────────────────────────────────────────
function getPages(currentPage, totalPages) {
  const pages = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function UserListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll().then((r) => r.data),
    staleTime: 30 * 1000,
  })

  // Fetch roles for filter dropdown
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => userApi.getRoles().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => userApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa người dùng thành công!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.response?.data || 'Không thể xóa người dùng.'
      if (error.response?.status === 403) {
        toast.error('Bạn không có quyền xóa người dùng này.')
      } else if (error.response?.status === 409) {
        toast.error('Không thể xóa người dùng này vì có dữ liệu liên quan.')
      } else {
        toast.error(msg)
      }
    },
  })

  // Filtered + paginated users
  const filtered = users.filter((u) => {
    const s = search.toLowerCase()
    const matchSearch =
      !s ||
      (u.username || '').toLowerCase().includes(s) ||
      (u.fullName || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    const matchRole = !filterRole || u.roleId?.toString() === filterRole
    const matchStatus = filterStatus === '' || (u.isActive?.toString() === filterStatus)
    return matchSearch && matchRole && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function resetFilters() {
    setSearch('')
    setFilterRole('')
    setFilterStatus('')
    setPage(1)
  }

  function handleDelete(userId) {
    if (userId === currentUser?.userId) {
      toast.error('Bạn không thể xóa tài khoản của chính mình!')
      return
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?\n\nHành động này không thể hoàn tác!')) return
    deleteMutation.mutate(userId)
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Tìm kiếm theo tên, email, username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="filter-group">
          <select className="form-control" value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1) }}>
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
            ))}
          </select>
          <select className="form-control" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Khóa</option>
          </select>
          <button className="btn btn-secondary" onClick={resetFilters}>
            <i className="fas fa-redo"></i> Đặt lại
          </button>
          {currentUser?.role === ROLES.ADMIN && (
            <button className="btn btn-primary" onClick={() => navigate('/admin/users/new')}>
              <i className="fas fa-plus"></i> Thêm người dùng
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên đăng nhập</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center">
                      <i className="fas fa-spinner fa-spin"></i> Đang tải...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">Không có dữ liệu</td>
                  </tr>
                ) : (
                  paginated.map((user) => (
                    <tr key={user.userId}>
                      <td>{user.username}</td>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>
                        <span className="badge badge-primary">{user.roleName}</span>
                      </td>
                      <td>
                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {user.isActive ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/users/${user.userId}/edit`)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          {currentUser?.role === ROLES.ADMIN && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.userId)}>
                              <i className="fas fa-trash"></i> Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Hiển thị {(safePage - 1) * pageSize + 1} – {Math.min(safePage * pageSize, filtered.length)} trong tổng số {filtered.length} người dùng
              </div>
              <div className="pagination">
                <button className="btn btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
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
                <button className="btn btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  Sau <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
