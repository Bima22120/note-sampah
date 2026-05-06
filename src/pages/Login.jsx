import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineShieldCheck, HiOutlineUser } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('user'); // 'user' or 'admin'
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  // Redirect ke dashboard jika sudah login
  useEffect(() => {
    if (user && profile) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, profile, navigate]);

  // Deteksi autofill dari browser setelah mount
  // Browser Brave / Chrome sering mengisi field sebelum React state ter-update
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

    // Cek beberapa kali karena autofill bisa terjadi dengan delay
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

    // Timeout 10 detik untuk mencegah loading terus-menerus
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Koneksi timeout (terlalu lama). Silakan muat ulang halaman.')), 10000)
    );

    try {
      const { profile } = await Promise.race([
        signIn(submitEmail, submitPassword),
        timeoutPromise
      ]);

      // Cek role sesuai mode login
      if (loginMode === 'admin' && profile?.role !== 'admin') {
        toast.error('Akun ini bukan akun Admin!');
        setLoading(false);
        return;
      }

      if (loginMode === 'user' && profile?.role === 'admin') {
        toast.error('Akun Admin tidak bisa login di mode User. Gunakan tab Admin.');
        setLoading(false);
        return;
      }

      toast.success(`Berhasil masuk sebagai ${loginMode === 'admin' ? 'Admin' : 'User'}!`);
      navigate('/dashboard');
    } catch (error) {
      if (error.message && error.message.includes('timeout')) {
        // Hapus token yang nyangkut di localStorage jika terjadi timeout saat login
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key === 'notesampah-auth') {
              localStorage.removeItem(key);
            }
          });
        } catch (_) {}
        toast.error('Sesi sebelumnya nyangkut. Sistem telah dibersihkan, silakan klik Masuk sekali lagi.');
      } else {
        toast.error(error.message || 'Gagal masuk. Periksa email dan password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden px-4">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${loginMode === 'admin' ? 'bg-amber-500/10' : 'bg-primary-500/10'} rounded-full blur-3xl animate-pulse-slow transition-colors duration-700`} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 ${loginMode === 'admin' ? 'bg-red-500/10' : 'bg-accent-500/10'} rounded-full blur-3xl animate-pulse-slow transition-colors duration-700`} style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${loginMode === 'admin' ? 'bg-gradient-to-br from-amber-400 to-red-600 shadow-amber-500/30' : 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-primary-500/30'} rounded-2xl shadow-2xl mb-4 transition-all duration-500`}>
            <span className="text-3xl">{loginMode === 'admin' ? '🛡️' : '♻'}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NoteSampah</h1>
          <p className="text-dark-400">Sistem Pengelolaan & Pembukuan Sampah</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          {/* Role Tabs */}
          <div className="flex mb-6 bg-dark-800/80 rounded-xl p-1 border border-dark-700/50">
            <button
              type="button"
              onClick={() => setLoginMode('user')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                loginMode === 'user'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <HiOutlineUser className="w-5 h-5" />
              User
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                loginMode === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <HiOutlineShieldCheck className="w-5 h-5" />
              Admin
            </button>
          </div>

          <h2 className="text-xl font-semibold text-white mb-6">
            {loginMode === 'admin' ? 'Masuk sebagai Admin' : 'Masuk ke Akun'}
          </h2>

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
                    placeholder="nama@email.com"
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
                    placeholder="Masukkan password"
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
              className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 ${
                loginMode === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 shadow-lg shadow-amber-500/25'
                  : 'btn-primary'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                loginMode === 'admin' ? '🛡️ Masuk Admin' : 'Masuk'
              )}
            </button>
          </form>

          {loginMode === 'user' && (
            <div className="mt-6 text-center">
              <p className="text-dark-400 text-sm">
                Belum punya akun?{' '}
                <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          )}

          {loginMode === 'admin' && (
            <div className="mt-6 text-center">
              <p className="text-dark-500 text-xs">
                🔒 Hanya akun dengan role Admin yang dapat mengakses
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
