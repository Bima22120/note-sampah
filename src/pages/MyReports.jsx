import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { HiOutlineClipboardList, HiOutlineEye } from 'react-icons/hi';

export default function MyReports() {
  const { user } = useAuth();
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
        .eq('user_id', user.id)
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
  const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusBadge = (s) => {
    const map = {
      pending: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: '⏳ Menunggu' },
      approved: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: '✓ Disetujui' },
      rejected: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: '✕ Ditolak' },
    };
    const b = map[s] || map.pending;
    return <span className={`text-xs px-3 py-1 rounded-full font-medium border ${b.cls}`}>{b.label}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Laporan Saya</h1>
        <p className="text-dark-400 mt-1">Riwayat semua laporan sampah yang Anda buat</p>
      </div>

      {reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="glass-card p-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    r.category === 'organik' ? 'bg-green-500/15' : 'bg-blue-500/15'
                  }`}>
                    {r.category === 'organik' ? '🌿' : '🔧'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark-200 font-medium capitalize">{r.category}</p>
                    <p className="text-dark-500 text-sm truncate">{r.description}</p>
                    <p className="text-dark-600 text-xs mt-1">{fmtDate(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-semibold">{fmtWeight(r.weight_grams)}</span>
                  {statusBadge(r.status)}
                  <button
                    onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
                    className="p-2 text-dark-400 hover:text-primary-400 hover:bg-dark-800 rounded-lg transition-all"
                    title="Lihat Detail"
                  >
                    <HiOutlineEye className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Detail Panel */}
              {selectedReport?.id === r.id && (
                <div className="mt-4 pt-4 border-t border-dark-700/50 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-dark-800/60 rounded-lg p-3">
                      <p className="text-dark-500 text-xs mb-1">Kategori</p>
                      <p className="text-dark-200 capitalize">{r.category}</p>
                    </div>
                    <div className="bg-dark-800/60 rounded-lg p-3">
                      <p className="text-dark-500 text-xs mb-1">Berat</p>
                      <p className="text-dark-200">{Number(r.weight_grams).toLocaleString('id-ID')} gram ({fmtWeight(r.weight_grams)})</p>
                    </div>
                  </div>
                  <div className="bg-dark-800/60 rounded-lg p-3 text-sm">
                    <p className="text-dark-500 text-xs mb-1">Keterangan</p>
                    <p className="text-dark-300">{r.description}</p>
                  </div>
                  {r.admin_notes && (
                    <div className="bg-dark-800/60 rounded-lg p-3 text-sm border-l-2 border-amber-500/50">
                      <p className="text-dark-500 text-xs mb-1">Catatan Admin</p>
                      <p className="text-dark-300">{r.admin_notes}</p>
                    </div>
                  )}
                  <p className="text-dark-600 text-xs">
                    📌 Laporan yang sudah disetujui/ditolak tidak dapat diedit.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-dark-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HiOutlineClipboardList className="w-8 h-8 text-dark-500" />
          </div>
          <p className="text-dark-300 text-lg mb-1">Belum ada laporan</p>
          <p className="text-dark-500 text-sm">Mulai buat laporan pertama Anda</p>
        </div>
      )}
    </div>
  );
}
