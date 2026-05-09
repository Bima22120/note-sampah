import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const profileCacheRef = useRef({});
  const isRecoveryRef = useRef(false);

  // Fetch profile dengan cache untuk menghindari fetch berulang
  const fetchProfile = async (userId) => {
    if (!userId) return null;
    
    // Cek cache dulu
    if (profileCacheRef.current[userId]) {
      const cached = profileCacheRef.current[userId];
      if (mountedRef.current) setProfile(cached);
      return cached;
    }

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
          .insert({ id: userId, full_name: fullName, role: 'user' })
          .select()
          .single();

        if (insertError) {
          console.error('Gagal buat profile:', insertError);
          return null;
        }
        profileCacheRef.current[userId] = newProfile;
        if (mountedRef.current) setProfile(newProfile);
        return newProfile;
      }

      if (error) throw error;
      
      profileCacheRef.current[userId] = data;
      if (mountedRef.current) setProfile(data);
      return data;
    } catch (error) {
      console.error('Gagal fetch profile:', error);
      if (mountedRef.current) setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // Safety: jika setelah 10 detik loading masih true, paksa selesai
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('[Auth] Safety timeout - paksa loading selesai');
        setLoading(false);
      }
    }, 10000);

    // ============================================================
    // SATU-SATUNYA sumber kebenaran: onAuthStateChange
    // Ini adalah best practice resmi Supabase.
    // INITIAL_SESSION event otomatis membaca dari localStorage.
    // Tidak perlu manual getSession() atau getUser().
    // ============================================================
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;

        console.log('[Auth] Event:', event, '| User:', session?.user?.email || 'null');

        // Track jika ini adalah recovery session (reset password)
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[Auth] PASSWORD_RECOVERY detected - skip profile check');
          isRecoveryRef.current = true;
          if (session?.user) {
            setUser(session.user);
          }
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);

          // Jika ini recovery session, jangan fetch profile (tidak perlu)
          if (isRecoveryRef.current) {
            setLoading(false);
            return;
          }

          // PENTING: Gunakan setTimeout untuk fetch profile
          // Supabase menahan lock selama callback onAuthStateChange.
          // Jika kita panggil supabase.from() secara sinkron di sini,
          // bisa terjadi deadlock. setTimeout(0) mendefer ke microtask berikutnya.
          setTimeout(async () => {
            if (!mountedRef.current) return;
            await fetchProfile(session.user.id);
            if (mountedRef.current) setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          isRecoveryRef.current = false;
          setLoading(false);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;

    // Buat profile di tabel profiles
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, full_name: fullName, role: 'user' });
      if (profileError) console.error('Gagal buat profile:', profileError);
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
      profileCacheRef.current[data.user.id] = profileData;
      if (mountedRef.current) setProfile(profileData);
    }

    return { ...data, profile: userProfile };
  };

  // ============================================================
  // SECURITY FIX: signOut sekarang membersihkan semua token auth
  // dari localStorage secara agresif, termasuk semua key sb-*.
  // Ini mencegah session zombie yang bisa digunakan oleh orang
  // lain yang mengakses browser setelah admin logout.
  // ============================================================
  const signOut = useCallback(async () => {
    // Bersihkan cache
    profileCacheRef.current = {};

    // Sign out dari Supabase - ini akan trigger onAuthStateChange SIGNED_OUT
    // yang akan set user=null, profile=null, loading=false
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('signOut error:', error);
    }

    // SECURITY: Paksa bersihkan semua token auth dari localStorage
    // meskipun supabase.auth.signOut() berhasil, sebagai safety net
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key === 'notesampah-auth-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      // Abaikan jika localStorage tidak tersedia
    }

    // Paksa bersihkan state
    if (mountedRef.current) {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      isAdmin,
      fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
