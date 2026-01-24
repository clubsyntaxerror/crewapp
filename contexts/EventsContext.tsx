import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { fetchEvents, fetchTaskList } from '@/lib/google-sheets';
import { Event, CrewTask } from '@/lib/types';
import { STRINGS } from '@/constants/strings';

interface EventsContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  loadingMessage: string | null;
  preloaded: boolean;
  loadEvents: () => Promise<void>;
  preloadData: () => Promise<void>;
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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [preloaded, setPreloaded] = useState(false);
  const preloadingRef = useRef(false);

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

  const preloadData = useCallback(async () => {
    // Prevent multiple simultaneous preloads
    if (preloadingRef.current || preloaded) return;
    preloadingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Load events
      setLoadingMessage(STRINGS.LOADING.LOADING_EVENTS);
      const eventsData = await fetchEvents();
      setEvents(eventsData);

      // Preload the default task list (most events use this)
      setLoadingMessage(STRINGS.LOADING.LOADING_TASKS);
      const defaultTasks = await fetchTaskList();
      taskListCache.set('__default__', defaultTasks);

      // Also preload task lists for the first few upcoming events if they have custom lists
      const upcomingEvents = eventsData
        .filter((e) => e.startDate.getTime() > Date.now())
        .slice(0, 3);

      for (const event of upcomingEvents) {
        if (event.taskListName && !taskListCache.has(event.taskListName)) {
          const tasks = await fetchTaskList(event.taskListName);
          taskListCache.set(event.taskListName, tasks);
        }
      }

      setLoadingMessage(STRINGS.LOADING.ALMOST_READY);
      setPreloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error preloading data:', err);
    } finally {
      setLoading(false);
      setLoadingMessage(null);
      preloadingRef.current = false;
    }
  }, [preloaded]);

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
        loadingMessage,
        preloaded,
        loadEvents,
        preloadData,
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
