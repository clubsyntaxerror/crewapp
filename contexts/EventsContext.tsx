import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { fetchEvents, fetchTaskList } from '@/lib/google-sheets';
import { Event, CrewTask } from '@/lib/types';

interface EventsContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  loadEvents: () => Promise<void>;
  getEventById: (eventId: string) => Event | undefined;
  getTaskList: (taskListName?: string) => Promise<CrewTask[]>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

// Cache task lists by name to avoid re-fetching
const taskListCache = new Map<string, CrewTask[]>();

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getEventById = useCallback((eventId: string): Event | undefined => {
    return events.find((e) => e.eventId === eventId);
  }, [events]);

  const getTaskList = useCallback(async (taskListName?: string): Promise<CrewTask[]> => {
    const cacheKey = taskListName || '__default__';

    // Return cached task list if available
    if (taskListCache.has(cacheKey)) {
      return taskListCache.get(cacheKey)!;
    }

    // Fetch and cache the task list
    const tasks = await fetchTaskList(taskListName);
    taskListCache.set(cacheKey, tasks);
    return tasks;
  }, []);

  return (
    <EventsContext.Provider
      value={{
        events,
        loading,
        error,
        loadEvents,
        getEventById,
        getTaskList,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
