import { colors } from "@/constants/colors";
import { STRINGS } from "@/constants/strings";
import { microknightText } from "@/constants/typography";
import { StyleSheet, Text, View } from "react-native";

interface MissingField {
  label: string;
  completed: boolean;
}

interface MissingFieldsAlertProps {
  missingFields: MissingField[];
}

export function MissingFieldsAlert({ missingFields }: MissingFieldsAlertProps) {
  if (missingFields.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{STRINGS.EVENT.TASKS_MISSING}</Text>
      {missingFields.map((field, index) => (
        <View key={index} style={styles.taskItem}>
          <Text style={styles.taskBullet}>•</Text>
          <Text style={styles.taskText}>{field.label}</Text>
        </View>
      ))}
    </View>
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
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
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
});
