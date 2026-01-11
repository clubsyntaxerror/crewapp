import { EventCard } from '@/components/EventCard';
import { microknightText } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEvents, isFutureEvent, isPastEvent } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

type FilterType = 'upcoming' | 'past' | 'all';

export default function Index() {
  const { discordUsername, discordAvatar, signOut } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  const filteredEvents = events.filter((event) => {
    if (filter === 'upcoming') return isFutureEvent(event);
    if (filter === 'past') return isPastEvent(event);
    return true; // 'all'
  });

  // For upcoming events, separate next event from future events
  const nextEvent = filter === 'upcoming' && filteredEvents.length > 0 ? filteredEvents[0] : null;
  const futureEvents = filter === 'upcoming' && filteredEvents.length > 1 ? filteredEvents.slice(1) : null;

  const handleFilterSelect = (selectedFilter: FilterType) => {
    setFilter(selectedFilter);
    setShowFilterModal(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setShowUserModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Failed', 'Failed to sign out. Please try again.');
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Set up real-time subscription for task assignments across all events
  useEffect(() => {
    // Subscribe to changes in task_assignments table
    const channel = supabase
      .channel('task_assignments_global')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'task_assignments',
        },
        (payload) => {
          console.log('Real-time stats update received:', payload);
          // Trigger a refresh of all event card stats
          setStatsRefreshTrigger((prev) => prev + 1);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadEvents = async () => {
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
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Club Syntax Error Events',
          headerShown: true,
          headerLargeTitle: true,
          headerTitleStyle: {
            fontFamily: 'microknight',
          },
          headerLargeTitleStyle: {
            fontFamily: 'microknight',
          },
          headerLeft: () => (
            <Pressable onPress={() => setShowUserModal(true)} style={styles.userButton}>
              {discordAvatar ? (
                <Image source={{ uri: discordAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {discordUsername?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => setShowFilterModal(true)} style={styles.menuButton}>
              <Text style={styles.menuButtonText}>⋯</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        {filter === 'upcoming' && (nextEvent || futureEvents) ? (
          <ScrollView contentContainerStyle={styles.list}>
            {nextEvent && (
              <View>
                <Text style={styles.sectionHeader}>Upcoming event</Text>
                <EventCard event={nextEvent} refreshTrigger={statsRefreshTrigger} />
              </View>
            )}

            {futureEvents && futureEvents.length > 0 && (
              <View style={styles.futureEventsSection}>
                <Text style={styles.sectionHeader}>Future events</Text>
                {futureEvents.map((event) => (
                  <EventCard key={event.eventId} event={event} refreshTrigger={statsRefreshTrigger} />
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.eventId}
            renderItem={({ item }) => <EventCard event={item} refreshTrigger={statsRefreshTrigger} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>No events scheduled</Text>
            }
          />
        )}
      </View>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Filter Events</Text>

                <Pressable
                  style={styles.filterOption}
                  onPress={() => handleFilterSelect('upcoming')}
                >
                  <Text style={styles.filterOptionText}>Upcoming Events</Text>
                  {filter === 'upcoming' && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>

                <Pressable
                  style={styles.filterOption}
                  onPress={() => handleFilterSelect('past')}
                >
                  <Text style={styles.filterOptionText}>Past Events</Text>
                  {filter === 'past' && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>

                <Pressable
                  style={styles.filterOption}
                  onPress={() => handleFilterSelect('all')}
                >
                  <Text style={styles.filterOptionText}>All Events</Text>
                  {filter === 'all' && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowUserModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.userModalHeader}>
                  {discordAvatar ? (
                    <Image source={{ uri: discordAvatar }} style={styles.userModalAvatar} />
                  ) : (
                    <View style={styles.userModalAvatarPlaceholder}>
                      <Text style={styles.userModalAvatarText}>
                        {discordUsername?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.userModalUsername}>{discordUsername || 'Discord User'}</Text>
                </View>

                <Pressable
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setShowUserModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  userButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: -1,
  },
  list: {
    padding: 16,
  },
  sectionHeader: {
    ...microknightText.base,
    fontWeight: '600',
    color: '#0a84ff',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  futureEventsSection: {
    marginTop: 32,
  },
  empty: {
    ...microknightText.md,
    textAlign: 'center',
    color: '#8e8e93',
    marginTop: 32,
  },
  error: {
    ...microknightText.md,
    color: '#ff453a',
    textAlign: 'center',
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'microknight',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    marginBottom: 12,
  },
  filterOptionText: {
    ...microknightText.md,
    color: '#fff',
  },
  checkmark: {
    fontSize: 18,
    color: '#0a84ff',
    fontWeight: '600',
  },
  userModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userModalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  userModalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userModalAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  userModalUsername: {
    ...microknightText.lg,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#5865F2',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButtonText: {
    ...microknightText.md,
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ff453a',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...microknightText.md,
    color: '#fff',
    fontWeight: '600',
  },
});
