export const NOTIFICATION_CONFIG = {
  /** Days before event to send notifications (first = initial, rest = reminders) */
  DAYS_BEFORE_EVENT: [14, 7, 2],
  ANDROID_CHANNEL_ID: 'event-reminders',
  ANDROID_CHANNEL_NAME: 'Event Reminders',
} as const;
