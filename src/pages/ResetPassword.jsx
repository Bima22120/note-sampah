import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineCheckCircle, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';
import toast from 'react-hot-toast';
import logoGambar from '../assets/oasesongo.jpg';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // ============================================================
  // Supabase mengirim link recovery dengan format:
  // https://site.com/reset-password#access_token=xxx&type=recovery
  //
  // Saat halaman ini dibuka, Supabase client (detectSessionInUrl: true)
  // otomatis membaca hash dan memulai session recovery.
  // Kita tunggu event PASSWORD_RECOVERY dari onAuthStateChange.
  // ============================================================
  useEffect(() => {
    let mounted = true;

    // Cek apakah ada hash fragment di URL (dari link recovery email)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');

    if (type === 'recovery' && accessToken) {
      console.log('[ResetPassword] Recovery token terdeteksi, menunggu session...');
      
      // Supabase client akan otomatis process token ini
      // Tunggu session siap
      const checkSession = async () => {
        // Beri waktu Supabase untuk memproses token
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          console.log('[ResetPassword] Session recovery siap');
          setSessionReady(true);
        } else if (mounted) {
          // Coba lagi setelah 2 detik
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession && mounted) {
              setSessionReady(true);
            } else if (mounted) {
              setError('Token reset tidak valid atau sudah expired. Silakan minta link reset baru.');
            }
          }, 2000);
        }
      };

      checkSession();
    } else {
      // Tidak ada token di URL, cek apakah sudah ada session aktif
      // (misal: user sudah di-redirect dan token sudah diproses)
      const checkExistingSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setSessionReady(true);
        } else if (mounted) {
          setError('Tidak ada token reset password. Silakan gunakan link dari email Anda.');
        }
      };
      checkExistingSession();
    }

    // Listen untuk PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log('[ResetPassword] Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
        setError('');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password harus minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password dan konfirmasi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Password berhasil diubah!');

      // Sign out setelah reset agar user login ulang dengan password baru
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      toast.error(err.message || 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at top left, rgba(120,53,15,0.2), #020617 50%, #020617)'
            : 'radial-gradient(ellipse at top left, rgba(251,191,36,0.15), #f8fafc 50%, #f8fafc)',
        }}
      />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-xl transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.8)',
          border: '1px solid var(--border-color)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {isDark ? (
          <HiOutlineSun className="w-5 h-5 text-amber-400 theme-toggle-icon" />
        ) : (
          <HiOutlineMoon className="w-5 h-5 text-indigo-500 theme-toggle-icon" />
        )}
      </button>

      <div className="w-full max-w-md relative animate-fade-in z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-red-600 shadow-amber-500/30 rounded-2xl shadow-2xl mb-4 overflow-hidden">
            <img src={logoGambar} alt="Logo NoteSampah" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 theme-text-primary">Reset Password</h1>
          <p className="text-sm sm:text-base theme-text-muted">NoteSampah - Atur Password Baru</p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          {success ? (
            /* ====== SUCCESS STATE ====== */
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 rounded-2xl mx-auto">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold theme-text-primary">Password Berhasil Diubah!</h2>
              <p className="text-sm theme-text-muted">
                Anda akan diarahkan ke halaman login dalam beberapa detik...
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="text-sm text-primary-500 hover:text-primary-400 transition-colors"
              >
                Langsung ke Login →
              </button>
            </div>
          ) : error ? (
            /* ====== ERROR STATE ====== */
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-lg font-bold theme-text-primary">Link Tidak Valid</h2>
              <p className="text-sm theme-text-muted">{error}</p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 transition-all duration-300 shadow-lg shadow-amber-500/25"
              >
                Kembali ke Login
              </button>
            </div>
          ) : !sessionReady ? (
            /* ====== LOADING STATE ====== */
            <div className="text-center space-y-4 py-8">
              <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
              <p className="text-sm theme-text-muted">Memverifikasi link reset...</p>
            </div>
          ) : (
            /* ====== RESET FORM ====== */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm theme-text-muted">
                  Masukkan password baru Anda (minimal 6 karakter)
                </p>
              </div>

              <div>
                <label htmlFor="new-password" className="input-label">Password Baru</label>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="input-field pl-12 pr-12"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="input-label">Konfirmasi Password</label>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="input-field pl-12"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                )}
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${newPassword.length >= 2 ? 'bg-red-400' : 'theme-bg-input'}`} />
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${newPassword.length >= 4 ? 'bg-amber-400' : 'theme-bg-input'}`} />
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${newPassword.length >= 6 ? 'bg-yellow-400' : 'theme-bg-input'}`} />
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${newPassword.length >= 8 ? 'bg-emerald-400' : 'theme-bg-input'}`} />
                  </div>
                  <p className="text-xs theme-text-faint">
                    {newPassword.length < 6 ? '⚠️ Minimal 6 karakter' :
                     newPassword.length < 8 ? '🔒 Cukup aman' : '🔐 Password kuat'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  'Simpan Password Baru'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="text-sm text-primary-500 dark:text-primary-400 hover:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              ← Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
