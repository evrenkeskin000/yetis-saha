import type { UserRole } from '@saha/shared';
import { changePasswordSchema } from '@saha/shared';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { KVKK_CONSENT_VERSION } from '../constants/kvkk';
import { clearUserLocalData } from './localDataHygiene';
import { supabase } from './supabase';
import { ensureFreshSession } from './session';

interface AuthContextType {
  session: Session | null;
  user: SupabaseAuthUser | null;
  userRole: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  dealershipId: string | null;
  dealershipName: string | null;
  /** Bayi değişiminde artar; liste ekranları yeniden çeker. */
  dealershipEpoch: number;
  kvkkConsented: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveKvkkConsent: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseAuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dealershipId, setDealershipId] = useState<string | null>(null);
  const [dealershipName, setDealershipName] = useState<string | null>(null);
  const [dealershipEpoch, setDealershipEpoch] = useState(0);
  const [kvkkConsented, setKvkkConsented] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const prevDealershipIdRef = useRef<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);
  /** Eski/yarışan profil yüklemelerini yok saymak için. */
  const loadSeqRef = useRef(0);
  /** signIn kendi profil yüklemesini yaparken onAuthStateChange çakışmasın. */
  const signingInRef = useRef(false);

  function resetProfileState(loadingFlag = false) {
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUserName(null);
    setUserEmail(null);
    setDealershipId(null);
    setDealershipName(null);
    setKvkkConsented(false);
    setMustChangePassword(false);
    setLoading(loadingFlag);
  }

  async function rejectSession(
    message: string,
    opts?: { seq?: number; silent?: boolean }
  ) {
    const seq = opts?.seq;
    if (seq !== undefined && seq !== loadSeqRef.current) return;
    console.warn('[Auth] Oturum reddedildi:', message);
    const uid = prevUserIdRef.current;
    if (!opts?.silent) {
      Alert.alert('Erişim Engellendi', message);
    }
    await supabase.auth.signOut();
    await clearUserLocalData(uid);
    prevUserIdRef.current = null;
    prevDealershipIdRef.current = null;
    if (seq === undefined || seq === loadSeqRef.current) {
      resetProfileState();
    }
  }

  /**
   * @returns null oturum yoksa; aksi halde { ok, message? }
   */
  async function handleUserSession(
    currentSession: Session | null,
    opts?: { silentReject?: boolean }
  ): Promise<{ ok: boolean; message?: string } | null> {
    const seq = ++loadSeqRef.current;
    console.log('[Auth] handleUserSession', {
      seq,
      hasSession: !!currentSession,
      email: currentSession?.user?.email ?? null,
      silentReject: opts?.silentReject ?? false,
    });

    if (!currentSession?.user) {
      if (seq === loadSeqRef.current) resetProfileState();
      return null;
    }

    const userId = currentSession.user.id;

    if (prevUserIdRef.current && prevUserIdRef.current !== userId) {
      await clearUserLocalData(prevUserIdRef.current);
      if (seq === loadSeqRef.current) {
        setDealershipEpoch((e) => e + 1);
      }
    }

    if (seq === loadSeqRef.current) {
      setSession(currentSession);
      setUser(currentSession.user);
      setUserEmail(currentSession.user.email ?? null);
    }

    const fail = async (message: string) => {
      if (seq !== loadSeqRef.current) return { ok: false, message };
      await rejectSession(message, {
        seq,
        silent: opts?.silentReject,
      });
      return { ok: false, message };
    };

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select(
          'role, full_name, is_active, must_change_password, dealership_id, kvkk_consent_at, kvkk_consent_version'
        )
        .eq('id', userId)
        .maybeSingle();

      if (seq !== loadSeqRef.current) return { ok: false };

      if (error || !profile) {
        console.warn('[Auth] Profil sorgusu başarısız:', error?.message, error);
        return fail(
          `Kullanıcı profili yüklenemedi${error?.message ? `: ${error.message}` : ''}.`
        );
      }

      console.log('[Auth] Profil yüklendi:', {
        email: currentSession.user.email,
        role: profile.role,
        is_active: profile.is_active,
        must_change_password: profile.must_change_password,
        dealership_id: profile.dealership_id,
      });

      if (!profile.is_active) {
        return fail('Hesabınız pasif durumda. Bayi yöneticinizle görüşün.');
      }

      if (profile.role !== 'field_rep') {
        return fail('Bu uygulama yalnızca saha temsilcileri içindir.');
      }

      if (!profile.dealership_id) {
        return fail('Bayi bilginiz eksik. Lütfen bayi yöneticinizle görüşün.');
      }

      // Bayi adı için ayrı sorgu; gelmezse girişi engelleme (RLS/yarış).
      // Pasif bayi kontrolü security definer RPC ile.
      let dealershipNameValue: string | null = null;
      const { data: dealershipRow, error: dealerErr } = await supabase
        .from('dealerships')
        .select('name, is_active')
        .eq('id', profile.dealership_id)
        .maybeSingle();

      if (seq !== loadSeqRef.current) return { ok: false };

      if (dealerErr) {
        console.warn('[Auth] Bayi sorgusu hatası:', dealerErr.message);
      }

      if (dealershipRow) {
        dealershipNameValue = dealershipRow.name ?? null;
        if (dealershipRow.is_active !== true) {
          return fail('Hesabınız pasif durumda. Bayi yöneticinizle görüşün.');
        }
      } else {
        const { data: accountActive, error: activeErr } = await supabase.rpc(
          'auth_user_is_active'
        );
        if (activeErr) {
          console.warn('[Auth] auth_user_is_active hatası:', activeErr.message);
        } else if (accountActive === false) {
          return fail('Hesabınız pasif durumda. Bayi yöneticinizle görüşün.');
        } else {
          console.warn(
            '[Auth] Bayi satırı okunamadı; dealership_id ile devam ediliyor.'
          );
        }
      }

      const nextDealershipId = profile.dealership_id as string;
      if (
        prevDealershipIdRef.current &&
        prevDealershipIdRef.current !== nextDealershipId
      ) {
        setDealershipEpoch((e) => e + 1);
      }
      prevDealershipIdRef.current = nextDealershipId;
      prevUserIdRef.current = userId;

      setUserRole(profile.role);
      setUserName(
        profile.full_name ??
          (currentSession.user.user_metadata?.full_name as string) ??
          currentSession.user.email ??
          'Saha Temsilcisi'
      );
      setDealershipId(nextDealershipId);
      setDealershipName(dealershipNameValue);

      const isConsented = !!(
        profile.kvkk_consent_at &&
        profile.kvkk_consent_version === KVKK_CONSENT_VERSION
      );
      setKvkkConsented(isConsented);
      setMustChangePassword(!!profile.must_change_password);
      setLoading(false);
      return { ok: true };
    } catch (err) {
      console.warn('Profil yüklenirken beklenmeyen hata:', err);
      return fail('Kullanıcı profili yüklenemedi. Lütfen tekrar giriş yapın.');
    }
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      void handleUserSession(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      // Auth kilidi + signIn ile çift yüklemeyi önle
      setTimeout(() => {
        if (signingInRef.current) return;
        void handleUserSession(s);
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // React Native'de tarayıcı focus API'si yok; token yenilemeyi AppState ile yönet.
    // https://supabase.com/docs/reference/javascript/auth-startautorefresh
    void supabase.auth.startAutoRefresh();

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void supabase.auth.startAutoRefresh();
        void (async () => {
          const fresh = await ensureFreshSession(supabase);
          if (fresh) {
            void handleUserSession(fresh);
          }
        })();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      sub.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  async function signIn(email: string, pass: string) {
    console.log('[Auth] signIn başladı:', email.trim());
    setLoading(true);
    signingInRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      console.log('[Auth] signInWithPassword sonucu:', {
        hasSession: !!data?.session,
        error: error?.message ?? null,
      });

      if (error) {
        setLoading(false);
        let turkishMessage = 'Giriş yapılırken bir hata oluştu.';
        const msg = error.message.toLowerCase();

        if (
          msg.includes('invalid login credentials') ||
          msg.includes('invalid credentials')
        ) {
          turkishMessage = 'E-posta veya şifre hatalı.';
        } else if (
          msg.includes('network') ||
          msg.includes('fetch') ||
          msg.includes('failed to fetch') ||
          msg.includes('connection')
        ) {
          turkishMessage =
            'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
        } else {
          turkishMessage = `Giriş başarısız: ${error.message}`;
        }

        throw new Error(turkishMessage);
      }

      if (data.session) {
        const result = await handleUserSession(data.session, {
          silentReject: true,
        });
        console.log('[Auth] signIn profil sonucu:', result);
        if (result && !result.ok) {
          setLoading(false);
          throw new Error(
            result.message ?? 'Giriş sonrası profil doğrulanamadı.'
          );
        }
      } else {
        setLoading(false);
        throw new Error('Oturum oluşturulamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      signingInRef.current = false;
    }
  }

  async function signOut() {
    setLoading(true);
    const uid = user?.id ?? prevUserIdRef.current;
    await clearUserLocalData(uid);
    await supabase.auth.signOut();
    prevUserIdRef.current = null;
    prevDealershipIdRef.current = null;
    resetProfileState();
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

  async function changePassword(newPassword: string) {
    const parsed = changePasswordSchema.safeParse({ password: newPassword });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Geçersiz şifre.');
    }

    const { error: authErr } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (authErr) {
      throw new Error(`Şifre değiştirilemedi: ${authErr.message}`);
    }

    const { error: rpcErr } = await supabase.rpc('complete_password_change');

    if (rpcErr) {
      throw new Error(
        `Şifre güncellendi ancak zorunluluk kaldırılamadı: ${rpcErr.message}`
      );
    }

    setMustChangePassword(false);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        userName,
        userEmail,
        dealershipId,
        dealershipName,
        dealershipEpoch,
        kvkkConsented,
        mustChangePassword,
        loading,
        signIn,
        signOut,
        saveKvkkConsent,
        changePassword,
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
