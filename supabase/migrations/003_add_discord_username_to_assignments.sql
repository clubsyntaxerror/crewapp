-- Add Discord username to task_assignments table
-- This makes it easy to display who's committed to each task

ALTER TABLE task_assignments
  ADD COLUMN username TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN task_assignments.username IS 'Discord username of the user who assigned the task (denormalized for easy display)';

-- Create index for querying by username
CREATE INDEX IF NOT EXISTS idx_task_assignments_username
  ON task_assignments(username);
