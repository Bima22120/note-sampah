import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';
import toast from 'react-hot-toast';
import logoGambar from '../assets/oasesongo.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  const { signIn, signOut, user, profile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const cooldownRef = useRef(null);

  // Redirect ke dashboard jika sudah login
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') {
        navigate('/dashboard', { replace: true });
      } else {
        signOut();
        toast.error('Sesi Anda diakhiri. Hanya Admin yang diizinkan.');
      }
    }
  }, [user, profile, navigate, signOut]);

  // Deteksi autofill dari browser setelah mount
  useEffect(() => {
    const checkAutofill = () => {
      if (!formRef.current) return;
      const emailInput = formRef.current.querySelector('#login-email');
      const passwordInput = formRef.current.querySelector('#login-password');
      
      if (emailInput && emailInput.value && !email) {
        setEmail(emailInput.value);
      }
      if (passwordInput && passwordInput.value && !password) {
        setPassword(passwordInput.value);
      }
    };

    const timers = [
      setTimeout(checkAutofill, 100),
      setTimeout(checkAutofill, 500),
      setTimeout(checkAutofill, 1000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Cooldown timer for forgot password (1 minute = 60 seconds)
  const startCooldown = () => {
    setResetCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResetCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Masukkan email admin Anda.');
      return;
    }
    if (resetCooldown > 0) {
      toast.error(`Tunggu ${resetCooldown} detik sebelum mengirim ulang.`);
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Link reset password telah dikirim ke email Anda!');
      startCooldown();
    } catch (error) {
      console.error('Reset password error:', error);
      // Jangan ungkap apakah email terdaftar atau tidak (keamanan)
      toast.success('Jika email terdaftar, link reset akan dikirim.');
      startCooldown();
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ambil value langsung dari DOM sebagai fallback jika state belum ter-update (autofill)
    let submitEmail = email;
    let submitPassword = password;
    
    if (formRef.current) {
      const emailInput = formRef.current.querySelector('#login-email');
      const passwordInput = formRef.current.querySelector('#login-password');
      if (emailInput?.value) submitEmail = emailInput.value;
      if (passwordInput?.value) submitPassword = passwordInput.value;
    }

    if (!submitEmail || !submitPassword) {
      toast.error('Masukkan email dan password.');
      return;
    }

    setLoading(true);

    try {
      const { profile } = await signIn(submitEmail, submitPassword);

      if (profile?.role !== 'admin') {
        toast.error('Hanya admin yang dapat login!');
        await signOut();
        setLoading(false);
        return;
      }

      toast.success('Berhasil masuk sebagai Admin!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      const msg = error.message || '';
      if (msg.includes('Invalid login credentials')) {
        toast.error('Email atau password salah.');
      } else if (msg.includes('Network') || msg.includes('fetch')) {
        toast.error('Gagal terhubung ke server. Periksa koneksi internet.');
      } else {
        toast.error(msg || 'Gagal masuk. Periksa email dan password.');
      }
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

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-xl transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.8)',
          border: '1px solid var(--border-color)',
          backdropFilter: 'blur(12px)',
        }}
        title={isDark ? 'Beralih ke Mode Siang' : 'Beralih ke Mode Malam'}
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-red-600 shadow-amber-500/30 rounded-2xl shadow-2xl mb-4 transition-all duration-500 overflow-hidden">
            <img 
              src={logoGambar} 
              alt="Logo NoteSampah" 
              className="w-full h-full object-cover" 
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 theme-text-primary">Login Admin</h1>
          <p className="text-sm sm:text-base theme-text-muted">NoteSampah - Panel Manajemen</p>
        </div>

        {/* Login / Forgot Password Card */}
        <div className="glass-card p-6 sm:p-8">
          {showForgotPassword ? (
            /* ====== FORGOT PASSWORD FORM ====== */
            <div className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold theme-text-primary">Lupa Kata Sandi</h2>
                <p className="text-sm theme-text-muted mt-1">
                  Masukkan email admin untuk menerima link reset password
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="input-label">Email Admin</label>
                  <div className="relative">
                    <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
                    <input
                      id="reset-email"
                      name="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@email.com"
                      className="input-field pl-12"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading || resetCooldown > 0}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : resetCooldown > 0 ? (
                    <span>Kirim Ulang ({resetCooldown}s)</span>
                  ) : (
                    'Kirim Link Reset'
                  )}
                </button>
              </form>

              {resetCooldown > 0 && (
                <div className="text-center">
                  <p className="text-xs theme-text-faint">
                    ⏳ Tunggu {resetCooldown} detik sebelum mengirim ulang
                  </p>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(resetCooldown / 60) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={() => { setShowForgotPassword(false); setResetEmail(''); }}
                  className="text-sm text-primary-500 dark:text-primary-400 hover:text-primary-400 dark:hover:text-primary-300 transition-colors"
                >
                  ← Kembali ke Login
                </button>
              </div>
            </div>
          ) : (
            /* ====== LOGIN FORM ====== */
            <>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="input-label">Email</label>
                  <div className="relative">
                    <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
                    <div>
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onInput={(e) => setEmail(e.target.value)}
                        placeholder="admin@email.com"
                        className="input-field pl-12"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="input-label">Password</label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-faint)' }} />
                    <div>
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onInput={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password admin"
                        className="input-field pl-12 pr-12"
                        autoComplete="current-password"
                        required
                      />
                    </div>
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

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setResetEmail(email); }}
                    className="text-sm text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                  >
                    Lupa kata sandi?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 shadow-lg shadow-amber-500/25"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    'Masuk Admin'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs theme-text-faint">
                  Halaman ini khusus untuk Admin NoteSampah
                </p>
                <p className="text-sm mt-4">
                  <button onClick={() => navigate('/dashboard')} className="text-primary-500 dark:text-primary-400 hover:text-primary-400 dark:hover:text-primary-300 transition-colors">
                    Kembali ke Halaman Public
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
