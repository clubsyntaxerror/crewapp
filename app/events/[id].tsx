import crewTasksData from '@/lib/crew-tasks.json';
import { fetchEvents } from '@/lib/google-sheets';
import { openMapLocation } from '@/lib/maps';
import { Event } from '@/lib/types';
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
import { useAuth } from '@/contexts/AuthContext';

interface TaskItem {
  label: string;
  completed: boolean;
}

interface CrewTask {
  id: string;
  label: string;
  description?: string;
}

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasRequiredRole } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Set<string>>(new Set());

  const crewTasks: CrewTask[] = crewTasksData;

  const toggleTask = (taskId: string) => {
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

      return newSet;
    });
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      const events = await fetchEvents();
      const found = events.find((e) => e.eventId === id);
      setEvent(found || null);
    } catch (error) {
      console.error('Error loading event:', error);
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
                  </View>
                </Pressable>
              );
            })}
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
    fontFamily: 'microknight',
  },
  date: {
    fontSize: 18,
    color: '#e5e5ea',
    marginBottom: 4,
    fontFamily: 'microknight',
  },
  time: {
    fontSize: 16,
    color: '#8e8e93',
    fontFamily: 'microknight',
  },
  section: {
    backgroundColor: '#1c1c1e',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
    fontFamily: 'microknight',
  },
  venue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'microknight',
  },
  address: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 4,
    fontFamily: 'microknight',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'microknight',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#e5e5ea',
    fontFamily: 'microknight',
  },
  info: {
    fontSize: 16,
    color: '#e5e5ea',
    marginBottom: 4,
    fontFamily: 'microknight',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'microknight',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'microknight',
  },
  error: {
    fontSize: 16,
    color: '#ff453a',
    fontFamily: 'microknight',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskBullet: {
    color: '#ff453a',
    fontSize: 16,
    marginRight: 8,
    fontFamily: 'microknight',
  },
  taskText: {
    flex: 1,
    color: '#e5e5ea',
    fontSize: 14,
    fontFamily: 'microknight',
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
    color: '#0a84ff',
    fontSize: 16,
    fontFamily: 'microknight',
  },
  detailsToggleIcon: {
    color: '#0a84ff',
    fontSize: 12,
    fontFamily: 'microknight',
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
    fontSize: 16,
    color: '#e5e5ea',
    fontFamily: 'microknight',
  },
  crewTaskTextChecked: {
    color: '#0a84ff',
    fontWeight: '600',
  },
  crewTaskDescription: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: 'microknight',
    marginTop: 2,
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
    fontSize: 14,
    color: '#8e8e93',
    fontFamily: 'microknight',
    textAlign: 'center',
    lineHeight: 20,
  },
});
