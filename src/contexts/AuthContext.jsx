import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

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

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      // Safety timer: paksa loading selesai setelah 8 detik
      const safetyTimer = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('Auth init safety timeout');
          setLoading(false);
        }
      }, 8000);

      try {
        // Ambil session - getSession() baca dari cache localStorage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          // Tidak ada session / error = user belum login, itu normal
          if (mountedRef.current) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          clearTimeout(safetyTimer);
          return;
        }

        // Validasi session dari server (cek apakah token masih berlaku)
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !validatedUser) {
          // Token expired/invalid - bersihkan dan redirect ke login
          console.warn('Token sudah tidak valid, membersihkan...');
          try { await supabase.auth.signOut(); } catch (_) {}
          if (mountedRef.current) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          clearTimeout(safetyTimer);
          return;
        }

        // Session valid!
        if (mountedRef.current) {
          setUser(validatedUser);
          await fetchProfile(validatedUser.id);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } finally {
        clearTimeout(safetyTimer);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        if (event === 'INITIAL_SESSION') return; // Sudah ditangani initializeAuth

        console.log('Auth event:', event);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) setUser(session.user);
          return;
        }

        // SIGNED_IN, USER_UPDATED, dll
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw error;

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
    // LANGKAH 1: Segera bersihkan state React supaya UI responsif
    setUser(null);
    setProfile(null);

    // LANGKAH 2: Sign out dari Supabase (scope: global = bersihkan server + local)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('signOut error (diabaikan):', error);
    }

    // LANGKAH 3: Bersihkan semua sisa token di localStorage sebagai safety net
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key === 'notesampah-auth')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      // Brave mungkin memblokir - abaikan
    }
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
