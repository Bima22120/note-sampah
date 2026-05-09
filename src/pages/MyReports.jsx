import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { HiOutlineClipboardList, HiOutlineEye } from 'react-icons/hi';
import compostImg from '../assets/compost.png';
import repurposeImg from '../assets/repurpose.png';

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (e) { console.error(e); }
    finally { 
      clearTimeout(safetyTimer);
      setLoading(false); 
    }
  };

  const fmtWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const statusBadge = (s) => {
    const map = {
      pending: { cls: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30', label: '⏳ Menunggu' },
      approved: { cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: '✓ Disetujui' },
      rejected: { cls: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30', label: '✕ Ditolak' },
    };
    const b = map[s] || map.pending;
    return <span className={`text-xs px-3 py-1 rounded-full font-medium border ${b.cls}`}>{b.label}</span>;
  };

  const getCategoryImage = (cat) => cat === 'organik' ? compostImg : repurposeImg;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold theme-text-primary">Daftar Laporan</h1>
        <p className="theme-text-muted mt-1">Semua laporan sampah yang telah masuk</p>
      </div>

      {reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="glass-card p-4 sm:p-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    r.category === 'organik' ? 'bg-green-500/15' : 'bg-blue-500/15'
                  }`}>
                    <img src={getCategoryImage(r.category)} alt={r.category} className="category-img" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium capitalize theme-text-secondary text-sm sm:text-base">{r.category}</p>
                    <p className="theme-text-faint text-xs sm:text-sm truncate">{r.description}</p>
                    <p className="theme-text-faint text-xs mt-1">{fmtDate(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-13 sm:ml-0">
                  <span className="font-semibold theme-text-primary text-sm sm:text-base">{fmtWeight(r.weight_grams)}</span>
                  {statusBadge(r.status)}
                  <button
                    onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
                    className="p-2 rounded-lg transition-all theme-text-muted hover:text-primary-500 dark:hover:text-primary-400"
                    style={{ backgroundColor: 'transparent' }}
                    title="Lihat Detail"
                  >
                    <HiOutlineEye className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Detail Panel */}
              {selectedReport?.id === r.id && (
                <div className="mt-4 pt-4 border-t space-y-3 animate-fade-in" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="rounded-lg p-3 theme-bg-input">
                      <p className="theme-text-faint text-xs mb-1">Kategori</p>
                      <p className="capitalize theme-text-secondary">{r.category}</p>
                    </div>
                    <div className="rounded-lg p-3 theme-bg-input">
                      <p className="theme-text-faint text-xs mb-1">Berat</p>
                      <p className="theme-text-secondary">{Number(r.weight_grams).toLocaleString('id-ID')} gram ({fmtWeight(r.weight_grams)})</p>
                    </div>
                  </div>
                  <div className="rounded-lg p-3 text-sm theme-bg-input">
                    <p className="theme-text-faint text-xs mb-1">Keterangan</p>
                    <p className="theme-text-muted">{r.description}</p>
                  </div>
                  {r.admin_notes && (
                    <div className="rounded-lg p-3 text-sm border-l-2 border-amber-500/50 theme-bg-input">
                      <p className="theme-text-faint text-xs mb-1">Catatan Admin</p>
                      <p className="theme-text-muted">{r.admin_notes}</p>
                    </div>
                  )}
                  <p className="theme-text-faint text-xs">
                    📌 Laporan yang sudah disetujui/ditolak tidak dapat diedit.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 theme-bg-input">
            <HiOutlineClipboardList className="w-8 h-8 theme-text-faint" />
          </div>
          <p className="theme-text-muted text-lg mb-1">Belum ada laporan</p>
          <p className="theme-text-faint text-sm">Belum ada laporan sampah yang masuk</p>
        </div>
      )}
    </div>
  );
}
