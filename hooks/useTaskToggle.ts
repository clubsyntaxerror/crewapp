import { useState } from 'react';
import { STRINGS } from '@/constants/strings';
import { TIMING } from '@/constants/gameplay';
import {
  fetchEventTaskAssignments,
  getAbsentTaskId,
  saveUserTaskAssignments,
  TaskAssignment,
} from '@/lib/task-assignments';
import { CrewTask, Event } from '@/lib/types';

export function useTaskToggle(
  event: Event | null,
  crewTasks: CrewTask[],
  assignedTasks: Set<string>,
  setAssignedTasks: (tasks: Set<string>) => void,
  setAllAssignments: (assignments: TaskAssignment[]) => void,
  discordUsername: string | null,
  userRoles: string[] = []
) {
  // Determine primary role: prefer 'crew' over 'volunteer'
  const primaryRole = userRoles.find((r) => r.toLowerCase() === 'crew')
    ? 'crew'
    : userRoles.find((r) => r.toLowerCase() === 'volunteer')
      ? 'volunteer'
      : undefined;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveAssignments = async (taskSet: Set<string>) => {
    if (!event) return;

    setSaveStatus('saving');
    setSaveError(null);

    try {
      const selectedTasks = crewTasks.filter((task) => taskSet.has(task.id));

      await saveUserTaskAssignments(
        event.eventId,
        event.taskListName || 'H62',
        selectedTasks,
        event.title,
        event.startDate,
        discordUsername || undefined,
        primaryRole
      );

      // Reload all assignments to update the display
      const eventAssignments = await fetchEventTaskAssignments(event.eventId);
      setAllAssignments(eventAssignments);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), TIMING.SAVE_SUCCESS_DISPLAY);
    } catch (error) {
      console.error('Error saving task assignments:', error);
      setSaveStatus('error');
      setSaveError(STRINGS.ERRORS.SAVE_FAILED);
      setTimeout(() => setSaveStatus('idle'), TIMING.SAVE_ERROR_DISPLAY);
    }
  };

  const toggleTask = (taskId: string) => {
    if (!event) return;
    const isPast = event.endDate.getTime() < Date.now();
    if (isPast) return;

    setAssignedTasks((prev) => {
      const newSet = new Set(prev);
      const absentTaskId = getAbsentTaskId(crewTasks);

      // If toggling the absent task
      if (taskId === absentTaskId) {
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.clear();
          newSet.add(taskId);
        }
      } else {
        // Toggling a regular task
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          if (absentTaskId) {
            newSet.delete(absentTaskId);
          }
          newSet.add(taskId);
        }
      }

      // Auto-save after state update
      saveAssignments(newSet);

      return newSet;
    });
  };

  return {
    toggleTask,
    saveStatus,
    saveError,
  };
}
