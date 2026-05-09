import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  HiOutlinePencil, HiOutlineTrash, HiOutlineDownload,
  HiOutlineCheck, HiOutlineX, HiOutlineSearch,
  HiOutlineFilter, HiOutlineDocumentReport,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import compostImg from '../assets/compost.png';
import repurposeImg from '../assets/repurpose.png';

export default function AdminReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [errorState, setErrorState] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  useEffect(() => {
    let result = [...reports];
    if (filterStatus !== 'all') result = result.filter(r => r.status === filterStatus);
    if (filterCategory !== 'all') result = result.filter(r => r.category === filterCategory);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.description?.toLowerCase().includes(s) ||
        (r.nama_pelapor || r.profiles?.full_name || '').toLowerCase().includes(s) ||
        r.category?.toLowerCase().includes(s)
      );
    }
    setFiltered(result);
  }, [reports, filterStatus, filterCategory, search]);

  const fetchReports = async () => {
    setErrorState(false);
    setLoading(true);
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setErrorState(true);
      toast.error('Koneksi terputus. Silakan muat ulang halaman.');
    }, 8000);
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*, profiles:user_id(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
      clearTimeout(safetyTimer);
    } catch (e) { 
      console.error(e); 
      clearTimeout(safetyTimer);
    }
    finally { 
      setLoading(false); 
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report.id);
    setEditForm({
      category: report.category,
      weight_grams: report.weight_grams,
      description: report.description,
      status: report.status,
      admin_notes: report.admin_notes || '',
    });
  };

  const handleSaveEdit = async (reportId) => {
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({
          ...editForm,
          weight_grams: Number(editForm.weight_grams),
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      if (error) throw error;
      toast.success('Laporan berhasil diperbarui!');
      setEditingReport(null);
      fetchReports();
    } catch (e) {
      toast.error('Gagal memperbarui laporan.');
      console.error(e);
    }
  };

  const handleDelete = async (reportId) => {
    try {
      const { error } = await supabase
        .from('waste_reports')
        .delete()
        .eq('id', reportId);
      if (error) throw error;
      toast.success('Laporan berhasil dihapus!');
      setDeleteConfirm(null);
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (e) {
      toast.error('Gagal menghapus laporan.');
      console.error(e);
    }
  };

  const handleStatusChange = async (reportId, status) => {
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ status, approved_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw error;
      toast.success(status === 'approved' ? 'Laporan disetujui!' : 'Laporan ditolak!');
      fetchReports();
    } catch (e) {
      toast.error('Gagal mengubah status.');
    }
  };

  const downloadExcel = () => {
    const data = filtered.map((r, i) => ({
      'No': i + 1,
      'Pelapor': r.nama_pelapor || r.profiles?.full_name || '-',
      'RT': r.rt || '-',
      'RW': r.rw || '-',
      'Kategori': r.category === 'organik' ? 'Organik' : 'Anorganik',
      'Organik (kg)': r.category === 'organik' ? (r.weight_grams / 1000).toFixed(2) : '0',
      'Anorganik (kg)': r.category === 'anorganik' ? (r.weight_grams / 1000).toFixed(2) : '0',
      'Total Berat (kg)': (r.weight_grams / 1000).toFixed(2),
      'Keterangan': r.description,
      'Status': r.status === 'approved' ? 'Disetujui' : r.status === 'rejected' ? 'Ditolak' : 'Menunggu',
      'Catatan Admin': r.admin_notes || '-',
      'Tanggal Laporan': new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }));

    const wsData = [...data];
    const totalOrganik = filtered.reduce((sum, r) => sum + (r.category === 'organik' ? r.weight_grams : 0), 0);
    const totalAnorganik = filtered.reduce((sum, r) => sum + (r.category === 'anorganik' ? r.weight_grams : 0), 0);
    const totalWeight = filtered.reduce((sum, r) => sum + r.weight_grams, 0);

    wsData.push({
      'No': '',
      'Pelapor': 'TOTAL KESELURUHAN',
      'RT': '',
      'RW': '',
      'Kategori': '',
      'Organik (kg)': (totalOrganik / 1000).toFixed(2),
      'Anorganik (kg)': (totalAnorganik / 1000).toFixed(2),
      'Total Berat (kg)': (totalWeight / 1000).toFixed(2),
      'Keterangan': '',
      'Status': '',
      'Catatan Admin': '',
      'Tanggal Laporan': '',
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Auto-fit column widths
    const colWidths = Object.keys(wsData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...wsData.map(r => String(r[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Sampah');
    
    const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, `Laporan_Sampah_${dateStr}.xlsx`);
    toast.success('File Excel berhasil didownload!');
  };

  const fmtWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-enter space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary">Semua Laporan</h1>
          <p className="theme-text-muted mt-1 text-sm">{filtered.length} laporan ditemukan</p>
        </div>
        <button onClick={downloadExcel} disabled={filtered.length === 0}
          className="btn-primary flex items-center justify-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto">
          <HiOutlineDownload className="w-5 h-5" />
          Download Excel
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-faint" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari pelapor, keterangan..." className="input-field pl-10 !py-2.5 text-sm" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
  <select
    value={filterStatus}
    onChange={e => setFilterStatus(e.target.value)}
    className="input-field w-full sm:w-auto !py-2.5 text-sm !pr-8 cursor-pointer"
  >
    <option value="all">Semua Status</option>
    <option value="pending">Menunggu</option>
    <option value="approved">Disetujui</option>
    <option value="rejected">Ditolak</option>
  </select>

  <select
    value={filterCategory}
    onChange={e => setFilterCategory(e.target.value)}
    className="input-field w-full sm:w-auto !py-2.5 text-sm !pr-8 cursor-pointer"
  >
    <option value="all">Semua Kategori</option>
    <option value="organik">Organik</option>
    <option value="anorganik">Anorganik</option>
  </select>
</div>
        </div>
      </div>

      {/* Reports List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="glass-card p-4 sm:p-5 animate-fade-in">
              {editingReport === r.id ? (
                /* Edit Mode */
                <div className="space-y-3 sm:space-y-4">
                  <p className="font-semibold text-sm theme-text-primary">✏️ Edit Laporan</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs theme-text-faint mb-1 block">Kategori</label>
                      <select value={editForm.category} onChange={e => setEditForm(f => ({...f, category: e.target.value}))}
                        className="input-field !py-2 text-sm">
                        <option value="organik">Organik</option>
                        <option value="anorganik">Anorganik</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs theme-text-faint mb-1 block">Berat (gram)</label>
                      <input type="number" value={editForm.weight_grams} onChange={e => setEditForm(f => ({...f, weight_grams: e.target.value}))}
                        className="input-field !py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs theme-text-faint mb-1 block">Status</label>
                      <select value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value}))}
                        className="input-field !py-2 text-sm">
                        <option value="pending">Menunggu</option>
                        <option value="approved">Disetujui</option>
                        <option value="rejected">Ditolak</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs theme-text-faint mb-1 block">Keterangan</label>
                    <textarea value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
                      className="input-field !py-2 text-sm resize-none" rows={2} />
                  </div>
                  <div>
                    <label className="text-xs theme-text-faint mb-1 block">Catatan Admin</label>
                    <input type="text" value={editForm.admin_notes} onChange={e => setEditForm(f => ({...f, admin_notes: e.target.value}))}
                      className="input-field !py-2 text-sm" placeholder="Tambahkan catatan..." />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(r.id)} className="btn-primary !py-2 !px-4 text-sm">💾 Simpan</button>
                    <button onClick={() => setEditingReport(null)} className="btn-secondary !py-2 !px-4 text-sm">Batal</button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center justify-between">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      r.category === 'organik' ? 'bg-green-500/15' : 'bg-blue-500/15'
                    }`}>
                      <img
                        src={r.category === 'organik' ? compostImg : repurposeImg}
                        alt={r.category}
                        className="w-5 h-5 sm:w-7 sm:h-7 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-xs sm:text-sm theme-text-secondary">
                          {r.nama_pelapor || r.profiles?.full_name || 'Tanpa Nama'} {r.rt && r.rw ? `(RT ${r.rt}/RW ${r.rw})` : ''}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === 'approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                          r.status === 'rejected' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                          'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                        }`}>
                          {r.status === 'approved' ? '✓ Disetujui' : r.status === 'rejected' ? '✕ Ditolak' : '⏳ Menunggu'}
                        </span>
                      </div>
                      <p className="theme-text-faint text-xs mt-0.5 truncate">{r.description}</p>
                      <p className="text-xs mt-0.5 theme-text-faint">{fmtDate(r.created_at)} • {fmtWeight(r.weight_grams)} • {r.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-end sm:self-auto">
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatusChange(r.id, 'approved')} title="Setujui"
                          className="p-1.5 sm:p-2 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/15 rounded-lg transition-all">
                          <HiOutlineCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button onClick={() => handleStatusChange(r.id, 'rejected')} title="Tolak"
                          className="p-1.5 sm:p-2 text-red-500 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-all">
                          <HiOutlineX className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleEdit(r)} title="Edit"
                      className="p-1.5 sm:p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-500/15 rounded-lg transition-all">
                      <HiOutlinePencil className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    {deleteConfirm === r.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(r.id)} className="text-xs bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-red-700">Hapus!</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg theme-bg-input theme-text-muted hover:theme-text-primary">Batal</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(r.id)} title="Hapus"
                        className="p-1.5 sm:p-2 text-red-500 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-all">
                        <HiOutlineTrash className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 theme-bg-input">
            <HiOutlineDocumentReport className="w-8 h-8 theme-text-faint" />
          </div>
          {errorState ? (
            <>
              <p className="text-red-500 dark:text-red-400 text-lg mb-1">Koneksi Terputus</p>
              <p className="theme-text-muted text-sm mb-4">Gagal mengambil data dari server. Sesi mungkin macet.</p>
              <button onClick={() => window.location.reload()} className="btn-primary px-6">Muat Ulang Halaman</button>
            </>
          ) : (
            <>
              <p className="theme-text-muted text-lg mb-1">Tidak ada laporan</p>
              <p className="theme-text-faint text-sm">Sesuaikan filter untuk melihat laporan</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
