import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  HiOutlineDownload,
  HiOutlineCalendar,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineChartBar,
  HiOutlineScale,
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, Line, ComposedChart,
} from 'recharts';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ProcessedWaste() {
  const { user } = useAuth();
  const [processedData, setProcessedData] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formDate, setFormDate] = useState(''); // Target Date (Tanggal Masuk)
  const [formProcessingDate, setFormProcessingDate] = useState(''); // Tanggal Diolah
  const [formWeight, setFormWeight] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [procRes, repRes] = await Promise.all([
        supabase
          .from('processed_waste')
          .select('*')
          .order('date', { ascending: false }),
        supabase
          .from('waste_reports')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: true }),
      ]);

      if (procRes.error) throw procRes.error;
      if (repRes.error) throw repRes.error;

      setProcessedData(procRes.data || []);
      setReports(repRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  // Group approved reports by date (local timezone)
  const reportsByDate = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      const d = new Date(r.created_at);
      const dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (!map[dateKey]) map[dateKey] = { total: 0, organik: 0, anorganik: 0 };
      map[dateKey].total += r.weight_grams;
      if (r.category === 'organik') map[dateKey].organik += r.weight_grams;
      else map[dateKey].anorganik += r.weight_grams;
    });
    return map;
  }, [reports]);

  // Build chart data: merge processed_waste with reports by date
  const chartData = useMemo(() => {
    // Collect all dates from processed data
    const allDates = new Set();
    processedData.forEach((p) => allDates.add(p.date));
    // Also include report dates that have processed data
    Object.keys(reportsByDate).forEach((d) => allDates.add(d));

    const data = Array.from(allDates).sort().map((date) => {
      const reportTotal = reportsByDate[date]?.total || 0;
      const proc = processedData.find((p) => p.date === date);
      const processedWeight = proc?.processed_weight_grams || 0;
      const percentage = reportTotal > 0 ? Math.min(100, ((processedWeight / reportTotal) * 100)) : (processedWeight > 0 ? 100 : 0);

      return {
        date,
        dateLabel: new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        totalMasuk: reportTotal,
        totalOlahan: processedWeight,
        persentase: Math.round(percentage * 10) / 10,
      };
    });

    // Only show dates that have processed data entry
    return data.filter((d) => d.totalOlahan > 0);
  }, [processedData, reportsByDate]);

  const fmtWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formDate) { toast.error('Pilih tanggal masuk!'); return; }
    if (!formProcessingDate) { toast.error('Pilih tanggal diolah!'); return; }
    if (!formWeight || Number(formWeight) <= 0) { toast.error('Masukkan berat yang valid!'); return; }
    
    // Validasi berat tidak boleh melebihi total sampah masuk di tanggal tersebut
    const maxWeight = reportsByDate[formDate]?.total || 0;
    if (Number(formWeight) > maxWeight) {
      toast.error(`Berat olahan tidak boleh melebihi total sampah masuk (${maxWeight >= 1000 ? (maxWeight/1000).toFixed(1) + ' kg' : maxWeight + ' g'})!`);
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('processed_waste')
          .update({
            date: formDate,
            processing_date: formProcessingDate,
            processed_weight_grams: Number(formWeight),
            notes: formNotes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Data olahan berhasil diperbarui!');
      } else {
        // Insert new
        const { error } = await supabase
          .from('processed_waste')
          .insert({
            date: formDate,
            processing_date: formProcessingDate,
            processed_weight_grams: Number(formWeight),
            notes: formNotes.trim() || null,
            created_by: user?.id || null,
          });
        if (error) throw error;
        toast.success('Data olahan berhasil ditambahkan!');
      }

      // Reset form
      setFormDate('');
      setFormProcessingDate('');
      setFormWeight('');
      setEditingId(null);
      fetchAll();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Gagal menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormDate(item.date);
    setFormProcessingDate(item.processing_date || item.date);
    setFormWeight(String(item.processed_weight_grams));
    setFormNotes(item.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('processed_waste')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Data berhasil dihapus!');
      setDeleteConfirm(null);
      setProcessedData((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toast.error('Gagal menghapus data.');
      console.error(e);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormDate('');
    setFormProcessingDate('');
    setFormWeight('');
    setFormNotes('');
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 shadow-xl text-sm" style={{ minWidth: 200 }}>
        <p className="font-semibold theme-text-primary mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium theme-text-secondary">
              {p.dataKey === 'persentase' ? `${p.value}%` : fmtWeight(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Download Excel — hanya persentase dan total berat per hari
  const downloadExcel = () => {
    if (chartData.length === 0) {
      toast.error('Tidak ada data untuk didownload.');
      return;
    }

    const data = chartData.map((d, i) => {
      // Cari tanggal olahan untuk baris ini
      const proc = processedData.find((p) => p.date === d.date);
      return {
        'No': i + 1,
        'Tanggal Sampah Masuk': new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        'Tanggal Diolah': proc?.processing_date ? new Date(proc.processing_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
        'Total Sampah Masuk (kg)': (d.totalMasuk / 1000).toFixed(2),
        'Total Sampah Olahan (kg)': (d.totalOlahan / 1000).toFixed(2),
        'Persentase Olahan (%)': d.persentase,
      };
    });

    // Total row
    const totalMasuk = chartData.reduce((s, d) => s + d.totalMasuk, 0);
    const totalOlahan = chartData.reduce((s, d) => s + d.totalOlahan, 0);
    const avgPersentase = chartData.length > 0
      ? Math.round((chartData.reduce((s, d) => s + d.persentase, 0) / chartData.length) * 10) / 10
      : 0;

    data.push({
      'No': '',
      'Tanggal Sampah Masuk': 'TOTAL / RATA-RATA',
      'Tanggal Diolah': '',
      'Total Sampah Masuk (kg)': (totalMasuk / 1000).toFixed(2),
      'Total Sampah Olahan (kg)': (totalOlahan / 1000).toFixed(2),
      'Persentase Olahan (%)': avgPersentase,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sampah Olahan');

    const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, `Sampah_Olahan_${dateStr}.xlsx`);
    toast.success('File Excel berhasil didownload!');
  };

  // Summary stats
  const totalMasukAll = reports.reduce((s, r) => s + r.weight_grams, 0);
  const totalOlahanAll = processedData.reduce((s, p) => s + p.processed_weight_grams, 0);
  const overallPercentage = totalMasukAll > 0 ? Math.min(100, ((totalOlahanAll / totalMasukAll) * 100)) : 0;

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
            <HiOutlineScale className="w-7 h-7 text-primary-500 dark:text-primary-400" />
            Sampah Olahan
          </h1>
          <p className="theme-text-muted mt-1 text-sm">
            Catat dan pantau sampah yang berhasil diolah per hari
          </p>
        </div>
        <button onClick={downloadExcel} disabled={chartData.length === 0}
          className="btn-primary flex items-center justify-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto">
          <HiOutlineDownload className="w-5 h-5" />
          Download Excel
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineScale className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold theme-text-primary">{fmtWeight(totalMasukAll)}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate theme-text-muted">Total Sampah Masuk</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-emerald-500 dark:text-emerald-400">{fmtWeight(totalOlahanAll)}</p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate theme-text-muted">Total Sampah Diolah</p>
        </div>
        <div className="glass-card p-2.5 sm:p-4 md:p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <HiOutlineChartBar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-bold text-amber-500 dark:text-amber-400">
            {overallPercentage.toFixed(1)}%
          </p>
          <p className="text-[10px] sm:text-xs mt-0.5 truncate theme-text-muted">Persentase Keseluruhan</p>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-500/10 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
          <HiOutlinePlusCircle className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          {editingId ? '✏️ Edit Data Olahan' : 'Tambah Data Olahan'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div>
              <label htmlFor="procDate" className="input-label flex items-center gap-2">
                <HiOutlineCalendar className="w-4 h-4" /> Tanggal Sampah Masuk
              </label>
              <select
                id="procDate"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="input-field"
                required
              >
                <option value="">-- Pilih Tanggal --</option>
                {Object.keys(reportsByDate).sort((a, b) => b.localeCompare(a)).map(dateStr => {
                  const hasProcessed = processedData.find(p => p.date === dateStr);
                  if (hasProcessed && hasProcessed.id !== editingId) return null; // Sembunyikan yang sudah ada datanya kecuali sedang diedit
                  return (
                    <option key={dateStr} value={dateStr}>
                      {new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} (Masuk: {fmtWeight(reportsByDate[dateStr].total)})
                    </option>
                  );
                })}
              </select>
              <p className="text-xs theme-text-faint mt-1">Hanya tanggal yang ada laporan disetujui yang bisa dipilih.</p>
            </div>
            <div>
              <label htmlFor="procProcessingDate" className="input-label flex items-center gap-2">
                <HiOutlineCalendar className="w-4 h-4 text-emerald-500" /> Tanggal Diolah
              </label>
              <input
                id="procProcessingDate"
                type="date"
                value={formProcessingDate}
                onChange={(e) => setFormProcessingDate(e.target.value)}
                className="input-field"
                required
              />
              <p className="text-xs theme-text-faint mt-1">Tanggal saat Anda mengolah sampah tersebut.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="procWeight" className="input-label flex items-center gap-2">
                <HiOutlineScale className="w-4 h-4" /> Berat Olahan (gram)
              </label>
              <div className="relative">
                <input
                  id="procWeight"
                  type="number"
                  min="1"
                  step="1"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  placeholder="Contoh: 5000"
                  className="input-field pr-16"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium theme-text-faint">gram</span>
              </div>
              {formWeight && (
                <p className="text-xs theme-text-faint mt-1">
                  ≈ <span className="text-primary-500 dark:text-primary-400 font-medium">{(Number(formWeight) / 1000).toFixed(2)} kg</span>
                  {formDate && reportsByDate[formDate] && (
                    <span className="ml-2">
                      ({Math.min(100, (Number(formWeight) / reportsByDate[formDate].total * 100)).toFixed(1)}% dari sampah masuk hari itu)
                    </span>
                  )}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="procNotes" className="input-label">Catatan (opsional)</label>
              <input
                id="procNotes"
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 !py-2.5 text-sm">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Menyimpan...</span></>
              ) : editingId ? '💾 Simpan Perubahan' : '➕ Tambah Data'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn-secondary !py-2.5 text-sm">
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Chart: Persentase per hari */}
      {chartData.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
            <HiOutlineChartBar className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            Grafik Persentase Olahan Per Hari
          </h2>
          <div className="w-full" style={{ height: Math.max(300, Math.min(400, chartData.length * 30)) }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}kg` : `${v}g`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Bar yAxisId="left" dataKey="totalMasuk" name="Sampah Masuk" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.4} />
                <Bar yAxisId="left" dataKey="totalOlahan" name="Sampah Olahan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="persentase" name="Persentase (%)" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Table */}
      {processedData.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-base sm:text-lg font-semibold theme-text-primary flex items-center gap-2">
              <HiOutlineCalendar className="w-5 h-5 text-primary-500 dark:text-primary-400" />
              Riwayat Data Olahan
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                  <th className="text-left px-4 py-3 font-semibold theme-text-muted">No</th>
                  <th className="text-left px-4 py-3 font-semibold theme-text-muted">Tgl. Masuk</th>
                  <th className="text-left px-4 py-3 font-semibold theme-text-muted">Tgl. Diolah</th>
                  <th className="text-right px-4 py-3 font-semibold theme-text-muted">Sampah Masuk</th>
                  <th className="text-right px-4 py-3 font-semibold theme-text-muted">Sampah Olahan</th>
                  <th className="text-right px-4 py-3 font-semibold theme-text-muted">Persentase</th>
                  <th className="text-left px-4 py-3 font-semibold theme-text-muted">Catatan</th>
                  <th className="text-center px-4 py-3 font-semibold theme-text-muted">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((p, i) => {
                  const reportTotal = reportsByDate[p.date]?.total || 0;
                  const pct = reportTotal > 0 ? Math.min(100, (p.processed_weight_grams / reportTotal * 100)) : (p.processed_weight_grams > 0 ? 100 : 0);

                  return (
                    <tr key={p.id} className="border-t transition-colors hover:bg-slate-500/5" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-3 theme-text-faint">{i + 1}</td>
                      <td className="px-4 py-3 font-medium theme-text-secondary whitespace-nowrap">
                        {new Date(p.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {p.processing_date ? new Date(p.processing_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-500 dark:text-blue-400 font-medium">
                        {reportTotal > 0 ? fmtWeight(reportTotal) : <span className="theme-text-faint text-xs">tidak ada</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-500 dark:text-emerald-400 font-medium">
                        {fmtWeight(p.processed_weight_grams)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          pct >= 80 ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400' :
                          pct >= 50 ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400' :
                          'bg-red-500/15 text-red-500 dark:text-red-400'
                        }`}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 theme-text-faint text-xs max-w-[150px] truncate">
                        {p.notes || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(p)} title="Edit"
                            className="p-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-500/15 rounded-lg transition-all">
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === p.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(p.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700">Hapus!</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded-lg theme-bg-input theme-text-muted">Batal</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(p.id)} title="Hapus"
                              className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-all">
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 theme-bg-input">
            <HiOutlineScale className="w-8 h-8 theme-text-faint" />
          </div>
          <p className="theme-text-muted text-lg mb-1">Belum ada data olahan</p>
          <p className="theme-text-faint text-sm">Gunakan form di atas untuk menambahkan data sampah yang berhasil diolah</p>
        </div>
      )}
    </div>
  );
}
