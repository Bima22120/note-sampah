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
  HiOutlineShieldCheck,
  HiOutlineDocumentReport,
  HiOutlineTrendingUp,
  HiChevronDown,
  HiChevronUp,
} from 'react-icons/hi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import logoGambar from '../assets/oasesongo.jpg';
import compostImg from '../assets/compost.png';
import repurposeImg from '../assets/repurpose.png';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, totalWeight: 0, totalOrganik: 0, totalAnorganik: 0 });
  const [processedStats, setProcessedStats] = useState({ totalOlahan: 0, percentage: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecentReportsOpen, setIsRecentReportsOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetchData(ignore);
    return () => { ignore = true; };
  }, [isAdmin]);

  const fetchData = async (ignore) => {
    setLoading(true);
    try {
      // Ambil semua laporan dan data olahan untuk dashboard
      const [reportsRes, procRes] = await Promise.all([
        supabase.from('waste_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('processed_waste').select('*').order('date', { ascending: true })
      ]);
      
      if (reportsRes.error) throw reportsRes.error;
      if (procRes.error) throw procRes.error;

      if (!ignore) {
        const reports = reportsRes.data || [];
        const procData = procRes.data || [];
        
        const approvedReports = reports.filter(r => r.status === 'approved');
        const totalMasuk = approvedReports.reduce((sum, r) => sum + r.weight_grams, 0);
        const totalOlahan = procData.reduce((sum, p) => sum + p.processed_weight_grams, 0);
        const percentage = totalMasuk > 0 ? Math.min(100, (totalOlahan / totalMasuk) * 100) : 0;

        setStats({
          total: reports.length,
          pending: reports.filter(r => r.status === 'pending').length,
          approved: approvedReports.length,
          rejected: reports.filter(r => r.status === 'rejected').length,
          totalWeight: totalMasuk,
          totalOrganik: approvedReports.filter(r => r.category === 'organik').reduce((sum, r) => sum + r.weight_grams, 0),
          totalAnorganik: approvedReports.filter(r => r.category === 'anorganik').reduce((sum, r) => sum + r.weight_grams, 0),
        });
        
        setProcessedStats({ totalOlahan, percentage });

        // Build simple chart data
        const cData = procData.map(p => ({
          dateLabel: new Date(p.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          olahan: p.processed_weight_grams
        }));
        setChartData(cData);

        setRecentReports(reports.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  const fmtWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  const getCategoryImage = (cat) => cat === 'organik' ? compostImg : repurposeImg;

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 shadow-xl text-sm" style={{ minWidth: 150 }}>
        <p className="font-semibold theme-text-primary mb-2">{label}</p>
        <div className="flex justify-between gap-4">
          <span style={{ color: payload[0].color }}>Olahan</span>
          <span className="font-medium theme-text-secondary">{fmtWeight(payload[0].value)}</span>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3 theme-text-primary">
          {/* {isAdmin && (
            <img 
              src={logoGambar} 
              alt="Logo NoteSampah" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" 
            />
          )} */}
          {isAdmin ? 'Dashboard Admin' : 'Selamat datang di NoteSampah!'}
        </h1>
        <p className="theme-text-muted mt-1 text-sm sm:text-base">
          {isAdmin ? 'Kelola semua laporan sampah dari sini' : 'Pantau dan catat laporan sampah warga'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold theme-text-primary">{stats.total}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate">Total Laporan</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineClock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-amber-500 dark:text-amber-400">{stats.pending}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate">Menunggu</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineScale className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold theme-text-primary">{fmtWeight(stats.totalWeight)}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate">Total Berat</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats.approved}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate">Disetujui</p>
        </div>
        {/* Organik & Anorganik weight cards */}
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-green-500/15 rounded-xl flex items-center justify-center">
              <img src={compostImg} alt="Organik" className="w-4 h-4 sm:w-6 sm:h-6 object-contain" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-green-500 dark:text-green-400">{fmtWeight(stats.totalOrganik)}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate">Total Organik</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <img src={repurposeImg} alt="Anorganik" className="w-4 h-4 sm:w-6 sm:h-6 object-contain" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-blue-500 dark:text-blue-400">{fmtWeight(stats.totalAnorganik)}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate">Total Anorganik</p>
        </div>
      </div>

      {/* Processed Waste Overview (For All) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4 sm:p-6 lg:col-span-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0">
              <HiOutlineScale className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold theme-text-primary">Total Olahan Berhasil</h2>
              <p className="text-xs theme-text-muted">Dari total sampah masuk</p>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-500 dark:text-emerald-400 mb-2">
            {processedStats.percentage.toFixed(1)}%
          </p>
          <p className="text-sm font-medium theme-text-secondary mb-4">
            {fmtWeight(processedStats.totalOlahan)} <span className="text-xs theme-text-faint font-normal">diolah</span> / {fmtWeight(stats.totalWeight)} <span className="text-xs theme-text-faint font-normal">masuk</span>
          </p>
          <div className="w-full bg-slate-500/10 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-1000"
              style={{ width: `${processedStats.percentage}%` }}
            />
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-sm sm:text-base font-semibold theme-text-primary mb-4 flex items-center gap-2">
            <HiOutlineTrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            Grafik Sampah Olahan
          </h2>
          {chartData.length > 0 ? (
            <div className="w-full h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOlahan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="dateLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="olahan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOlahan)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="w-full h-48 sm:h-56 flex items-center justify-center text-sm theme-text-faint">
                Belum ada data olahan
             </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {isAdmin ? (
          <>
            <Link to="/admin/pending" className="glass-card p-4 sm:p-6 hover:border-amber-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <HiOutlineShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold theme-text-primary text-sm sm:text-base">Persetujuan Laporan</p>
                  <p className="theme-text-muted text-xs sm:text-sm">{stats.pending} laporan menunggu persetujuan</p>
                </div>
              </div>
            </Link>
            <Link to="/admin/reports" className="glass-card p-4 sm:p-6 hover:border-primary-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <HiOutlineDocumentReport className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold theme-text-primary text-sm sm:text-base">Kelola Semua Laporan</p>
                  <p className="theme-text-muted text-xs sm:text-sm">Edit, hapus, dan download laporan</p>
                </div>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link to="/reports/new" className="glass-card p-4 sm:p-6 hover:border-primary-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <HiOutlineDocumentAdd className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold theme-text-primary text-sm sm:text-base">Buat Laporan Baru</p>
                  <p className="theme-text-muted text-xs sm:text-sm">Laporkan sampah tanpa perlu login</p>
                </div>
              </div>
            </Link>
            <Link to="/reports" className="glass-card p-4 sm:p-6 hover:border-accent-500/30 transition-all duration-300 group">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <HiOutlineClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-accent-500 dark:text-accent-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold theme-text-primary text-sm sm:text-base">Daftar Laporan</p>
                  <p className="theme-text-muted text-xs sm:text-sm">Lihat semua laporan yang masuk</p>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Recent Reports (Collapsible on Mobile) */}
      <div className="glass-card overflow-hidden">
        <button 
          onClick={() => setIsRecentReportsOpen(!isRecentReportsOpen)}
          className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left hover:bg-slate-500/5 transition-colors"
        >
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 theme-text-primary">
            <HiOutlineTrendingUp className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            Laporan Terbaru
          </h2>
          <div className="p-1 rounded-lg bg-slate-500/10 theme-text-muted">
            {isRecentReportsOpen ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out ${isRecentReportsOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 sm:p-5 md:p-6 pt-0 border-t border-slate-500/10">
            {recentReports.length > 0 ? (
              <div className="space-y-2 sm:space-y-3 mt-3">
                {recentReports.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl p-3 sm:p-4 theme-bg-input">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        r.category === 'organik' ? 'bg-green-500/15' : 'bg-blue-500/15'
                      }`}>
                        <img src={getCategoryImage(r.category)} alt={r.category} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate theme-text-secondary">
                          {r.nama_pelapor ? `${r.nama_pelapor} — ` : ''}
                          {r.description?.substring(0, 30)}{r.description?.length > 30 ? '...' : ''}
                        </p>
                        <p className="text-[10px] sm:text-xs theme-text-faint truncate">
                          {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                      <span className="text-xs sm:text-sm font-medium theme-text-muted whitespace-nowrap">{fmtWeight(r.weight_grams)}</span>
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full font-medium ${
                        r.status === 'approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                        r.status === 'rejected' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                        'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                      }`}>
                        {r.status === 'approved' ? '✓' : r.status === 'rejected' ? '✕' : '⏳'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className=" text-center py-8 text-sm">Belum ada laporan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
