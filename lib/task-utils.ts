import { CrewTask } from './types';

/**
 * Get the ID of the "Absent" task (last task in the crew tasks list)
 * @param crewTasks - Array of crew tasks
 * @returns The ID of the absent task, or undefined if not found
 */
export function getAbsentTaskId(crewTasks: CrewTask[]): string | undefined {
  return crewTasks[crewTasks.length - 1]?.id;
}

/**
 * Check if a task is the "Absent" task
 * @param task - The task to check
 * @param crewTasks - Array of crew tasks
 * @returns True if the task is the absent task
 */
export function isAbsentTask(task: CrewTask, crewTasks: CrewTask[]): boolean {
  return task.id === getAbsentTaskId(crewTasks);
}

/**
 * Check if the "Absent" task is checked
 * @param assignedTasks - Set of assigned task IDs
 * @param crewTasks - Array of crew tasks
 * @returns True if the absent task is checked
 */
export function isAbsentChecked(assignedTasks: Set<string>, crewTasks: CrewTask[]): boolean {
  const absentId = getAbsentTaskId(crewTasks);
  return absentId ? assignedTasks.has(absentId) : false;
}
