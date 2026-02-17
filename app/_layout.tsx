import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { EventsProvider, useEvents } from '@/contexts/EventsContext';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading: authLoading, loadingSteps: authSteps } = useAuth();
  const { loadingSteps: eventsSteps, preloaded, preloadData } = useEvents();
  const segments = useSegments();
  const router = useRouter();

  // Trigger data preloading once authenticated
  useEffect(() => {
    if (session && !preloaded) {
      preloadData();
    }
  }, [session, preloaded, preloadData]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (authLoading) return;
    // Wait for preloading to complete before navigating
    if (session && !preloaded) return;

    const inAuthGroup = (segments as string[]).includes('login');

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login' as any);
    } else if (session && inAuthGroup) {
      // Redirect to home if authenticated and on login screen
      router.replace('/');
    }
  }, [session, segments, authLoading, preloaded, router]);

  // Show loading screen during auth or data preloading
  if (authLoading || (session && !preloaded)) {
    return <AppLoadingScreen steps={[...authSteps, ...eventsSteps]} />;
  }

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        headerShown: false,
      }}
    />
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'freepixel': require('../assets/fonts/freepixel.ttf'),
    'microknight': require('../assets/fonts/microknight.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <EventsProvider>
        <RootLayoutNav />
      </EventsProvider>
    </AuthProvider>
  );
}
