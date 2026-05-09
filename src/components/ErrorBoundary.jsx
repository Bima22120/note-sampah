import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Crash ditangkap:', error, errorInfo);
  }

  handleReload = () => {
    // Bersihkan semua token auth sebelum reload
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      // Cek apakah dark mode aktif
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#0a0f1a' : '#f8fafc',
          color: isDark ? '#f1f5f9' : '#0f172a',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          padding: '20px',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '400px',
            padding: '40px',
            borderRadius: '16px',
            backgroundColor: isDark ? '#111827' : '#ffffff',
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: isDark
              ? '0 10px 15px -3px rgba(0,0,0,0.3)'
              : '0 10px 15px -3px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
              Terjadi Kesalahan
            </h2>
            <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              Aplikasi mengalami crash, kemungkinan disebabkan oleh ekstensi browser atau password manager.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
