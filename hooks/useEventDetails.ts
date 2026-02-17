import { useEffect, useState } from 'react';
import { useEvents } from '@/contexts/EventsContext';
import {
  fetchEventTaskAssignments,
  fetchUserEventTaskAssignments,
  TaskAssignment,
} from '@/lib/task-assignments';
import { CrewTask, Event } from '@/lib/types';

export function useEventDetails(eventId: string | undefined) {
  const { getEventById, getTaskList, loading: eventsLoading } = useEvents();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [crewTasks, setCrewTasks] = useState<CrewTask[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Set<string>>(new Set());
  const [allAssignments, setAllAssignments] = useState<TaskAssignment[]>([]);

  useEffect(() => {
    const loadEventDetails = async () => {
      if (!eventId || eventsLoading) {
        if (!eventsLoading && !eventId) {
          setLoading(false);
        }
        return;
      }

      try {
        // Get event from cache (no network call)
        const found = getEventById(eventId);
        setEvent(found || null);

        if (found) {
          // Load task list (cached), user assignments, and all assignments in parallel
          const [tasks] = await Promise.all([
            getTaskList(found.taskListName),
            fetchUserEventTaskAssignments(found.eventId)
              .then((saved) => setAssignedTasks(new Set(saved.map((a) => a.task_id))))
              .catch((error) => console.error('Error loading saved task assignments:', error)),
            fetchEventTaskAssignments(found.eventId)
              .then(setAllAssignments)
              .catch((error) => console.error('Error loading event assignments:', error)),
          ]);
          setCrewTasks(tasks);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEventDetails();
  }, [eventId, eventsLoading, getEventById, getTaskList]);

  // Helper to get usernames with roles for a specific task
  const getUsernamesForTask = (taskId: string): { username: string; role?: string }[] => {
    const seen = new Set<string>();
    return allAssignments
      .filter((a) => a.task_id === taskId && a.username)
      .filter((a) => {
        if (seen.has(a.username!)) return false;
        seen.add(a.username!);
        return true;
      })
      .map((a) => ({ username: a.username!, role: a.role }));
  };

  return {
    event,
    loading,
    crewTasks,
    assignedTasks,
    setAssignedTasks,
    allAssignments,
    setAllAssignments,
    getUsernamesForTask,
  };
}
