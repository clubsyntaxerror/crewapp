import { Pressable, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Event } from '@/lib/types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const startDate = format(event.startDate, 'MMM dd, yyyy');
  const startTime = format(event.startDate, 'HH:mm');

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
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.date}>{startDate}</Text>
      <Text style={styles.venue}>{event.venueName}</Text>
      <Text style={styles.time}>{startTime}</Text>
      {event.coverFee && <Text style={styles.coverFee}>{event.coverFee}</Text>}
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
    marginBottom: 2,
    fontFamily: 'microknight',
  },
  time: {
    fontSize: 14,
    color: '#8e8e93',
    fontFamily: 'microknight',
  },
  coverFee: {
    marginTop: 8,
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: 'microknight',
  },
});
