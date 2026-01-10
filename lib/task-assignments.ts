import { supabase } from './supabase';
import { CrewTask } from './types';

export interface TaskAssignment {
  id: string;
  user_id: string;
  event_id: string;
  task_list_name: string;
  task_id: string;
  task_label: string;
  task_description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all task assignments for a specific event
 */
export async function fetchEventTaskAssignments(
  eventId: string
): Promise<TaskAssignment[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching task assignments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch task assignments for the current user for a specific event
 */
export async function fetchUserEventTaskAssignments(
  eventId: string
): Promise<TaskAssignment[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching user task assignments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Save task assignments for the current user for a specific event
 * This replaces all existing assignments for this user+event combination
 */
export async function saveUserTaskAssignments(
  eventId: string,
  taskListName: string,
  tasks: CrewTask[]
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Start a transaction-like operation:
  // 1. Delete all existing assignments for this user+event
  const { error: deleteError } = await supabase
    .from('task_assignments')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error deleting existing task assignments:', deleteError);
    throw deleteError;
  }

  // 2. Insert new assignments (if any tasks are selected)
  if (tasks.length > 0) {
    const assignments = tasks.map((task) => ({
      user_id: user.id,
      event_id: eventId,
      task_list_name: taskListName,
      task_id: task.id,
      task_label: task.label,
      task_description: task.description,
    }));

    const { error: insertError } = await supabase
      .from('task_assignments')
      .insert(assignments);

    if (insertError) {
      console.error('Error inserting task assignments:', insertError);
      throw insertError;
    }
  }
}

/**
 * Get a summary of who's doing what for an event
 */
export async function getEventTaskSummary(
  eventId: string
): Promise<Record<string, string[]>> {
  const assignments = await fetchEventTaskAssignments(eventId);

  // Group by task_id
  const summary: Record<string, string[]> = {};

  for (const assignment of assignments) {
    if (!summary[assignment.task_id]) {
      summary[assignment.task_id] = [];
    }
    // You might want to fetch user names from Discord or Supabase profiles
    // For now, we'll just use user_id
    summary[assignment.task_id].push(assignment.user_id);
  }

  return summary;
}
