import { useRef, useState } from 'react';
import { STRINGS } from '@/constants/strings';
import { TIMING } from '@/constants/gameplay';
import { getAbsentTaskId, saveUserTaskAssignments } from '@/lib/task-assignments';
import { CrewTask, Event } from '@/lib/types';

export function useTaskToggle(
  event: Event | null,
  crewTasks: CrewTask[],
  assignedTasks: Set<string>,
  setAssignedTasks: (tasks: Set<string>) => void,
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

  // Track pending save to avoid race conditions (using Symbol for unique ID)
  const pendingSaveRef = useRef<symbol | null>(null);

  // Compute new task set based on toggle logic (pure function)
  const computeNewTaskSet = (currentSet: Set<string>, taskId: string): Set<string> => {
    const newSet = new Set(currentSet);
    const absentTaskId = getAbsentTaskId(crewTasks);

    if (taskId === absentTaskId) {
      // Toggling absent task: clear all others or remove absent
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.clear();
        newSet.add(taskId);
      }
    } else {
      // Toggling regular task
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        if (absentTaskId) {
          newSet.delete(absentTaskId);
        }
        newSet.add(taskId);
      }
    }

    return newSet;
  };

  const toggleTask = async (taskId: string) => {
    if (!event) return;
    if (event.endDate.getTime() < Date.now()) return;

    // Compute new state
    const newSet = computeNewTaskSet(assignedTasks, taskId);

    // Optimistic UI update - instant feedback
    setAssignedTasks(newSet);

    // Save in background (fire-and-forget pattern with status tracking)
    setSaveStatus('saving');
    setSaveError(null);

    // Use a unique ID to track this specific save operation
    const saveId = Symbol();
    pendingSaveRef.current = saveId;

    (async () => {
      try {
        const selectedTasks = crewTasks.filter((task) => newSet.has(task.id));

        await saveUserTaskAssignments(
          event.eventId,
          event.taskListName || 'H62',
          selectedTasks,
          event.title,
          event.startDate,
          discordUsername || undefined,
          primaryRole
        );

        // Only update status if this is still the latest save
        if (pendingSaveRef.current === saveId) {
          setSaveStatus('saved');
          setTimeout(() => {
            if (pendingSaveRef.current === saveId) {
              setSaveStatus('idle');
            }
          }, TIMING.SAVE_SUCCESS_DISPLAY);
        }
      } catch (error) {
        console.error('Error saving task assignments:', error);
        // Only show error if this is still the latest save
        if (pendingSaveRef.current === saveId) {
          setSaveStatus('error');
          setSaveError(STRINGS.ERRORS.SAVE_FAILED);
          setTimeout(() => {
            if (pendingSaveRef.current === saveId) {
              setSaveStatus('idle');
            }
          }, TIMING.SAVE_ERROR_DISPLAY);
        }
      }
    })();
  };

  return {
    toggleTask,
    saveStatus,
    saveError,
  };
}
