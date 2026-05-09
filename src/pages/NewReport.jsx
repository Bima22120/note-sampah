import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { HiOutlineScale, HiOutlineTag, HiOutlineDocumentText, HiOutlineUser, HiOutlineLocationMarker } from 'react-icons/hi';
import toast from 'react-hot-toast';
import compostImg from '../assets/compost.png';
import repurposeImg from '../assets/repurpose.png';

export default function NewReport() {
  const navigate = useNavigate();
  const [namaPelapor, setNamaPelapor] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [category, setCategory] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!namaPelapor.trim() || !/^[a-zA-Z\s]+$/.test(namaPelapor)) { toast.error('Nama wajib diisi dan hanya boleh huruf!'); return; }
    if (rt.trim().length !== 2 || rw.trim().length !== 2) { toast.error('RT dan RW wajib 2 angka (contoh: 01)!'); return; }
    if (!category) { toast.error('Pilih kategori sampah!'); return; }
    if (!weightGrams || Number(weightGrams) <= 0) { toast.error('Masukkan berat yang valid!'); return; }
    setLoading(true);
    
    try {
      const { error } = await supabase.from('waste_reports').insert({
        nama_pelapor: namaPelapor.trim(),
        rt: rt.trim(),
        rw: rw.trim(),
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold theme-text-primary">Laporan Sampah Baru</h1>
        <p className="theme-text-muted mt-1 text-sm sm:text-base">Isi form berikut untuk melaporkan sampah yang telah ditimbang</p>
      </div>

      <div className="glass-card p-5 sm:p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Identitas Pelapor */}
          <div className="p-4 sm:p-5 rounded-xl border space-y-4 theme-bg-input" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2 theme-text-primary">
              <HiOutlineUser className="w-5 h-5 text-primary-500 dark:text-primary-400" /> Data Diri
            </h3>
            <div>
              <label htmlFor="namaPelapor" className="input-label">Nama Lengkap</label>
              <input id="namaPelapor" type="text" value={namaPelapor}
                onChange={(e) => setNamaPelapor(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                placeholder="Masukkan nama lengkap Anda" className="input-field" required />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="rt" className="input-label flex items-center gap-2">
                  <HiOutlineLocationMarker className="w-4 h-4" /> RT
                </label>
                <input id="rt" type="text" value={rt} maxLength={2}
                  onChange={(e) => setRt(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Contoh: 01" className="input-field" required />
              </div>
              <div>
                <label htmlFor="rw" className="input-label flex items-center gap-2">
                  <HiOutlineLocationMarker className="w-4 h-4" /> RW
                </label>
                <input id="rw" type="text" value={rw} maxLength={2}
                  onChange={(e) => setRw(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Contoh: 02" className="input-field" required />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="input-label flex items-center gap-2">
              <HiOutlineTag className="w-4 h-4" /> Kategori Sampah
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button type="button" onClick={() => setCategory('organik')}
                className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left ${category === 'organik' ? 'border-green-500 bg-green-500/10' : 'border-transparent hover:border-green-500/30'}`}
                style={{ backgroundColor: category === 'organik' ? undefined : 'var(--bg-input)' }}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 mb-1 sm:mb-2">
                  <img src={compostImg} alt="Organik" className="w-full h-full object-contain" />
                </div>
                <p className={`font-semibold ${category === 'organik' ? 'text-green-500 dark:text-green-400' : 'theme-text-secondary'} text-sm sm:text-base`}>Organik</p>
                <p className="text-xs theme-text-faint mt-1 hidden sm:block">Sisa makanan, daun, kayu, dll</p>
              </button>
              <button type="button" onClick={() => setCategory('anorganik')}
                className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left ${category === 'anorganik' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-blue-500/30'}`}
                style={{ backgroundColor: category === 'anorganik' ? undefined : 'var(--bg-input)' }}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 mb-1 sm:mb-2">
                  <img src={repurposeImg} alt="Anorganik" className="w-full h-full object-contain" />
                </div>
                <p className={`font-semibold ${category === 'anorganik' ? 'text-blue-500 dark:text-blue-400' : 'theme-text-secondary'} text-sm sm:text-base`}>Anorganik</p>
                <p className="text-xs theme-text-faint mt-1 hidden sm:block">Plastik, logam, kaca, dll</p>
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
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium theme-text-faint">gram</span>
            </div>
            {weightGrams && (
              <p className="text-sm theme-text-faint mt-2">
                ≈ <span className="text-primary-500 dark:text-primary-400 font-medium">{weightKg} kg</span>
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
            <div className="rounded-xl p-4 border theme-bg-input" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 theme-text-muted">Ringkasan Laporan</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div><p className="theme-text-faint">Nama</p><p className="font-medium truncate theme-text-secondary">{namaPelapor || '-'}</p></div>
                <div><p className="theme-text-faint">RT / RW</p><p className="font-medium theme-text-secondary">{rt || '-'} / {rw || '-'}</p></div>
                <div>
                  <p className="theme-text-faint">Kategori</p>
                  <p className="font-medium capitalize theme-text-secondary flex items-center gap-1">
                    <img src={category === 'organik' ? compostImg : repurposeImg} alt={category} className="w-4 h-4 object-contain inline" />
                    {category === 'organik' ? ' Organik' : ' Anorganik'}
                  </p>
                </div>
                <div><p className="theme-text-faint">Berat</p><p className="font-medium theme-text-secondary">{Number(weightGrams).toLocaleString('id-ID')} gram ({weightKg} kg)</p></div>
                <div className="col-span-2"><p className="theme-text-faint">Status</p><span className="badge-pending">⏳ Pending</span></div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 order-1 sm:order-2">
              {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Mengirim...</span></> : 'Kirim Laporan'}
            </button>
            <button type="button" onClick={() => navigate('/reports')} className="btn-secondary sm:w-1/3 order-2 sm:order-1">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
