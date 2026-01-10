-- Add event context columns to task_assignments table
-- Makes it easier to understand assignments after the fact

ALTER TABLE task_assignments
  ADD COLUMN event_title TEXT,
  ADD COLUMN event_date DATE;

-- Add comment to describe the columns
COMMENT ON COLUMN task_assignments.event_title IS 'Event title for easier reference (denormalized from Google Sheets)';
COMMENT ON COLUMN task_assignments.event_date IS 'Event start date without time (denormalized from Google Sheets)';

-- Create index for querying assignments by date
CREATE INDEX IF NOT EXISTS idx_task_assignments_event_date
  ON task_assignments(event_date DESC);
