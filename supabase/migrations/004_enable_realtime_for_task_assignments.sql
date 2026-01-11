-- Enable real-time replication for task_assignments table
-- This allows Supabase to broadcast changes to all connected clients

ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
