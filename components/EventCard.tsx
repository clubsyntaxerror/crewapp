import { Pressable, Text, StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Event } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getEventSignupStats, EventSignupStats } from '@/lib/task-assignments';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const [stats, setStats] = useState<EventSignupStats | null>(null);
  const startDate = format(event.startDate, 'MMM dd, yyyy');

  useEffect(() => {
    loadStats();
  }, [event.eventId]);

  const loadStats = async () => {
    try {
      const eventStats = await getEventSignupStats(event.eventId);
      setStats(eventStats);
    } catch (error) {
      console.error('Error loading event stats:', error);
      // Don't block rendering if stats fail to load
    }
  };

  const handlePress = () => {
    router.push({
      pathname: '/events/[id]',
      params: { id: event.eventId },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
    >
      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.date}>{startDate}</Text>
          <Text style={styles.venue}>{event.venueName}</Text>
        </View>

        {stats && stats.total > 0 && (
          <View style={styles.statsInfo}>
            {stats.participating > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>✅</Text>
                <Text style={styles.statNumber}>{stats.participating}</Text>
              </View>
            )}
            {stats.absent > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>😢</Text>
                <Text style={styles.statNumber}>{stats.absent}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mainInfo: {
    flex: 1,
  },
  statsInfo: {
    marginLeft: 16,
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: {
    fontSize: 16,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'microknight',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#fff',
    fontFamily: 'microknight',
  },
  date: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 8,
    fontFamily: 'microknight',
  },
  venue: {
    fontSize: 16,
    color: '#e5e5ea',
    fontFamily: 'microknight',
  },
});
