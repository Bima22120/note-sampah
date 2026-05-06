import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  HiOutlineDocumentAdd,
  HiOutlineClipboardList,
  HiOutlineScale,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineShieldCheck,
  HiOutlineDocumentReport,
  HiOutlineTrendingUp,
} from 'react-icons/hi';

export default function Dashboard() {
  const { profile, isAdmin, user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, totalWeight: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    fetchData(ignore);
    return () => { ignore = true; };
  }, [user, isAdmin]);

  const fetchData = async (ignore) => {
    if (!user) return;
    const safetyTimer = setTimeout(() => {
      if (!ignore) setLoading(false);
    }, 8000);
    try {
      let query = supabase.from('waste_reports').select('*, profiles:user_id(full_name)');
      
      // User hanya lihat miliknya, admin lihat semua
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      if (!ignore) {
        const reports = data || [];
        setStats({
          total: reports.length,
          pending: reports.filter(r => r.status === 'pending').length,
          approved: reports.filter(r => r.status === 'approved').length,
          rejected: reports.filter(r => r.status === 'rejected').length,
          totalWeight: reports.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.weight_grams, 0),
        });
        setRecentReports(reports.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    } finally {
      clearTimeout(safetyTimer);
      if (!ignore) setLoading(false);
    }
  };

  const fmtWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          {isAdmin ? '🛡️ Dashboard Admin' : `Selamat datang, ${profile?.full_name || user?.user_metadata?.full_name || 'User'}!`}
        </h1>
        <p className="text-dark-400 mt-1">
          {isAdmin ? 'Kelola semua laporan sampah dari sini' : 'Pantau laporan sampah Anda'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineClipboardList className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-dark-500 mt-1">Total Laporan</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineClock className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-xs text-dark-500 mt-1">Menunggu</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
          <p className="text-xs text-dark-500 mt-1">Disetujui</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineScale className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{fmtWeight(stats.totalWeight)}</p>
          <p className="text-xs text-dark-500 mt-1">Total Berat</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isAdmin ? (
          <>
            <Link to="/admin/pending" className="glass-card p-6 hover:border-amber-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiOutlineShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Persetujuan Laporan</p>
                  <p className="text-dark-400 text-sm">{stats.pending} laporan menunggu persetujuan</p>
                </div>
              </div>
            </Link>
            <Link to="/admin/reports" className="glass-card p-6 hover:border-primary-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiOutlineDocumentReport className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Kelola Semua Laporan</p>
                  <p className="text-dark-400 text-sm">Edit, hapus, dan download laporan</p>
                </div>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link to="/reports/new" className="glass-card p-6 hover:border-primary-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiOutlineDocumentAdd className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Buat Laporan Baru</p>
                  <p className="text-dark-400 text-sm">Laporkan sampah yang telah ditimbang</p>
                </div>
              </div>
            </Link>
            <Link to="/reports" className="glass-card p-6 hover:border-accent-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiOutlineClipboardList className="w-6 h-6 text-accent-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Laporan Saya</p>
                  <p className="text-dark-400 text-sm">Lihat riwayat laporan Anda</p>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Recent Reports */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HiOutlineTrendingUp className="w-5 h-5 text-primary-400" />
            Laporan Terbaru
          </h2>
        </div>
        {recentReports.length > 0 ? (
          <div className="space-y-3">
            {recentReports.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-dark-800/60 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{r.category === 'organik' ? '🌿' : '🔧'}</span>
                  <div>
                    <p className="text-sm font-medium text-dark-200">
                      {isAdmin && r.profiles?.full_name ? `${r.profiles.full_name} — ` : ''}
                      {r.description?.substring(0, 40)}{r.description?.length > 40 ? '...' : ''}
                    </p>
                    <p className="text-xs text-dark-500">
                      {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-dark-300">{fmtWeight(r.weight_grams)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                    r.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>
                    {r.status === 'approved' ? '✓' : r.status === 'rejected' ? '✕' : '⏳'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-500 text-center py-8">Belum ada laporan</p>
        )}
      </div>
    </div>
  );
}
