import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { HiOutlineCheck, HiOutlineX, HiOutlineClock } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function AdminPending() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [notes, setNotes] = useState({});

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*, profiles:user_id(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setReports(data || []);
    } catch (e) { console.error(e); }
    finally { 
      clearTimeout(safetyTimer);
      setLoading(false); 
    }
  };

  const handleAction = async (reportId, status) => {
    setActionLoading(reportId);
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({
          status,
          admin_notes: notes[reportId] || null,
          approved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      if (error) throw error;
      toast.success(status === 'approved' ? 'Laporan disetujui!' : 'Laporan ditolak.');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (e) {
      toast.error('Gagal memproses laporan.');
      console.error(e);
    } finally { setActionLoading(null); }
  };

  const fmt = (g) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Persetujuan Laporan</h1>
        <p className="text-dark-400 mt-1">Tinjau dan setujui laporan sampah yang masuk</p>
      </div>

      {reports.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <HiOutlineClock className="w-5 h-5 text-amber-400" />
            <span>{reports.length} laporan menunggu persetujuan</span>
          </div>

          {reports.map((r) => (
            <div key={r.id} className="glass-card p-6 animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Report Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={r.category === 'organik' ? 'badge-organik' : 'badge-anorganik'}>
                      {r.category === 'organik' ? '🌿 Organik' : '🔧 Anorganik'}
                    </span>
                    <span className="badge-pending">⏳ Pending</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-dark-800/60 rounded-lg p-3">
                      <p className="text-xs text-dark-500 mb-1">Pelapor</p>
                      <p className="text-sm font-medium text-dark-200">{r.nama_pelapor || r.profiles?.full_name || 'Tanpa Nama'}</p>
                      {r.rt && r.rw && <p className="text-xs text-dark-500">RT {r.rt} / RW {r.rw}</p>}
                    </div>
                    <div className="bg-dark-800/60 rounded-lg p-3">
                      <p className="text-xs text-dark-500 mb-1">Berat</p>
                      <p className="text-sm font-bold text-white">{fmt(r.weight_grams)}</p>
                      <p className="text-xs text-dark-500">{r.weight_grams.toLocaleString('id-ID')} gram</p>
                    </div>
                    <div className="bg-dark-800/60 rounded-lg p-3">
                      <p className="text-xs text-dark-500 mb-1">Tanggal</p>
                      <p className="text-sm text-dark-200">
                        {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-dark-500 mb-1">Keterangan</p>
                    <p className="text-sm text-dark-300 bg-dark-800/40 rounded-lg p-3">{r.description}</p>
                  </div>
                </div>

                {/* Action Panel */}
                <div className="lg:w-72 space-y-3 shrink-0">
                  <div>
                    <label className="text-xs font-medium text-dark-400 mb-1 block">Catatan Admin (opsional)</label>
                    <textarea
                      value={notes[r.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Tambahkan catatan..."
                      rows={3}
                      className="input-field text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(r.id, 'approved')}
                      disabled={actionLoading === r.id}
                      className="btn-success flex-1 flex items-center justify-center gap-2 !py-2.5 !px-4 text-sm"
                    >
                      <HiOutlineCheck className="w-4 h-4" /> Setuju
                    </button>
                    <button
                      onClick={() => handleAction(r.id, 'rejected')}
                      disabled={actionLoading === r.id}
                      className="btn-danger flex-1 flex items-center justify-center gap-2 !py-2.5 !px-4 text-sm"
                    >
                      <HiOutlineX className="w-4 h-4" /> Tolak
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HiOutlineCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-dark-300 text-lg mb-1">Semua laporan telah diproses!</p>
          <p className="text-dark-500 text-sm">Tidak ada laporan yang menunggu persetujuan</p>
        </div>
      )}
    </div>
  );
}
