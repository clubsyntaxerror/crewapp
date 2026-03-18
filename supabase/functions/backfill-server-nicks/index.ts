import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
const DISCORD_GUILD_ID = Deno.env.get('DISCORD_GUILD_ID');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      return new Response(JSON.stringify({ error: 'Discord bot token or guild ID not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use service role to read auth.users and update task_assignments
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get all distinct user_ids from task_assignments
    const { data: assignments, error: assignmentsError } = await adminClient
      .from('task_assignments')
      .select('user_id')
      .not('user_id', 'is', null);

    if (assignmentsError) throw assignmentsError;

    const userIds = [...new Set(assignments.map((a: { user_id: string }) => a.user_id))];

    const results: { userId: string; nick: string | null; updated: number; error?: string }[] = [];

    for (const userId of userIds) {
      // Get Discord provider_id from auth.users metadata
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);

      if (userError || !userData.user) {
        results.push({ userId, nick: null, updated: 0, error: userError?.message ?? 'User not found' });
        continue;
      }

      const discordUserId = userData.user.user_metadata?.provider_id;
      if (!discordUserId) {
        results.push({ userId, nick: null, updated: 0, error: 'No Discord provider_id' });
        continue;
      }

      // Fetch guild member from Discord API
      const memberResponse = await fetch(
        `${DISCORD_API_BASE}/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } },
      );

      if (!memberResponse.ok) {
        results.push({ userId, nick: null, updated: 0, error: `Discord API: ${memberResponse.status}` });
        continue;
      }

      const member = await memberResponse.json();
      const nick: string | null = member.nick ?? null;

      if (!nick) {
        // No server nick set — nothing to update
        results.push({ userId, nick: null, updated: 0 });
        continue;
      }

      // Update all task_assignments rows for this user
      const { count, error: updateError } = await adminClient
        .from('task_assignments')
        .update({ username: nick }, { count: 'exact' })
        .eq('user_id', userId);

      if (updateError) {
        results.push({ userId, nick, updated: 0, error: updateError.message });
      } else {
        results.push({ userId, nick, updated: count ?? 0 });
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

    return new Response(
      JSON.stringify({ processed: userIds.length, totalUpdated, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
