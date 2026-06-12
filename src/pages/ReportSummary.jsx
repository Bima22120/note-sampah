import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  HiOutlineDownload,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineFilter,
} from 'react-icons/hi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import compostImg from '../assets/compost.png';
import repurposeImg from '../assets/repurpose.png';

export default function ReportSummary() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily'); // daily | weekly | monthly

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setReports(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data laporan.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: get period key from a date
  const getPeriodKey = (dateStr) => {
    const d = new Date(dateStr);
    if (period === 'daily') {
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } else if (period === 'weekly') {
      // Get the Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return `${monday.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    } else {
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
  };

  // Helper: get sort key for ordering
  const getSortKey = (dateStr) => {
    const d = new Date(dateStr);
    if (period === 'daily') {
      return d.toISOString().slice(0, 10);
    } else if (period === 'weekly') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(new Date(d).setDate(diff));
      return monday.toISOString().slice(0, 10);
    } else {
      return d.toISOString().slice(0, 7);
    }
  };

  // Group data by period
  const groupedData = useMemo(() => {
    const groups = {};
    reports.forEach((r) => {
      const key = getPeriodKey(r.created_at);
      const sortKey = getSortKey(r.created_at);
      if (!groups[key]) {
        groups[key] = { period: key, sortKey, organik: 0, anorganik: 0, total: 0, count: 0 };
      }
      const w = r.weight_grams;
      if (r.category === 'organik') {
        groups[key].organik += w;
      } else {
        groups[key].anorganik += w;
      }
      groups[key].total += w;
      groups[key].count += 1;
    });
    return Object.values(groups).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [reports, period]);

  const totalOrganik = groupedData.reduce((s, g) => s + g.organik, 0);
  const totalAnorganik = groupedData.reduce((s, g) => s + g.anorganik, 0);
  const totalBerat = totalOrganik + totalAnorganik;
  const totalLaporan = groupedData.reduce((s, g) => s + g.count, 0);

  const fmtWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  const periodLabel = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 shadow-xl text-sm" style={{ minWidth: 180 }}>
        <p className="font-semibold theme-text-primary mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium theme-text-secondary">{fmtWeight(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Download Excel
  const downloadExcel = () => {
    if (groupedData.length === 0) {
      toast.error('Tidak ada data untuk didownload.');
      return;
    }

    const data = groupedData.map((g, i) => ({
      'No': i + 1,
      'Periode': g.period,
      'Jumlah Laporan': g.count,
      'Organik (kg)': (g.organik / 1000).toFixed(2),
      'Anorganik (kg)': (g.anorganik / 1000).toFixed(2),
      'Total Berat (kg)': (g.total / 1000).toFixed(2),
    }));

    // Add total row
    data.push({
      'No': '',
      'Periode': 'TOTAL KESELURUHAN',
      'Jumlah Laporan': totalLaporan,
      'Organik (kg)': (totalOrganik / 1000).toFixed(2),
      'Anorganik (kg)': (totalAnorganik / 1000).toFixed(2),
      'Total Berat (kg)': (totalBerat / 1000).toFixed(2),
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${periodLabel[period]}`);

    const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, `Rekap_Sampah_${periodLabel[period]}_${dateStr}.xlsx`);
    toast.success('File Excel berhasil didownload!');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-enter space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary flex items-center gap-2">
            <HiOutlineChartBar className="w-7 h-7 text-primary-500 dark:text-primary-400" />
            Rekap Laporan
          </h1>
          <p className="theme-text-muted mt-1 text-sm">
            Ringkasan laporan sampah per {periodLabel[period].toLowerCase()} (hanya yang disetujui)
          </p>
        </div>
        <button onClick={downloadExcel} disabled={groupedData.length === 0}
          className="btn-primary flex items-center justify-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto">
          <HiOutlineDownload className="w-5 h-5" />
          Download Excel
        </button>
      </div>

      {/* Period Filter */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineFilter className="w-5 h-5 theme-text-faint" />
          <span className="text-sm font-medium theme-text-muted">Filter Periode</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['daily', 'weekly', 'monthly']).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                period === p
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'theme-bg-input theme-text-muted hover:theme-text-primary'
              }`}
            >
              <HiOutlineCalendar className="w-4 h-4 inline mr-1.5" />
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineChartBar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold theme-text-primary">{groupedData.length}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate theme-text-muted">Total Periode</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold theme-text-primary">{totalLaporan}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate theme-text-muted">Total Laporan</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-green-500/15 rounded-xl flex items-center justify-center">
              <img src={compostImg} alt="Organik" className="w-4 h-4 sm:w-6 sm:h-6 object-contain" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-green-500 dark:text-green-400">{fmtWeight(totalOrganik)}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate theme-text-muted">Total Organik</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <img src={repurposeImg} alt="Anorganik" className="w-4 h-4 sm:w-6 sm:h-6 object-contain" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-blue-500 dark:text-blue-400">{fmtWeight(totalAnorganik)}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate theme-text-muted">Total Anorganik</p>
        </div>
      </div>

      {/* Chart */}
      {groupedData.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
            <HiOutlineChartBar className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            Grafik Sampah {periodLabel[period]}
          </h2>
          <div className="w-full" style={{ height: Math.max(300, Math.min(400, groupedData.length * 30)) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  angle={period === 'daily' ? -45 : 0}
                  textAnchor={period === 'daily' ? 'end' : 'middle'}
                  height={period === 'daily' ? 80 : 40}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}kg` : `${v}g`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
                />
                <Bar dataKey="organik" name="Organik" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="anorganik" name="Anorganik" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table */}
      {groupedData.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-base sm:text-lg font-semibold theme-text-primary flex items-center gap-2">
              <HiOutlineCalendar className="w-5 h-5 text-primary-500 dark:text-primary-400" />
              Tabel Rekap {periodLabel[period]}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                  <th className="text-left px-4 py-3 font-semibold theme-text-muted">No</th>
                  <th className="text-left px-4 py-3 font-semibold theme-text-muted">Periode</th>
                  <th className="text-center px-4 py-3 font-semibold theme-text-muted">Laporan</th>
                  <th className="text-right px-4 py-3 font-semibold theme-text-muted">Organik</th>
                  <th className="text-right px-4 py-3 font-semibold theme-text-muted">Anorganik</th>
                  <th className="text-right px-4 py-3 font-semibold theme-text-muted">Total</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.map((g, i) => (
                  <tr key={i} className="border-t transition-colors hover:bg-slate-500/5" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 theme-text-faint">{i + 1}</td>
                    <td className="px-4 py-3 font-medium theme-text-secondary">{g.period}</td>
                    <td className="px-4 py-3 text-center theme-text-muted">{g.count}</td>
                    <td className="px-4 py-3 text-right text-green-500 dark:text-green-400 font-medium">{fmtWeight(g.organik)}</td>
                    <td className="px-4 py-3 text-right text-blue-500 dark:text-blue-400 font-medium">{fmtWeight(g.anorganik)}</td>
                    <td className="px-4 py-3 text-right font-semibold theme-text-primary">{fmtWeight(g.total)}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-input)' }}>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 theme-text-primary">TOTAL</td>
                  <td className="px-4 py-3 text-center theme-text-primary">{totalLaporan}</td>
                  <td className="px-4 py-3 text-right text-green-500 dark:text-green-400">{fmtWeight(totalOrganik)}</td>
                  <td className="px-4 py-3 text-right text-blue-500 dark:text-blue-400">{fmtWeight(totalAnorganik)}</td>
                  <td className="px-4 py-3 text-right theme-text-primary">{fmtWeight(totalBerat)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 theme-bg-input">
            <HiOutlineChartBar className="w-8 h-8 theme-text-faint" />
          </div>
          <p className="theme-text-muted text-lg mb-1">Belum ada data</p>
          <p className="theme-text-faint text-sm">Belum ada laporan yang disetujui</p>
        </div>
      )}
    </div>
  );
}
