import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { HiOutlineScale, HiOutlineTag, HiOutlineDocumentText } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function NewReport() {
  const { user, profile, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Pastikan profile ada sebelum kirim laporan
  const ensureProfile = async () => {
    if (profile) return true;

    // Cek apakah profile sudah ada di database
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (data) {
      await fetchProfile(user.id);
      return true;
    }

    // Buat profile jika belum ada
    const fullName = user.user_metadata?.full_name || 'User';
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        role: 'user',
      });

    if (error) {
      console.error('Error creating profile:', error);
      return false;
    }

    await fetchProfile(user.id);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) { toast.error('Pilih kategori sampah!'); return; }
    if (!weightGrams || Number(weightGrams) <= 0) { toast.error('Masukkan berat yang valid!'); return; }
    setLoading(true);
    try {
      // Pastikan profile ada dulu
      const profileReady = await ensureProfile();
      if (!profileReady) {
        toast.error('Gagal membuat profil. Silakan logout dan login kembali.');
        return;
      }

      const { error } = await supabase.from('waste_reports').insert({
        user_id: user.id,
        category,
        weight_grams: Number(weightGrams),
        description: description.trim(),
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Laporan berhasil dikirim! Menunggu persetujuan admin.');
      navigate('/reports');
    } catch (error) {
      toast.error(error.message || 'Gagal mengirim laporan.');
    } finally { setLoading(false); }
  };

  const weightKg = weightGrams ? (Number(weightGrams) / 1000).toFixed(2) : '0.00';

  return (
    <div className="page-enter max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Laporan Sampah Baru</h1>
        <p className="text-dark-400 mt-1">Isi form berikut untuk melaporkan sampah yang telah ditimbang</p>
      </div>

      <div className="glass-card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div>
            <label className="input-label flex items-center gap-2">
              <HiOutlineTag className="w-4 h-4" /> Kategori Sampah
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setCategory('organik')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${category === 'organik' ? 'border-green-500 bg-green-500/10' : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'}`}>
                <div className="text-2xl mb-2">🌿</div>
                <p className={`font-semibold ${category === 'organik' ? 'text-green-400' : 'text-dark-200'}`}>Organik</p>
                <p className="text-xs text-dark-500 mt-1">Sisa makanan, daun, kayu, dll</p>
              </button>
              <button type="button" onClick={() => setCategory('anorganik')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${category === 'anorganik' ? 'border-blue-500 bg-blue-500/10' : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'}`}>
                <div className="text-2xl mb-2">🔧</div>
                <p className={`font-semibold ${category === 'anorganik' ? 'text-blue-400' : 'text-dark-200'}`}>Anorganik</p>
                <p className="text-xs text-dark-500 mt-1">Plastik, logam, kaca, dll</p>
              </button>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label htmlFor="weight" className="input-label flex items-center gap-2">
              <HiOutlineScale className="w-4 h-4" /> Berat (gram)
            </label>
            <div className="relative">
              <input id="weight" type="number" min="1" step="1" value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                placeholder="Contoh: 500" className="input-field pr-16" required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 text-sm font-medium">gram</span>
            </div>
            {weightGrams && (
              <p className="text-sm text-dark-500 mt-2">
                ≈ <span className="text-primary-400 font-medium">{weightKg} kg</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="input-label flex items-center gap-2">
              <HiOutlineDocumentText className="w-4 h-4" /> Keterangan
            </label>
            <textarea id="description" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan jenis sampah yang dilaporkan..." rows={4}
              className="input-field resize-none" required />
          </div>

          {/* Preview */}
          {category && weightGrams && (
            <div className="bg-dark-800/80 rounded-xl p-4 border border-dark-700/50">
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Ringkasan Laporan</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-dark-500">Kategori</p><p className="text-dark-200 font-medium capitalize">{category === 'organik' ? '🌿 Organik' : '🔧 Anorganik'}</p></div>
                <div><p className="text-dark-500">Berat</p><p className="text-dark-200 font-medium">{Number(weightGrams).toLocaleString('id-ID')} gram ({weightKg} kg)</p></div>
                <div className="col-span-2"><p className="text-dark-500">Status</p><span className="badge-pending">⏳ Pending</span></div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Mengirim...</span></> : 'Kirim Laporan'}
            </button>
            <button type="button" onClick={() => navigate('/reports')} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
