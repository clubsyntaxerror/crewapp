import { colors } from "@/constants/colors";
import { STRINGS } from "@/constants/strings";
import { microknightText } from "@/constants/typography";
import { openMapLocation } from "@/lib/google-sheets";
import { Event } from "@/lib/types";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

interface EventDetailsSectionProps {
  event: Event;
}

export function EventDetailsSection({ event }: EventDetailsSectionProps) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.EVENT.VENUE_TITLE}</Text>
        <Text style={styles.venue}>{event.venueName}</Text>
        {event.streetAddress && (
          <>
            <Text style={styles.address}>{event.streetAddress}</Text>
            <Pressable
              style={styles.mapButton}
              onPress={() =>
                openMapLocation(event.streetAddress!, event.venueName)
              }
            >
              <Text style={styles.mapButtonText}>
                {STRINGS.EVENT.MAP_BUTTON}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {event.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {STRINGS.EVENT.DESCRIPTION_TITLE}
          </Text>
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
            {event.ticketsTitle || STRINGS.EVENT.TICKETS_BUTTON}
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
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    ...microknightText.base,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  venue: {
    ...microknightText.xl,
    color: colors.textPrimary,
  },
  address: {
    ...microknightText.md,
    color: colors.textTertiary,
    marginTop: 4,
  },
  mapButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  mapButtonText: {
    ...microknightText.base,
    color: colors.textPrimary,
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
    backgroundColor: colors.callToAction,
    padding: 16,
    margin: 20,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  ticketsButtonText: {
    ...microknightText.md,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.facebookBlue,
    padding: 16,
    margin: 20,
    marginTop: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    ...microknightText.md,
    color: colors.textPrimary,
  },
});
