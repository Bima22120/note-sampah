import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  HiOutlineHome,
  HiOutlineDocumentAdd,
  HiOutlineClipboardList,
  HiOutlineShieldCheck,
  HiOutlineDocumentReport,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineLogin,
  HiOutlineSun,
  HiOutlineMoon,
} from 'react-icons/hi';
import { useState } from 'react';
import toast from 'react-hot-toast';
import logoGambar from '../assets/oasesongo.jpg';

export default function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (signingOut) return;
    setSigningOut(true);

    try {
      await signOut();
      toast.success('Berhasil keluar!');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Gagal keluar, mencoba paksa...');
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const userLinks = [
    { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
    { to: '/reports/new', icon: HiOutlineDocumentAdd, label: 'Laporan Baru' },
    { to: '/reports', icon: HiOutlineClipboardList, label: 'Daftar Laporan' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
    { to: '/admin/pending', icon: HiOutlineShieldCheck, label: 'Persetujuan' },
    { to: '/admin/reports', icon: HiOutlineDocumentReport, label: 'Semua Laporan' },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pb-6 pt-16 lg:p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <img src={logoGambar} alt="Logo NoteSampah" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 shrink-0">
              <span className="text-white font-bold text-lg">♻</span>
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold tracking-tight theme-text-primary">NoteSampah</h1>
            <p className="text-xs theme-text-faint">{isAdmin ? 'Panel Admin' : 'Kelola Sampah Cerdas'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider px-4 mb-3 theme-text-faint">
          {isAdmin ? 'Menu Admin' : 'Menu Utama'}
        </p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle + User info */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="nav-link w-full mb-2 group"
          title={isDark ? 'Beralih ke Mode Siang' : 'Beralih ke Mode Malam'}
        >
          {isDark ? (
            <HiOutlineSun className="w-5 h-5 text-amber-400 theme-toggle-icon" />
          ) : (
            <HiOutlineMoon className="w-5 h-5 text-indigo-500 theme-toggle-icon" />
          )}
          <span>{isDark ? 'Mode Siang' : 'Mode Malam'}</span>
        </button>

        {isAdmin ? (
          <>
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-red-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {(profile?.full_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate theme-text-secondary">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs capitalize text-amber-500 dark:text-amber-400 font-semibold">
                  Admin
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className={`nav-link w-full text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 ${signingOut ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
              style={{ pointerEvents: signingOut ? 'none' : 'auto' }}
            >
              {signingOut ? (
                <>
                  <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  <span>Keluar...</span>
                </>
              ) : (
                <>
                  <HiOutlineLogout className="w-5 h-5" />
                  <span>Keluar</span>
                </>
              )}
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="nav-link w-full"
          >
            <HiOutlineLogin className="w-5 h-5" />
            <span>Login Admin</span>
          </NavLink>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl transition-colors"
        style={{
          backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
          border: `1px solid var(--border-color)`,
          color: 'var(--text-muted)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {mobileOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 border-r transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--border-color)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
