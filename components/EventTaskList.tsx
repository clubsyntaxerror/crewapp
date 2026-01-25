import { colors } from "@/constants/colors";
import {
  COMMITMENT_EMOJIS,
  EMOJI_PROGRESSION,
  EMOJI_THRESHOLDS,
} from "@/constants/gameplay";
import { STRINGS } from "@/constants/strings";
import { microknightText } from "@/constants/typography";
import { ROLE_CONFIG } from "@/contexts/AuthContext";
import { getAbsentTaskId, isAbsentTask } from "@/lib/task-assignments";
import { CrewTask } from "@/lib/types";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface EventTaskListProps {
  crewTasks: CrewTask[];
  assignedTasks: Set<string>;
  isPastEvent: boolean;
  getUsernamesForTask: (
    taskId: string,
  ) => { username: string; role?: string }[];
  onToggleTask: (taskId: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
}

export function EventTaskList({
  crewTasks,
  assignedTasks,
  isPastEvent,
  getUsernamesForTask,
  onToggleTask,
  saveStatus,
  saveError,
}: EventTaskListProps) {
  const rainbowColors = colors.rainbow;

  const getCommitmentEmoji = () => {
    const absentTaskId = getAbsentTaskId(crewTasks);
    if (absentTaskId && assignedTasks.has(absentTaskId)) {
      return COMMITMENT_EMOJIS.ABSENT;
    }

    const selectedCount = Array.from(assignedTasks).filter(
      (taskId) => taskId !== absentTaskId,
    ).length;

    const totalTasks = crewTasks.length - 1;
    const isSmallList = totalTasks <= EMOJI_THRESHOLDS.SMALL_TASK_LIST_MAX;
    const progression = isSmallList
      ? EMOJI_PROGRESSION.small
      : EMOJI_PROGRESSION.large;

    const effectiveCount =
      isSmallList && selectedCount === totalTasks && selectedCount > 0
        ? Infinity
        : selectedCount;

    const tier = progression.find(
      ({ min, max }) => effectiveCount >= min && effectiveCount <= max,
    );

    return tier?.emoji ?? "";
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {isPastEvent
          ? STRINGS.EVENT.TASKS_TITLE_ENDED
          : STRINGS.EVENT.TASKS_TITLE_ACTIVE}
      </Text>

      {crewTasks.map((task, index) => {
        const taskIsAbsent = isAbsentTask(task, crewTasks);
        const absentTaskId = getAbsentTaskId(crewTasks);
        const isAbsentChecked = absentTaskId
          ? assignedTasks.has(absentTaskId)
          : false;
        const isDisabled = isPastEvent || (!taskIsAbsent && isAbsentChecked);
        const usernames = getUsernamesForTask(task.id);
        const taskColor = rainbowColors[index % rainbowColors.length];

        return (
          <Pressable
            key={task.id}
            style={[
              styles.crewTaskItem,
              { backgroundColor: taskColor + "20" },
              isDisabled && styles.crewTaskItemDisabled,
            ]}
            onPress={() => !isDisabled && onToggleTask(task.id)}
            disabled={isDisabled}
          >
            <View
              style={[styles.checkbox, isDisabled && styles.checkboxDisabled]}
            >
              {assignedTasks.has(task.id) && (
                <Text style={styles.checkboxChecked}>✓</Text>
              )}
            </View>
            <View style={styles.crewTaskTextContainer}>
              <Text
                style={[
                  styles.crewTaskText,
                  isDisabled && styles.crewTaskTextDisabled,
                ]}
              >
                {task.label}
              </Text>
              {task.description && (
                <Text
                  style={[
                    styles.crewTaskDescription,
                    isDisabled && styles.crewTaskTextDisabled,
                  ]}
                >
                  {task.description}
                </Text>
              )}
              {usernames.length > 0 && (
                <Text style={styles.crewTaskUsernamesContainer}>
                  {usernames.map((user, idx) => {
                    const roleColor = user.role
                      ? ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG]
                          ?.color
                      : undefined;
                    return (
                      <Text
                        key={idx}
                        style={[
                          styles.crewTaskUsername,
                          roleColor && { color: roleColor },
                          isDisabled && styles.crewTaskTextDisabled,
                        ]}
                      >
                        {user.username}
                        {idx < usernames.length - 1 ? ", " : ""}
                      </Text>
                    );
                  })}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}

      {!isPastEvent && (
        <View style={styles.statusContainer}>
          {getCommitmentEmoji() && (
            <Text style={styles.commitmentEmoji}>{getCommitmentEmoji()}</Text>
          )}

          {saveStatus === "saving" && (
            <View style={styles.statusBadge}>
              <ActivityIndicator size="small" color={colors.textTertiary} />
              <Text style={styles.statusText}>{STRINGS.STATUS.SAVING}</Text>
            </View>
          )}
          {saveStatus === "saved" && (
            <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
              <Text style={styles.statusIcon}>✓</Text>
              <Text style={[styles.statusText, styles.statusTextSuccess]}>
                {STRINGS.STATUS.SAVED}
              </Text>
            </View>
          )}
          {saveStatus === "error" && (
            <View style={[styles.statusBadge, styles.statusBadgeError]}>
              <Text style={styles.statusIcon}>!</Text>
              <Text style={[styles.statusText, styles.statusTextError]}>
                {saveError || STRINGS.STATUS.ERROR_SAVING}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    marginTop: 12,
    paddingBottom: 64,
  },
  sectionTitle: {
    ...microknightText.base,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  crewTaskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  crewTaskTextContainer: {
    flex: 1,
  },
  crewTaskText: {
    ...microknightText.md,
    color: colors.textSecondary,
  },
  crewTaskDescription: {
    ...microknightText.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  crewTaskUsernamesContainer: {
    marginTop: 4,
  },
  crewTaskUsername: {
    ...microknightText.xs,
    color: colors.textTertiary,
  },
  crewTaskItemDisabled: {
    opacity: 0.4,
  },
  checkboxDisabled: {
    borderColor: colors.textTertiary,
  },
  crewTaskTextDisabled: {
    color: colors.textTertiary,
  },
  statusContainer: {
    marginTop: 12,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  commitmentEmoji: {
    fontSize: 32,
  },
  statusBadge: {
    position: "absolute",
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.modalBackground,
  },
  statusBadgeSuccess: {
    backgroundColor: "rgba(48, 209, 88, 0.15)",
  },
  statusBadgeError: {
    backgroundColor: "rgba(255, 69, 58, 0.15)",
  },
  statusIcon: {
    ...microknightText.base,
    marginRight: 6,
  },
  statusText: {
    ...microknightText.sm,
    color: colors.textTertiary,
  },
  statusTextSuccess: {
    color: colors.success,
  },
  statusTextError: {
    color: colors.error,
  },
});
