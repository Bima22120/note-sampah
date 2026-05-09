import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../contexts/ThemeContext';

export default function Layout() {
  const { isDark } = useTheme();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at top right, var(--bg-gradient-from), var(--bg-gradient-via), var(--bg-gradient-to))'
            : 'radial-gradient(ellipse at top right, #e0e7ff 0%, #f8fafc 40%, #f8fafc 100%)',
        }}
      />

      <Sidebar />

      {/* Main content */}
      <main className="flex-1 lg:ml-0 relative">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
