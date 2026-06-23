import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const AuthContext = createContext(null);

async function applySessionToSupabase(session) {
  if (!session?.access_token) return;
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const managedLoginRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setProfile(data.profile);
      return data.profile;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        if (!managedLoginRef.current) {
          fetchProfile();
        }
        managedLoginRef.current = false;
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const finishLogin = async (data) => {
    setProfile(data.profile);
    setUser(data.user);
    managedLoginRef.current = true;
    await applySessionToSupabase(data.session);
    return data;
  };

  const login = async (email, password, role) => {
    try {
      const { data } = await api.post('/auth/login', { email, password, role });
      return finishLogin(data);
    } catch (apiErr) {
      const { data: signIn, error: sbErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (sbErr) {
        throw new Error(sbErr.message || apiErr.message || 'Login failed');
      }
      if (!signIn?.session) {
        throw new Error('Sign-in succeeded but no session was returned.');
      }

      await applySessionToSupabase(signIn.session);

      let profileRow = null;
      try {
        const { data: prof } = await api.get('/auth/profile');
        profileRow = prof.profile;
      } catch {
        const { data: boot } = await api.post('/auth/ensure-profile', {
          role: role || 'BUYER',
        });
        profileRow = boot.profile;
      }

      return finishLogin({
        user: signIn.user,
        session: signIn.session,
        profile: profileRow,
      });
    }
  };

  const register = async (email, password, name, phone, role) => {
    const { data } = await api.post('/auth/register', { email, password, name, phone, role });

    if (data.session) {
      setProfile(data.profile);
      setUser(data.user);
      managedLoginRef.current = true;
      await applySessionToSupabase(data.session);
    }

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
