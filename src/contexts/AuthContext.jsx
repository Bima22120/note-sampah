import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const signingOutRef = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile tidak ditemukan, buat otomatis
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const fullName = authUser?.user_metadata?.full_name || 'User';
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: fullName,
            role: 'user',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          if (mountedRef.current) setProfile(null);
          return null;
        }
        if (mountedRef.current) setProfile(newProfile);
        return newProfile;
      }

      if (error) throw error;
      if (mountedRef.current) setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (mountedRef.current) setProfile(null);
      return null;
    }
  }, []);

  // Fungsi untuk membersihkan semua token auth dari localStorage
  const clearAuthTokens = useCallback(() => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key === 'notesampah-auth') {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Gagal membersihkan token:', e);
    }
  }, []);

  // Fungsi untuk reset state ke kondisi logged out
  const resetAuthState = useCallback(() => {
    if (mountedRef.current) {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      // Safety timer: paksa loading selesai setelah 8 detik apa pun yang terjadi
      const safetyTimer = setTimeout(() => {
        if (mountedRef.current && !signingOutRef.current) {
          console.warn('Auth init safety timeout - forcing load complete');
          setLoading(false);
        }
      }, 8000);

      try {
        // Step 1: Ambil session dari cache localStorage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          clearAuthTokens();
          resetAuthState();
          clearTimeout(safetyTimer);
          return;
        }

        if (!session) {
          // Tidak ada session, user belum login
          if (mountedRef.current) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          clearTimeout(safetyTimer);
          return;
        }

        // Step 2: VALIDASI session dengan server (penting untuk Brave yang sering corrupt cache)
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !validatedUser) {
          // Session cache ada tapi sudah invalid/expired
          console.warn('Session invalid, clearing tokens...');
          clearAuthTokens();
          // Coba sign out secara resmi untuk bersihkan server-side juga
          try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
          resetAuthState();
          clearTimeout(safetyTimer);
          return;
        }

        // Session valid, set user dan fetch profile
        if (mountedRef.current) {
          setUser(validatedUser);
          await fetchProfile(validatedUser.id);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthTokens();
        resetAuthState();
      } finally {
        clearTimeout(safetyTimer);
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        // Skip INITIAL_SESSION karena sudah ditangani oleh initializeAuth
        if (event === 'INITIAL_SESSION') return;

        console.log('Auth event:', event);

        if (event === 'SIGNED_OUT') {
          // User keluar - bersihkan semua state
          resetAuthState();
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          // Token di-refresh berhasil, update user tapi jangan re-fetch profile
          if (session?.user) {
            setUser(session.user);
          }
          return;
        }

        if (event === 'SIGNED_IN') {
          // User baru login
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
          return;
        }

        // Event lainnya (USER_UPDATED, etc)
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearAuthTokens, resetAuthState]);

  const signUp = async (email, password, fullName) => {
    // 1. Daftarkan user di Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw error;

    // 2. Buat profile di tabel profiles (tidak pakai trigger)
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          role: 'user',
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Jangan throw error di sini agar user tetap terdaftar
        // Profile bisa dibuat ulang nanti jika gagal
      }
    }

    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Fetch profile untuk cek role
    let userProfile = null;
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      userProfile = profileData;
      if (mountedRef.current) setProfile(profileData);
    }

    return { ...data, profile: userProfile };
  };

  const signOut = async () => {
    // Tandai sedang sign out supaya safety timer tidak mengganggu
    signingOutRef.current = true;

    // LANGKAH 1: Segera bersihkan state React (ini yang membuat UI langsung responsif)
    setUser(null);
    setProfile(null);

    // LANGKAH 2: Bersihkan localStorage (critical untuk Brave)
    clearAuthTokens();

    // LANGKAH 3: Beritahu Supabase server (dengan timeout agar tidak hang)
    try {
      const signOutPromise = supabase.auth.signOut({ scope: 'local' });
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error dari Supabase saat sign out:', error);
      // Tidak masalah jika gagal - state lokal sudah dibersihkan
    }

    signingOutRef.current = false;
  };

  const isAdmin = profile?.role === 'admin';

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
