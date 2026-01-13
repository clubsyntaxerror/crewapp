import { View, Text, StyleSheet } from 'react-native';
import { microknightText } from '@/constants/typography';
import { STRINGS } from '@/constants/strings';
import { colors } from '@/constants/colors';

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
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
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
});
