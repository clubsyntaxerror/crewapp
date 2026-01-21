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
          // Load task list (cached after first fetch)
          const tasks = await getTaskList(found.taskListName);
          setCrewTasks(tasks);

          // Load user's saved task assignments (from Supabase)
          try {
            const savedAssignments = await fetchUserEventTaskAssignments(found.eventId);
            const savedTaskIds = new Set(savedAssignments.map((a) => a.task_id));
            setAssignedTasks(savedTaskIds);
          } catch (error) {
            console.error('Error loading saved task assignments:', error);
          }

          // Load all assignments for this event to show who's doing what
          try {
            const eventAssignments = await fetchEventTaskAssignments(found.eventId);
            setAllAssignments(eventAssignments);
          } catch (error) {
            console.error('Error loading event assignments:', error);
          }
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEventDetails();
  }, [eventId, eventsLoading, getEventById, getTaskList]);

  // Helper to get usernames for a specific task
  const getUsernamesForTask = (taskId: string): string[] => {
    const usernames = allAssignments
      .filter((a) => a.task_id === taskId && a.username)
      .map((a) => a.username!);
    return [...new Set(usernames)];
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
