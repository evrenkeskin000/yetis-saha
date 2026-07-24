import type { UserRole } from '@saha/shared';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { KVKK_CONSENT_VERSION } from '../constants/kvkk';
import { supabase } from './supabase';

interface AuthContextType {
  session: Session | null;
  user: SupabaseAuthUser | null;
  userRole: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  kvkkConsented: boolean;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveKvkkConsent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseAuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [kvkkConsented, setKvkkConsented] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  async function handleUserSession(currentSession: Session | null) {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      setUserRole(null);
      setUserName(null);
      setUserEmail(null);
      setKvkkConsented(false);
      setLoading(false);
      return;
    }

    setSession(currentSession);
    setUser(currentSession.user);
    setUserEmail(currentSession.user.email ?? null);

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.warn('Profil sorgulanırken hata:', error.message);
      }

      const role: UserRole =
        profile?.role ??
        (currentSession.user.user_metadata?.role as UserRole) ??
        'field_rep';

      if (role !== 'field_rep') {
        Alert.alert(
          'Erişim Engellendi',
          'Bu uygulama yalnızca saha temsilcileri içindir.'
        );
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setUserEmail(null);
        setKvkkConsented(false);
        setLoading(false);
        return;
      }

      setUserRole(role);
      setUserName(
        profile?.full_name ??
          (currentSession.user.user_metadata?.full_name as string) ??
          currentSession.user.email ??
          'Saha Temsilcisi'
      );

      const isConsented = !!(
        profile?.kvkk_consent_at &&
        profile?.kvkk_consent_version === KVKK_CONSENT_VERSION
      );
      setKvkkConsented(isConsented);
    } catch (err) {
      console.warn('Profil yüklenirken beklenmeyen hata:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleUserSession(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      handleUserSession(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, pass: string) {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      setLoading(false);
      let turkishMessage = 'Giriş yapılırken bir hata oluştu.';
      const msg = error.message.toLowerCase();

      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        turkishMessage = 'E-posta veya şifre hatalı.';
      } else if (
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('failed to fetch') ||
        msg.includes('connection')
      ) {
        turkishMessage = 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
      } else {
        turkishMessage = `Giriş başarısız: ${error.message}`;
      }

      throw new Error(turkishMessage);
    }

    if (data.session) {
      await handleUserSession(data.session);
    }
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUserName(null);
    setUserEmail(null);
    setKvkkConsented(false);
    setLoading(false);
  }

  async function saveKvkkConsent() {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('users')
      .update({
        kvkk_consent_at: nowIso,
        kvkk_consent_version: KVKK_CONSENT_VERSION,
      })
      .eq('id', user.id);

    if (error) {
      throw new Error(`KVKK onayı kaydedilemedi: ${error.message}`);
    }

    setKvkkConsented(true);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        userName,
        userEmail,
        kvkkConsented,
        loading,
        signIn,
        signOut,
        saveKvkkConsent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth bir AuthProvider içerisinde kullanılmalıdır.');
  }
  return context;
}
