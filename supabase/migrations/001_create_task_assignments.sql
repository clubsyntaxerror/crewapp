-- Task Assignments Table
-- Stores which tasks each crew member has signed up for per event
-- Denormalized design: stores task details with each assignment for historical accuracy

CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (from Discord via Supabase Auth)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event identification (from Google Sheets)
  event_id TEXT NOT NULL,

  -- Task list identification
  task_list_name TEXT NOT NULL,

  -- Task details (denormalized for historical accuracy)
  task_id TEXT NOT NULL,
  task_label TEXT NOT NULL,
  task_description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure a user can only sign up for a specific task once per event
  UNIQUE(user_id, event_id, task_id)
);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id
  ON task_assignments(user_id);

-- Index for quick lookups by event
CREATE INDEX IF NOT EXISTS idx_task_assignments_event_id
  ON task_assignments(event_id);

-- Index for finding all assignments for a user+event combination
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_event
  ON task_assignments(user_id, event_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row changes
CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all task assignments (to see who's doing what)
CREATE POLICY "Anyone can view task assignments"
  ON task_assignments
  FOR SELECT
  USING (true);

-- Policy: Users can only insert/update/delete their own assignments
CREATE POLICY "Users can manage their own task assignments"
  ON task_assignments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
