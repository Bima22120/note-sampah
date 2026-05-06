import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import toast from 'react-hot-toast';
import logoGambar from '../src/oasesongo.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

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
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Optimized background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-900/20 via-dark-950 to-dark-950" />

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Login Admin</h1>
          <p className="text-dark-400 text-sm sm:text-base">NoteSampah - Panel Manajemen</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-6 sm:p-8">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="input-label">Email</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
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
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
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
            <p className="text-dark-500 text-xs">
              Halaman ini khusus untuk Admin NoteSampah
            </p>
            <p className="text-dark-400 text-sm mt-4">
              <button onClick={() => navigate('/dashboard')} className="text-primary-400 hover:text-primary-300 transition-colors">
                Kembali ke Halaman Public
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
