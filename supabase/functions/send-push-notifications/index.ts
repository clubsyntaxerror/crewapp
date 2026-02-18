import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configurable: days before event to send notifications
const DAYS_BEFORE_EVENT = [14, 7, 2];

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DEFAULT_TASK_LIST = 'H62';

// Role access: H62 is open to all roles, other task lists are crew-only
const ALL_ROLES = ['crew', 'volunteer', 'tester'];
const TASK_LIST_ALLOWED_ROLES: Record<string, string[]> = {
  [DEFAULT_TASK_LIST]: ALL_ROLES,
};
const DEFAULT_ALLOWED_ROLES = ['crew'];

interface SheetEvent {
  eventId: string;
  title: string;
  startDate: Date;
  taskListName?: string;
}

interface UserWithToken {
  user_id: string;
  push_token: string;
  discord_user_id?: string;
}

serve(async (req) => {
  try {
    // Verify authorization (service role key from pg_cron)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role client to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch events from Google Sheets
    const events = await fetchEventsFromSheets();
    const now = new Date();
    let totalSent = 0;

    for (const event of events) {
      const daysUntil = Math.floor(
        (event.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check each notification threshold
      for (const threshold of DAYS_BEFORE_EVENT) {
        // First threshold (14d): send anytime from 14 days out until event day
        // Later thresholds (7d, 2d): use a 1-day window [threshold-1, threshold]
        const isFirstThreshold = threshold === DAYS_BEFORE_EVENT[0];
        if (isFirstThreshold) {
          if (daysUntil > threshold || daysUntil < 0) continue;
        } else {
          if (daysUntil > threshold || daysUntil < threshold - 1) continue;
        }

        const sent = await sendNotificationsForEvent(
          supabase,
          event,
          threshold,
          daysUntil
        );
        totalSent += sent;
      }
    }

    return jsonResponse({ success: true, notificationsSent: totalSent });
  } catch (error) {
    console.error('Error in send-push-notifications:', error);
    return jsonResponse({ error: 'Internal server error', message: (error as Error).message }, 500);
  }
});

async function sendNotificationsForEvent(
  supabase: ReturnType<typeof createClient>,
  event: SheetEvent,
  daysBefore: number,
  daysUntil: number
): Promise<number> {
  // Find users who have any task assignment for this event (they've committed)
  const { data: committedRows } = await supabase
    .from('task_assignments')
    .select('user_id')
    .eq('event_id', event.eventId);

  const committedUserIds = new Set(
    (committedRows ?? []).map((r: { user_id: string }) => r.user_id)
  );

  // Find users already notified at this threshold
  const { data: alreadyNotified } = await supabase
    .from('notification_log')
    .select('user_id')
    .eq('event_id', event.eventId)
    .eq('days_before', daysBefore);

  const notifiedUserIds = new Set(
    (alreadyNotified ?? []).map((r: { user_id: string }) => r.user_id)
  );

  // Get all push tokens, excluding committed and already-notified users
  const { data: tokens } = await supabase
    .from('device_push_tokens')
    .select('user_id, push_token');

  if (!tokens || tokens.length === 0) return 0;

  let candidates = (tokens as UserWithToken[]).filter(
    (t) => !committedUserIds.has(t.user_id) && !notifiedUserIds.has(t.user_id)
  );

  if (candidates.length === 0) return 0;

  // Filter by role-based access for this event's task list
  const allowedRoles = getAllowedRoles(event.taskListName);
  candidates = await filterByDiscordRoles(supabase, candidates, allowedRoles);

  if (candidates.length === 0) return 0;

  // Build notification payload
  const isInitial = daysBefore === DAYS_BEFORE_EVENT[0];
  const body = isInitial
    ? `Time to pick tasks for ${event.title}!`
    : `Reminder: ${event.title} is in ${daysUntil} days — pick your tasks!`;

  const messages = candidates.map((t) => ({
    to: t.push_token,
    title: 'Syntax Error Events',
    body,
    data: { eventId: event.eventId },
    channelId: 'event-reminders',
  }));

  // Send via Expo Push API (batch)
  const pushResponse = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  const pushResult = await pushResponse.json();
  console.log('Expo Push API response:', JSON.stringify(pushResult));

  if (!pushResponse.ok) {
    console.error('Expo Push API error:', JSON.stringify(pushResult));
    return 0;
  }

  // Check individual ticket errors and clean up stale tokens
  const tickets = pushResult.data ?? [];
  const staleTokens: string[] = [];
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === 'error') {
      console.error('Push ticket error:', ticket.message, ticket.details);
      if (ticket.details?.error === 'DeviceNotRegistered') {
        staleTokens.push(messages[i].to);
      }
    }
  }

  if (staleTokens.length > 0) {
    await supabase
      .from('device_push_tokens')
      .delete()
      .in('push_token', staleTokens);
    console.log(`Removed ${staleTokens.length} stale push token(s)`);
  }

  // Log sent notifications for deduplication (deduplicate by user_id)
  const uniqueUserIds = [...new Set(candidates.map((t) => t.user_id))];
  const logEntries = uniqueUserIds.map((user_id) => ({
    event_id: event.eventId,
    user_id,
    days_before: daysBefore,
  }));

  await supabase.from('notification_log').upsert(logEntries, {
    onConflict: 'event_id,user_id,days_before',
  });

  return messages.length;
}

function getAllowedRoles(taskListName?: string): string[] {
  const listName = taskListName || DEFAULT_TASK_LIST;
  return TASK_LIST_ALLOWED_ROLES[listName] ?? DEFAULT_ALLOWED_ROLES;
}

/**
 * Filter candidates to only users whose Discord roles allow access.
 * Fetches Discord guild member roles via the Discord bot API.
 */
async function filterByDiscordRoles(
  supabase: ReturnType<typeof createClient>,
  candidates: UserWithToken[],
  allowedRoles: string[]
): Promise<UserWithToken[]> {
  const discordBotToken = Deno.env.get('DISCORD_BOT_TOKEN');
  const discordGuildId = Deno.env.get('DISCORD_GUILD_ID');

  if (!discordBotToken || !discordGuildId) {
    console.error('Discord bot token or guild ID not configured, skipping role filter');
    return [];
  }

  // Get unique user IDs and look up their Discord IDs from Supabase auth
  const uniqueUserIds = [...new Set(candidates.map((t) => t.user_id))];
  const { data: users } = await supabase.auth.admin.listUsers();

  if (!users?.users) return [];

  const userDiscordMap = new Map<string, string>();
  for (const user of users.users) {
    const discordId = user.user_metadata?.provider_id;
    if (discordId && uniqueUserIds.includes(user.id)) {
      userDiscordMap.set(user.id, discordId);
    }
  }

  // Fetch all guild roles once to map IDs to names
  const rolesResponse = await fetch(
    `${DISCORD_API_BASE}/guilds/${discordGuildId}/roles`,
    { headers: { Authorization: `Bot ${discordBotToken}` } }
  );

  if (!rolesResponse.ok) {
    console.error('Failed to fetch Discord guild roles');
    return [];
  }

  const guildRoles: { id: string; name: string }[] = await rolesResponse.json();
  const roleIdToName = new Map(guildRoles.map((r) => [r.id, r.name.toLowerCase()]));

  // Check each user's guild membership and roles
  const authorizedUserIds = new Set<string>();

  for (const [userId, discordId] of userDiscordMap) {
    try {
      const memberResponse = await fetch(
        `${DISCORD_API_BASE}/guilds/${discordGuildId}/members/${discordId}`,
        { headers: { Authorization: `Bot ${discordBotToken}` } }
      );

      if (!memberResponse.ok) continue;

      const member: { roles: string[] } = await memberResponse.json();
      const memberRoleNames = member.roles
        .map((id) => roleIdToName.get(id))
        .filter(Boolean) as string[];

      if (allowedRoles.some((role) => memberRoleNames.includes(role.toLowerCase()))) {
        authorizedUserIds.add(userId);
      }
    } catch (error) {
      console.error(`Failed to check Discord roles for user ${userId}:`, error);
    }
  }

  return candidates.filter((t) => authorizedUserIds.has(t.user_id));
}

// --- Google Sheets fetching (duplicated for Deno runtime) ---

async function fetchEventsFromSheets(): Promise<SheetEvent[]> {
  const sheetId = Deno.env.get('EXPO_PUBLIC_GOOGLE_SHEET_ID');
  const clientEmail = Deno.env.get('EXPO_PUBLIC_GOOGLE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('EXPO_PUBLIC_GOOGLE_PRIVATE_KEY');

  if (!sheetId || !clientEmail || !privateKey) {
    throw new Error('Google Sheets credentials not configured');
  }

  // Clean private key: strip surrounding quotes, convert literal \n to newlines
  const cleanedKey = privateKey
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

  const accessToken = await getGoogleAccessToken(clientEmail, cleanedKey);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Events`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Sheets API error: ${error}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  // Skip header row, parse events (same column layout as client)
  return rows
    .slice(1)
    .map((row): SheetEvent | null => {
      if (!row[0] || !row[15]) return null;
      const startDate = parseSheetDate(row[0]);
      if (!startDate) return null;
      return {
        eventId: row[15],
        title: row[4] || row[2] || 'Event',
        startDate,
        taskListName: row[14] || undefined,
      };
    })
    .filter((e): e is SheetEvent => e !== null);
}

function parseSheetDate(dateStr: string): Date | null {
  // Google Sheets format: M/D/YYYY H:mm:ss
  const match = dateStr.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;
  const [, month, day, year, hours, minutes, seconds] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds)
  );
}

async function getGoogleAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const jwt = await signJwt(header, payload, privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Google access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function signJwt(
  header: Record<string, string>,
  payload: Record<string, unknown>,
  privateKeyPem: string
): Promise<string> {
  const encoder = new TextEncoder();

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import PEM private key (handle both real newlines and literal \n from env vars)
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  );

  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

function base64url(bytes: Uint8Array): string {
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
