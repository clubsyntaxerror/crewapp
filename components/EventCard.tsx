import { colors } from "@/constants/colors";
import { microknightText } from "@/constants/typography";
import { useAuth } from "@/contexts/AuthContext";
import { EventSignupStats, getEventSignupStats } from "@/lib/task-assignments";
import { Event } from "@/lib/types";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EventCardProps {
  event: Event;
  refreshTrigger?: number;
  accentColor?: string;
}

export function EventCard({
  event,
  refreshTrigger,
  accentColor = colors.primary,
}: EventCardProps) {
  const router = useRouter();
  const { hasRequiredRole } = useAuth();
  const [stats, setStats] = useState<EventSignupStats | null>(null);
  const startDate = format(event.startDate, "MMMM dd, yyyy");

  useEffect(() => {
    loadStats();
  }, [event.eventId, refreshTrigger]);

  const loadStats = async () => {
    try {
      const eventStats = await getEventSignupStats(event.eventId);
      setStats(eventStats);
    } catch (error) {
      console.error("Error loading event stats:", error);
      // Don't block rendering if stats fail to load
    }
  };

  const handlePress = () => {
    router.push({
      pathname: "/events/[id]",
      params: { id: event.eventId },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: accentColor },
        pressed && styles.cardPressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.date}>{startDate}</Text>
          <Text style={styles.venue}>{event.venueName}</Text>
        </View>

        {hasRequiredRole && stats && stats.total > 0 && (
          <View style={styles.statsInfo}>
            {stats.participating > 0 && (
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statEmoji,
                    { textShadowColor: `${accentColor}99` },
                  ]}
                >
                  💪
                </Text>
                <Text style={styles.statNumber}>{stats.participating}</Text>
              </View>
            )}
            {stats.absent > 0 && (
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statEmoji,
                    { textShadowColor: `${accentColor}99` },
                  ]}
                >
                  🏝️
                </Text>
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
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    shadowColor: colors.background,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mainInfo: {
    flex: 1,
  },
  statsInfo: {
    marginLeft: 16,
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statEmoji: {
    fontSize: 16,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statNumber: {
    ...microknightText.md,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  title: {
    ...microknightText.lg,
    fontWeight: "600",
    marginBottom: 4,
    color: colors.textPrimary,
  },
  date: {
    ...microknightText.base,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  venue: {
    ...microknightText.md,
    color: colors.textSecondary,
  },
});
