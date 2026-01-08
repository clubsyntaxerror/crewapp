# Discord OAuth & Supabase Setup Guide

This guide will walk you through setting up Discord OAuth authentication with role-based authorization for the Crew App.

## Prerequisites

- A Supabase project (you mentioned you already have one)
- Admin access to your Discord server
- Discord Developer Portal access

---

## Step 1: Configure Discord OAuth Application

### 1.1 Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name it (e.g., "Crew App" or "Club Syntax Error Crew")
4. Click **"Create"**

### 1.2 Get OAuth Credentials

1. In your Discord application, go to **OAuth2 → General**
2. Copy the **Client ID** (you'll add this to `.env.local`)
3. Click **"Reset Secret"** to generate a new **Client Secret**
4. Copy the **Client Secret** immediately (it won't be shown again)

### 1.3 Configure Redirect URIs

1. Still in **OAuth2 → General**, scroll to **Redirects**
2. Click **"Add Redirect"**
3. Add the following URL (replace `YOUR_PROJECT_REF` with your Supabase project reference):
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
4. Click **"Save Changes"**

### 1.4 Configure Scopes (in Supabase, not Discord Portal)

The required OAuth scopes are:
- `identify` - Get user ID, username, avatar
- `email` - Get user email
- `guilds.members.read` - Read user's guild memberships and roles

These will be configured in Supabase in Step 2.

---

## Step 2: Create Discord Bot (for Role Verification)

### 2.1 Enable Bot

1. In your Discord application, go to **Bot** section
2. Click **"Reset Token"** (or **"Copy"** if token exists)
3. Copy the **Bot Token** (this is your `DISCORD_BOT_TOKEN`)
4. ⚠️ **IMPORTANT**: Never share this token or commit it to Git

### 2.2 Enable Privileged Intents

1. Still in **Bot** section, scroll to **Privileged Gateway Intents**
2. Enable:
   - ✅ **SERVER MEMBERS INTENT** (required to fetch guild member info)
3. Click **"Save Changes"**

### 2.3 Invite Bot to Your Discord Server

1. Go to **OAuth2 → URL Generator**
2. Under **Scopes**, select:
   - ✅ `bot`
3. Under **Bot Permissions**, select:
   - ✅ `View Channels` (Read Messages/View Channels)
4. Copy the generated URL at the bottom
5. Open the URL in a new tab and select your Discord server
6. Click **"Authorize"**

---

## Step 3: Get Your Discord Server (Guild) ID

1. Open Discord desktop/web app
2. Go to **User Settings** (gear icon) → **Advanced**
3. Enable **Developer Mode**
4. Close settings
5. Right-click your server icon → **"Copy Server ID"**
6. This is your `DISCORD_GUILD_ID`

---

## Step 4: Configure Supabase

### 4.1 Enable Discord Auth Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication → Providers**
4. Find **Discord** in the list and click to expand
5. Toggle **"Enable Discord"**
6. Fill in:
   - **Client ID**: Your Discord OAuth Client ID from Step 1.2
   - **Client Secret**: Your Discord OAuth Client Secret from Step 1.2
   - **Authorized Client IDs**: Leave blank (or add Client ID if required)
7. Under **Scopes**, add:
   ```
   identify email guilds.members.read
   ```
8. Click **"Save"**

### 4.2 Get Supabase Credentials

1. In Supabase Dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (the long JWT token under "Project API keys")

---

## Step 5: Update Environment Variables

1. Open your `.env.local` file (or create it from `.env.local.example`)
2. Fill in all the values you collected:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Discord OAuth Configuration
EXPO_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id_here
EXPO_PUBLIC_DISCORD_GUILD_ID=your_discord_guild_id_here

# Discord Secrets (for Edge Functions - NOT exposed to client)
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_BOT_TOKEN=your_discord_bot_token_here
```

3. Save the file

---

## Step 6: Verify Your Discord Roles

The app checks for these Discord roles (case-insensitive):
- `crew`
- `volunteer`
- `admin`
- `alumni`

Make sure these roles exist in your Discord server and are assigned to the appropriate members.

To check/create roles:
1. In Discord, right-click your server → **Server Settings**
2. Go to **Roles**
3. Verify the roles exist with these exact names
4. Assign roles to members under **Server Settings → Members**

---

## Summary Checklist

Before running the app, verify you have:

- [ ] Created Discord application
- [ ] Configured OAuth redirect URI in Discord
- [ ] Created Discord bot and enabled Server Members Intent
- [ ] Invited bot to your Discord server
- [ ] Enabled Discord provider in Supabase
- [ ] Added Discord OAuth credentials to Supabase
- [ ] Updated `.env.local` with all credentials
- [ ] Verified Discord roles exist in your server

---

## Next Steps

Once all configuration is complete, the app will:
1. Require Discord login before showing any content
2. Fetch user's roles from your Discord server
3. Only show task management UI to users with: crew, volunteer, admin, or alumni roles
4. Display user's Discord username and avatar in the header
5. Provide a logout button in the header

---

## Troubleshooting

### "Invalid redirect_uri"
- Verify the redirect URI in Discord OAuth settings matches your Supabase project URL exactly
- Format: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### "Missing Access" or bot can't see roles
- Ensure Server Members Intent is enabled in Discord Bot settings
- Verify the bot has been invited to your Discord server
- Check that the bot has "View Channels" permission

### Roles not being detected
- Verify role names match exactly: `crew`, `volunteer`, `admin`, or `alumni` (case-insensitive)
- Ensure the user is actually a member of your Discord server
- Check that `guilds.members.read` scope is enabled in Supabase Discord provider

### Environment variables not loading
- Restart the Expo development server after changing `.env.local`
- Ensure variable names start with `EXPO_PUBLIC_` for client-side access
- Private variables (DISCORD_BOT_TOKEN, DISCORD_CLIENT_SECRET) should NOT have `EXPO_PUBLIC_` prefix
