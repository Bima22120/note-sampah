import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  HiOutlineDocumentAdd,
  HiOutlineClipboardList,
  HiOutlineShieldCheck,
  HiOutlineDocumentReport,
  HiOutlineTrendingUp,
  HiChevronDown,
  HiChevronUp,
  HiOutlineClock,
} from 'react-icons/hi';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import compostImg from '../assets/compost.png';
import repurposeImg from '../assets/repurpose.png';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  
  // Data State
  const [allReports, setAllReports] = useState([]);
  const [allProcessed, setAllProcessed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecentReportsOpen, setIsRecentReportsOpen] = useState(false);
  
  // Filter State
  const [period, setPeriod] = useState('daily'); // 'daily', 'weekly', 'monthly', 'all'

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, procRes] = await Promise.all([
        supabase.from('waste_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('processed_waste').select('*').order('date', { ascending: true })
      ]);
      
      if (reportsRes.error) throw reportsRes.error;
      if (procRes.error) throw procRes.error;

      setAllReports(reportsRes.data || []);
      setAllProcessed(procRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fmtWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;
  const getCategoryImage = (cat) => cat === 'organik' ? compostImg : repurposeImg;

  // Filter Data Berdasarkan Periode
  const filteredData = useMemo(() => {
    const now = new Date();
    
    // Tentukan batas waktu berdasarkan filter
    let startDate = new Date(0); // default 'all'
    if (period === 'daily') {
      startDate = new Date(now.setHours(0,0,0,0));
    } else if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0,0,0,0);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filter Reports (Hanya yang disetujui untuk dihitung total masuk)
    const reportsInPeriod = allReports.filter(r => new Date(r.created_at) >= startDate);
    const approvedInPeriod = reportsInPeriod.filter(r => r.status === 'approved');
    const pendingCount = reportsInPeriod.filter(r => r.status === 'pending').length;
    
    const totalMasuk = approvedInPeriod.reduce((sum, r) => sum + r.weight_grams, 0);
    const organikMasuk = approvedInPeriod.filter(r => r.category === 'organik').reduce((sum, r) => sum + r.weight_grams, 0);
    const anorganikMasuk = approvedInPeriod.filter(r => r.category === 'anorganik').reduce((sum, r) => sum + r.weight_grams, 0);

    // Filter Processed Waste
    const processedInPeriod = allProcessed.filter(p => new Date(p.date) >= startDate);
    const totalOlahan = processedInPeriod.reduce((sum, p) => sum + p.processed_weight_grams, 0);

    const sisa = Math.max(0, totalMasuk - totalOlahan);
    const percentage = totalMasuk > 0 ? Math.min(100, (totalOlahan / totalMasuk) * 100) : 0;

    // Data untuk Chart (Gabungan Masuk dan Olahan per Hari)
    const chartGroups = {};
    
    approvedInPeriod.forEach(r => {
      const dKey = new Date(r.created_at).toISOString().slice(0, 10);
      if(!chartGroups[dKey]) chartGroups[dKey] = { dateLabel: new Date(dKey + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), masuk: 0, olahan: 0, date: dKey };
      chartGroups[dKey].masuk += r.weight_grams;
    });

    processedInPeriod.forEach(p => {
      const dKey = p.date;
      if(!chartGroups[dKey]) chartGroups[dKey] = { dateLabel: new Date(dKey + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), masuk: 0, olahan: 0, date: dKey };
      chartGroups[dKey].olahan += p.processed_weight_grams;
    });

    const cData = Object.values(chartGroups).sort((a,b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      persentase: d.masuk > 0 ? Math.min(100, (d.olahan / d.masuk * 100)) : (d.olahan > 0 ? 100 : 0)
    }));

    return {
      totalMasuk, totalOlahan, sisa, percentage, pendingCount, cData, organikMasuk, anorganikMasuk
    };
  }, [allReports, allProcessed, period]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 shadow-xl text-sm" style={{ minWidth: 200 }}>
        <p className="font-semibold theme-text-primary mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between gap-4 mb-1">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium theme-text-secondary">
              {p.dataKey === 'persentase' ? `${p.value.toFixed(1)}%` : fmtWeight(p.value)}
            </span>
          </div>
        ))}
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
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary">
            {isAdmin ? 'Dashboard Admin' : 'Selamat datang di NoteSampah!'}
          </h1>
          <p className="theme-text-muted mt-1 text-sm sm:text-base">
            Pantau ringkasan data sampah dengan mudah
          </p>
        </div>
        
        {/* Simple Tabs for Period */}
        <div className="flex bg-slate-500/10 p-1 rounded-xl self-start">
          {[
            { id: 'daily', label: 'Harian' },
            { id: 'weekly', label: 'Mingguan' },
            { id: 'monthly', label: 'Bulanan' },
            { id: 'all', label: 'Semua' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                period === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isAdmin && filteredData.pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex items-center gap-3">
          <HiOutlineClock className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium">Ada <b>{filteredData.pendingCount}</b> laporan baru yang menunggu persetujuan Anda.</p>
          <Link to="/admin/pending" className="ml-auto btn-primary !py-1.5 !px-4 text-xs">Lihat</Link>
        </div>
      )}

      {/* 3 Simple Big Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sampah Masuk */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <p className="text-sm font-semibold theme-text-muted mb-1 relative z-10">Total Sampah Masuk</p>
          <p className="text-3xl sm:text-4xl font-bold text-blue-500 dark:text-blue-400 mb-2 relative z-10">
            {fmtWeight(filteredData.totalMasuk)}
          </p>
          <div className="flex gap-4 text-xs font-medium relative z-10">
            <span className="text-green-500 flex items-center gap-1"><img src={compostImg} alt="" className="w-3 h-3 opacity-70"/> {fmtWeight(filteredData.organikMasuk)}</span>
            <span className="text-blue-400 flex items-center gap-1"><img src={repurposeImg} alt="" className="w-3 h-3 opacity-70"/> {fmtWeight(filteredData.anorganikMasuk)}</span>
          </div>
        </div>

        {/* Sampah Olahan */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-center relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <p className="text-sm font-semibold theme-text-muted mb-1 relative z-10">Total Olahan Berhasil</p>
          <p className="text-3xl sm:text-4xl font-bold text-emerald-500 dark:text-emerald-400 mb-2 relative z-10">
            {fmtWeight(filteredData.totalOlahan)}
          </p>
          <div className="flex items-center gap-2 text-xs font-medium relative z-10">
            <span className="theme-text-muted">Sisa belum diolah:</span>
            <span className="text-amber-500">{fmtWeight(filteredData.sisa)}</span>
          </div>
        </div>

        {/* Persentase */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-center relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <p className="text-sm font-semibold theme-text-muted mb-1 relative z-10">Tingkat Keberhasilan</p>
          <p className="text-3xl sm:text-4xl font-bold text-amber-500 dark:text-amber-400 mb-2 relative z-10">
            {filteredData.percentage.toFixed(1)}%
          </p>
          <div className="w-full bg-slate-500/10 rounded-full h-2 mt-2 relative z-10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-1000"
              style={{ width: `${filteredData.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Actions - Very Simple */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isAdmin ? (
          <>
            <Link to="/admin/pending" className="glass-card p-6 flex items-center justify-center gap-3 hover:bg-slate-500/5 transition-colors">
              <HiOutlineShieldCheck className="w-6 h-6 text-amber-500" />
              <span className="font-semibold theme-text-primary text-lg">Persetujuan Laporan</span>
            </Link>
            <Link to="/admin/reports" className="glass-card p-6 flex items-center justify-center gap-3 hover:bg-slate-500/5 transition-colors">
              <HiOutlineDocumentReport className="w-6 h-6 text-primary-500" />
              <span className="font-semibold theme-text-primary text-lg">Semua Laporan & Export</span>
            </Link>
          </>
        ) : (
          <>
            <Link to="/reports/new" className="glass-card p-6 flex items-center justify-center gap-3 hover:bg-primary-500 hover:text-white transition-colors group">
              <HiOutlineDocumentAdd className="w-6 h-6 text-primary-500 group-hover:text-white" />
              <span className="font-semibold text-lg">Buat Laporan Baru</span>
            </Link>
            <Link to="/reports" className="glass-card p-6 flex items-center justify-center gap-3 hover:bg-slate-500/5 transition-colors">
              <HiOutlineClipboardList className="w-6 h-6 text-accent-500" />
              <span className="font-semibold theme-text-primary text-lg">Lihat Daftar Laporan</span>
            </Link>
          </>
        )}
      </div>

      {/* Simple Chart */}
      {filteredData.cData.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold theme-text-primary mb-4 flex items-center gap-2">
            <HiOutlineTrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            Grafik Pertumbuhan Sampah Masuk vs Olahan
          </h2>
          <div className="w-full h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData.cData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Bar yAxisId="left" dataKey="masuk" name="Sampah Masuk" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.5} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="olahan" name="Sampah Diolah" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="persentase" name="Persentase (%)" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Reports List - Simplified */}
      <div className="glass-card overflow-hidden">
        <button 
          onClick={() => setIsRecentReportsOpen(!isRecentReportsOpen)}
          className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left hover:bg-slate-500/5 transition-colors"
        >
          <h2 className="text-base sm:text-lg font-semibold theme-text-primary">
            Riwayat 5 Laporan Terakhir
          </h2>
          <div className="p-1 rounded-lg bg-slate-500/10 theme-text-muted">
            {isRecentReportsOpen ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out ${isRecentReportsOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 sm:p-5 md:p-6 pt-0 border-t border-slate-500/10">
            {allReports.slice(0,5).length > 0 ? (
              <div className="space-y-2 mt-3">
                {allReports.slice(0,5).map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl p-3 theme-bg-input">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img src={getCategoryImage(r.category)} alt={r.category} className="w-6 h-6 object-contain shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate theme-text-secondary">
                          {r.nama_pelapor || 'Tanpa Nama'} - {r.description?.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-sm font-medium theme-text-muted">{fmtWeight(r.weight_grams)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'approved' ? 'bg-emerald-500/15 text-emerald-600' :
                        r.status === 'rejected' ? 'bg-red-500/15 text-red-600' :
                        'bg-amber-500/15 text-amber-600'
                      }`}>
                        {r.status === 'approved' ? '✓' : r.status === 'rejected' ? '✕' : '⏳'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-sm theme-text-faint">Belum ada laporan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
