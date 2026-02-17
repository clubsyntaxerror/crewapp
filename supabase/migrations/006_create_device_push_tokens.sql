CREATE TABLE device_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'android', 'ios', 'web'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, push_token)
);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
  ON device_push_tokens FOR ALL
  USING (auth.uid() = user_id);
