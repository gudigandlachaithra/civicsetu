import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, OfficialSeed } from '@/types';

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_PASSWORD = 'CivicSetu_123456';
const phoneToEmail = (phone: string) => `${phone}@civicsetu.app`;
const emailToPhone = (email: string) => email.replace('@civicsetu.app', '');

function makeFallbackProfile(userId: string, phone: string, role: 'citizen' | 'official', department: string | null): Profile {
  return {
    id: userId,
    phone,
    role,
    citizen_type: null,
    department,
    is_onboarded: role === 'official',
    name: null,
    age: null,
    gender: null,
    state: null,
    district: null,
    preferred_language: 'en',
    education_level: null,
    course: null,
    year_of_study: null,
    institution_type: null,
    last_exam_percentage: null,
    annual_family_income: null,
    land_acres: null,
    ownership_type: null,
    crop_type: null,
    annual_income: null,
    category: null,
    occupation: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const signInInProgress = useRef(false);

  const loadProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return null;
    }

    const typed = data as Profile | null;
    if (typed) {
      setProfile(typed);
    }
    return typed;
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  // On mount: restore session if one exists
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          const email = session.user.email || '';
          setUser({ id: session.user.id, email });
          loadProfile(session.user.id).then((loaded) => {
            if (!mounted) return;
            // If no profile row exists, create a fallback so the app doesn't get stuck
            if (!loaded) {
              const phone = emailToPhone(email);
              setProfile(makeFallbackProfile(session.user.id, phone, 'citizen', null));
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const email = session.user.email || '';
        setUser({ id: session.user.id, email });

        // If signIn is handling profile creation, don't race with it
        if (signInInProgress.current) return;

        loadProfile(session.user.id).then((loaded) => {
          if (!mounted) return;
          if (!loaded) {
            const phone = emailToPhone(email);
            setProfile(makeFallbackProfile(session.user.id, phone, 'citizen', null));
          }
          setLoading(false);
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (phone: string): Promise<{ error: string | null }> => {
    const email = phoneToEmail(phone);
    signInInProgress.current = true;

    try {
      // Try existing user first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: DEMO_PASSWORD,
      });

      if (!signInError) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          const loaded = await loadProfile(session.user.id);
          if (!loaded) {
            // Profile row missing — create it now
            await supabase.from('profiles').insert({
              id: session.user.id,
              phone,
              role: 'citizen',
              is_onboarded: false,
            });
            const reloaded = await loadProfile(session.user.id);
            if (!reloaded) {
              setProfile(makeFallbackProfile(session.user.id, phone, 'citizen', null));
            }
          }
          setLoading(false);
        }
        return { error: null };
      }

      // New user — sign up
      if (
        signInError.message.includes('Invalid login credentials') ||
        signInError.message.includes('not confirmed')
      ) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: DEMO_PASSWORD,
        });

        if (signUpError) {
          return { error: signUpError.message };
        }

        const userId = signUpData.user?.id;
        if (!userId) {
          return { error: 'Signup failed — no user returned' };
        }

        // Check if this phone belongs to an official
        const { data: officialSeed } = await supabase
          .from('official_seeds')
          .select('*')
          .eq('phone', phone)
          .maybeSingle();

        const officialSeedTyped = officialSeed as unknown as OfficialSeed | null;

        const role = officialSeedTyped ? 'official' : 'citizen';
        const department = officialSeedTyped?.department || null;

        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          phone,
          role,
          department,
          is_onboarded: !!officialSeedTyped,
        });

        if (profileError && !profileError.message.includes('duplicate')) {
          return { error: profileError.message };
        }

        setUser({ id: userId, email });
        const loaded = await loadProfile(userId);
        if (!loaded) {
          setProfile(makeFallbackProfile(userId, phone, role as 'citizen' | 'official', department));
        }
        setLoading(false);
        return { error: null };
      }

      return { error: signInError.message };
    } finally {
      signInInProgress.current = false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
