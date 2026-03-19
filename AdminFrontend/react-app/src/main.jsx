import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

// CSS imports - giữ nguyên thứ tự từ AngularJS
import './assets/css/fontawesome/all.min.css'
import './assets/css/main.css'
import './assets/css/semantic-colors.css'
import './assets/css/components.css'
import './assets/css/dashboard.css'
import './assets/css/enhanced-components.css'
import './assets/css/modal.css'
import './assets/css/login.css'
import './assets/css/audit-log.css'
import './assets/css/timetable-admin.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '8px',
                padding: '12px 16px',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
