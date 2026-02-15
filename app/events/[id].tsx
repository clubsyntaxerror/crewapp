import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { EventCard } from "@/components/EventCard";
import { EventDetailsSection } from "@/components/EventDetailsSection";
import { EventTaskList } from "@/components/EventTaskList";
import { MissingFieldsAlert } from "@/components/MissingFieldsAlert";
import { colors } from "@/constants/colors";
import { STRINGS } from "@/constants/strings";
import { microknightText } from "@/constants/typography";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useEventDetails } from "@/hooks/useEventDetails";
import { canManageEvent } from "@/lib/event-access";
import { useTaskToggle } from "@/hooks/useTaskToggle";
import { getMissingEventFields } from "@/lib/event-validation";
import { fetchEventTaskAssignments } from "@/lib/task-assignments";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasRequiredRole, discordUsername, userRoles } = useAuth();
  const { taskAssignmentVersion } = useEvents();
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
    discordUsername,
    userRoles,
  );

  // Track if this is the initial mount to skip the first effect run
  const isInitialMount = useRef(true);

  // Reload all assignments when real-time updates occur (to show other users' changes)
  // We only refetch allAssignments, not assignedTasks - the user's own state is managed
  // optimistically by useTaskToggle for instant feedback
  useEffect(() => {
    // Skip on initial mount (data is already loaded by useEventDetails)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!event?.eventId) return;

    // Only refetch all assignments to see other users' changes
    // Don't refetch user's own assignedTasks - trust the optimistic update
    fetchEventTaskAssignments(event.eventId)
      .then(setAllAssignments)
      .catch((error) => {
        console.error("Error reloading assignments after real-time update:", error);
      });
  }, [taskAssignmentVersion, event?.eventId, setAllAssignments]);

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

  const missingFields = getMissingEventFields(event);
  const isPastEvent = event.endDate.getTime() < Date.now();
  const canManage = canManageEvent(event.taskListName, userRoles);

  return (
    <>
      <Stack.Screen
        options={{
          title: STRINGS.EVENT.HEADER_TITLE,
          headerBackTitle: "Events",
          headerShown: true,
          headerLargeTitle: false,
          headerTitleStyle: {
            fontFamily: "microknight",
          },
          headerBackTitleStyle: {
            fontFamily: "microknight",
          },
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.cardWrapper}>
          <EventCard event={event} static />
        </View>

        {canManage && (
          <MissingFieldsAlert missingFields={missingFields} />
        )}

        <Pressable
          style={styles.detailsToggle}
          onPress={() => setShowDetails(!showDetails)}
        >
          <Text style={styles.detailsToggleText}>
            {showDetails
              ? STRINGS.EVENT.DETAILS_HIDE
              : STRINGS.EVENT.DETAILS_SHOW}
          </Text>
          <Text style={styles.detailsToggleIcon}>
            {showDetails ? "▼" : "▶"}
          </Text>
        </Pressable>

        {showDetails && <EventDetailsSection event={event} />}

        {canManage ? (
          <EventTaskList
            crewTasks={crewTasks}
            assignedTasks={assignedTasks}
            isPastEvent={isPastEvent}
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
                {hasRequiredRole
                  ? STRINGS.EVENT.EVENT_FULL_MESSAGE
                  : STRINGS.EVENT.UNAUTHORIZED_MESSAGE}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 12,
  },
  cardWrapper: {
    padding: 16,
    paddingBottom: 0,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailsToggleText: {
    ...microknightText.md,
    color: colors.retroBlue,
  },
  detailsToggleIcon: {
    ...microknightText.sm,
    color: colors.retroBlue,
  },
  unauthorizedContainer: {
    alignItems: "center",
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
    textAlign: "center",
  },
});
