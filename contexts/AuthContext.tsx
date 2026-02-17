import { STRINGS } from "@/constants/strings";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

// Allowed Discord roles for task management with their display colors
export const ROLE_CONFIG = {
  crew: { color: "#ff9f0a" }, // Orange
  volunteer: { color: "#ffd60a" }, // Yellow
  tester: { color: "#ff9f0a" }, // Same as crew
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

export interface LoadingStep {
  label: string;
  completed: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  loadingSteps: LoadingStep[];
  hasRequiredRole: boolean;
  userRoles: string[];
  discordUsername: string | null;
  discordAvatar: string | null;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  loadingSteps: [],
  hasRequiredRole: false,
  userRoles: [],
  discordUsername: null,
  discordAvatar: null,
  signInWithDiscord: async () => {},
  signOut: async () => {},
  deleteUserData: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { label: STRINGS.LOADING.AUTHENTICATING, completed: false },
  ]);

  const completeStep = (label: string) => {
    setLoadingSteps((prev) =>
      prev.map((s) => (s.label === label ? { ...s, completed: true } : s)),
    );
  };

  const addStep = (label: string) => {
    setLoadingSteps((prev) => {
      if (prev.some((s) => s.label === label)) return prev;
      return [...prev, { label, completed: false }];
    });
  };
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  // Promise-based timeout helper that works reliably on React Native
  const withTimeout = <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = "Request timed out",
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
      ),
    ]);
  };

  // Fetch user's Discord roles from Supabase Edge Function
  // accessToken can be passed directly to avoid getSession() race conditions on first launch
  const fetchUserRoles = async (
    userId: string,
    options: {
      retries?: number;
      accessToken?: string;
      onRetry?: (attempt: number, maxAttempts: number) => void;
    } = {},
  ): Promise<string[]> => {
    const { retries = 2, accessToken: providedToken, onRetry } = options;

    // Use provided token or fetch from session
    let accessToken = providedToken;
    if (!accessToken) {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      accessToken = currentSession?.access_token;
    }

    if (!accessToken) {
      console.error("No access token available");
      return [];
    }

    const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-discord-roles`;
    const maxAttempts = retries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Notify about retry attempt
        if (attempt > 0 && onRetry) {
          onRetry(attempt + 1, maxAttempts);
        }

        // Fetch with timeout - wraps both fetch AND json parsing
        const responseData = await withTimeout(
          (async () => {
            const response = await fetch(functionUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
              },
              body: JSON.stringify({ userId }),
            });

            const data = await response.json();

            if (!response.ok) {
              // Attach status to error for handling below
              const error = new Error(
                `Server error: ${response.status}`,
              ) as Error & { status: number };
              error.status = response.status;
              throw error;
            }

            return data;
          })(),
          10000, // 10 second timeout covers entire request + json parsing
          "Request timed out",
        );

        return responseData?.roles || [];
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts - 1;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const status = (error as Error & { status?: number }).status;

        console.error(
          `Error fetching Discord roles (attempt ${attempt + 1}/${maxAttempts}):`,
          errorMessage,
        );

        // Don't retry on auth errors (4xx)
        if (status && status >= 400 && status < 500) {
          console.warn("Auth error, not retrying");
          return [];
        }

        if (isLastAttempt) {
          console.warn("All retries exhausted, continuing without roles");
          return [];
        }

        // Wait before retrying (exponential backoff: 1s, 2s)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }

    return [];
  };

  // Check if user has any of the required roles
  const checkRequiredRole = (roles: string[]) => {
    const normalizedRoles = roles.map((role) => role.toLowerCase());
    return ALLOWED_ROLES.some((allowedRole) =>
      normalizedRoles.includes(allowedRole.toLowerCase()),
    );
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        completeStep(STRINGS.LOADING.AUTHENTICATING);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          addStep(STRINGS.LOADING.FETCHING_ROLES);
          fetchUserRoles(session.user.id, {
            accessToken: session.access_token,
            onRetry: (attempt, max) => {
              setLoadingSteps((prev) =>
                prev.map((s) =>
                  s.label.startsWith(STRINGS.LOADING.FETCHING_ROLES)
                    ? { ...s, label: STRINGS.LOADING.FETCHING_ROLES_RETRY(attempt, max) }
                    : s,
                ),
              );
            },
          }).then((roles) => {
            completeStep(STRINGS.LOADING.FETCHING_ROLES);
            // Also complete any retry label variant
            setLoadingSteps((prev) =>
              prev.map((s) =>
                s.label.startsWith(STRINGS.LOADING.FETCHING_ROLES)
                  ? { ...s, completed: true }
                  : s,
              ),
            );
            setUserRoles(roles);
            setHasRequiredRole(checkRequiredRole(roles));
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error getting initial session:", err);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        addStep(STRINGS.LOADING.FETCHING_ROLES);
        const roles = await fetchUserRoles(session.user.id, {
          accessToken: session.access_token,
          onRetry: (attempt, max) => {
            setLoadingSteps((prev) =>
              prev.map((s) =>
                s.label.startsWith(STRINGS.LOADING.FETCHING_ROLES)
                  ? { ...s, label: STRINGS.LOADING.FETCHING_ROLES_RETRY(attempt, max) }
                  : s,
              ),
            );
          },
        });
        setLoadingSteps((prev) =>
          prev.map((s) =>
            s.label.startsWith(STRINGS.LOADING.FETCHING_ROLES)
              ? { ...s, completed: true }
              : s,
          ),
        );
        setUserRoles(roles);
        setHasRequiredRole(checkRequiredRole(roles));
      } else {
        setUserRoles([]);
        setHasRequiredRole(false);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithDiscord = async () => {
    const redirectUrl = Linking.createURL("/");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: redirectUrl,
        scopes: "identify",
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });

    if (error) {
      console.error("Error signing in with Discord:", error);

      if (
        error.message?.includes("chrome-extension") ||
        error.message?.includes("Unauthorized request")
      ) {
        throw new Error(
          "Browser extension blocking OAuth. Please:\n" +
            "1. Open in incognito/private mode, OR\n" +
            "2. Disable browser extensions, OR\n" +
            "3. Test on a mobile device/emulator",
        );
      }

      throw error;
    }

    // For mobile, open the OAuth URL in a browser
    if (Platform.OS !== "web" && data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          // Keep browser in Android task switcher so users can switch to authenticator apps for 2FA
          showInRecents: Platform.OS === "android",
        },
      );

      if (result.type === "success") {
        // Parse tokens from URL hash fragment (e.g., #access_token=...&refresh_token=...)
        const url = result.url;
        const hashParams = new URLSearchParams(url.split("#")[1] || "");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        console.log("OAuth result URL:", url);
        console.log("Access token found:", !!accessToken);
        console.log("Refresh token found:", !!refreshToken);

        if (accessToken && refreshToken) {
          // Set loading to true while we establish the session
          setLoading(true);
          setLoadingSteps([
            { label: STRINGS.LOADING.AUTHENTICATING, completed: false },
          ]);

          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            setLoading(false);
            setLoadingSteps([]);
            console.error("Error setting session:", sessionError);
            throw sessionError;
          }

          // Manually handle the session instead of relying on onAuthStateChange
          // This fixes Android first-launch issue where the listener doesn't fire
          if (sessionData?.session?.user) {
            setSession(sessionData.session);
            setUser(sessionData.session.user);
            completeStep(STRINGS.LOADING.AUTHENTICATING);
            addStep(STRINGS.LOADING.FETCHING_ROLES);

            try {
              // Pass the access token directly to avoid getSession() race condition on first launch
              const roles = await fetchUserRoles(sessionData.session.user.id, {
                accessToken: sessionData.session.access_token,
                onRetry: (attempt, max) => {
                  setLoadingSteps((prev) =>
                    prev.map((s) =>
                      s.label.startsWith(STRINGS.LOADING.FETCHING_ROLES)
                        ? { ...s, label: STRINGS.LOADING.FETCHING_ROLES_RETRY(attempt, max) }
                        : s,
                    ),
                  );
                },
              });
              setLoadingSteps((prev) =>
                prev.map((s) =>
                  s.label.startsWith(STRINGS.LOADING.FETCHING_ROLES)
                    ? { ...s, completed: true }
                    : s,
                ),
              );
              setUserRoles(roles);
              setHasRequiredRole(checkRequiredRole(roles));
            } catch (roleError) {
              console.error("Error fetching roles after login:", roleError);
              // Continue without roles rather than blocking
              setUserRoles([]);
              setHasRequiredRole(false);
            }

            setLoading(false);
          } else {
            console.error("No session data returned after setSession");
            setLoading(false);
            setLoadingSteps([]);
            throw new Error("Failed to establish session");
          }

          return;
        } else {
          console.error("No tokens found in callback URL:", url);
          throw new Error("No authentication tokens received");
        }
      } else if (result.type === "cancel") {
        throw new Error("Authentication cancelled");
      } else {
        throw new Error("Authentication failed");
      }
    }
  };

  const deleteUserData = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const accessToken = currentSession?.access_token;

    if (!accessToken) {
      throw new Error("No active session");
    }

    const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-data`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete user data");
    }

    await supabase.auth.signOut();
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // Extract Discord username and avatar from user metadata
  const discordMetadata = user?.user_metadata as
    | DiscordUserMetadata
    | undefined;
  const discordUsername =
    discordMetadata?.custom_claims?.global_name ||
    discordMetadata?.full_name ||
    discordMetadata?.name ||
    user?.email?.split("@")[0] ||
    null;

  const discordAvatar = discordMetadata?.avatar
    ? `https://cdn.discordapp.com/avatars/${discordMetadata.provider_id}/${discordMetadata.avatar}.png`
    : discordMetadata?.picture || null;

  const value: AuthContextType = {
    session,
    user,
    loading,
    loadingSteps,
    hasRequiredRole,
    userRoles,
    discordUsername,
    discordAvatar,
    signInWithDiscord,
    signOut,
    deleteUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
