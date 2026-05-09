import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const [validating, setValidating] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  // ============================================================
  // SECURITY FIX: Validasi session secara server-side setiap kali
  // user mengakses halaman admin. Ini mencegah akses dari session
  // yang tersimpan di localStorage setelah admin logout.
  // ============================================================
  useEffect(() => {
    let mounted = true;

    const validateSession = async () => {
      if (loading) return; // tunggu auth loading selesai dulu

      if (!user) {
        if (mounted) {
          setSessionValid(false);
          setValidating(false);
        }
        return;
      }

      try {
        // Verifikasi session ke Supabase server (bukan dari cache/localStorage)
        const { data: { user: serverUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !serverUser) {
          console.warn('[ProtectedRoute] Session tidak valid di server, logout...');
          await signOut();
          if (mounted) {
            setSessionValid(false);
            setValidating(false);
          }
          return;
        }

        // Verifikasi role dari database (bukan dari cache)
        if (adminOnly) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', serverUser.id)
            .single();

          if (profileError || !profileData || profileData.role !== 'admin') {
            console.warn('[ProtectedRoute] User bukan admin, logout dan redirect...');
            await signOut();
            if (mounted) {
              setSessionValid(false);
              setValidating(false);
            }
            return;
          }
        }

        if (mounted) {
          setSessionValid(true);
          setValidating(false);
        }
      } catch (err) {
        console.error('[ProtectedRoute] Validasi error:', err);
        await signOut();
        if (mounted) {
          setSessionValid(false);
          setValidating(false);
        }
      }
    };

    validateSession();

    return () => { mounted = false; };
  }, [user, loading, adminOnly, signOut]);

  if (loading || validating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm theme-text-muted">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Jika tidak ada user ATAU session tidak valid, redirect ke login
  if (!user || !sessionValid) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
