import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Allowed Discord roles for task management
const ALLOWED_ROLES = ['crew', 'volunteer', 'admin', 'alumni'];

interface DiscordUserMetadata {
  avatar?: string;
  custom_claims?: {
    global_name?: string;
  };
  email?: string;
  email_verified?: boolean;
  full_name?: string;
  iss?: string;
  name?: string;
  picture?: string;
  provider_id?: string;
  sub?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  // Fetch user's Discord roles from Supabase Edge Function
  const fetchUserRoles = async (userId: string) => {
    try {
      // Get the current session to ensure we have a valid token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('Current session exists:', !!currentSession);
      console.log('Access token exists:', !!currentSession?.access_token);

      if (!currentSession?.access_token) {
        console.error('No access token available');
        return [];
      }

      // Explicitly pass the Authorization header
      const { data, error } = await supabase.functions.invoke('get-discord-roles', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching Discord roles:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }

      console.log('Discord roles fetched successfully:', data);
      return data?.roles || [];
    } catch (error) {
      console.error('Error fetching Discord roles:', error);
      return [];
    }
  };

  // Check if user has any of the required roles
  const checkRequiredRole = (roles: string[]) => {
    const normalizedRoles = roles.map(role => role.toLowerCase());
    return ALLOWED_ROLES.some(allowedRole =>
      normalizedRoles.includes(allowedRole.toLowerCase())
    );
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch roles when user is authenticated
        fetchUserRoles(session.user.id).then(roles => {
          setUserRoles(roles);
          setHasRequiredRole(checkRequiredRole(roles));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch roles when user signs in
          const roles = await fetchUserRoles(session.user.id);
          setUserRoles(roles);
          setHasRequiredRole(checkRequiredRole(roles));
        } else {
          setUserRoles([]);
          setHasRequiredRole(false);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithDiscord = async () => {
    // Create the redirect URL - this is where Supabase will redirect after OAuth
    const redirectUrl = Linking.createURL('/');
    console.log('Redirect URL:', redirectUrl);

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

      // Check for Chrome extension interference
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

    console.log('OAuth URL:', data?.url);

    // For mobile, open the OAuth URL in a browser
    if (Platform.OS !== 'web' && data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log('WebBrowser result:', result);

      if (result.type === 'success') {
        const { url } = result;
        console.log('Callback URL:', url);

        // The URL contains the session tokens from Supabase
        // We need to extract them and set the session
        const urlParams = new URL(url);
        const accessToken = urlParams.searchParams.get('access_token');
        const refreshToken = urlParams.searchParams.get('refresh_token');

        console.log('Access token found:', !!accessToken);
        console.log('Refresh token found:', !!refreshToken);

        if (accessToken && refreshToken) {
          // Set the session using the tokens from the callback
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            throw sessionError;
          }

          console.log('Session set successfully');
        } else {
          console.error('No tokens found in callback URL');
          throw new Error('No authentication tokens received');
        }
      } else if (result.type === 'cancel') {
        throw new Error('Authentication cancelled');
      } else {
        console.error('Unexpected result type:', result.type);
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
    hasRequiredRole,
    userRoles,
    discordUsername,
    discordAvatar,
    signInWithDiscord,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
