import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
} from 'react-icons/hi';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth();
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
      <div className="p-6 border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${isAdmin ? 'bg-gradient-to-br from-amber-400 to-red-600' : 'bg-gradient-to-br from-primary-400 to-primary-600'} rounded-xl flex items-center justify-center shadow-lg ${isAdmin ? 'shadow-amber-500/30' : 'shadow-primary-500/30'}`}>
            <span className="text-white font-bold text-lg">{isAdmin ? '🛡️' : '♻'}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">NoteSampah</h1>
            <p className="text-xs text-dark-500">{isAdmin ? 'Panel Admin' : 'Kelola Sampah Cerdas'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider px-4 mb-3">
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

      {/* User info / Login Admin */}
      <div className="p-4 border-t border-dark-700/50">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-red-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {(profile?.full_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-200 truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs capitalize text-amber-400 font-semibold">
                  🛡️ Admin
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className={`nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${signingOut ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
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
            className="nav-link w-full text-dark-300 hover:text-white"
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-800/90 backdrop-blur-xl border border-dark-700/50 rounded-xl text-dark-300 hover:text-white transition-colors"
      >
        {mobileOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
