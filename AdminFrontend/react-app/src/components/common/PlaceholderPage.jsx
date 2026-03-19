// Trang placeholder — sẽ được thay thế ở các giai đoạn tiếp theo
export default function PlaceholderPage({ title, description }) {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{title || 'Trang đang được xây dựng'}</h1>
        <p>{description || 'Trang này sẽ được chuyển đổi từ AngularJS sang ReactJS ở các giai đoạn tiếp theo.'}</p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          <i className="fas fa-tools"></i>
        </div>
        <h3>Trang đang được xây dựng</h3>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Nội dung sẽ được chuyển đổi từ AngularJS ở các giai đoạn tiếp theo.
        </p>
      </div>
    </div>
  )
}
