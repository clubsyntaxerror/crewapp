CREATE TABLE notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_notification_log_dedup
  ON notification_log(event_id, user_id, days_before);

-- RLS enabled with no policies: only the service role (edge function) can access
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
