import { Outlet } from 'react-router-dom'

// Placeholder - sẽ được xây dựng đầy đủ ở Giai đoạn 4
export default function MainLayout() {
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Education Management</h2>
        </div>
        <nav className="sidebar-nav">
          <p style={{ padding: '1rem', color: '#999' }}>Sidebar sẽ được xây dựng ở Giai đoạn 4</p>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
