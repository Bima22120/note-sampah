import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import NewReport from './pages/NewReport';
import MyReports from './pages/MyReports';
import AdminPending from './pages/AdminPending';
import AdminReports from './pages/AdminReports';
import ProcessedWaste from './pages/ProcessedWaste';
import AdminSettings from './pages/AdminSettings';

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#0f172a',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          boxShadow: isDark
            ? '0 10px 15px -3px rgba(0,0,0,0.3)'
            : '0 10px 15px -3px rgba(0,0,0,0.08)',
        },
        success: {
          iconTheme: { primary: '#22c55e', secondary: isDark ? '#f1f5f9' : '#ffffff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: isDark ? '#f1f5f9' : '#ffffff' },
        },
      }}
    />
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ThemedToaster />
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Layout for all main pages */}
              <Route element={<Layout />}>
                {/* Public Routes (No login required) */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports/new" element={<NewReport />} />
                <Route path="/reports" element={<MyReports />} />

                {/* Admin-only routes */}
                <Route
                  path="/admin/pending"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminPending />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminReports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/processed"
                  element={
                    <ProtectedRoute adminOnly>
                      <ProcessedWaste />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminSettings />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Root & Catch-all Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
