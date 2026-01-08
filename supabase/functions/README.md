# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Crew App.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Replace `YOUR_PROJECT_REF` with your Supabase project reference ID (from your project URL).

## Functions

### `get-discord-roles`

Fetches a user's Discord roles from the configured Discord server using the Discord Bot API.

**Environment Variables Required:**
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_GUILD_ID` - Your Discord server (guild) ID

## Deployment

### Step 1: Set Environment Secrets

Before deploying, set the required secrets in your Supabase project:

```bash
# Set Discord bot token
supabase secrets set DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Set Discord guild ID
supabase secrets set DISCORD_GUILD_ID=your_discord_guild_id_here
```

You can verify secrets are set:
```bash
supabase secrets list
```

### Step 2: Deploy Function

Deploy the `get-discord-roles` function:

```bash
supabase functions deploy get-discord-roles
```

Or deploy all functions:

```bash
supabase functions deploy
```

### Step 3: Verify Deployment

Test the function locally first:

```bash
# Start local Supabase
supabase start

# Serve the function locally
supabase functions serve get-discord-roles --env-file .env.local

# Test it (in another terminal)
curl -i --location --request POST 'http://localhost:54321/functions/v1/get-discord-roles' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"user-id-here"}'
```

Once deployed to production, the function will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-discord-roles
```

## Monitoring

View function logs in the Supabase Dashboard:
1. Go to **Edge Functions** in your Supabase project
2. Click on `get-discord-roles`
3. View **Logs** tab

Or via CLI:
```bash
supabase functions logs get-discord-roles
```

## Troubleshooting

### "Discord bot token or guild ID not configured"
- Ensure you've set the secrets using `supabase secrets set`
- Redeploy the function after setting secrets

### "User is not a member of the Discord server"
- Verify the user is actually a member of your Discord server
- Check that the DISCORD_GUILD_ID matches your server

### "Failed to fetch Discord member info"
- Verify the Discord bot has been invited to your server
- Ensure Server Members Intent is enabled in Discord Bot settings
- Check the bot has necessary permissions (View Channels)

### Testing with curl

```bash
# Get your auth token from Supabase
TOKEN="your_user_jwt_token_here"

# Call the function
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-discord-roles' \
  --header "Authorization: Bearer $TOKEN" \
  --header 'Content-Type: application/json'
```
