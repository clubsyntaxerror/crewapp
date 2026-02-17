-- Enable required extensions
-- pg_cron must be in cron schema (Supabase manages this)
-- pg_net doesn't support SET SCHEMA; Supabase lint warning can be dismissed
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily push notification check (pg_cron uses UTC)
-- 13:00 UTC = 14:00 CET (Stockholm winter) / 15:00 CEST (Stockholm summer)
-- pg_cron doesn't support DST, so this drifts by 1h in summer
-- To change the time, update the cron expression below

SELECT cron.schedule(
  'send-event-notifications',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
