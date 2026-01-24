import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { EventDetailsSection } from '@/components/EventDetailsSection';
import { EventTaskList } from '@/components/EventTaskList';
import { MissingFieldsAlert } from '@/components/MissingFieldsAlert';
import { colors } from '@/constants/colors';
import { STRINGS } from '@/constants/strings';
import { microknightText } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useEventDetails } from '@/hooks/useEventDetails';
import { useTaskAssignmentSync } from '@/hooks/useTaskAssignmentSync';
import { useTaskToggle } from '@/hooks/useTaskToggle';
import { getMissingEventFields } from '@/lib/event-validation';
import { fetchEventTaskAssignments } from '@/lib/task-assignments';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasRequiredRole, discordUsername } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const {
    event,
    loading,
    crewTasks,
    assignedTasks,
    setAssignedTasks,
    setAllAssignments,
    getUsernamesForTask,
  } = useEventDetails(id);

  const { toggleTask, saveStatus, saveError } = useTaskToggle(
    event,
    crewTasks,
    assignedTasks,
    setAssignedTasks,
    setAllAssignments,
    discordUsername
  );

  // Set up real-time subscription for task assignments
  useTaskAssignmentSync({
    eventId: event?.eventId,
    onUpdate: async () => {
      if (!event?.eventId) return;
      try {
        const eventAssignments = await fetchEventTaskAssignments(event.eventId);
        setAllAssignments(eventAssignments);
      } catch (error) {
        console.error('Error reloading assignments after real-time update:', error);
      }
    },
  });

  if (loading) {
    return <AppLoadingScreen message={STRINGS.LOADING.LOADING_EVENT_DETAILS} />;
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{STRINGS.EVENT.NOT_FOUND}</Text>
      </View>
    );
  }

  const startDate = format(event.startDate, 'EEEE, MMMM dd, yyyy');
  const startTime = format(event.startDate, 'HH:mm');
  const endTime = format(event.endDate, 'HH:mm');
  const missingFields = getMissingEventFields(event);
  const isPastEvent = event.endDate.getTime() < Date.now();

  return (
    <>
      <Stack.Screen
        options={{
          title: STRINGS.EVENT.HEADER_TITLE,
          headerBackTitle: 'Events',
          headerShown: true,
          headerLargeTitle: false,
          headerTitleStyle: {
            fontFamily: 'microknight',
          },
          headerBackTitleStyle: {
            fontFamily: 'microknight',
          },
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.date}>{startDate}</Text>
          <Text style={styles.time}>
            {startTime} - {endTime}
          </Text>
        </View>

        {hasRequiredRole && <MissingFieldsAlert missingFields={missingFields} />}

        {hasRequiredRole ? (
          <EventTaskList
            crewTasks={crewTasks}
            assignedTasks={assignedTasks}
            isPastEvent={isPastEvent}
            discordUsername={discordUsername}
            getUsernamesForTask={getUsernamesForTask}
            onToggleTask={toggleTask}
            saveStatus={saveStatus}
            saveError={saveError}
          />
        ) : (
          <View style={styles.section}>
            <View style={styles.unauthorizedContainer}>
              <Text style={styles.unauthorizedIcon}>😊</Text>
              <Text style={styles.unauthorizedText}>
                {STRINGS.EVENT.UNAUTHORIZED_MESSAGE}
              </Text>
            </View>
          </View>
        )}

        {hasRequiredRole && (
          <Pressable
            style={styles.detailsToggle}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.detailsToggleText}>
              {showDetails ? STRINGS.EVENT.DETAILS_HIDE : STRINGS.EVENT.DETAILS_SHOW}
            </Text>
            <Text style={styles.detailsToggleIcon}>
              {showDetails ? '▼' : '▶'}
            </Text>
          </Pressable>
        )}

        {(showDetails || !hasRequiredRole) && <EventDetailsSection event={event} />}
      </ScrollView>
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
  header: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  title: {
    ...microknightText['2xl'],
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  date: {
    ...microknightText.lg,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  time: {
    ...microknightText.md,
    color: colors.textTertiary,
  },
  section: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    marginTop: 12,
  },
  error: {
    ...microknightText.md,
    color: colors.error,
  },
  detailsToggle: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsToggleText: {
    ...microknightText.md,
    color: colors.primary,
  },
  detailsToggleIcon: {
    ...microknightText.sm,
    color: colors.primary,
  },
  unauthorizedContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  unauthorizedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  unauthorizedText: {
    ...microknightText.base,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
