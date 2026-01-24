import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';

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
  // Use ref to store callback so subscription doesn't need to be recreated
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const channelName = eventId ? `task_assignments:${eventId}` : 'task_assignments_global';
    const filter = eventId ? { filter: `event_id=eq.${eventId}` } : {};

    console.log(`Setting up real-time subscription: ${channelName}`);

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
          onUpdateRef.current();
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ${channelName}:`, status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log(`Removing channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [eventId]); // Only depend on eventId, use ref for callback
}
