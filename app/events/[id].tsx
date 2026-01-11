import { colors } from '@/constants/colors';
import { microknightText } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskAssignmentSync } from '@/hooks/useTaskAssignmentSync';
import { getAbsentTaskId, isAbsentTask } from '@/lib/task-utils';
import { fetchEvents, fetchTaskList } from '@/lib/google-sheets';
import { openMapLocation } from '@/lib/maps';
import {
  fetchEventTaskAssignments,
  fetchUserEventTaskAssignments,
  saveUserTaskAssignments,
  TaskAssignment,
} from '@/lib/task-assignments';
import { CrewTask, Event } from '@/lib/types';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface TaskItem {
  label: string;
  completed: boolean;
}

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasRequiredRole, discordUsername } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Set<string>>(new Set());
  const [crewTasks, setCrewTasks] = useState<CrewTask[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [allAssignments, setAllAssignments] = useState<TaskAssignment[]>([]);

  // Get usernames for a specific task
  const getUsernamesForTask = (taskId: string): string[] => {
    const usernames = allAssignments
      .filter((a) => a.task_id === taskId && a.username)
      .map((a) => a.username!);

    // Remove duplicates
    return [...new Set(usernames)];
  };

  const toggleTask = (taskId: string) => {
    if (!event) return;
    const isPast = event.endDate.getTime() < Date.now();
    if (isPast) return;

    setAssignedTasks((prev) => {
      const newSet = new Set(prev);
      const absentTaskId = getAbsentTaskId(crewTasks);

      // If toggling the absent task
      if (taskId === absentTaskId) {
        if (newSet.has(taskId)) {
          // Unchecking absent - just remove it
          newSet.delete(taskId);
        } else {
          // Checking absent - clear all other tasks and add only absent
          newSet.clear();
          newSet.add(taskId);
        }
      } else {
        // Toggling a regular task
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          // Remove absent if present, then add the task
          if (absentTaskId) {
            newSet.delete(absentTaskId);
          }
          newSet.add(taskId);
        }
      }

      // Auto-save after state update
      saveAssignments(newSet);

      return newSet;
    });
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

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

  const loadEvent = async () => {
    try {
      const events = await fetchEvents();
      const found = events.find((e) => e.eventId === id);
      setEvent(found || null);

      if (found) {
        // Load task list for this event
        const tasks = await fetchTaskList(found.taskListName);
        setCrewTasks(tasks);

        // Load user's saved task assignments
        try {
          const savedAssignments = await fetchUserEventTaskAssignments(found.eventId);
          const savedTaskIds = new Set(savedAssignments.map((a) => a.task_id));
          setAssignedTasks(savedTaskIds);
        } catch (error) {
          console.error('Error loading saved task assignments:', error);
          // Don't fail the whole load if assignments fail
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

  const getCommitmentEmoji = () => {
    const absentTaskId = getAbsentTaskId(crewTasks);
    const isAbsent = absentTaskId ? assignedTasks.has(absentTaskId) : false;

    if (isAbsent) {
      return '😢'; // Sad - marked as absent
    }

    // Count non-absent tasks
    const totalTasks = crewTasks.length - 1; // Exclude absent
    const selectedCount = Array.from(assignedTasks).filter(
      (taskId) => taskId !== absentTaskId
    ).length;

    if (selectedCount === 0) {
      return ''; // No emoji when nothing selected
    }

    // If task list has <= 4 tasks, show happiest emoji when all are checked
    if (totalTasks <= 4) {
      if (selectedCount === totalTasks) {
        return '🤩'; // All tasks - super excited!
      } else if (selectedCount === 3) {
        return '😄'; // 3 tasks - very happy
      } else if (selectedCount === 2) {
        return '😊'; // 2 tasks - happy
      } else {
        return '🙂'; // 1 task - appreciated!
      }
    }

    // For task lists with > 4 tasks, add wild emojis for overachievers
    if (selectedCount >= 8) {
      return '💫'; // 8+ tasks - LEGENDARY WIZARD!
    } else if (selectedCount >= 7) {
      return '🖖'; // 7 tasks - MAGICAL UNICORN!
    } else if (selectedCount >= 6) {
      return '🧙'; // 6 tasks - ROCKSTAR!
    } else if (selectedCount >= 5) {
      return '🦄'; // 5 tasks - SUPERSTAR!
    } else if (selectedCount === 4) {
      return '🤩'; // 4 tasks - super excited!
    } else if (selectedCount === 3) {
      return '😄'; // 3 tasks - very happy
    } else if (selectedCount === 2) {
      return '😊'; // 2 tasks - happy
    } else {
      return '🙂'; // 1 task - appreciated!
    }
  };

  const saveAssignments = async (taskSet: Set<string>) => {
    if (!event) return;

    setSaveStatus('saving');
    setSaveError(null);

    try {
      // Get the selected tasks (with full details)
      const selectedTasks = crewTasks.filter((task) => taskSet.has(task.id));

      // Save to Supabase with event context
      await saveUserTaskAssignments(
        event.eventId,
        event.taskListName || 'H62',
        selectedTasks,
        event.title,
        event.startDate,
        discordUsername || undefined
      );

      // Reload all assignments to update the display
      const eventAssignments = await fetchEventTaskAssignments(event.eventId);
      setAllAssignments(eventAssignments);

      setSaveStatus('saved');
      // Clear "saved" status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving task assignments:', error);
      setSaveStatus('error');
      setSaveError('Failed to save. Please try again.');
      // Clear error status after 5 seconds
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.info} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Event not found</Text>
      </View>
    );
  }

  const startDate = format(event.startDate, 'EEEE, MMMM dd, yyyy');
  const startTime = format(event.startDate, 'HH:mm');
  const endTime = format(event.endDate, 'HH:mm');

  const isNumeric = (value: string | undefined): boolean => {
    if (!value) return false;
    return /^\d+/.test(value.trim());
  };

  const getTasks = (): TaskItem[] => {
    const tasks: TaskItem[] = [];

    if (!event.ticketsUrl) {
      tasks.push({ label: 'Tickets site', completed: false });
    }
    if (!event.facebookUrl) {
      tasks.push({ label: 'Facebook event', completed: false });
    }
    if (!event.coverFee || !isNumeric(event.coverFee)) {
      tasks.push({ label: 'Cover fee', completed: false });
    }
    if (!event.venueName) {
      tasks.push({ label: 'Venue', completed: false });
    }
    if (!event.description) {
      tasks.push({ label: 'Description', completed: false });
    }
    if (!event.streetAddress) {
      tasks.push({ label: 'Address', completed: false });
    }

    return tasks;
  };

  const tasks = getTasks();
  const isPastEvent = event.endDate.getTime() < Date.now();

  // Rainbow colors for crew tasks
  const rainbowColors = colors.rainbow;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Crew & volunteer signup',
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

        {hasRequiredRole && tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You're missing:</Text>
            {tasks.map((task, index) => (
              <View key={index} style={styles.taskItem}>
                <Text style={styles.taskBullet}>•</Text>
                <Text style={styles.taskText}>{task.label}</Text>
              </View>
            ))}
          </View>
        )}

        {hasRequiredRole ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isPastEvent ? 'Responsibilities (Event ended):' : 'Commit to responsibilities:'}
            </Text>
            {crewTasks.map((task, index) => {
              const taskIsAbsent = isAbsentTask(task, crewTasks);
              const absentTaskId = getAbsentTaskId(crewTasks);
              const isAbsentChecked = absentTaskId ? assignedTasks.has(absentTaskId) : false;
              const isDisabled = isPastEvent || (!taskIsAbsent && isAbsentChecked);
              const usernames = getUsernamesForTask(task.id);
              const taskColor = rainbowColors[index % rainbowColors.length];

              return (
                <Pressable
                  key={task.id}
                  style={[
                    styles.crewTaskItem,
                    { backgroundColor: taskColor + '20' }, // 20 is 12.5% opacity in hex
                    isDisabled && styles.crewTaskItemDisabled
                  ]}
                  onPress={() => !isDisabled && toggleTask(task.id)}
                  disabled={isDisabled}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: taskColor },
                    isDisabled && styles.checkboxDisabled
                  ]}>
                    {assignedTasks.has(task.id) && (
                      <Text style={[styles.checkboxChecked, { color: taskColor }]}>✓</Text>
                    )}
                  </View>
                  <View style={styles.crewTaskTextContainer}>
                    <Text style={[
                      styles.crewTaskText,
                      assignedTasks.has(task.id) && { color: taskColor, fontWeight: '600' },
                      isDisabled && styles.crewTaskTextDisabled
                    ]}>
                      {task.label}
                    </Text>
                    {task.description && (
                      <Text style={[
                        styles.crewTaskDescription,
                        isDisabled && styles.crewTaskTextDisabled
                      ]}>
                        {task.description}
                      </Text>
                    )}
                    {usernames.length > 0 && (
                      <Text style={styles.crewTaskUsernamesContainer}>
                        {usernames.map((username, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.crewTaskUsername,
                              { color: taskColor },
                              username === discordUsername && { fontWeight: '600' },
                              isDisabled && styles.crewTaskTextDisabled
                            ]}
                          >
                            {username}{idx < usernames.length - 1 ? ', ' : ''}
                          </Text>
                        ))}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {!isPastEvent && (
              <View style={styles.statusContainer}>
                {/* Commitment emoji centered */}
                {getCommitmentEmoji() && (
                  <Text style={styles.commitmentEmoji}>{getCommitmentEmoji()}</Text>
                )}

                {/* Save status indicators on the right */}
                {saveStatus === 'saving' && (
                  <View style={styles.statusBadge}>
                    <ActivityIndicator size="small" color={colors.textTertiary} />
                    <Text style={styles.statusText}>Saving...</Text>
                  </View>
                )}
                {saveStatus === 'saved' && (
                  <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
                    <Text style={styles.statusIcon}>✓</Text>
                    <Text style={[styles.statusText, styles.statusTextSuccess]}>Saved</Text>
                  </View>
                )}
                {saveStatus === 'error' && (
                  <View style={[styles.statusBadge, styles.statusBadgeError]}>
                    <Text style={styles.statusIcon}>!</Text>
                    <Text style={[styles.statusText, styles.statusTextError]}>
                      {saveError || 'Error saving'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.unauthorizedContainer}>
              <Text style={styles.unauthorizedIcon}>😊</Text>
              <Text style={styles.unauthorizedText}>
                Want to help out with our events? Reach out to us on Discord to learn about volunteering!
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
              {showDetails ? 'Hide Event Details' : 'Show Event Details'}
            </Text>
            <Text style={styles.detailsToggleIcon}>
              {showDetails ? '▼' : '▶'}
            </Text>
          </Pressable>
        )}

        {(showDetails || !hasRequiredRole) && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue</Text>
              <Text style={styles.venue}>{event.venueName}</Text>
              {event.streetAddress && (
                <>
                  <Text style={styles.address}>{event.streetAddress}</Text>
                  <Pressable
                    style={styles.mapButton}
                    onPress={() => openMapLocation(event.streetAddress!, event.venueName)}
                  >
                    <Text style={styles.mapButtonText}>Open in Maps</Text>
                  </Pressable>
                </>
              )}
            </View>

            {event.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{event.description}</Text>
              </View>
            )}

            {event.coverFee && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Entry Fee</Text>
                <Text style={styles.info}>{event.coverFee}</Text>
              </View>
            )}

            {event.ageLimit && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Age Limit</Text>
                <Text style={styles.info}>{event.ageLimit}</Text>
              </View>
            )}

            {(event.payingGuests !== undefined ||
              event.nonPayingGuests !== undefined) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Expected Attendance</Text>
                {event.payingGuests !== undefined && (
                  <Text style={styles.info}>Paying guests: {event.payingGuests}</Text>
                )}
                {event.nonPayingGuests !== undefined && (
                  <Text style={styles.info}>
                    Non-paying guests: {event.nonPayingGuests}
                  </Text>
                )}
              </View>
            )}

            {event.ticketsUrl && (
              <Pressable
                style={styles.ticketsButton}
                onPress={() => Linking.openURL(event.ticketsUrl!)}
              >
                <Text style={styles.ticketsButtonText}>
                  {event.ticketsTitle || 'Get Tickets'}
                </Text>
              </Pressable>
            )}

            {event.facebookUrl && (
              <Pressable
                style={styles.button}
                onPress={() => Linking.openURL(event.facebookUrl!)}
              >
                <Text style={styles.buttonText}>View Facebook Event</Text>
              </Pressable>
            )}
          </>
        )}
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
  sectionTitle: {
    ...microknightText.base,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  venue: {
    ...microknightText.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  address: {
    ...microknightText.md,
    color: colors.textTertiary,
    marginTop: 4,
  },
  mapButton: {
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    ...microknightText.base,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  description: {
    ...microknightText.md,
    color: colors.textSecondary,
  },
  info: {
    ...microknightText.md,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ticketsButton: {
    backgroundColor: colors.primary,
    padding: 16,
    margin: 20,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  ticketsButtonText: {
    ...microknightText.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    margin: 20,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    ...microknightText.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  error: {
    ...microknightText.md,
    color: colors.error,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskBullet: {
    ...microknightText.md,
    color: colors.error,
    marginRight: 8,
  },
  taskText: {
    ...microknightText.base,
    flex: 1,
    color: colors.textSecondary,
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
  crewTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  crewTaskTextContainer: {
    flex: 1,
  },
  crewTaskText: {
    ...microknightText.md,
    color: colors.textSecondary,
  },
  crewTaskDescription: {
    ...microknightText.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  crewTaskUsernamesContainer: {
    marginTop: 4,
  },
  crewTaskUsername: {
    ...microknightText.xs,
    fontStyle: 'italic',
  },
  crewTaskItemDisabled: {
    opacity: 0.4,
  },
  checkboxDisabled: {
    borderColor: colors.textTertiary,
  },
  crewTaskTextDisabled: {
    color: colors.textTertiary,
  },
  statusContainer: {
    marginTop: 12,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  commitmentEmoji: {
    fontSize: 32,
  },
  statusBadge: {
    position: 'absolute',
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.modalBackground,
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  statusBadgeError: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  statusIcon: {
    ...microknightText.base,
    marginRight: 6,
  },
  statusText: {
    ...microknightText.sm,
    color: colors.textTertiary,
  },
  statusTextSuccess: {
    color: colors.success,
  },
  statusTextError: {
    color: colors.error,
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
