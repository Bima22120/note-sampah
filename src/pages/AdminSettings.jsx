import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { HiOutlineExclamation, HiOutlineTrash, HiOutlineCog } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteData = async () => {
    if (confirmText !== 'DELETE DATA') {
      toast.error('Ketikan tidak sesuai!');
      return;
    }

    setIsDeleting(true);
    try {
      // Hapus data olahan terlebih dahulu
      const { error: errorProcessed } = await supabase
        .from('processed_waste')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      if (errorProcessed) throw errorProcessed;

      // Hapus semua laporan sampah
      const { error: errorReports } = await supabase
        .from('waste_reports')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      if (errorReports) throw errorReports;

      toast.success('Semua data transaksi berhasil dihapus!');
      setShowModal(false);
      setConfirmText('');
    } catch (error) {
      console.error(error);
      toast.error('Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary">Pengaturan Admin</h1>
        <p className="theme-text-muted mt-1 text-sm sm:text-base">
          Kelola konfigurasi dan database NoteSampah
        </p>
      </div>

      <div className="glass-card p-5 sm:p-6 border border-red-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-1">
            <HiOutlineExclamation className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Zona Bahaya (Danger Zone)</h2>
            <p className="theme-text-muted text-sm mt-1 mb-4">
              Aksi ini akan menghapus permanen <b>seluruh data laporan sampah</b> dan <b>seluruh data sampah olahan</b> dari database. 
              Gunakan fitur ini jika Anda ingin mengosongkan (reset) aplikasi menjadi seperti baru. Data profil pengguna tidak akan terhapus.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary !bg-red-600 hover:!bg-red-700 flex items-center gap-2"
            >
              <HiOutlineTrash className="w-5 h-5" />
              Reset Database Transaksi
            </button>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setShowModal(false)} />
          <div className="glass-card w-full max-w-md p-6 relative z-10 animate-fade-in border border-red-500/30 shadow-2xl shadow-red-500/20">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <HiOutlineExclamation className="w-8 h-8" />
              <h3 className="text-xl font-bold">Konfirmasi Penghapusan</h3>
            </div>
            <p className="theme-text-secondary text-sm mb-4">
              Aksi ini <b>TIDAK BISA DIBATALKAN</b>. Semua data laporan (menunggu, disetujui, ditolak) dan data sampah olahan akan hilang selamanya.
            </p>
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm theme-text-primary mb-2">
                Ketik <b>DELETE DATA</b> untuk melanjutkan:
              </p>
              <input
                type="text"
                className="input-field w-full !border-red-500/50 focus:!border-red-500 focus:!ring-red-500/20"
                placeholder="DELETE DATA"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setConfirmText('');
                }}
                disabled={isDeleting}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteData}
                disabled={confirmText !== 'DELETE DATA' || isDeleting}
                className="btn-primary !bg-red-600 hover:!bg-red-700 disabled:!bg-slate-500 disabled:opacity-50 px-4 py-2 text-sm flex items-center gap-2"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Semua Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
