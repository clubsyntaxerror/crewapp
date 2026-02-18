import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { NOTIFICATION_CONFIG } from '@/constants/notifications';
import type { Session } from '@supabase/supabase-js';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications(session: Session | null) {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!session) return;

    registerForPushNotifications(session.user.id);

    // Handle notification taps — navigate to event
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const eventId = response.notification.request.content.data?.eventId;
        if (eventId) {
          router.push(`/events/${eventId}` as any);
        }
      }
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [session, router]);
}

async function registerForPushNotifications(userId: string) {
  // Skip on web (requires VAPID key) and non-physical devices (emulators)
  if (Platform.OS === 'web' || !Device.isDevice) return;

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      NOTIFICATION_CONFIG.ANDROID_CHANNEL_ID,
      {
        name: NOTIFICATION_CONFIG.ANDROID_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.DEFAULT,
      }
    );
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: '9a8fe96b-cb85-42cf-8d7f-e6f9c91ec08c',
    })
  ).data;

  const { error } = await supabase
    .from('device_push_tokens')
    .upsert(
      {
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' }
    );

  if (error) {
    console.error('Failed to store push token:', error.message);
  }
}
