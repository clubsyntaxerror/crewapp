import { AvatarDisplay } from '@/components/AvatarDisplay';
import { EventCard } from '@/components/EventCard';
import { colors } from '@/constants/colors';
import { STRINGS } from '@/constants/strings';
import { microknightText } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useTaskAssignmentSync } from '@/hooks/useTaskAssignmentSync';
import { isFutureEvent, isPastEvent } from '@/lib/google-sheets';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

type FilterType = 'upcoming' | 'past' | 'all';

export default function Index() {
  const { discordUsername, discordAvatar, signOut } = useAuth();
  const { events, loading, error, loadEvents } = useEvents();
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
      Alert.alert(STRINGS.ERRORS.LOGOUT_FAILED_TITLE, STRINGS.ERRORS.LOGOUT_FAILED_MESSAGE);
    }
  };

  // Events are preloaded after auth, only reload if not already loaded
  useEffect(() => {
    if (events.length === 0 && !loading) {
      loadEvents();
    }
  }, [events.length, loading, loadEvents]);

  // Refresh stats when screen comes back into focus (e.g., after navigating back from event detail)
  useFocusEffect(
    useCallback(() => {
      setStatsRefreshTrigger((prev) => prev + 1);
    }, [])
  );

  // Set up real-time subscription for task assignments across all events
  useTaskAssignmentSync({
    onUpdate: () => {
      setStatsRefreshTrigger((prev) => prev + 1);
    },
  });

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
          title: STRINGS.APP_TITLE,
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
              <AvatarDisplay avatarUrl={discordAvatar} username={discordUsername} size={32} />
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
                <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>{STRINGS.HOME.NEXT_EVENT}</Text>
                <EventCard event={nextEvent} refreshTrigger={statsRefreshTrigger} accentColor={colors.textPrimary} rainbowTitle />
              </View>
            )}

            {futureEvents && futureEvents.length > 0 && (
              <View style={styles.futureEventsSection}>
                <Text style={[styles.sectionHeader, { color: colors.secondary }]}>{STRINGS.HOME.FUTURE_EVENTS}</Text>
                {futureEvents.map((event) => (
                  <EventCard key={event.eventId} event={event} refreshTrigger={statsRefreshTrigger} accentColor={colors.secondary} />
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
              <Text style={styles.empty}>{STRINGS.HOME.NO_EVENTS}</Text>
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
                <Text style={styles.modalTitle}>{STRINGS.FILTER.TITLE}</Text>

                <Pressable
                  style={styles.filterOption}
                  onPress={() => handleFilterSelect('upcoming')}
                >
                  <Text style={styles.filterOptionText}>{STRINGS.FILTER.UPCOMING}</Text>
                  {filter === 'upcoming' && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>

                <Pressable
                  style={styles.filterOption}
                  onPress={() => handleFilterSelect('past')}
                >
                  <Text style={styles.filterOptionText}>{STRINGS.FILTER.PAST}</Text>
                  {filter === 'past' && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>

                <Pressable
                  style={styles.filterOption}
                  onPress={() => handleFilterSelect('all')}
                >
                  <Text style={styles.filterOptionText}>{STRINGS.FILTER.ALL}</Text>
                  {filter === 'all' && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.cancelButtonText}>{STRINGS.FILTER.CANCEL}</Text>
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
                  <AvatarDisplay avatarUrl={discordAvatar} username={discordUsername} size={80} />
                  <Text style={styles.userModalUsername}>{discordUsername || STRINGS.USER.FALLBACK_USERNAME}</Text>
                </View>

                <Pressable
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutButtonText}>{STRINGS.USER.LOGOUT}</Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setShowUserModal(false)}
                >
                  <Text style={styles.cancelButtonText}>{STRINGS.FILTER.CANCEL}</Text>
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
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  userButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuButtonText: {
    fontSize: 28,
    color: colors.info,
    fontWeight: '600',
    letterSpacing: -1,
  },
  list: {
    padding: 16,
  },
  sectionHeader: {
    ...microknightText.base,
    fontWeight: '600',
    color: colors.primary,
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
    color: colors.textTertiary,
    marginTop: 32,
  },
  error: {
    ...microknightText.md,
    color: colors.error,
    textAlign: 'center',
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
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
    backgroundColor: colors.modalBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  filterOptionText: {
    ...microknightText.md,
    color: colors.textPrimary,
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  userModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  userModalUsername: {
    ...microknightText.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.discord,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButtonText: {
    ...microknightText.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.error,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...microknightText.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
