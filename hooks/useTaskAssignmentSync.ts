import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

interface UseTaskAssignmentSyncOptions {
  eventId?: string;
  onUpdate: () => void;
}

/**
 * Custom hook to subscribe to real-time task assignment updates
 * @param eventId - Optional event ID to filter updates for a specific event
 * @param onUpdate - Callback function to run when updates are received
 */
export function useTaskAssignmentSync({ eventId, onUpdate }: UseTaskAssignmentSyncOptions) {
  useEffect(() => {
    const channelName = eventId ? `task_assignments:${eventId}` : 'task_assignments_global';
    const filter = eventId ? { filter: `event_id=eq.${eventId}` } : {};

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'task_assignments',
          ...filter,
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          onUpdate();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, onUpdate]);
}
