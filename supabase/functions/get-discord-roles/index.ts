// Follow this setup guide to integrate the Deno runtime into your favorite editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
const DISCORD_GUILD_ID = Deno.env.get('DISCORD_GUILD_ID');

interface DiscordRole {
  id: string;
  name: string;
}

interface DiscordGuildMember {
  roles: string[];
  nick?: string;
  user: {
    id: string;
    username: string;
  };
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User verification failed:', userError?.message || 'No user found');
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        details: userError?.message || 'No user found'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get Discord user ID from user metadata
    const discordUserId = user.user_metadata?.provider_id;
    if (!discordUserId) {
      return new Response(
        JSON.stringify({ error: 'Discord user ID not found in user metadata' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      return new Response(
        JSON.stringify({ error: 'Discord bot token or guild ID not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch guild member info from Discord API
    const memberResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!memberResponse.ok) {
      if (memberResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'User is not a member of the Discord server', roles: [] }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const errorText = await memberResponse.text();
      console.error('Discord API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Discord member info' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const member: DiscordGuildMember = await memberResponse.json();

    // Fetch guild roles to map role IDs to names
    const rolesResponse = await fetch(`${DISCORD_API_BASE}/guilds/${DISCORD_GUILD_ID}/roles`, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text();
      console.error('Discord API error fetching roles:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Discord roles' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const guildRoles: DiscordRole[] = await rolesResponse.json();

    // Map role IDs to role names
    const roleNames = member.roles
      .map((roleId) => {
        const role = guildRoles.find((r) => r.id === roleId);
        return role?.name;
      })
      .filter(Boolean) as string[];

    return new Response(
      JSON.stringify({
        roles: roleNames,
        discordUserId,
        username: member.user.username,
        serverNick: member.nick ?? null,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in get-discord-roles function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
