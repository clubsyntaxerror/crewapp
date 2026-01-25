import { STRINGS } from '@/constants/strings';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Allowed Discord roles for task management with their display colors
export const ROLE_CONFIG = {
  crew: { color: '#ff9f0a' },      // Orange
  volunteer: { color: '#ffd60a' }, // Yellow
} as const;

const ALLOWED_ROLES = Object.keys(ROLE_CONFIG);

interface DiscordUserMetadata {
  avatar?: string;
  custom_claims?: {
    global_name?: string;
  };
  full_name?: string;
  name?: string;
  picture?: string;
  provider_id?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  loadingMessage: string | null;
  hasRequiredRole: boolean;
  userRoles: string[];
  discordUsername: string | null;
  discordAvatar: string | null;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  loadingMessage: null,
  hasRequiredRole: false,
  userRoles: [],
  discordUsername: null,
  discordAvatar: null,
  signInWithDiscord: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(STRINGS.LOADING.AUTHENTICATING);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  // Fetch with timeout helper
  const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeoutMs: number = 10000
  ): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Fetch user's Discord roles from Supabase Edge Function
  const fetchUserRoles = async (userId: string, retries: number = 2): Promise<string[]> => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession?.access_token) {
      console.error('No access token available');
      return [];
    }

    const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-discord-roles`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(
          functionUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentSession.access_token}`,
              'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ userId }),
          },
          10000 // 10 second timeout
        );

        const responseData = await response.json();

        if (!response.ok) {
          console.error('Error fetching Discord roles:', responseData);
          // Don't retry on auth errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return [];
          }
          throw new Error(`Server error: ${response.status}`);
        }

        return responseData?.roles || [];
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isAborted = error instanceof Error && error.name === 'AbortError';

        console.error(
          `Error fetching Discord roles (attempt ${attempt + 1}/${retries + 1}):`,
          isAborted ? 'Request timed out' : errorMessage
        );

        if (isLastAttempt) {
          console.warn('All retries exhausted, continuing without roles');
          return [];
        }

        // Wait before retrying (exponential backoff: 1s, 2s)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    return [];
  };

  // Check if user has any of the required roles
  const checkRequiredRole = (roles: string[]) => {
    const normalizedRoles = roles.map(role => role.toLowerCase());
    return ALLOWED_ROLES.some(allowedRole =>
      normalizedRoles.includes(allowedRole.toLowerCase())
    );
  };

  useEffect(() => {
    setLoadingMessage(STRINGS.LOADING.AUTHENTICATING);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoadingMessage(STRINGS.LOADING.FETCHING_ROLES);
        fetchUserRoles(session.user.id).then(roles => {
          setUserRoles(roles);
          setHasRequiredRole(checkRequiredRole(roles));
          setLoadingMessage(null);
          setLoading(false);
        });
      } else {
        setLoadingMessage(null);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Error getting initial session:', err);
      setLoadingMessage(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setLoadingMessage(STRINGS.LOADING.FETCHING_ROLES);
          const roles = await fetchUserRoles(session.user.id);
          setUserRoles(roles);
          setHasRequiredRole(checkRequiredRole(roles));
        } else {
          setUserRoles([]);
          setHasRequiredRole(false);
        }

        setLoadingMessage(null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithDiscord = async () => {
    const redirectUrl = Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: redirectUrl,
        scopes: 'identify email guilds.members.read',
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) {
      console.error('Error signing in with Discord:', error);

      if (error.message?.includes('chrome-extension') || error.message?.includes('Unauthorized request')) {
        throw new Error(
          'Browser extension blocking OAuth. Please:\n' +
          '1. Open in incognito/private mode, OR\n' +
          '2. Disable browser extensions, OR\n' +
          '3. Test on a mobile device/emulator'
        );
      }

      throw error;
    }

    // For mobile, open the OAuth URL in a browser
    if (Platform.OS !== 'web' && data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        // Parse tokens from URL hash fragment (e.g., #access_token=...&refresh_token=...)
        const url = result.url;
        const hashParams = new URLSearchParams(url.split('#')[1] || '');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        console.log('OAuth result URL:', url);
        console.log('Access token found:', !!accessToken);
        console.log('Refresh token found:', !!refreshToken);

        if (accessToken && refreshToken) {
          // Set loading to true while we establish the session
          setLoading(true);
          setLoadingMessage(STRINGS.LOADING.AUTHENTICATING);

          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setLoading(false);
            setLoadingMessage(null);
            console.error('Error setting session:', sessionError);
            throw sessionError;
          }

          // Manually handle the session instead of relying on onAuthStateChange
          // This fixes Android first-launch issue where the listener doesn't fire
          if (sessionData?.session?.user) {
            setSession(sessionData.session);
            setUser(sessionData.session.user);
            setLoadingMessage(STRINGS.LOADING.FETCHING_ROLES);

            try {
              const roles = await fetchUserRoles(sessionData.session.user.id);
              setUserRoles(roles);
              setHasRequiredRole(checkRequiredRole(roles));
            } catch (roleError) {
              console.error('Error fetching roles after login:', roleError);
              // Continue without roles rather than blocking
              setUserRoles([]);
              setHasRequiredRole(false);
            }

            setLoadingMessage(null);
            setLoading(false);
          } else {
            console.error('No session data returned after setSession');
            setLoading(false);
            setLoadingMessage(null);
            throw new Error('Failed to establish session');
          }

          return;
        } else {
          console.error('No tokens found in callback URL:', url);
          throw new Error('No authentication tokens received');
        }
      } else if (result.type === 'cancel') {
        throw new Error('Authentication cancelled');
      } else {
        throw new Error('Authentication failed');
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Extract Discord username and avatar from user metadata
  const discordMetadata = user?.user_metadata as DiscordUserMetadata | undefined;
  const discordUsername =
    discordMetadata?.custom_claims?.global_name ||
    discordMetadata?.full_name ||
    discordMetadata?.name ||
    user?.email?.split('@')[0] ||
    null;

  const discordAvatar = discordMetadata?.avatar
    ? `https://cdn.discordapp.com/avatars/${discordMetadata.provider_id}/${discordMetadata.avatar}.png`
    : discordMetadata?.picture || null;

  const value: AuthContextType = {
    session,
    user,
    loading,
    loadingMessage,
    hasRequiredRole,
    userRoles,
    discordUsername,
    discordAvatar,
    signInWithDiscord,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
