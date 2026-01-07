import { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { format } from 'date-fns';
import { fetchEvents } from '@/lib/google-sheets';
import { Event } from '@/lib/types';
import { openMapLocation } from '@/lib/maps';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <Stack.Screen
        options={{
          title: event.title,
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
});
