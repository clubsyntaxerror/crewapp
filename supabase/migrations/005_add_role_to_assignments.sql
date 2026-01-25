-- Add Discord role to task_assignments table
-- This enables color-coding usernames by their role (crew/volunteer)

ALTER TABLE task_assignments
  ADD COLUMN role TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN task_assignments.role IS 'Discord role of the user (crew/volunteer) for display color-coding';
