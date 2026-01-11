import { microknightText } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEvents, fetchTaskList } from '@/lib/google-sheets';
import { openMapLocation } from '@/lib/maps';
import { supabase } from '@/lib/supabase';
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
      const absentTaskId = crewTasks[crewTasks.length - 1]?.id;

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
          newSet.delete(absentTaskId);
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
  useEffect(() => {
    if (!event?.eventId) return;

    // Subscribe to changes in task_assignments for this event
    const channel = supabase
      .channel(`task_assignments:${event.eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'task_assignments',
          filter: `event_id=eq.${event.eventId}`,
        },
        async (payload) => {
          console.log('Real-time update received:', payload);

          // Reload all assignments to update the display
          try {
            const eventAssignments = await fetchEventTaskAssignments(event.eventId);
            setAllAssignments(eventAssignments);
          } catch (error) {
            console.error('Error reloading assignments after real-time update:', error);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.eventId]);

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
    const absentTaskId = crewTasks[crewTasks.length - 1]?.id;
    const isAbsent = assignedTasks.has(absentTaskId);

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
        <ActivityIndicator size="large" color="#007AFF" />
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
            <Text style={styles.sectionTitle}>Stuff to complete:</Text>
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
              const isAbsentTask = index === crewTasks.length - 1;
              const isAbsentChecked = assignedTasks.has(crewTasks[crewTasks.length - 1]?.id);
              const isDisabled = isPastEvent || (!isAbsentTask && isAbsentChecked);
              const usernames = getUsernamesForTask(task.id);

              return (
                <Pressable
                  key={task.id}
                  style={[
                    styles.crewTaskItem,
                    isDisabled && styles.crewTaskItemDisabled
                  ]}
                  onPress={() => !isDisabled && toggleTask(task.id)}
                  disabled={isDisabled}
                >
                  <View style={[
                    styles.checkbox,
                    isDisabled && styles.checkboxDisabled
                  ]}>
                    {assignedTasks.has(task.id) && (
                      <Text style={styles.checkboxChecked}>✓</Text>
                    )}
                  </View>
                  <View style={styles.crewTaskTextContainer}>
                    <Text style={[
                      styles.crewTaskText,
                      assignedTasks.has(task.id) && styles.crewTaskTextChecked,
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
                              username === discordUsername && styles.crewTaskUsernameOwn,
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
                    <ActivityIndicator size="small" color="#8e8e93" />
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

        {showDetails && (
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
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#1c1c1e',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#38383a',
  },
  title: {
    ...microknightText['2xl'],
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
  },
  date: {
    ...microknightText.lg,
    color: '#e5e5ea',
    marginBottom: 4,
  },
  time: {
    ...microknightText.md,
    color: '#8e8e93',
  },
  section: {
    backgroundColor: '#1c1c1e',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    ...microknightText.base,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  venue: {
    ...microknightText.xl,
    fontWeight: '600',
    color: '#fff',
  },
  address: {
    ...microknightText.md,
    color: '#8e8e93',
    marginTop: 4,
  },
  mapButton: {
    backgroundColor: '#30d158',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    ...microknightText.base,
    color: '#fff',
    fontWeight: '600',
  },
  description: {
    ...microknightText.md,
    color: '#e5e5ea',
  },
  info: {
    ...microknightText.md,
    color: '#e5e5ea',
    marginBottom: 4,
  },
  ticketsButton: {
    backgroundColor: '#ff9f0a',
    padding: 16,
    margin: 20,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  ticketsButtonText: {
    ...microknightText.md,
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#0a84ff',
    padding: 16,
    margin: 20,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    ...microknightText.md,
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    ...microknightText.md,
    color: '#ff453a',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskBullet: {
    ...microknightText.md,
    color: '#ff453a',
    marginRight: 8,
  },
  taskText: {
    ...microknightText.base,
    flex: 1,
    color: '#e5e5ea',
  },
  detailsToggle: {
    backgroundColor: '#1c1c1e',
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsToggleText: {
    ...microknightText.md,
    color: '#0a84ff',
  },
  detailsToggleIcon: {
    ...microknightText.sm,
    color: '#0a84ff',
  },
  crewTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0a84ff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    color: '#0a84ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  crewTaskTextContainer: {
    flex: 1,
  },
  crewTaskText: {
    ...microknightText.md,
    color: '#e5e5ea',
  },
  crewTaskTextChecked: {
    color: '#0a84ff',
    fontWeight: '600',
  },
  crewTaskDescription: {
    ...microknightText.sm,
    color: '#8e8e93',
    marginTop: 2,
  },
  crewTaskUsernamesContainer: {
    marginTop: 4,
  },
  crewTaskUsername: {
    ...microknightText.xs,
    color: '#ff9f0a',
    fontStyle: 'italic',
  },
  crewTaskUsernameOwn: {
    color: '#0a84ff',
  },
  crewTaskItemDisabled: {
    opacity: 0.4,
  },
  checkboxDisabled: {
    borderColor: '#8e8e93',
  },
  crewTaskTextDisabled: {
    color: '#8e8e93',
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
    backgroundColor: '#2c2c2e',
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
    color: '#8e8e93',
  },
  statusTextSuccess: {
    color: '#30d158',
  },
  statusTextError: {
    color: '#ff453a',
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
    color: '#8e8e93',
    textAlign: 'center',
  },
});
