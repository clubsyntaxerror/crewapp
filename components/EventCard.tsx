import { colors } from "@/constants/colors";
import { microknightText } from "@/constants/typography";
import { useAuth } from "@/contexts/AuthContext";
import { canManageEvent } from "@/lib/event-access";
import { EventSignupStats, getEventSignupStats } from "@/lib/task-assignments";
import { Event } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RainbowText } from "./RainbowText";

interface EventCardProps {
  event: Event;
  refreshTrigger?: number;
  accentColor?: string;
  rainbowTitle?: boolean;
  titleColor?: string;
}

export function EventCard({
  event,
  refreshTrigger,
  accentColor = colors.primary,
  rainbowTitle = false,
  titleColor,
}: EventCardProps) {
  const router = useRouter();
  const { userRoles } = useAuth();
  const canManage = canManageEvent(event.taskListName, userRoles);
  const [stats, setStats] = useState<EventSignupStats | null>(null);
  const startDate = format(event.startDate, "MMMM dd, yyyy");
  const startTime = format(event.startDate, "HH:mm");

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
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
    >
      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          {rainbowTitle ? (
            <View style={styles.titleContainer}>
              <RainbowText style={styles.title}>{event.title}</RainbowText>
            </View>
          ) : (
            <Text style={[styles.title, titleColor && { color: titleColor }]}>
              {event.title}
            </Text>
          )}
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={rainbowTitle ? colors.textSecondary : colors.textTertiary}
              style={styles.dateIcon}
            />
            <Text style={[styles.date, rainbowTitle && styles.dateHighlight]}>
              {startDate}, {startTime}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={rainbowTitle ? colors.textSecondary : colors.textTertiary}
            />
            <Text style={[styles.venue, rainbowTitle && styles.venueHighlight]}>
              {event.venueName}
            </Text>
          </View>
        </View>

        {canManage && stats && stats.total > 0 && (
          <View style={styles.statsInfo}>
            {stats.participating > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statEmoji]}>💪</Text>
                <Text style={styles.statNumber}>{stats.participating}</Text>
              </View>
            )}
            {stats.absent > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statEmoji]}>🏝️</Text>
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
    borderRadius: 2,
    padding: 16,
    marginBottom: 12,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.8,
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
  },
  statNumber: {
    ...microknightText.md,
    color: colors.textPrimary,
  },
  titleContainer: {
    marginBottom: 4,
  },
  title: {
    ...microknightText.lg,
    marginBottom: 4,
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateIcon: {
    marginTop: -4,
  },
  date: {
    ...microknightText.base,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  venue: {
    ...microknightText.md,
    color: colors.textTertiary,
  },
  dateHighlight: {
    color: colors.textSecondary,
  },
  venueHighlight: {
    color: colors.textSecondary,
  },
});
