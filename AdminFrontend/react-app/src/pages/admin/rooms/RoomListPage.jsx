import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import roomApi from '../../../api/roomApi'

function getPages(currentPage, totalPages) {
  const pages = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export default function RoomListPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState('') // ''=all, 'true'=active, 'false'=inactive
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [form, setForm] = useState({ roomCode: '', building: '', capacity: '', isActive: true })
  const [formErrors, setFormErrors] = useState({})

  // Fetch rooms
  const { data: rawData = {}, isLoading } = useQuery({
    queryKey: ['rooms', page, search, filterActive],
    queryFn: () => {
      const params = { page, pageSize }
      if (search) params.search = search
      if (filterActive === 'true') params.isActive = true
      if (filterActive === 'false') params.isActive = false
      return roomApi.getAll(params).then(r => {
        const d = r.data
        if (d?.success) return { data: d.data || [], pagination: { totalCount: d.totalCount, totalPages: d.totalPages } }
        if (Array.isArray(d)) return { data: d, pagination: {} }
        return { data: d?.data || d?.items || [], pagination: d?.pagination || {} }
      })
    },
    staleTime: 30 * 1000,
  })
  const rooms = Array.isArray(rawData) ? rawData : (rawData?.data || [])
  const pagination = rawData?.pagination || {}

  // Stats
  const { data: allRooms = [] } = useQuery({
    queryKey: ['rooms-all'],
    queryFn: () => roomApi.getAll({ page: 1, pageSize: 1000 }).then(r => {
      const d = r.data
      if (d?.success) return d.data || []
      return Array.isArray(d) ? d : (d?.data || d?.items || [])
    }),
    staleTime: 60 * 1000,
  })

  const stats = {
    total: allRooms.length,
    active: allRooms.filter(r => r.isActive).length,
    inactive: allRooms.filter(r => !r.isActive).length,
    capacity: allRooms.reduce((s, r) => s + (r.capacity || 0), 0),
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : null }
      return editingRoom ? roomApi.update(editingRoom.roomId, payload) : roomApi.create(payload)
    },
    onSuccess: () => {
      toast.success(`${editingRoom ? 'Cập nhật' : 'Tạo'} phòng học thành công!`)
      setShowModal(false)
      setEditingRoom(null)
      setForm({ roomCode: '', building: '', capacity: '', isActive: true })
      setFormErrors({})
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Lỗi khi lưu phòng học'
      toast.error(msg)
    },
  })

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: (room) => roomApi.update(room.roomId, {
      roomCode: room.roomCode,
      building: room.building,
      capacity: room.capacity,
      isActive: !room.isActive,
    }),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công!')
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
    onError: () => toast.error('Không thể cập nhật trạng thái'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => roomApi.delete(id),
    onSuccess: () => {
      toast.success('Xóa phòng học thành công!')
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Không thể xóa phòng học'
      toast.error(msg)
    },
  })

  const totalPages = Math.max(1, pagination.totalPages || Math.ceil(rooms.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = rooms.slice((safePage - 1) * pageSize, safePage * pageSize)

  function validateForm() {
    const errs = {}
    if (!form.roomCode?.trim()) errs.roomCode = 'Mã phòng bắt buộc'
    if (form.capacity && (isNaN(form.capacity) || Number(form.capacity) <= 0)) {
      errs.capacity = 'Sức chứa phải > 0'
    }
    return errs
  }

  function handleSave() {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    saveMutation.mutate()
  }

  function handleDelete(room) {
    if (!window.confirm(`Xóa phòng "${room.roomCode}"?`)) return
    deleteMutation.mutate(room.roomId)
  }

  function openCreate() {
    setEditingRoom(null)
    setForm({ roomCode: '', building: '', capacity: '', isActive: true })
    setFormErrors({})
    setShowModal(true)
  }

  function openEdit(r) {
    setEditingRoom(r)
    setForm({
      roomCode: r.roomCode || '',
      building: r.building || '',
      capacity: r.capacity ?? '',
      isActive: r.isActive !== undefined ? r.isActive : true,
    })
    setFormErrors({})
    setShowModal(true)
  }

  return (
    <div>
      {/* Stats */}
      <div className="row mb-3">
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-center">
            <div className="card-body py-2">
              <div className="h4 mb-0">{stats.total}</div>
              <small className="text-muted">Tổng phòng</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-center">
            <div className="card-body py-2">
              <div className="h4 mb-0 text-success">{stats.active}</div>
              <small className="text-muted">Đang hoạt động</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-center">
            <div className="card-body py-2">
              <div className="h4 mb-0 text-secondary">{stats.inactive}</div>
              <small className="text-muted">Không hoạt động</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-2">
          <div className="card text-center">
            <div className="card-body py-2">
              <div className="h4 mb-0">{stats.capacity.toLocaleString()}</div>
              <small className="text-muted">Tổng sức chứa</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <input type="text" className="form-control" placeholder="Tìm kiếm mã phòng, tòa nhà..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="filter-group">
          <select className="form-control" value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1) }}>
            <option value="">Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fas fa-plus"></i> Thêm phòng
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã phòng</th><th>Tòa nhà</th><th>Sức chứa</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5" className="text-center"><i className="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="5" className="text-center">Không có dữ liệu</td></tr>
                ) : (
                  paginated.map(r => (
                    <tr key={r.roomId}>
                      <td><strong>{r.roomCode}</strong></td>
                      <td>{r.building || '—'}</td>
                      <td>{r.capacity ?? '—'}</td>
                      <td>
                        <span className={`badge ${r.isActive ? 'badge-success' : 'badge-secondary'}`}>
                          {r.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleMutation.mutate(r)} title={r.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                            <i className={`fas ${r.isActive ? 'fa-toggle-on text-success' : 'fa-toggle-off text-secondary'}`}></i>
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => openEdit(r)}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r)}>
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

          {rooms.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Hiển thị {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rooms.length)} / {pagination.totalCount || rooms.length}
              </div>
              <div className="pagination">
                <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <i className="fas fa-chevron-left"></i> Trước
                </button>
                {getPages(safePage, totalPages).map(p => (
                  <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  Sau <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editingRoom ? 'Chỉnh sửa phòng học' : 'Thêm phòng học mới'}</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label>Mã phòng <span className="text-danger">*</span></label>
                <input className={`form-control${formErrors.roomCode ? ' is-invalid' : ''}`}
                  value={form.roomCode}
                  onChange={e => setForm(f => ({ ...f, roomCode: e.target.value }))}
                  placeholder="VD: A101" />
                {formErrors.roomCode && <div className="invalid-feedback d-block">{formErrors.roomCode}</div>}
              </div>
              <div className="form-group mb-3">
                <label>Tòa nhà</label>
                <input className="form-control"
                  value={form.building}
                  onChange={e => setForm(f => ({ ...f, building: e.target.value }))}
                  placeholder="VD: Tòa A" />
              </div>
              <div className="form-group mb-3">
                <label>Sức chứa</label>
                <input className={`form-control${formErrors.capacity ? ' is-invalid' : ''}`}
                  type="number" min="1"
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="VD: 50" />
                {formErrors.capacity && <div className="invalid-feedback d-block">{formErrors.capacity}</div>}
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox"
                  id="roomActive"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <label className="form-check-label" htmlFor="roomActive">Đang hoạt động</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
